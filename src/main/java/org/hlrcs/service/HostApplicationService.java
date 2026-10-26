package org.hlrcs.service;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.hlrcs.exception.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.time.LocalDateTime;
import java.util.*;
@Service @RequiredArgsConstructor
public class HostApplicationService {
 private final AuthService auth;
 private final UserRepository users;
 private final HostApplicationRepository applications;
 private final ModerationLogRepository logs;
 public record Submission(@NotBlank String targetCommune,@NotBlank String expectedScale,@NotBlank @Size(min=20,max=1000) String introduction,@NotNull @AssertTrue Boolean agreementAccepted,Long version) {}
 public record Decision(@NotBlank @Pattern(regexp="APPROVED|NEEDS_CHANGES|REJECTED") String decision,@Size(max=2000) String note,Boolean allowResubmit,@NotNull Long version,@Size(max=6) List<@NotBlank String> requestedFields) {}
 public record View(Integer id,Integer userId,String userName,String userPhone,String userEmail,String targetCommune,String expectedScale,String introduction,String status,boolean allowResubmit,String reviewerNote,String reviewedBy,LocalDateTime submittedAt,LocalDateTime reviewedAt,LocalDateTime updatedAt,Long version,List<String> requestedFields) {}
 private static final Set<String> AREAS=Set.of("Tân Xã","Thạch Hòa","Bình Yên","Hạ Bằng","Đồng Trúc","Tiến Xuân","Khác");
 private static final Set<String> SCALES=Set.of("Dưới 5 phòng","5 - 15 phòng","16 - 30 phòng","31 - 50 phòng","Trên 50 phòng");
 private View view(HostApplication a){var u=a.getUser();return new View(a.getId(),u.getUserId(),u.getFullName(),u.getPhoneNumber(),u.getEmail(),a.getTargetCommune(),a.getExpectedScale(),a.getIntroduction(),a.getStatus(),a.isAllowResubmit(),a.getReviewerNote(),a.getReviewedBy()==null?null:a.getReviewedBy().getFullName(),a.getSubmittedAt(),a.getReviewedAt(),a.getUpdatedAt(),a.getVersion(),a.getRequestedFields()==null||a.getRequestedFields().isBlank()?List.of():List.of(a.getRequestedFields().split(",")));}
 @Transactional(readOnly=true) public View current(){return applications.findByUser_UserId(auth.getCurrentUser().getUserId()).map(this::view).orElse(null);}
 @Transactional public View submit(Submission input){
  var me=auth.getCurrentUser();var user=users.findForRegistrationUpdate(me.getUserId()).orElseThrow();
  if(user.getRole()!=UserRole.USER||user.getStatus()!=UserStatus.ACTIVE)throw new AppException("Chỉ người dùng đang hoạt động mới có thể đăng ký làm chủ trọ.",HttpStatus.FORBIDDEN);
  if(user.getFullName()==null||user.getFullName().isBlank()||user.getPhoneNumber()==null||!user.getPhoneNumber().matches("^(0|\\+84)[35789][0-9]{8}$"))throw new BadRequestException("Vui lòng cập nhật họ tên và số điện thoại hợp lệ tại Hồ sơ cá nhân trước khi đăng ký.");
  if(!AREAS.contains(input.targetCommune())||!SCALES.contains(input.expectedScale())||input.introduction().strip().length()<20||!Boolean.TRUE.equals(input.agreementAccepted()))throw new BadRequestException("Vui lòng kiểm tra khu vực, quy mô, lời giới thiệu và cam kết.");
  var existing=applications.findByUser_UserId(user.getUserId());
  HostApplication a=existing.orElseGet(HostApplication::new);
  if(existing.isPresent()){
   if(!Set.of("NEEDS_CHANGES","REJECTED").contains(a.getStatus())||!a.isAllowResubmit())throw new AppException("Hồ sơ hiện tại không thể gửi thêm hoặc chỉnh sửa.",HttpStatus.CONFLICT);
   if(!Objects.equals(a.getVersion(),input.version()))throw new AppException("Hồ sơ đã thay đổi. Vui lòng tải lại trang trước khi gửi.",HttpStatus.CONFLICT);
  }
  a.setUser(user);a.setTargetCommune(input.targetCommune());a.setExpectedScale(input.expectedScale());a.setIntroduction(input.introduction().strip());a.setAgreementAccepted(true);a.setStatus("PENDING_REVIEW");a.setSubmittedAt(LocalDateTime.now());a.setUpdatedAt(LocalDateTime.now());a.setReviewedBy(null);a.setReviewedAt(null);a.setReviewerNote(null);a.setRequestedFields(null);a.setAllowResubmit(true);
  return view(applications.saveAndFlush(a));
 }
 public record Stats(long total,long pending,long needsChanges,long approved,long rejected) {}
 public record Queue(List<View> content,long totalElements,int totalPages,int number,int size,Stats stats) {}
 public record Event(String action,String note,String reviewer,LocalDateTime createdAt) {}
 public record Detail(View application,List<Event> history) {}
 @Transactional(readOnly=true) public Detail detail(Integer id){
  var a=applications.findById(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hồ sơ đăng ký chủ trọ"));
  var history=logs.findByTargetTypeAndTargetIdOrderByCreatedAtDesc("HOST_APPLICATION",id).stream().map(log->new Event(log.getAction(),log.getNote(),log.getStaff().getFullName(),log.getCreatedAt())).toList();
  return new Detail(view(a),history);
 }
 @Transactional(readOnly=true) public Queue queue(String status,String search,String sort,int page,int size){
  if(status!=null&&!Set.of("ALL","PENDING_REVIEW","NEEDS_CHANGES","APPROVED","REJECTED","PROCESSED").contains(status))throw new BadRequestException("Trạng thái bộ lọc không hợp lệ");
  org.springframework.data.jpa.domain.Specification<HostApplication> spec=(root,query,cb)->{
   var predicates=new ArrayList<jakarta.persistence.criteria.Predicate>();
   if("PROCESSED".equals(status))predicates.add(root.get("status").in("APPROVED","REJECTED"));
   else if(status!=null&&!status.equals("ALL"))predicates.add(cb.equal(root.get("status"),status));
   if(search!=null&&!search.isBlank()){
    String term=search.strip().toLowerCase(java.util.Locale.ROOT);
    if(term.matches("hreg-[0-9]+")){
     try{predicates.add(cb.equal(root.get("id"),Integer.parseInt(term.substring(5))));}catch(NumberFormatException ex){predicates.add(cb.disjunction());}
    }else{
     String escaped="%"+term.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
     var user=root.join("user");
     predicates.add(cb.or(cb.like(cb.lower(user.get("fullName")),escaped,'!'),cb.like(cb.lower(user.get("email")),escaped,'!'),cb.like(cb.lower(user.get("phoneNumber")),escaped,'!')));
    }
   }
   return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
  };
  var ordering=switch(sort==null?"NEWEST":sort){case "NEWEST"->Sort.by("submittedAt").descending();case "OLDEST"->Sort.by("submittedAt");case "UPDATED"->Sort.by("updatedAt").descending();case "NAME_ASC"->Sort.by("user.fullName");default->throw new BadRequestException("Thứ tự sắp xếp không hợp lệ");};
  var result=applications.findAll(spec,PageRequest.of(Math.max(0,page),Math.max(1,Math.min(size,50)),ordering.and(Sort.by("id"))));
  var stats=new Stats(applications.count(),applications.countByStatus("PENDING_REVIEW"),applications.countByStatus("NEEDS_CHANGES"),applications.countByStatus("APPROVED"),applications.countByStatus("REJECTED"));
  return new Queue(result.map(this::view).getContent(),result.getTotalElements(),result.getTotalPages(),result.getNumber(),result.getSize(),stats);
 }
 @Transactional public View review(Integer id,Decision input){
  var reviewer=auth.getCurrentUser();
  var a=applications.findForReview(id).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy đơn đăng ký chủ trọ"));
  if(a.getUser().getUserId().equals(reviewer.getUserId()))throw new AppException("Không thể tự xét duyệt hồ sơ của mình.",HttpStatus.FORBIDDEN);
  if(!a.getStatus().equals("PENDING_REVIEW")||!Objects.equals(a.getVersion(),input.version()))throw new AppException("Hồ sơ đã được xử lý hoặc đã thay đổi. Vui lòng tải lại.",HttpStatus.CONFLICT);
  var owner=users.findForRegistrationUpdate(a.getUser().getUserId()).orElseThrow();
  if(owner.getRole()!=UserRole.USER||owner.getStatus()!=UserStatus.ACTIVE)throw new AppException("Tài khoản đăng ký không còn đủ điều kiện xét duyệt.",HttpStatus.CONFLICT);
  if(!input.decision().equals("APPROVED")&&(input.note()==null||input.note().isBlank()))throw new BadRequestException("Vui lòng nêu rõ lý do hoặc yêu cầu bổ sung.");
  var fields=input.requestedFields()==null?List.<String>of():input.requestedFields().stream().distinct().toList();
  if(fields.size()>6||!Set.of("targetCommune","expectedScale","introduction","accPhone","accFullName","accEmail").containsAll(fields))throw new BadRequestException("Mục yêu cầu bổ sung không hợp lệ");
  a.setRequestedFields(input.decision().equals("NEEDS_CHANGES")?String.join(",",fields):null);
  a.setStatus(input.decision());a.setReviewerNote(input.note()==null?null:input.note().strip());a.setReviewedBy(reviewer);a.setReviewedAt(LocalDateTime.now());a.setUpdatedAt(LocalDateTime.now());a.setAllowResubmit(!input.decision().equals("APPROVED")&&!Boolean.FALSE.equals(input.allowResubmit()));
  if(input.decision().equals("APPROVED")){owner.setRole(UserRole.ROOM_HOST);users.save(owner);}
  logs.save(ModerationLog.builder().staff(reviewer).targetType("HOST_APPLICATION").targetId(id).action(input.decision()).note(a.getReviewerNote()).build());
  return view(applications.saveAndFlush(a));
 }
}
