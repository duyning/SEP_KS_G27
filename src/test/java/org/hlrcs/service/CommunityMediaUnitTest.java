package org.hlrcs.service;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.entity.enums.MediaType;
import org.hlrcs.repository.*;
import org.hlrcs.exception.FieldValidationException;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import java.nio.*;
import java.io.*;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import org.jcodec.api.SequenceEncoder;
import org.jcodec.common.io.ByteBufferSeekableByteChannel;
import org.jcodec.common.model.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityMediaUnitTest extends CommunityUnitSupport {
    static byte[] image(String format,int w,int h)throws IOException {var o=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(w,h,BufferedImage.TYPE_INT_RGB),format,o);return o.toByteArray();}
    static byte[] video(int w,int h,int seconds)throws Exception{var channel=ByteBufferSeekableByteChannel.writeToByteBuffer(ByteBuffer.allocate(1024*1024));var encoder=SequenceEncoder.createWithFps(channel,Rational.R(1,seconds));encoder.encodeNativeFrame(Picture.create(w,h,ColorSpace.RGB));encoder.finish();var data=channel.getContents();byte[] b=new byte[data.remaining()];data.get(b);return b;}
    static class F {
        PostMediaRepository media=mock(PostMediaRepository.class);PostRepository posts=mock(PostRepository.class);AuthService auth=mock(AuthService.class);
        CommunityImageService images=new CommunityImageService(media,posts,auth);CommunityVideoService videos=new CommunityVideoService(media);Post p=post();
        PostMedia row=PostMedia.builder().mediaId(8).post(p).mediaType(MediaType.IMAGE).fileName("a.png").contentType("image/png").fileContent(new byte[]{1,2}).build();
        PostMediaRepository.Metadata meta=mock(PostMediaRepository.Metadata.class);
        F(){when(meta.getMediaId()).thenReturn(8);when(meta.getFileName()).thenReturn("a.png");when(posts.findById(10)).thenReturn(Optional.of(p));when(media.findById(8)).thenReturn(Optional.of(row));when(auth.getCurrentUser()).thenReturn(p.getAuthor());}
    }
    @TestFactory List<DynamicTest> mediaCases(){
        for(String format:List.of("png","jpg","jpeg"))add("CommunityImageService.validate","Normal","valid "+format+" 1x1 image; uppercase MIME/extension; unsafe filename","Accept real bytes, normalize MIME and sanitize filename",()->{
            var r=CommunityImageService.validate(new MockMultipartFile("images","folder/evil\\A."+format.toUpperCase(),format.equals("png")?"IMAGE/PNG":"IMAGE/JPEG",image(format.equals("png")?"png":"jpg",1,1)),"images");assertTrue(r.bytes().length>0);assertFalse(r.fileName().contains("/"));assertEquals(format.equals("png")?"image/png":"image/jpeg",r.contentType());
        });
        for(String c:List.of("empty","over-size","jpg-wrong-mime","jpeg-wrong-mime","png-wrong-mime","wrong-extension","no-mime","no-name","corrupt","png-as-jpg","jpg-as-png","io-error","wide","tall","pixels","long-name"))add("CommunityImageService.validate","Boundary",c,"Reject bad metadata/content/dimensions/IO; sanitized name capped at 200",()->{
            byte[] bytes=image("png",1,1);String name="a.png",mime="image/png";long size=-1;switch(c){case "empty"->bytes=new byte[0];case "over-size"->size=CommunityImageService.MAX_BYTES+1;case "jpg-wrong-mime"->name="a.jpg";case "jpeg-wrong-mime"->name="a.jpeg";case "png-wrong-mime"->mime="image/jpeg";case "wrong-extension"->name="a.gif";case "no-mime"->mime=null;case "no-name"->name=null;case "corrupt"->bytes=new byte[]{1,2};case "png-as-jpg"->{name="a.jpg";mime="image/jpeg";}case "jpg-as-png"->bytes=image("jpg",1,1);case "wide"->bytes=image("png",10001,1);case "tall"->bytes=image("png",1,10001);case "pixels"->bytes=image("png",5000,4001);case "long-name"->name="a".repeat(196)+".png";}
            MultipartFile file=new MockMultipartFile("images",name,mime,bytes);if(size>0){file=spy(file);doReturn(size).when(file).getSize();}if(c.equals("io-error")){file=spy(file);doThrow(new IOException()).when(file).getBytes();}
            var upload=file;if(c.equals("long-name"))assertEquals(200,CommunityImageService.validate(upload,"images").fileName().length());else assertThrows(FieldValidationException.class,()->CommunityImageService.validate(upload,"images"));
        });
        for(String c:List.of("size-exact","width-exact","height-exact","pixels-exact"))add("CommunityImageService.validate","Boundary",c,"Exact byte/dimension/pixel limits accepted",()->{
            MultipartFile file=new MockMultipartFile("images","a.png","image/png",image("png",c.equals("width-exact")?10000:c.equals("pixels-exact")?5000:1,c.equals("height-exact")?10000:c.equals("pixels-exact")?4000:1));if(c.equals("size-exact")){file=spy(file);doReturn(CommunityImageService.MAX_BYTES).when(file).getSize();}assertNotNull(CommunityImageService.validate(file,"images"));
        });
        for(boolean video:List.of(false,true)){
            String cls=video?"CommunityVideoService":"CommunityImageService";
            add(cls+".metadata","Normal","one repository metadata row","Map media ID and filename; query correct media type",()->{F f=new F();when(f.media.findByPost_PostIdAndMediaTypeAndFileContentIsNotNullOrderByMediaIdAsc(10,video?MediaType.VIDEO:MediaType.IMAGE)).thenReturn(List.of(f.meta));assertEquals(8,(video?f.videos.metadata(10):f.images.metadata(10)).get(0).id());});
            for(String state:List.of("null-lists","keep","remove","duplicate","foreign","too-many","new-file","invalid-file","empty-existing"))add(cls+".replace","Normal",state,"Retain/remove/upload limits; validate before deleting; correct media type persisted",()->{
                F f=new F();f.row.setMediaType(video?MediaType.VIDEO:MediaType.IMAGE);when(f.media.findByPost_PostIdAndMediaTypeAndFileContentIsNotNullOrderByMediaIdAsc(10,f.row.getMediaType())).thenReturn(state.equals("empty-existing")?List.of():List.of(f.meta));
                List<Integer> keep=null;List<MultipartFile> files=null;switch(state){case "keep"->keep=List.of(8);case "remove"->keep=List.of();case "duplicate"->keep=List.of(8,8);case "foreign"->keep=List.of(9);case "too-many"->files=Collections.nCopies(video?1:6,mock(MultipartFile.class));case "new-file"->{keep=List.of();files=List.of(new MockMultipartFile("upload",video?"a.mp4":"a.png",video?"video/mp4":"image/png",video?video(32,32,1):image("png",1,1)));}case "invalid-file"->{keep=List.of();files=List.of(new MockMultipartFile("x","a.bad","bad",new byte[]{1}));}}
                var retained=keep;var uploads=files;if(Set.of("duplicate","foreign","too-many","invalid-file").contains(state)){assertThrows(FieldValidationException.class,()->{if(video)f.videos.replace(f.p,retained,uploads);else f.images.replace(f.p,retained,uploads);});verify(f.media,never()).deleteById(any());verify(f.media,never()).save(any());}
                else{if(video)f.videos.replace(f.p,keep,files);else f.images.replace(f.p,keep,files);if(state.equals("remove")||state.equals("new-file"))verify(f.media).deleteById(8);else verify(f.media,never()).deleteById(any());if(state.equals("new-file"))verify(f.media).save(argThat(m->m.getMediaType()==(video?MediaType.VIDEO:MediaType.IMAGE)&&m.getFileContent().length>0));verify(f.media).flush();}
            });
        }
        for(String condition:List.of("public","no-auth","unauthenticated","anonymous","owner","stranger","staff","admin","post-missing","media-missing","wrong-post","wrong-type","null-content"))add("CommunityImageService.content","Abnormal",condition,"Public or authenticated owner/staff/admin can read matching media; every other path =>404",()->{
            F f=new F();SecurityContextHolder.clearContext();try{
                if(condition.equals("public"))f.p.setStatus(PostStatus.APPROVED);else if(!condition.equals("no-auth"))SecurityContextHolder.getContext().setAuthentication(condition.equals("anonymous")?new AnonymousAuthenticationToken("key","anon",List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))):condition.equals("unauthenticated")?new UsernamePasswordAuthenticationToken("u","p"):UsernamePasswordAuthenticationToken.authenticated("u","p",List.of()));
                if(condition.equals("stranger"))when(f.auth.getCurrentUser()).thenReturn(user(2,UserRole.USER));if(condition.equals("staff"))when(f.auth.getCurrentUser()).thenReturn(user(2,UserRole.STAFF));if(condition.equals("admin"))when(f.auth.getCurrentUser()).thenReturn(user(2,UserRole.ADMIN));
                if(condition.equals("post-missing"))when(f.posts.findById(10)).thenReturn(Optional.empty());if(condition.equals("media-missing"))when(f.media.findById(8)).thenReturn(Optional.empty());if(condition.equals("wrong-post")){Post p=post();p.setPostId(11);f.row.setPost(p);}if(condition.equals("wrong-type"))f.row.setMediaType(MediaType.VIDEO);if(condition.equals("null-content"))f.row.setFileContent(null);
                if(Set.of("public","owner","staff","admin").contains(condition))assertArrayEquals(new byte[]{1,2},f.images.image(10,8).bytes());else status(404,()->f.images.content(10,8,MediaType.IMAGE));
            }finally{SecurityContextHolder.clearContext();}
        });
        for(String c:List.of("valid","empty","over-size","exact-size","extension","mime","null-name","null-mime","fake","truncated","long","exact-duration","wide","io-error"))add("CommunityVideoService.validate","Boundary",c,"Accept real H264 MP4 and exact limits; reject invalid metadata, duration, dimensions, corrupt content and IO",()->{
            F f=new F();String name="a.mp4",mime="video/mp4";byte[] b=video(32,32,c.equals("long")?181:c.equals("exact-duration")?180:1);switch(c){case "empty"->b=new byte[0];case "extension"->name="a.mov";case "mime"->mime="application/octet-stream";case "null-name"->name=null;case "null-mime"->mime=null;case "fake"->b=new byte[]{1};case "truncated"->b=Arrays.copyOf(b,b.length-20);case "wide"->b=video(1936,16,1);}
            MultipartFile file=new MockMultipartFile("videos",name,mime,b);if(c.equals("over-size")||c.equals("exact-size")){file=spy(file);doReturn(CommunityVideoService.MAX_BYTES+(c.equals("over-size")?1:0)).when(file).getSize();}if(c.equals("io-error")){file=spy(file);doThrow(new IOException()).when(file).getBytes();}
            var upload=file;if(Set.of("valid","exact-size","exact-duration").contains(c)){f.videos.replace(f.p,List.of(),List.of(upload));verify(f.media).save(argThat(r->r.getContentType().equals("video/mp4")));}else assertThrows(FieldValidationException.class,()->f.videos.replace(f.p,List.of(),List.of(upload)));
        });
        for(String c:List.of("empty","short-header","short-extended","too-small","too-long","ftyp-short","bad-brand","missing-moov","empty-mdat","trailing-byte","zero-length","extended-valid","valid"))add("CommunityVideoService.validateContainer","Boundary",c,"MP4 atom length/brand/presence constraints; valid normal, zero and 64-bit atom sizes",()->{
            var out=new ByteArrayOutputStream();var data=new DataOutputStream(out);boolean ok=Set.of("zero-length","extended-valid","valid").contains(c);
            if(c.equals("empty")){}else if(c.equals("short-header"))data.write(new byte[]{1});else if(c.equals("short-extended")){data.writeInt(1);data.writeBytes("moov");}else if(c.equals("too-small")){data.writeInt(7);data.writeBytes("moov");}else if(c.equals("too-long")){data.writeInt(999);data.writeBytes("moov");}else{
                data.writeInt(c.equals("ftyp-short")?8:16);data.writeBytes("ftyp");if(!c.equals("ftyp-short")){data.writeBytes(c.equals("bad-brand")?"BAD!":"isom");data.writeInt(0);}if(!c.equals("missing-moov")){data.writeInt(c.equals("extended-valid")?1:8);data.writeBytes("moov");if(c.equals("extended-valid"))data.writeLong(16);}
                data.writeInt(c.equals("zero-length")?0:c.equals("empty-mdat")?8:9);data.writeBytes("mdat");if(!c.equals("empty-mdat"))data.writeByte(0);if(c.equals("trailing-byte"))data.writeByte(0);
            }
            F f=new F();if(ok)assertDoesNotThrow(()->ReflectionTestUtils.invokeMethod(f.videos,"validateContainer",out.toByteArray()));else assertThrows(IllegalArgumentException.class,()->ReflectionTestUtils.invokeMethod(f.videos,"validateContainer",out.toByteArray()));
        });
        return cases;
    }
}
