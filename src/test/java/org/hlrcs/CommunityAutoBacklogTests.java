package org.hlrcs;

import org.hlrcs.entity.CommunityScan;
import org.hlrcs.entity.CommunityScan.State;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.enums.PostStatus;
import org.hlrcs.entity.enums.PostType;
import org.hlrcs.dto.response.CommunityPostResponse.ScanFinding;
import org.hlrcs.repository.*;
import org.hlrcs.service.CommunityAutoModeration;
import org.hlrcs.service.CommunityAutoModeration.Mode;
import org.hlrcs.service.GeminiCommunityScanner;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:community-auto-backlog;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "community.ai.mode=OFF", "community.ai.poll-ms=3600000"})
@ActiveProfiles("test")
class CommunityAutoBacklogTests {
    @Autowired CommunityAutoModeration worker;
    @Autowired CommunityScanRepository scans;
    @Autowired PostRepository posts;
    @Autowired PostMediaRepository media;
    @Autowired UserRepository users;
    @Autowired PlatformTransactionManager transactions;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean GeminiCommunityScanner scanner;

    @BeforeEach
    void isolateQueue() {
        worker.changeMode(Mode.OFF);
        scans.deleteAll();
        jdbc.update("update posts set status = 'REJECTED' where status = 'PENDING'");
        when(scanner.configured()).thenReturn(true);
    }

    @AfterEach
    void stop() { worker.changeMode(Mode.OFF); }

    @Test
    void autoProcessesPostsSubmittedWhileOffWithoutDuplicateJobs() throws Exception {
        Post post = pending();
        assertTrue(scans.findByPostIdOrderByRevisionDesc(post.getPostId()).isEmpty());
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        assertEquals(PostStatus.APPROVED, status(post));
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        assertEquals(1, scans.findByPostIdOrderByRevisionDesc(post.getPostId()).size());
        verify(scanner, times(1)).scan(anyString(), isNull());
    }

    @Test
    void assistClearIsRescannedAndOnlyFreshResultCanDecide() throws Exception {
        Post post = pending();
        worker.changeMode(Mode.ASSIST);
        new TransactionTemplate(transactions).executeWithoutResult(s -> worker.enqueue(post));
        worker.processNext();
        assertEquals(PostStatus.PENDING, status(post));
        assertEquals(State.CLEAR, scan(post).getState());
        when(scanner.scan(anyString(), isNull())).thenReturn(new ScanFinding("UNSURE", null, null, null));
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        assertEquals(State.FLAGGED, scan(post).getState());
        assertEquals(PostStatus.PENDING, status(post));
        assertNull(scan(post).getDecision());
        // A held post must not be re-enqueued on every poll or repeated AUTO click.
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        verify(scanner, times(2)).scan(anyString(), isNull());
        assertEquals(1, scans.findByPostIdOrderByRevisionDesc(post.getPostId()).size());
    }

    @Test
    void startupInAutoAlsoProcessesExistingPendingPosts() {
        Post post = pending();
        var restarted = new CommunityAutoModeration(scans, posts, media, scanner, json, transactions, Mode.AUTO);
        restarted.processNext();
        assertEquals(PostStatus.APPROVED, status(post));
    }

    @Test
    void backlogSkipsOtherStatusesAndUsesOnlyCurrentRevision() {
        for (PostStatus state : PostStatus.values()) {
            if (state == PostStatus.PENDING) continue;
            Post post = pending();
            post.setStatus(state);
            posts.save(post);
        }
        Post current = pending();
        current.setSubmissionRevision(1);
        posts.save(current);
        scans.save(CommunityScan.builder().postId(current.getPostId()).revision(0)
                .autoEligible(false).state(State.FLAGGED).build());
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        assertEquals(PostStatus.APPROVED, status(current));
        assertEquals(2, scans.count());
        assertEquals(State.FLAGGED, scans.findByPostIdAndRevision(current.getPostId(), 0).orElseThrow().getState());
        assertEquals(PostStatus.APPROVED, scans.findByPostIdAndRevision(current.getPostId(), 1).orElseThrow().getDecision());
    }

    @Test
    void staffDecisionDuringBacklogScanCannotBeOverwritten() throws Exception {
        Post post = pending();
        when(scanner.scan(anyString(), isNull())).thenAnswer(call -> {
            new TransactionTemplate(transactions).executeWithoutResult(s -> {
                Post locked = posts.findForReview(post.getPostId()).orElseThrow();
                locked.setStatus(PostStatus.REJECTED);
                locked.setReviewNote("Quyết định của staff trong lúc AI đang chạy.");
            });
            return null;
        });
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        assertEquals(PostStatus.REJECTED, status(post));
        assertNull(scan(post).getDecision());
    }

    @Test
    void batchesContinuePastTwentyFivePosts() {
        var pending = new ArrayList<Post>();
        for (int i = 0; i < 28; i++) pending.add(pending());
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        assertEquals(25, scans.count());
        for (int i = 1; i < 28; i++) worker.processNext();
        assertEquals(28, scans.count());
        for (Post post : pending) assertEquals(PostStatus.APPROVED, status(post));
    }

    @Test
    void runningScanIsNotResetUntilItHasFinished() {
        Post post = pending();
        var running = scans.save(CommunityScan.builder().postId(post.getPostId()).revision(0)
                .state(State.RUNNING).startedAt(LocalDateTime.now()).build());
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        assertEquals(State.RUNNING, scan(post).getState());
        assertEquals(PostStatus.PENDING, status(post));
        running.setState(State.CLEAR);
        scans.save(running);
        worker.processNext();
        assertEquals(PostStatus.APPROVED, status(post));
    }

    @Test
    void failedOrExpiredJobsGetOneFreshAttemptPerActivation() throws Exception {
        Post post = pending();
        scans.save(CommunityScan.builder().postId(post.getPostId()).revision(0).autoEligible(true)
                .state(State.RUNNING).startedAt(LocalDateTime.now().minusMinutes(16)).build());
        when(scanner.scan(anyString(), isNull())).thenThrow(new java.io.IOException("test failure"));
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        worker.processNext();
        assertEquals(State.FAILED, scan(post).getState());
        assertEquals(PostStatus.PENDING, status(post));
        verify(scanner, times(1)).scan(anyString(), isNull());
        doReturn(null).when(scanner).scan(anyString(), isNull());
        worker.changeMode(Mode.OFF);
        worker.changeMode(Mode.AUTO);
        worker.processNext();
        assertEquals(PostStatus.APPROVED, status(post));
    }

    private Post pending() {
        return posts.save(Post.builder().author(users.findByEmail("user@hlrcs.com").orElseThrow())
                .postType(PostType.PASS_ITEM).status(PostStatus.PENDING)
                .title("Bàn học còn tốt tại Tân Xã")
                .description("Bàn gỗ chắc chắn, có thể kiểm tra trực tiếp trước khi nhận.")
                .contactName("Người đăng thử").contactPhone("0912345678").build());
    }

    private PostStatus status(Post post) { return posts.findById(post.getPostId()).orElseThrow().getStatus(); }
    private CommunityScan scan(Post post) {
        return scans.findByPostIdAndRevision(post.getPostId(), post.revision()).orElseThrow();
    }
}
