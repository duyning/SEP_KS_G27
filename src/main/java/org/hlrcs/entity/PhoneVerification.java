package org.hlrcs.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/** One account-bound challenge, shared across web/mobile API instances. No plaintext OTP is stored. */
@Entity
@Table(name = "phone_verifications")
@Getter @Setter @NoArgsConstructor
public class PhoneVerification {
    @Id private Integer userId;
    @Column(length = 16) private String phone;
    @Column(length = 40) private String providerSid;
    @Column(length = 100) private String otpHash;
    private Instant sentAt;
    private Instant expiresAt;
    private Instant verifiedAt;
    private Instant windowStart;
    private int sends;
    private int attempts;
}
