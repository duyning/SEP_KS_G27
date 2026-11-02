package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

/** Read-only administration: never turns oversight into verification authority. */
@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class AdminOverviewService {
    private final AuthService auth;
    private final UserRepository users;
    private final PropertyRegistrationRepository registrations;
    private final PropertyRepository properties;
    private final ModerationLogRepository logs;
    public record Account(Integer userId,String fullName,String email,String phoneNumber,String role,String status,LocalDateTime createdAt) {}
    public record Page<T>(List<T> content,long totalElements,int totalPages,int number,int size) {}
    public record RoleCount(String role,long count) {}
    public record Activity(Integer logId,String actor,String type,Integer targetId,String action,String note,LocalDateTime createdAt) {}
    public record StaffLoad(Integer userId,String name,String status,long assigned,long pending) {}
    public record Overview(long totalAccounts,long activeAccounts,long totalProperties,long pendingVerifications,long unassignedVerifications,
        List<RoleCount> roles,List<StaffLoad> staff,List<PropertyRegistrationRepository.AssignmentOverview> recentApplications,List<Activity> activities,LocalDateTime fetchedAt) {}
    private void requireAdmin() {
        var actor=auth.getCurrentUser();
        if(actor.getRole()!=UserRole.ADMIN || actor.getStatus()!=UserStatus.ACTIVE)throw new AppException("Chỉ Admin đang hoạt động được truy cập dữ liệu quản trị.",HttpStatus.FORBIDDEN);
    }
    private PageRequest page(int page,int size) {
        if(page<0 || size<1 || size>100)throw new BadRequestException("Phân trang không hợp lệ.");
        return PageRequest.of(page,size);
    }
    private String search(String q) {if(q!=null && q.length()>200)throw new BadRequestException("Từ khóa tối đa 200 ký tự.");return "%"+Objects.toString(q,"").trim().toLowerCase(Locale.ROOT)+"%";}
    public Overview overview() {
        requireAdmin();
        var roles=Arrays.stream(UserRole.values()).map(role->new RoleCount(role.name(),users.countByRole(role))).toList();
        var staff=new ArrayList<StaffLoad>();
        for(var status:UserStatus.values())for(var user:users.findByRoleAndStatusOrderByUserIdAsc(UserRole.STAFF,status))
            staff.add(new StaffLoad(user.getUserId(),user.getFullName(),status.name(),registrations.countByAssignedStaff_UserId(user.getUserId()),registrations.countByAssignedStaff_UserIdAndStatus(user.getUserId(),RegistrationStatus.PENDING)));
        return new Overview(users.count(),users.countByStatus(UserStatus.ACTIVE),properties.count(),registrations.countByStatus(RegistrationStatus.PENDING),registrations.countByAssignedStaffIsNullAndStatus(RegistrationStatus.PENDING),roles,staff,
            registrations.findAdminAssignments("%",false,PageRequest.of(0,6)).getContent(),activityRows(0,6).content(),LocalDateTime.now());
    }
    public Page<Account> accounts(String q,String role,int page,int size) {
        requireAdmin();UserRole selected=null;
        if(role!=null && !role.isBlank() && !role.equals("ALL"))try{selected=UserRole.valueOf(role);}catch(IllegalArgumentException e){throw new BadRequestException("Vai trò không hợp lệ.");}
        var result=users.findAdminAccounts(selected,search(q),page(page,size));
        return new Page<>(result.stream().map(u->new Account(u.getUserId(),u.getFullName(),u.getEmail(),u.getPhoneNumber(),u.getRole().name(),u.getStatus().name(),u.getCreatedAt())).toList(),result.getTotalElements(),result.getTotalPages(),page,size);
    }
    public Page<PropertyRegistrationRepository.AssignmentOverview> assignments(String q,boolean unassigned,int page,int size) {
        requireAdmin();var result=registrations.findAdminAssignments(search(q),unassigned,page(page,size));
        return new Page<>(result.getContent(),result.getTotalElements(),result.getTotalPages(),page,size);
    }
    public Page<Activity> activities(int page,int size) {requireAdmin();page(page,size);return activityRows(page,size);}
    private Page<Activity> activityRows(int page,int size) {
        var result=logs.findAll(PageRequest.of(page,size,org.springframework.data.domain.Sort.by("createdAt").descending().and(org.springframework.data.domain.Sort.by("logId").descending())));
        return new Page<>(result.stream().map(log->new Activity(log.getLogId(),log.getStaff().getFullName(),log.getTargetType(),log.getTargetId(),log.getAction(),log.getNote(),log.getCreatedAt())).toList(),result.getTotalElements(),result.getTotalPages(),page,size);
    }
}
