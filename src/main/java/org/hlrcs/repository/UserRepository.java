package org.hlrcs.repository;

import org.hlrcs.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    long countByRole(org.hlrcs.entity.enums.UserRole role);
    long countByStatus(org.hlrcs.entity.enums.UserStatus status);
    @org.springframework.data.jpa.repository.Query("select u from User u where (:role is null or u.role=:role) and (lower(coalesce(u.fullName,'')) like :query or lower(u.email) like :query or coalesce(u.phoneNumber,'') like :query) order by u.createdAt desc, u.userId desc")
    org.springframework.data.domain.Page<User> findAdminAccounts(@org.springframework.data.repository.query.Param("role") org.hlrcs.entity.enums.UserRole role, @org.springframework.data.repository.query.Param("query") String query, org.springframework.data.domain.Pageable pageable);
    java.util.List<User> findByRoleAndStatusOrderByUserIdAsc(org.hlrcs.entity.enums.UserRole role, org.hlrcs.entity.enums.UserStatus status);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.userId = :id")
    Optional<User> findForRegistrationUpdate(@org.springframework.data.repository.query.Param("id") Integer id);

    Optional<User> findByEmail(String email);

    Optional<User> findByPhoneNumber(String phoneNumber);

    boolean existsByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);
}
