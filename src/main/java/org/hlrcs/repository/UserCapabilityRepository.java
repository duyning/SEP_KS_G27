package org.hlrcs.repository;

import org.hlrcs.entity.UserCapability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserCapabilityRepository extends JpaRepository<UserCapability, Integer> {

    List<UserCapability> findByUser_UserId(Integer userId);

    List<UserCapability> findByUser_UserIdAndStatus(Integer userId, String status);
}
