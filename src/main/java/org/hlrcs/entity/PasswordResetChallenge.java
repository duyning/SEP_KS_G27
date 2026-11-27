package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "password_reset_challenges")
@Getter @Setter @NoArgsConstructor
public class PasswordResetChallenge {
    @Id @Column(length = 64) private String id;
    @Version private Long version;
    // Snapshots bind the proof to an account and invalidate it after a password/session change.
    private Integer userId;
    private long sessionVersion;
    @Column(length = 100) private String secretHash;
    @Column(length = 160) private String providerReference;
    @Column(nullable = false) private Instant sentAt;
    @Column(nullable = false) private Instant expiresAt;
    @Column(nullable = false) private Instant windowStart;
    private int sends;
    private int failedAttempts;
    private boolean verified;
    public PasswordResetChallenge(String id) { this.id = id; }
}
