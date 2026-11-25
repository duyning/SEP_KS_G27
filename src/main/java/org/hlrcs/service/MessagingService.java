package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class MessagingService {
    private final DirectConversationRepository conversations;
    private final DirectMessageRepository messages;
    private final UserRepository users;
    private final AuthService auth;
    private final ApplicationEventPublisher events;
    private final List<MessagingContextResolver> resolvers;
    private final MessagingMediaService media;

    public record Context(String kind,Integer referenceId) {}
    public record Reference(String kind,Integer referenceId,String title,String url,boolean available,Integer imageId,String subtitle) {}
    public record Peer(Integer id,String name,boolean active) {}
    public record Reply(Long id,long sequence,Integer senderId,String senderName,String content) {}
    public record Message(Long id,long sequence,Integer senderId,String clientMessageId,String content,LocalDateTime createdAt,Reference context,Reply replyTo,List<MessagingMediaService.Attachment> attachments) {}
    public record Conversation(Long id,Peer peer,long unreadCount,long lastSequence,long readSequence,long peerReadSequence,
                               String lastMessage,LocalDateTime updatedAt) {}
    public record Opened(Conversation conversation,Reference context) {}
    public record Inbox(List<Conversation> items,boolean hasMore,long unreadCount) {}
    public record History(Conversation conversation,List<Message> items,boolean hasMore) {}

    private User viewer() {
        User user=auth.getCurrentUser();
        if(user.getStatus()!=UserStatus.ACTIVE) throw new AppException("Tài khoản không hoạt động.",HttpStatus.FORBIDDEN);
        return user;
    }
    private DirectConversation owned(Long id,Integer viewer,boolean lock) {
        var c=(lock?conversations.lock(id):conversations.findById(id)).orElseThrow(()->new ResourceNotFoundException("Không tìm thấy hội thoại."));
        if(!c.getLowUser().getUserId().equals(viewer)&&!c.getHighUser().getUserId().equals(viewer))
            throw new ResourceNotFoundException("Không tìm thấy hội thoại.");
        return c;
    }
    private boolean low(DirectConversation c,Integer id){return c.getLowUser().getUserId().equals(id);}
    private User peer(DirectConversation c,Integer id){return low(c,id)?c.getHighUser():c.getLowUser();}
    private long read(DirectConversation c,Integer id){return low(c,id)?c.getLowReadSequence():c.getHighReadSequence();}
    private Conversation view(DirectConversation c,Integer id) {
        User other=peer(c,id);
        return new Conversation(c.getId(),new Peer(other.getUserId(),other.getFullName()==null?"Tài khoản":other.getFullName(),other.getStatus()==UserStatus.ACTIVE),
                messages.unreadIn(c.getId(),id,read(c,id)),c.getLastSequence(),read(c,id),read(c,other.getUserId()),
                messages.findFirstByConversation_IdOrderBySequenceNumberDesc(c.getId()).map(m->m.getContent().isEmpty()?"Đã gửi tệp đính kèm":m.getContent()).orElse("Chưa có tin nhắn"),c.getUpdatedAt());
    }
    private Reference reference(Context context,Integer viewer,Integer peer,boolean sending) {
        if(context==null)return null;
        if(context.referenceId()==null||context.referenceId()<1)throw new BadRequestException("Tham chiếu không hợp lệ.");
        return resolvers.stream().filter(r->r.kind().equals(context.kind())).findFirst()
                .orElseThrow(()->new BadRequestException("Loại tham chiếu chưa được hỗ trợ.")).resolve(context.referenceId(),viewer,peer,sending);
    }
    private Message message(DirectMessage m,Integer viewer,Integer other) {
        var parent=m.getReplyTo();
        var reply=parent==null?null:new Reply(parent.getId(),parent.getSequenceNumber(),parent.getSender().getUserId(),parent.getSender().getFullName(),
                parent.getContent().isEmpty()?"Tệp đính kèm":parent.getContent().substring(0,Math.min(180,parent.getContent().length())));
        return new Message(m.getId(),m.getSequenceNumber(),m.getSender().getUserId(),m.getClientMessageId(),m.getContent(),m.getCreatedAt(),
                reference(m.getContextKind()==null?null:new Context(m.getContextKind(),m.getContextReferenceId()),viewer,other,false),reply,media.metadata(m.getId()));
    }
    private void changed(DirectConversation c){events.publishEvent(new MessagingChanged(c.getId(),c.getLowUser().getUserId(),c.getHighUser().getUserId()));}

    @Transactional
    public Opened open(Integer recipientId,Context context) {
        User user=viewer();
        if(recipientId==null||recipientId.equals(user.getUserId()))throw new BadRequestException("Hãy chọn một tài khoản khác để nhắn tin.");
        User other=users.findById(recipientId).filter(u->u.getStatus()==UserStatus.ACTIVE)
                .orElseThrow(()->new ResourceNotFoundException("Không thể liên hệ tài khoản này."));
        Reference ref=reference(context,user.getUserId(),recipientId,true);
        int low=Math.min(user.getUserId(),recipientId),high=Math.max(user.getUserId(),recipientId);
        // Serialize creation on the same canonical member, including the first conversation.
        users.findForRegistrationUpdate(low).orElseThrow(()->new ResourceNotFoundException("Không thể mở hội thoại."));
        var c=conversations.findByLowUser_UserIdAndHighUser_UserId(low,high).orElseGet(()->{
            LocalDateTime now=LocalDateTime.now();
            return conversations.save(DirectConversation.builder().lowUser(low==user.getUserId()?user:other)
                    .highUser(high==user.getUserId()?user:other).createdAt(now).updatedAt(now).build());
        });
        return new Opened(view(c,user.getUserId()),ref);
    }
    @Transactional(readOnly=true)
    public Inbox inbox(int page,String query) {
        User user=viewer();
        if(page<0||page>100000||query==null||query.length()>100)throw new BadRequestException("Bộ lọc không hợp lệ.");
        String term="%"+query.strip().toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        var rows=conversations.inbox(user.getUserId(),term,PageRequest.of(page,20));
        return new Inbox(rows.stream().map(c->view(c,user.getUserId())).toList(),rows.hasNext(),messages.unread(user.getUserId()));
    }
    @Transactional(readOnly=true)
    public History history(Long id,long before) {
        User user=viewer();var c=owned(id,user.getUserId(),false);
        if(before<1)throw new BadRequestException("Mốc tin nhắn không hợp lệ.");
        var rows=messages.history(id,before,PageRequest.of(0,51));
        boolean more=rows.size()>50;
        var result=new ArrayList<>(rows.subList(0,Math.min(50,rows.size())));Collections.reverse(result);
        return new History(view(c,user.getUserId()),result.stream().map(m->message(m,user.getUserId(),peer(c,user.getUserId()).getUserId())).toList(),more);
    }
    @Transactional
    public Message send(Long id,String clientKey,String text,Context context) {
        return send(id,clientKey,text,context,null,List.of());
    }
    @Transactional
    public Message send(Long id,String clientKey,String text,Context context,Long replyToId,List<org.springframework.web.multipart.MultipartFile> files) {
        User user=viewer();var c=owned(id,user.getUserId(),true);
        if(clientKey==null||!clientKey.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"))
            throw new BadRequestException("Mã gửi tin không hợp lệ.");
        clientKey=clientKey.toLowerCase(Locale.ROOT);
        String content=text==null?"":text.strip();
        var uploads=media.validate(files);
        if(content.isEmpty()&&uploads.isEmpty()||content.length()>2000||content.chars().anyMatch(ch->ch<32&&ch!='\n'&&ch!='\t'))
            throw new BadRequestException("Tin nhắn cần từ 1–2.000 ký tự.");
        var previous=messages.findByConversation_IdAndSender_UserIdAndClientMessageId(id,user.getUserId(),clientKey);
        if(previous.isPresent()) {
            var m=previous.get();
            if(!m.getContent().equals(content)||!Objects.equals(m.getContextKind(),context==null?null:context.kind())
                    ||!Objects.equals(m.getContextReferenceId(),context==null?null:context.referenceId())
                    ||!Objects.equals(m.getReplyTo()==null?null:m.getReplyTo().getId(),replyToId)||!media.matches(m.getId(),uploads))
                throw new AppException("Mã gửi này đã được dùng cho một nội dung khác.",HttpStatus.CONFLICT);
            return message(m,user.getUserId(),peer(c,user.getUserId()).getUserId());
        }
        User other=peer(c,user.getUserId());
        if(other.getStatus()!=UserStatus.ACTIVE)throw new AppException("Tài khoản này hiện không nhận tin nhắn.",HttpStatus.FORBIDDEN);
        reference(context,user.getUserId(),other.getUserId(),true);
        DirectMessage replyTo=replyToId==null?null:messages.findById(replyToId)
                .filter(m->m.getConversation().getId().equals(id))
                .orElseThrow(()->new BadRequestException("Tin nhắn trả lời không thuộc hội thoại này."));
        c.setLastSequence(c.getLastSequence()+1);c.setUpdatedAt(LocalDateTime.now());
        var m=messages.save(DirectMessage.builder().conversation(c).sender(user).sequenceNumber(c.getLastSequence())
                .clientMessageId(clientKey).content(content).contextKind(context==null?null:context.kind())
                .contextReferenceId(context==null?null:context.referenceId()).replyTo(replyTo).createdAt(c.getUpdatedAt()).build());
        media.save(m,uploads);
        changed(c);return message(m,user.getUserId(),other.getUserId());
    }
    @Transactional(readOnly=true)
    public CommunityImageService.ImageContent attachment(Long id,Long attachmentId){
        User user=viewer();owned(id,user.getUserId(),false);return media.content(id,attachmentId);
    }
    @Transactional
    public Conversation markRead(Long id,long through) {
        User user=viewer();var c=owned(id,user.getUserId(),true);
        if(through<0||through>c.getLastSequence())throw new BadRequestException("Mốc đã đọc không hợp lệ.");
        if(through>read(c,user.getUserId())){
            if(low(c,user.getUserId()))c.setLowReadSequence(through);else c.setHighReadSequence(through);
            changed(c);
        }
        return view(c,user.getUserId());
    }
}
