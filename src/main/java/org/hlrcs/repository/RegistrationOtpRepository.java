package org.hlrcs.repository;

import jakarta.persistence.LockModeType;
import org.hlrcs.entity.RegistrationOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RegistrationOtpRepository extends JpaRepository<RegistrationOtp, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select otp from RegistrationOtp otp where otp.id = :id")
    Optional<RegistrationOtp> findLocked(@Param("id") String id);

    @Modifying
    @Query("delete from RegistrationOtp otp where otp.expiresAt < :cutoff")
    void deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
