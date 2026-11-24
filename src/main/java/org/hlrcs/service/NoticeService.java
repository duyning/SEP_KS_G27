package org.hlrcs.service;
import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.repository.*;
import org.hlrcs.exception.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import java.time.*;
import java.util.*;
@Service @RequiredArgsConstructor
public class NoticeService {
 private final UserNoticeRepository notices;
 private final ViewingNotificationRepository viewings;
 private final AuthService auth;
 private final ApplicationEventPublisher events;
 public record Item(String id,String category,String kind,String title,String content,String quote,String target,
   Integer referenceId,Integer postId,Integer commentId,boolean read,LocalDateTime createdAt) {}
 public record Feed(List<Item> items,String nextCursor,long unreadCount,Map<String,Long> counts) {}
 @Transactional
 public void send(User recipient,String category,String kind,String title,String content,String quote,String target,Integer reference,Integer post,Integer comment) {
  var n=new UserNotice(); n.setRecipient(recipient); n.setCategory(category);n.setKind(kind);n.setTitle(title==null||title.isBlank()?"Thông báo":title.substring(0,Math.min(255,title.length())));
  n.setContent(trim(content));n.setQuote(trim(quote));n.setTarget(target);n.setReferenceId(reference);n.setPostId(post);n.setCommentId(comment);
  n.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));notices.save(n);
  events.publishEvent(new ViewingUpdates.Changed(recipient.getUserId()));
 }
 private String trim(String value){return value==null?null:value.substring(0,Math.min(4000,value.length()));}
 private Item item(UserNotice n){return new Item("n"+n.getId(),n.getCategory(),n.getKind(),n.getTitle(),n.getContent(),n.getQuote(),n.getTarget(),n.getReferenceId(),n.getPostId(),n.getCommentId(),n.isRead(),n.getCreatedAt());}
 private Item item(ViewingNotification n){var b=n.getBooking();boolean host=b.getRoomType().getProperty().getOwner().getUserId().equals(auth.getCurrentUser().getUserId());return new Item("v"+n.getNotificationId(),"VIEWING",n.getEvent().name(),b.getRoomType().getProperty().getName(),n.getContent(),null,(host?"/host/viewings?id=":"/bookings?id=")+b.getBookingId(),b.getBookingId(),null,null,n.isRead(),n.getCreatedAt());}
 private List<Item> all(){int id=auth.getCurrentUser().getUserId();var rows=new ArrayList<Item>();notices.findByRecipient_UserId(id).forEach(n->rows.add(item(n)));viewings.findAllByRecipient_UserId(id).forEach(n->rows.add(item(n)));rows.sort(Comparator.comparing(Item::createdAt).thenComparing(Item::id).reversed());return rows;}
 @Transactional(readOnly=true)
 public Feed feed(String category,String kind,String q,String before){
  if(q.length()>100)throw new BadRequestException("Từ khóa tối đa 100 ký tự.");
  var rows=all();var counts=new HashMap<String,Long>();counts.put("ALL",(long)rows.size());
  for(var n:rows){counts.merge(n.category(),1L,Long::sum);if(!n.read())counts.merge("UNREAD",1L,Long::sum);}
  LocalDateTime time=null;String key="";
  if(!before.isBlank())try{var parts=before.split("\\|",2);time=LocalDateTime.parse(parts[0]);key=parts[1];}catch(Exception e){throw new BadRequestException("Con trỏ không hợp lệ.");}
  final var cutoff=time;final var tie=key;String search=q.strip().toLowerCase(Locale.ROOT);
  var selected=rows.stream().filter(n->category.equals("ALL")||(category.equals("UNREAD")?!n.read():n.category().equals(category)))
   .filter(n->kind.isBlank()||n.kind().equals(kind)).filter(n->(n.title()+" "+n.content()+" #"+n.referenceId()).toLowerCase(Locale.ROOT).contains(search))
   .filter(n->cutoff==null||n.createdAt().isBefore(cutoff)||(n.createdAt().equals(cutoff)&&n.id().compareTo(tie)<0)).limit(21).toList();
  var page=selected.stream().limit(20).toList();var last=page.isEmpty()?null:page.get(page.size()-1);
  return new Feed(page,selected.size()>20?last.createdAt()+"|"+last.id():null,counts.getOrDefault("UNREAD",0L),counts);
 }
 @Transactional public Item read(String key){int user=auth.getCurrentUser().getUserId();try{
  if(key.startsWith("v")){var n=viewings.findByNotificationIdAndRecipient_UserId(Integer.parseInt(key.substring(1)),user).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy thông báo."));n.setRead(true);changed();return item(n);}
  if(key.startsWith("n")){var n=notices.findByIdAndRecipient_UserId(Long.parseLong(key.substring(1)),user).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy thông báo."));n.setRead(true);changed();return item(n);}
 }catch(NumberFormatException ex){throw new BadRequestException("Mã thông báo không hợp lệ.");}throw new ResourceNotFoundException("Không tìm thấy thông báo.");}
 @Transactional public void readAll(){int user=auth.getCurrentUser().getUserId();notices.findByRecipient_UserId(user).forEach(n->n.setRead(true));viewings.findAllByRecipient_UserId(user).forEach(n->n.setRead(true));changed();}
 @Transactional(readOnly=true) public org.hlrcs.dto.response.ViewingResponses.Viewing viewing(String key){
  if(!key.matches("v[0-9]+"))throw new BadRequestException("Không phải thông báo lịch hẹn.");
  var n=viewings.findByNotificationIdAndRecipient_UserId(Integer.parseInt(key.substring(1)),auth.getCurrentUser().getUserId()).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy thông báo."));
  return org.hlrcs.dto.response.ViewingResponses.Viewing.from(n.getBooking());
 }
 private void changed(){events.publishEvent(new ViewingUpdates.Changed(auth.getCurrentUser().getUserId()));}
}
