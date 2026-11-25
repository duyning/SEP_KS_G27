package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.*;
import org.hlrcs.repository.DirectMessageAttachmentRepository;
import org.hlrcs.exception.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@Service @RequiredArgsConstructor
public class MessagingMediaService {
    private final DirectMessageAttachmentRepository attachments;
    private final CommunityVideoService videos;
    public record Attachment(Long id,String type,String fileName,String contentType,long size) {}
    public record Upload(String type,String fileName,String contentType,String digest,byte[] bytes) {}
    public List<Upload> validate(List<MultipartFile> files) {
        if(files==null||files.isEmpty())return List.of();
        long total=0;int images=0,videoCount=0;
        for(var file:files){
            if(file==null)throw new BadRequestException("Tệp đính kèm không hợp lệ.");
            if("video/mp4".equalsIgnoreCase(file.getContentType()))videoCount++;else images++;
            total+=file.getSize();
        }
        if(images>6||videoCount>1||total>80L*1024*1024)throw new BadRequestException("Mỗi tin nhắn tối đa 6 ảnh và 1 video, tổng không quá 80 MB.");
        return files.stream().map(file->{
            boolean video="video/mp4".equalsIgnoreCase(file.getContentType());
            var valid=video?videos.validate(file):CommunityImageService.validate(file,"files");
            try{return new Upload(video?"VIDEO":"IMAGE",valid.fileName(),valid.contentType(),
                HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(valid.bytes())),valid.bytes());}
            catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
        }).toList();
    }
    public List<Attachment> metadata(Long messageId){return attachments.metadata(messageId).stream()
        .map(a->new Attachment(a.getId(),a.getType(),a.getFileName(),a.getContentType(),a.getByteSize())).toList();}
    public boolean matches(Long messageId,List<Upload> files){
        var stored=attachments.metadata(messageId);if(stored.size()!=files.size())return false;
        for(int i=0;i<stored.size();i++)if(!stored.get(i).getDigest().equals(files.get(i).digest())
            ||!stored.get(i).getFileName().equals(files.get(i).fileName())||!stored.get(i).getType().equals(files.get(i).type()))return false;
        return true;
    }
    public void save(DirectMessage message,List<Upload> files){for(var file:files)attachments.save(DirectMessageAttachment.builder()
        .message(message).type(file.type()).fileName(file.fileName()).contentType(file.contentType())
        .byteSize(file.bytes().length).digest(file.digest()).content(file.bytes()).build());attachments.flush();}
    public CommunityImageService.ImageContent content(Long conversationId,Long attachmentId){
        var file=attachments.findById(attachmentId).filter(a->a.getMessage().getConversation().getId().equals(conversationId))
            .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy tệp trong hội thoại."));
        return new CommunityImageService.ImageContent(file.getContent(),file.getContentType(),file.getFileName());
    }
}
