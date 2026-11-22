package org.hlrcs.service;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.UserRepository;
import org.hlrcs.security.JwtTokenProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.*;

@Service @RequiredArgsConstructor
public class CommunityRealtimeService {
    private final JwtTokenProvider tokens;
    private final UserRepository users;
    private record Client(SseEmitter emitter, Integer userId, UserRole role, String token, long expiresAt) {}
    private final Set<Client> clients = ConcurrentHashMap.newKeySet();
    private final ScheduledExecutorService heartbeatClock = Executors.newSingleThreadScheduledExecutor(task -> {
        var thread = new Thread(task, "community-heartbeat"); thread.setDaemon(true); return thread;
    });
    private final ThreadPoolExecutor sender = new ThreadPoolExecutor(2, 4, 30, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(256), task -> { var t = new Thread(task, "community-live"); t.setDaemon(true); return t; });

    public SseEmitter connect(Integer id, UserRole role, String token) {
        var emitter = new SseEmitter(65000L);
        var client = new Client(emitter, id, role, token, System.currentTimeMillis() + 60000);
        clients.add(client);
        emitter.onCompletion(() -> clients.remove(client));
        emitter.onTimeout(() -> close(client));
        emitter.onError(error -> clients.remove(client));
        send(client, Map.of("type", "resync"));
        return emitter;
    }

    @TransactionalEventListener
    public void changed(CommunityRealtimeEvent event) {
        for (var client : clients) if (event.visibleTo(client.userId(), client.role()))
            send(client, event.postId() == null ? Map.of("type", event.type())
                    : Map.of("type", event.type(), "postId", event.postId()));
    }

    @jakarta.annotation.PostConstruct
    public void start() { heartbeatClock.scheduleWithFixedDelay(this::heartbeat, 15, 15, TimeUnit.SECONDS); }
    public void heartbeat() { for (var client : clients) send(client, Map.of("type", "heartbeat")); }

    private boolean valid(Client client) {
        if (System.currentTimeMillis() >= client.expiresAt()) return false;
        if (client.userId() == null) return true;
        if (!tokens.validateToken(client.token())) return false;
        return users.findById(client.userId()).filter(u -> u.getStatus() == UserStatus.ACTIVE
                && u.getRole() == client.role()).isPresent();
    }
    private void send(Client client, Map<String, Object> data) {
        try {
            sender.execute(() -> {
                if (!clients.contains(client)) return;
                try {
                    if (!valid(client)) { close(client); return; }
                    client.emitter().send(SseEmitter.event().name("community").data(data));
                } catch (Exception error) { close(client); }
            });
        } catch (RejectedExecutionException full) { close(client); }
    }
    private void close(Client client) { if (clients.remove(client)) client.emitter().complete(); }
    // Close long-lived requests before Tomcat starts waiting for graceful shutdown.
    @org.springframework.context.event.EventListener(org.springframework.context.event.ContextClosedEvent.class)
    public void contextClosing() { clients.forEach(this::close); }
    @PreDestroy public void shutdown() { clients.forEach(this::close); heartbeatClock.shutdownNow(); sender.shutdownNow(); }
}
