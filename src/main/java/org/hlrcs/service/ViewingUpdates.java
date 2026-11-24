package org.hlrcs.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ViewingUpdates {
    private final ConcurrentHashMap<Integer, Set<SseEmitter>> subscribers = new ConcurrentHashMap<>();

    public record Changed(Integer userId) {}

    public SseEmitter subscribe(Integer userId) {
        // Reconnect periodically so each connection rechecks the account and JWT.
        var emitter = new SseEmitter(25_000L);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(emitter::complete);
        emitter.onError(error -> remove(userId, emitter));
        subscribers.compute(userId, (id, connections) -> {
            if (connections == null) connections = ConcurrentHashMap.newKeySet();
            connections.add(emitter);
            return connections;
        });
        send(userId, emitter);
        return emitter;
    }

    @TransactionalEventListener
    public void afterCommit(Changed event) {
        for (var emitter : subscribers.getOrDefault(event.userId(), Set.of())) {
            send(event.userId(), emitter);
        }
    }

    private void send(Integer userId, SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event().data("refresh"));
        } catch (IOException | IllegalStateException error) {
            remove(userId, emitter);
            emitter.complete();
        }
    }

    private void remove(Integer userId, SseEmitter emitter) {
        subscribers.computeIfPresent(userId, (id, connections) -> {
            connections.remove(emitter);
            return connections.isEmpty() ? null : connections;
        });
    }
}
