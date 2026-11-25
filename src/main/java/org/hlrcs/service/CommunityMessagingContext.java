package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.entity.Post;
import org.hlrcs.entity.enums.PostStatus;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.repository.PostRepository;
import org.hlrcs.repository.PostMediaRepository;
import org.hlrcs.entity.enums.MediaType;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor
public class CommunityMessagingContext implements MessagingContextResolver {
    private final PostRepository posts;
    private final PostMediaRepository media;
    public String kind() { return "COMMUNITY_POST"; }
    public MessagingService.Reference resolve(Integer id,Integer viewer,Integer peer,boolean sending) {
        Post post=(sending?posts.findForReview(id):posts.findById(id)).orElse(null);
        boolean participant=post!=null && (post.getAuthor().getUserId().equals(viewer)||post.getAuthor().getUserId().equals(peer));
        boolean visible=participant && (post.getStatus()==PostStatus.APPROVED||!sending&&post.getAuthor().getUserId().equals(viewer));
        if(sending && (!visible||post.getStatus()!=PostStatus.APPROVED))
            throw new BadRequestException("Bài viết không còn công khai hoặc không thuộc người đang trò chuyện.");
        if(!visible) return new MessagingService.Reference(kind(),id,"Bài viết không còn khả dụng",null,false,null,null);
        String path="/community"+(post.getAuthor().getUserId().equals(viewer)?"?view=mine":"")+"#post-"+id;
        Integer image=media.findByPost_PostIdAndMediaTypeAndFileContentIsNotNullOrderByMediaIdAsc(id,MediaType.IMAGE)
                .stream().findFirst().map(PostMediaRepository.Metadata::getMediaId).orElse(null);
        String price=post.getPrice()==null?"Thỏa thuận":java.text.NumberFormat.getNumberInstance(java.util.Locale.forLanguageTag("vi-VN")).format(post.getPrice())+" đ";
        return new MessagingService.Reference(kind(),id,post.getTitle(),path,true,image,price);
    }
}
