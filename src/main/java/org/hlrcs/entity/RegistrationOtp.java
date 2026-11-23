package org.hlrcs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "registration_otps")
@Getter
@Setter
@NoArgsConstructor
public class RegistrationOtp {
    @Id
    @Column(length = 64)
    private String id;

    @Version
    private Long version;

    @Column(length = 100)
    private String secretHash;

    @Column(nullable = false)
    private Instant sentAt;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int failedAttempts;

    @Column(nullable = false)
    private boolean verified;

    public RegistrationOtp(String id) {
        this.id = id;
    }
}
