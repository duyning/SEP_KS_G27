package org.hlrcs.service;

import org.hlrcs.dto.response.CommunityPostResponse.Scan;
import org.hlrcs.dto.response.CommunityPostResponse.ScanFinding;
import org.hlrcs.entity.CommunityScan;
import org.hlrcs.entity.CommunityScan.State;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.PostMedia;
import org.hlrcs.entity.enums.PostStatus;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.repository.CommunityScanRepository;
import org.hlrcs.repository.PostMediaRepository;
import org.hlrcs.repository.PostRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CommunityAutoModeration {
    public enum Mode { OFF, ASSIST, AUTO }
    public record Settings(Mode mode, boolean configured) {}

    private static final Logger LOG = LoggerFactory.getLogger(CommunityAutoModeration.class);
    private final CommunityScanRepository jobs;
    private final PostRepository posts;
    private final PostMediaRepository media;
    private final GeminiCommunityScanner scanner;
    private final ObjectMapper json;
    private final TransactionTemplate tx;
    private final Object decisionLock = new Object();
    private volatile Mode mode;
    private long modeGeneration;

    public CommunityAutoModeration(CommunityScanRepository jobs, PostRepository posts, PostMediaRepository media,
                                   GeminiCommunityScanner scanner, ObjectMapper json, PlatformTransactionManager txManager,
                                   @Value("${community.ai.mode:OFF}") Mode mode) {
        this.jobs = jobs;
        this.posts = posts;
        this.media = media;
        this.scanner = scanner;
        this.json = json;
        this.tx = new TransactionTemplate(txManager);
        this.mode = mode;
    }

    public Settings settings() {
        return new Settings(mode, scanner.configured());
    }

    public Settings changeMode(Mode next) {
        if (next == null) throw new BadRequestException("Vui lòng chọn chế độ kiểm duyệt AI.");
        if (next != Mode.OFF && !scanner.configured()) throw new BadRequestException("Máy chủ chưa cấu hình khóa Gemini.");
        synchronized (decisionLock) {
            if (mode != next) modeGeneration++;
            mode = next;
            return settings();
        }
    }

    // Runs inside the submission transaction so the worker only sees committed posts and attachments.
    public void enqueue(Post post) {
        Mode selected = mode;
        if (selected != Mode.OFF) {
            jobs.save(CommunityScan.builder().postId(post.getPostId()).revision(post.revision())
                    .autoEligible(selected == Mode.AUTO).state(scanner.configured() ? State.QUEUED : State.FAILED)
                    .finishedAt(scanner.configured() ? null : LocalDateTime.now()).build());
        }
    }

    public Scan view(CommunityScan job) {
        List<ScanFinding> findings = job.getFindings() == null ? List.of()
                : json.readValue(job.getFindings(), new TypeReference<List<ScanFinding>>() {});
        String state = mode == Mode.OFF && job.getState() == State.QUEUED ? "PAUSED" : job.getState().name();
        return new Scan(state, findings, job.getFinishedAt());
    }

    @Scheduled(fixedDelayString = "${community.ai.poll-ms:2500}")
    public void processNext() {
        if (mode == Mode.OFF || !scanner.configured()) return;
        final Work work;
        synchronized (decisionLock) {
            if (mode == Mode.OFF) return;
            LocalDateTime now = LocalDateTime.now();
            tx.executeWithoutResult(status -> jobs.expire(State.RUNNING, State.FAILED, now, now.minusMinutes(15)));
            work = tx.execute(status -> claim());
        }
        if (work == null) return;

        var findings = new ArrayList<ScanFinding>();
        boolean failed = false;
        try {
            addFinding(findings, scanner.scan(work.context(), null));
            for (PostMedia attachment : work.attachments()) {
                if (mode == Mode.OFF) {
                    failed = true;
                    break;
                }
                addFinding(findings, scanner.scan(work.context(), attachment));
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            failed = true;
        } catch (Exception error) {
            // Do not log user media, provider response bodies or credentials.
            LOG.warn("Community scan {} failed ({})", work.id(), error.getClass().getSimpleName());
            failed = true;
        }
        State result = findings.stream().anyMatch(finding -> !finding.code().equals("OFF_TOPIC")) ? State.FLAGGED
                : failed ? State.FAILED : findings.isEmpty() ? State.CLEAR : State.OFF_TOPIC;
        synchronized (decisionLock) {
            tx.executeWithoutResult(status -> finish(work, findings, result));
        }
    }

    private Work claim() {
        LocalDateTime now = LocalDateTime.now();
        var queued = jobs.findFirstByStateOrderByIdAsc(State.QUEUED).orElse(null);
        if (queued == null) return null;
        Post post = posts.findForReview(queued.getPostId()).orElse(null);
        // The queue query only reads IDs; load the current state after locking the post.
        var job = jobs.lockById(queued.getId()).orElse(null);
        if (job == null || job.getState() != State.QUEUED) return null;
        if (!pendingRevision(post, job.getRevision())) {
            job.setState(State.SKIPPED);
            job.setFinishedAt(now);
            return null;
        }
        job.setState(State.RUNNING);
        job.setStartedAt(now);
        String context = json.writeValueAsString(new PostContext(post.getPostType().name(), post.getTitle(), post.getDescription()));
        return new Work(job.getId(), post.getPostId(), job.getRevision(), modeGeneration,
                mode == Mode.AUTO && job.isAutoEligible(), context, media.findByPost_PostIdOrderByMediaIdAsc(post.getPostId()));
    }

    private void finish(Work work, List<ScanFinding> findings, State result) {
        Post post = posts.findForReview(work.postId()).orElse(null);
        CommunityScan job = jobs.lockById(work.id()).orElse(null);
        if (job == null || job.getState() != State.RUNNING) return;
        job.setState(result);
        job.setFindings(json.writeValueAsString(findings));
        job.setFinishedAt(LocalDateTime.now());
        if (!work.auto() || mode != Mode.AUTO || work.generation() != modeGeneration
                || !pendingRevision(post, work.revision())) return;

        if (result == State.CLEAR) {
            decide(post, job, PostStatus.APPROVED, "Bài viết đã vượt qua các bước kiểm tra tự động.");
        } else if (result == State.OFF_TOPIC) {
            String names = findings.stream().map(finding -> finding.fileName() == null
                    ? "Ảnh #" + finding.mediaId() : "“" + finding.fileName() + "”").collect(Collectors.joining(", "));
            decide(post, job, PostStatus.NEED_CHANGES,
                    "Ảnh chưa phù hợp với nội dung bài viết. Vui lòng gỡ hoặc thay các ảnh sau rồi gửi lại: " + names);
        }
    }

    private void decide(Post post, CommunityScan job, PostStatus decision, String note) {
        post.setStatus(decision);
        post.setReviewer(null);
        post.setReviewedAt(job.getFinishedAt());
        post.setReviewNote(note);
        job.setDecision(decision);
        job.setDecisionNote(note);
    }

    private static boolean pendingRevision(Post post, int revision) {
        return post != null && post.getStatus() == PostStatus.PENDING && post.revision() == revision;
    }

    private static void addFinding(List<ScanFinding> findings, ScanFinding finding) {
        if (finding != null) findings.add(finding);
    }

    private record Work(Integer id, Integer postId, int revision, long generation, boolean auto, String context,
                        List<PostMedia> attachments) {}
    private record PostContext(String category, String title, String description) {}
}
