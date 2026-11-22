package org.hlrcs.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.hlrcs.entity.*;
import org.hlrcs.entity.CommunityReportAnalysis.State;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.hlrcs.service.CommunityReportAiPolicy.*;

@Service
public class CommunityReportAssistant {
    private final CommunityReportAnalysisRepository jobs;
    private final ReportRepository reports;
    private final PostRepository posts;
    private final PostMediaRepository media;
    private final CommunityReportEvidenceRepository evidence;
    private final GeminiCommunityScanner scanner;
    private final AuthService auth;
    private final ObjectMapper json;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate tx;
    private final boolean enabled;
    private final long pollMs;
    private final ScheduledExecutorService worker = Executors.newSingleThreadScheduledExecutor(task -> {
        var thread = new Thread(task, "community-report-assistant"); thread.setDaemon(true); return thread;
    });

    public CommunityReportAssistant(CommunityReportAnalysisRepository jobs, ReportRepository reports, PostRepository posts,
            PostMediaRepository media, CommunityReportEvidenceRepository evidence, GeminiCommunityScanner scanner,
            AuthService auth, ObjectMapper json, ApplicationEventPublisher events, PlatformTransactionManager manager,
            @Value("${community.report-ai.enabled:${COMMUNITY_REPORT_AI_ENABLED:true}}") boolean enabled,
            @Value("${community.report-ai.poll-ms:3000}") long pollMs) {
        this.jobs=jobs; this.reports=reports; this.posts=posts; this.media=media; this.evidence=evidence;
        this.scanner=scanner; this.auth=auth; this.json=json; this.events=events;
        this.tx=new TransactionTemplate(manager); this.enabled=enabled; this.pollMs=Math.max(1000, pollMs);
    }
    @PostConstruct void start() { worker.scheduleWithFixedDelay(() -> {
        try { runNext(); } catch (RuntimeException error) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("Report AI worker failed ({})", error.getClass().getSimpleName());
        }
    }, pollMs, pollMs, TimeUnit.MILLISECONDS); }
    @PreDestroy void stop() { worker.shutdownNow(); }

    public record Item(Integer reportId, String state, String recommendation, List<Finding> findings,
                       int completedChecks, int totalChecks, LocalDateTime finishedAt, LocalDateTime retryAt,
                       String model, String errorCode) {}
    public record View(boolean enabled, boolean configured, String rulesVersion, List<Rule> rules,
                       String recommendation, int totalOpen, int readyOpen, List<Item> items) {}
    private record Attachment(String source, PostMedia media) {}
    private record Work(Integer reportId, Integer postId, int generation, String fingerprint, String context,
                        String postText, String reportText, String reasonCode, List<Attachment> attachments) {}

    @EventListener @Transactional(propagation = Propagation.MANDATORY)
    public void submitted(CommunityReportSubmitted event) {
        if (jobs.existsById(event.reportId())) return;
        jobs.save(CommunityReportAnalysis.builder().reportId(event.reportId()).postId(event.postId())
                .state(available() ? State.QUEUED : State.DISABLED).generation(1)
                .rulesVersion(VERSION).model(scanner.modelName()).requestedAt(LocalDateTime.now()).build());
    }

    @Transactional(readOnly = true)
    public View view(Integer reportId) {
        admin();
        var selected = report(reportId);
        var post = posts.findById(selected.getTargetId()).orElse(null);
        var related = reports.findByTargetTypeAndTargetId(ReportTargetType.POST, selected.getTargetId());
        var ids = post == null ? List.<Integer>of() : media.idsForPost(post.getPostId());
        var byId = new HashMap<Integer, CommunityReportAnalysis>();
        jobs.findByPostId(selected.getTargetId()).forEach(job -> byId.put(job.getReportId(), job));
        var items = new ArrayList<Item>();
        int open=0, ready=0; boolean hide=false, review=false;
        for (var report : related) {
            var job = byId.get(report.getReportId());
            boolean currentOpen = open(report); if (currentOpen) open++;
            String state = job == null ? "NOT_ANALYZED" : job.getState().name();
            if (!currentOpen) state="CLOSED";
            else if (post == null || post.getStatus()!=PostStatus.APPROVED) state="UNAVAILABLE";
            else if (job != null && job.getFingerprint()!=null && !fingerprint(post, report, ids).equals(job.getFingerprint())) state="STALE";
            var findings = job == null || job.getFindings()==null ? List.<Finding>of()
                    : json.readValue(job.getFindings(), new TypeReference<List<Finding>>() {});
            String recommendation = "READY".equals(state) ? job.getRecommendation() : null;
            if (currentOpen && recommendation!=null) {
                ready++; hide |= "SUGGEST_HIDE".equals(recommendation); review |= "ADMIN_REVIEW".equals(recommendation);
            }
            items.add(new Item(report.getReportId(), state, recommendation, findings,
                    job==null?0:job.getCompletedChecks(), job==null?0:job.getTotalChecks(), job==null?null:job.getFinishedAt(),
                    job==null?null:job.getRequestedAt().plusSeconds(60), job==null?null:job.getModel(), job==null?null:job.getErrorCode()));
        }
        items.sort(Comparator.comparing(Item::reportId).reversed());
        // An unfinished/stale report prevents presenting a complete group verdict.
        String group = open==0 ? "CLOSED" : ready<open ? "INCOMPLETE" : hide ? "SUGGEST_HIDE" : review ? "ADMIN_REVIEW" : "SUGGEST_KEEP";
        return new View(enabled, scanner.configured(), VERSION, RULES, group, open, ready, items);
    }

    @Transactional
    public View request(Integer reportId) {
        admin();
        if (!available()) throw new BadRequestException("AI hỗ trợ report chưa bật hoặc chưa cấu hình khóa Gemini.");
        Integer postId = reports.findTargetId(reportId, ReportTargetType.POST).orElseThrow(this::missing);
        var post = posts.findForReview(postId).filter(p -> p.getStatus()==PostStatus.APPROVED)
                .orElseThrow(() -> new AppException("Bài viết không còn công khai để phân tích.", HttpStatus.CONFLICT));
        var related = reports.lockForTarget(ReportTargetType.POST, postId);
        int queued=0; var now=LocalDateTime.now();
        for (var report : related) {
            if (!open(report)) continue;
            var job = jobs.lockById(report.getReportId()).orElse(null);
            if (job!=null && (job.getState()==State.RUNNING || job.getState()==State.QUEUED
                    || job.getRequestedAt().isAfter(now.minusSeconds(60)))) continue;
            if (job==null) job=CommunityReportAnalysis.builder().reportId(report.getReportId()).postId(post.getPostId()).build();
            job.setState(State.QUEUED); job.setGeneration(job.getGeneration()+1); job.setRequestedAt(now);
            job.setStartedAt(null); job.setFinishedAt(null); job.setErrorCode(null); job.setFindings(null);
            job.setRecommendation(null); job.setFingerprint(null); job.setCompletedChecks(0); job.setTotalChecks(0);
            job.setRulesVersion(VERSION); job.setModel(scanner.modelName()); jobs.save(job); queued++;
        }
        if (queued==0) throw new AppException("Các báo cáo đang phân tích hoặc chưa đủ 60 giây để thử lại.", HttpStatus.CONFLICT);
        changed(postId);
        return view(reportId);
    }

    // Network calls happen outside DB transactions and never call CommunityReportService.resolve.
    public void runNext() {
        if (!available()) return;
        Work work=tx.execute(status -> claim());
        if (work==null) return;
        var findings=new ArrayList<Finding>(); boolean failed=false;
        try {
            findings.add(check(work, "POST_TEXT", null)); progress(work, 1);
            int completed=1;
            for (var attachment : work.attachments()) {
                if (!Boolean.TRUE.equals(tx.execute(status -> current(work)))) return;
                findings.add(check(work, attachment.source(), attachment.media())); progress(work, ++completed);
            }
        } catch (InterruptedException error) { Thread.currentThread().interrupt(); failed=true; }
        catch (Exception error) { failed=true; }
        final boolean failure=failed;
        tx.executeWithoutResult(status -> finish(work, findings, failure));
    }
    private Finding check(Work work, String source, PostMedia file) throws Exception {
        if (file!=null && (file.getFileContent()==null || file.getContentType()==null))
            return uncertain(source, file.getMediaId(), "Không đọc được tệp gốc; cần admin kiểm tra thủ công.");
        var result=scanner.assessReport(work.context()+"\nCURRENT_ARTIFACT_SOURCE="+source, file);
        return validate(result, source, file==null?null:file.getMediaId(), work.postText(), work.reportText(), file!=null && file.getMediaType()==MediaType.VIDEO);
    }
    private Work claim() {
        var now=LocalDateTime.now();
        if (jobs.expire(State.RUNNING, State.FAILED, now, now.minusMinutes(15)) > 0) changed(null);
        var entry=jobs.findFirstByStateOrderByRequestedAtAscReportIdAsc(State.QUEUED).orElse(null);
        if (entry==null) return null;
        Integer postId=reports.findTargetId(entry.getReportId(), ReportTargetType.POST).orElse(null);
        var post=postId==null?null:posts.findForReview(postId).orElse(null);
        var report=postId==null?null:reports.lockForTarget(ReportTargetType.POST, postId).stream()
                .filter(r -> r.getReportId().equals(entry.getReportId())).findFirst().orElse(null);
        var job=jobs.lockById(entry.getReportId()).orElse(null);
        if (job==null || job.getState()!=State.QUEUED) return null;
        if (post==null || post.getStatus()!=PostStatus.APPROVED || report==null || !open(report)) {
            job.setState(State.SKIPPED); job.setFinishedAt(now); changed(job.getPostId()); return null;
        }
        var attachments=new ArrayList<Attachment>();
        for (var file : media.findByPost_PostIdOrderByMediaIdAsc(postId)) attachments.add(new Attachment("POST_MEDIA", file));
        evidence.findById(report.getReportId()).ifPresent(proof -> attachments.add(new Attachment("REPORT_EVIDENCE",
                PostMedia.builder().mediaId(proof.getReportId()).mediaType(MediaType.IMAGE)
                        .fileName("Report evidence").fileContent(proof.getFileContent()).contentType(proof.getContentType()).build())));
        String fingerprint=fingerprint(post, report, media.idsForPost(postId));
        job.setFingerprint(fingerprint); job.setState(State.RUNNING); job.setStartedAt(now);
        job.setRulesVersion(VERSION); job.setModel(scanner.modelName()); job.setCompletedChecks(0);
        job.setTotalChecks(1+attachments.size()); changed(postId);
        String reportText=Objects.toString(report.getReason(), "");
        String context=json.writeValueAsString(Map.of("post", context(post), "report",
                Map.of("reasonCode", Objects.toString(report.getReasonCode(), "OTHER"), "allegation", reportText)));
        return new Work(report.getReportId(), postId, job.getGeneration(), fingerprint, context,
                postText(post), reportText, report.getReasonCode(), attachments);
    }
    private boolean current(Work work) {
        var post=posts.findForReview(work.postId()).orElse(null);
        var report=reports.lockForTarget(ReportTargetType.POST, work.postId()).stream()
                .filter(r -> r.getReportId().equals(work.reportId())).findFirst().orElse(null);
        var job=jobs.lockById(work.reportId()).orElse(null);
        if (job==null || job.getState()!=State.RUNNING || job.getGeneration()!=work.generation()) return false;
        if (post==null || post.getStatus()!=PostStatus.APPROVED || report==null || !open(report)
                || !fingerprint(post, report, media.idsForPost(work.postId())).equals(work.fingerprint())) {
            job.setState(State.SKIPPED); job.setFinishedAt(LocalDateTime.now()); changed(work.postId()); return false;
        }
        return true;
    }
    private void progress(Work work, int completed) {
        tx.executeWithoutResult(status -> {
            var job=jobs.lockById(work.reportId()).orElse(null);
            if (job!=null && job.getState()==State.RUNNING && job.getGeneration()==work.generation()) {
                job.setCompletedChecks(completed); changed(work.postId());
            }
        });
    }
    private void finish(Work work, List<Finding> findings, boolean failed) {
        if (!current(work)) return;
        var job=jobs.findById(work.reportId()).orElseThrow();
        if (!failed && Set.of("FRAUD", "MISLEADING", "SPAM").contains(Objects.toString(work.reasonCode(), ""))
                && !"SUGGEST_HIDE".equals(recommendation(findings)))
            findings.add(uncertain("REPORT_CONTEXT", null, "Cáo buộc lừa đảo, sai lệch thực tế hoặc đăng trùng cần admin xác minh; không thể bác bỏ chỉ vì bài trông bình thường."));
        job.setState(failed?State.FAILED:State.READY); job.setFinishedAt(LocalDateTime.now());
        job.setFindings(json.writeValueAsString(findings));
        job.setRecommendation(failed?"ADMIN_REVIEW":recommendation(findings));
        job.setErrorCode(failed?"PROVIDER_OR_RESPONSE_ERROR":null);
        changed(work.postId());
    }
    private Map<String, Object> context(Post post) {
        return Map.of("category", post.getPostType().name(), "title", Objects.toString(post.getTitle(), ""),
                "description", Objects.toString(post.getDescription(), ""), "location", Objects.toString(post.getLocation(), ""),
                "price", Objects.toString(post.getPrice(), "NEGOTIABLE"));
    }
    private String postText(Post post) {
        return Objects.toString(post.getTitle(), "")+"\n"+Objects.toString(post.getDescription(), "")+"\n"
                +Objects.toString(post.getLocation(), "")+"\n"+Objects.toString(post.getPrice(), "NEGOTIABLE");
    }
    private String fingerprint(Post post, Report report, List<Integer> mediaIds) {
        try {
            String input=json.writeValueAsString(List.of(VERSION, scanner.modelName(), post.revision(),
                    postText(post), post.getPostType().name(), mediaIds, evidence.existsById(report.getReportId()),
                    Objects.toString(report.getReasonCode(), ""), Objects.toString(report.getReason(), "")));
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private boolean available() { return enabled && scanner.configured(); }
    private boolean open(Report report) { return report.getStatus()==ReportStatus.OPEN || report.getStatus()==ReportStatus.PENDING; }
    private Report report(Integer id) { return reports.findByReportIdAndTargetType(id, ReportTargetType.POST).orElseThrow(this::missing); }
    private ResourceNotFoundException missing() { return new ResourceNotFoundException("Không tìm thấy báo cáo."); }
    private void admin() {
        var user=auth.getCurrentUser();
        if (user.getStatus()!=UserStatus.ACTIVE || user.getRole()!=UserRole.ADMIN)
            throw new AppException("Chỉ admin được sử dụng AI hỗ trợ xử lý báo cáo.", HttpStatus.FORBIDDEN);
    }
    private void changed(Integer postId) { events.publishEvent(CommunityRealtimeEvent.reports(postId)); }
}
