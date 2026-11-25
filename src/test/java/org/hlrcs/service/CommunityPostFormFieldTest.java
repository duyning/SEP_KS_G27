package org.hlrcs.service;

import jakarta.validation.Validation;
import org.hlrcs.dto.request.CommunityPostRequest;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.entity.enums.MediaType;
import org.hlrcs.exception.FieldValidationException;
import org.hlrcs.repository.PostMediaRepository;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Tests form requests against real Bean Validation and service/media rules; no HTTP/UI session. */
class CommunityPostFormFieldTest extends CommunityUnitSupport {
    @TestFactory List<DynamicTest> fields() throws Exception {
        var data=JSON.readTree(Files.readString(Path.of("target/community-form-frontend.json")));
        for(var c:data) {
            String id=c.get("id").asText(),title=c.get("title").asText();
            Map<String,Object> inputs=new LinkedHashMap<>();
            c.get("values").properties().forEach(e->inputs.put(e.getKey(),e.getValue().asText()));
            detailed("Đăng bài",c.get("flow").asText(),"CommunityService.submit",id+" "+title,inputs,c.get("frontendMessage").asText(),()->{
                assertEquals("Passed",c.get("frontendStatus").asText());
                if(!c.get("checkApi").asBoolean()) return; // Form blocked an unparseable value. No service call is claimed.
                var p=c.get("request");
                java.util.function.Function<String,String> text=k->p.has(k)&&!p.get(k).isNull()?p.get(k).asText():null;
                var req=new CommunityPostRequest(text.apply("type"),text.apply("title"),text.apply("content"),p.get("price").isNull()?null:new BigDecimal(p.get("price").asText()),text.apply("location"),text.apply("authorName"),text.apply("authorPhone"),text.apply("facebookUrl"),text.apply("zaloUrl"),List.of(),List.of(),null);
                var f=new CommunityServiceUnitTest.F();
                try(var factory=Validation.buildDefaultValidatorFactory()) {
                    var violations=factory.getValidator().validate(req);
                    if(!c.get("dtoField").isNull()) {
                        String field=c.get("dtoField").asText();
                        assertFalse(violations.isEmpty());
                        assertTrue(violations.stream().allMatch(v->v.getPropertyPath().toString().equals(field)));
                        verifyNoInteractions(f.posts,f.auto);return;
                    }
                    assertTrue(violations.isEmpty(),violations.toString());
                }
                var media=mock(PostMediaRepository.class);
                var realImages=new CommunityImageService(media,f.posts,f.auth);
                var realVideos=new CommunityVideoService(media);
                var service=new CommunityService(f.posts,f.logs,f.auth,realImages,realVideos,f.comments,JSON,f.scans,f.auto);
                var photos=photos(c.get("values").get("images").asText());
                var clips=clips(c.get("values").get("videos").asText());
                if(!c.get("serviceField").isNull()) {
                    var error=assertThrows(FieldValidationException.class,()->service.submit(req,photos,clips));
                    assertEquals(Set.of(c.get("serviceField").asText()),error.getFields().keySet());
                    verifyNoInteractions(f.auto);verify(media,never()).save(any());return;
                }
                var response=service.submit(req,photos,clips);
                assertEquals(10,response.id());assertEquals(1,response.authorId());assertEquals("PENDING",response.status());
                assertEquals(req.title(),response.title());assertEquals(req.content(),response.content());assertEquals(req.type(),response.type());
                assertEquals(req.price(),response.price());assertEquals(req.location(),response.location());assertEquals(req.authorName(),response.authorName());
                assertEquals(req.authorPhone(),response.authorPhone());assertEquals(req.facebookUrl(),response.facebookUrl());assertEquals(req.zaloUrl(),response.zaloUrl());
                verify(f.posts).saveAndFlush(any());verify(f.auto).enqueue(any());
                verify(media,times(photos.size())).save(argThat(m->m.getMediaType()==MediaType.IMAGE&&m.getFileContent().length>0));
                verify(media,times(clips.size())).save(argThat(m->m.getMediaType()==MediaType.VIDEO&&m.getFileContent().length>0));
            });
        }
        return cases;
    }
    static List<MultipartFile> photos(String profile)throws Exception {
        if(profile.equals("none"))return List.of();
        int count=profile.equals("six")?6:profile.equals("seven")?7:1;
        var out=new ArrayList<MultipartFile>();
        for(int i=0;i<count;i++) {
            String ext=profile.equals("jpg")?"jpg":profile.equals("gif")?"gif":"png";
            byte[] data=profile.equals("empty")?new byte[0]:profile.equals("corrupt")?new byte[]{1,2,3}:CommunityMediaUnitTest.image(profile.equals("jpg")?"jpg":"png",profile.equals("wide")?10001:32,32);
            MultipartFile file=new MockMultipartFile("photos","phong-"+(i+1)+"."+ext,profile.equals("jpg")?"image/jpeg":profile.equals("gif")?"image/gif":"image/png",data);
            if(profile.startsWith("size-")){file=spy(file);doReturn(CommunityImageService.MAX_BYTES+(profile.equals("size-over")?1:0)).when(file).getSize();}
            out.add(file);
        }return out;
    }
    static List<MultipartFile> clips(String profile)throws Exception {
        if(profile.equals("none"))return List.of();
        byte[] data=profile.equals("empty")?new byte[0]:profile.equals("corrupt")?new byte[]{1,2,3}:CommunityMediaUnitTest.video(32,32,profile.equals("duration-limit")?180:profile.equals("duration-over")?181:1);
        MultipartFile file=new MockMultipartFile("videos","phong-1."+(profile.equals("mov")?"mov":"mp4"),profile.equals("mov")?"video/quicktime":"video/mp4",data);
        if(profile.startsWith("size-")){file=spy(file);doReturn(CommunityVideoService.MAX_BYTES+(profile.equals("size-over")?1:0)).when(file).getSize();}
        return profile.equals("two")?List.of(file,file):List.of(file);
    }
}
