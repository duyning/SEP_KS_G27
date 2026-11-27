package org.hlrcs.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.exception.AppException;
import org.hlrcs.exception.BadRequestException;
import org.hlrcs.repository.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.data.domain.*;
import org.springframework.security.authentication.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Direct service invocation only: no Spring context, controller, HTTP, database or transaction proxy.
 * UTC IDs map one-to-one to service-rating-unit-cases.json and the workbook columns.
 */
class ServiceRatingFlowUnitTest {
    record Scenario(JsonNode data) {
        @Override public String toString() { return data.path("id").asText() + " " + data.path("op").asText() + " " + data.path("label").asText(); }
    }
    static Stream<Scenario> scenarios() throws IOException {
        try (var in = ServiceRatingFlowUnitTest.class.getResourceAsStream("/service-rating-unit-cases.json")) {
            var result = new ArrayList<Scenario>();
            new ObjectMapper().readTree(Objects.requireNonNull(in)).forEach(c -> result.add(new Scenario(c)));
            return result.stream();
        }
    }
    static <T> T mockType(Class<T> type) { return mock(type, withSettings().mockMaker("mock-maker-subclass")); }
    static String str(JsonNode n, String key) { return n.path(key).isNull() ? null : n.path(key).asText(); }
    static boolean flag(JsonNode n, String key, boolean fallback) { return n.has(key) ? n.get(key).asBoolean() : fallback; }
    static String value(JsonNode n, String key, String fallback) { return n.has(key) ? str(n,key) : fallback; }
    static byte[] bytes(JsonNode f) {
        byte[] result = new byte[f.path("size").asInt()];
        byte[] header = switch (f.path("signature").asText()) {
            case "jpeg" -> new byte[]{(byte)255,(byte)216,(byte)255};
            case "png" -> new byte[]{(byte)137,80,78,71,13,10,26,10};
            case "webp" -> new byte[]{82,73,70,70,0,0,0,0,87,69,66,80};
            default -> new byte[]{0};
        };
        System.arraycopy(header,0,result,0,Math.min(header.length,result.length));
        if(f.has("corrupt")) result[f.get("corrupt").asInt()] ^= 1;
        return result;
    }
    static List<MultipartFile> files(JsonNode input) throws IOException {
        if(input.isNull()) return null;
        var list = new ArrayList<MultipartFile>();
        for(var f:input) {
            var file=mockType(MultipartFile.class);
            when(file.isEmpty()).thenReturn(f.path("size").asInt()==0);
            when(file.getSize()).thenReturn(f.path("size").asLong());
            when(file.getContentType()).thenReturn(str(f,"mime"));
            if(f.path("io").asBoolean()) when(file.getBytes()).thenThrow(new IOException("read failed"));
            else when(file.getBytes()).thenReturn(bytes(f));
            list.add(file);
        }
        return list;
    }
    @ParameterizedTest(name="{0}") @MethodSource("scenarios")
    void serviceCase(Scenario scenario) throws Exception {
        SecurityContextHolder.clearContext();
        try (var helpers = mockStatic(ServiceFeedbackImages.class)) { execute(scenario.data(), helpers); } finally { SecurityContextHolder.clearContext(); }
    }
    void execute(JsonNode c, org.mockito.MockedStatic<ServiceFeedbackImages> helpers) throws Exception {
        var in=c.get("input"); var pre=c.get("fixture"); var expected=c.get("expected");
        String op=c.get("op").asText(), failure=pre.path("failure").asText();
        var auth=mockType(AuthService.class);var ratings=mockType(ServiceRatingRepository.class);
        var services=mockType(ServiceRepository.class);var users=mockType(UserRepository.class);
        var publication=mockType(ServicePublicationService.class);var em=mockType(EntityManager.class);
        var provider=User.builder().userId(30).fullName("Provider").status(UserStatus.ACTIVE).build();
        var customer=User.builder().userId(20).fullName("Customer").status(UserStatus.ACTIVE).build();
        var registration=ServiceRegistration.builder().status(RegistrationStatus.APPROVED).capabilityDecision("APPROVE").listingDecision("APPROVE").build();
        var row=org.hlrcs.entity.Service.builder().serviceId(10).provider(provider).status("ACTIVE").registration(registration).build();
        var rating=new ServiceRating();rating.setRatingId(100);rating.setService(row);rating.setAuthor(customer);rating.setStars(3);rating.setContent("Original review");rating.setCreatedAt(Instant.parse("2026-11-01T00:00:00Z"));
        rating.setImages(new ArrayList<>(List.of(new ServiceImage(new byte[]{1,2},"image/png"),new ServiceImage(new byte[]{3,4},"image/jpeg"))));
        if(pre.has("reply"))rating.setReply(str(pre,"reply"));
        if(pre.path("noImages").asBoolean())rating.getImages().clear();
        if(pre.path("wrongService").asBoolean())rating.setService(org.hlrcs.entity.Service.builder().serviceId(11).build());
        boolean owner=flag(pre,"owner",op.equals("reply"));
        when(auth.getCurrentUser()).thenReturn(owner?provider:customer);
        when(services.findById(10)).thenReturn(flag(pre,"serviceExists",true)?Optional.of(row):Optional.empty());
        when(users.findForRegistrationUpdate(30)).thenReturn(flag(pre,"providerExists",true)?Optional.of(provider):Optional.empty());
        when(publication.isPublic(row)).thenAnswer(x->flag(pre,"public",true)&&!row.isModerationHidden());
        if(pre.path("hideOnRefresh").asBoolean())doAnswer(x->{row.setModerationHidden(true);return null;}).when(em).refresh(row);
        when(ratings.existsByService_ServiceIdAndAuthor_UserId(10,owner?30:20)).thenReturn(pre.path("duplicate").asBoolean());
        when(ratings.saveAndFlush(any())).thenAnswer(x->{ServiceRating saved=x.getArgument(0);saved.setRatingId(100);return saved;});
        when(ratings.findForReply(100)).thenReturn(flag(pre,"ratingExists",true)?Optional.of(rating):Optional.empty());
        when(ratings.findById(100)).thenReturn(flag(pre,"ratingExists",true)?Optional.of(rating):Optional.empty());
        Integer stars=in.get("stars").isNull()?null:in.get("stars").asInt();
        int page=in.get("page").asInt();
        var pageable=PageRequest.of(Math.max(0,page),10);
        var items=pre.path("emptyPage").asBoolean()?List.<ServiceRating>of():List.of(rating);
        when(ratings.ratings(eq(10),nullable(Integer.class),any(Pageable.class))).thenReturn(new PageImpl<>(items,pageable,pre.path("emptyCounts").asBoolean()?0:4));
        List<Object[]> countRows=pre.path("emptyCounts").asBoolean()?List.of():pre.path("zeroCounts").asBoolean()?Collections.singletonList(new Object[]{0,2L}):List.of(new Object[]{0,2L},new Object[]{3,1L},new Object[]{5,1L});
        when(ratings.counts(10)).thenReturn(countRows);
        when(ratings.findByService_ServiceIdAndAuthor_UserId(10,20)).thenReturn(pre.path("mine").asBoolean()?Optional.of(rating):Optional.empty());
        String authentication=value(pre,"authentication","none");
        if(authentication.equals("anonymous"))SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken("key","anonymous",List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        if(authentication.equals("user"))SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("customer","ignored",List.of()));
        var injected=new IllegalStateException(failure+" failed");
        switch(failure){
            case "auth"->when(auth.getCurrentUser()).thenThrow(injected);
            case "lookup"->when(services.findById(10)).thenThrow(injected);
            case "lock"->when(users.findForRegistrationUpdate(30)).thenThrow(injected);
            case "refresh"->doThrow(injected).when(em).refresh(row);
            case "save"->doThrow(injected).when(ratings).saveAndFlush(any());
            case "page"->when(ratings.ratings(eq(10),nullable(Integer.class),any(Pageable.class))).thenThrow(injected);
            case "counts"->when(ratings.counts(10)).thenThrow(injected);
            case "replyLookup"->when(ratings.findForReply(100)).thenThrow(injected);
            case "imageLookup"->when(ratings.findById(100)).thenThrow(injected);
        }
        var sut=new ServiceRatingService(auth,ratings,services,users,publication,em);
        var images=files(in.get("images"));String content=str(in,"content");
        // Static mock deliberately never executes the helper implementation.
        var helperImages = new ArrayList<ServiceImage>();
        if (images != null) for (var file : images) helperImages.add(new ServiceImage(file.getBytes(), file.getContentType()));
        helpers.when(() -> ServiceFeedbackImages.text(content, 1)).thenReturn(content == null ? "" : content.trim());
        helpers.when(() -> ServiceFeedbackImages.read(images)).thenReturn(helperImages);
        Exception helperFailure = null;
        if (pre.has("helperFailure")) {
            helperFailure = expected.path("exception").asText().equals("IOException")
                    ? new IOException(str(expected,"message")) : new BadRequestException(str(expected,"message"));
            if (pre.path("helperFailure").asText().equals("text")) helpers.when(() -> ServiceFeedbackImages.text(content, 1)).thenThrow(helperFailure);
            else helpers.when(() -> ServiceFeedbackImages.read(images)).thenThrow(helperFailure);
        }
        java.util.concurrent.Callable<Object> call=()->switch(op){
            case "submit"->sut.submit(in.get("serviceId").asInt(),stars,content,images);
            case "reply"->sut.reply(in.get("ratingId").asInt(),content);
            case "list"->sut.list(in.get("serviceId").asInt(),stars,page);
            case "image"->sut.image(in.get("serviceId").asInt(),in.get("ratingId").asInt(),in.get("index").asInt());
            default->throw new AssertionError(op);
        };
        if(!expected.get("exception").isNull()){
            var thrown=assertThrows(Exception.class,call::call);
            assertEquals(expected.get("exception").asText(),thrown.getClass().getSimpleName());
            assertEquals(str(expected,"message"),thrown.getMessage());
            if(thrown instanceof AppException app)assertEquals(expected.get("status").asInt(),app.getStatus().value());
            if(!failure.isEmpty())assertSame(injected,thrown);
            if(helperFailure != null) assertSame(helperFailure,thrown);
            verify(ratings,times(failure.equals("save")?1:0)).saveAndFlush(any());
            return;
        }
        Object result=call.call();
        switch(op){
            case "submit"->{
                var dto=(ServiceRatingService.Rating)result;
                assertEquals(100,dto.ratingId());assertEquals(20,dto.authorId());assertEquals("Customer",dto.authorName());assertEquals(stars,dto.stars());assertEquals(content.trim(),dto.content());assertNotNull(dto.createdAt());assertNull(dto.reply());assertNull(dto.repliedAt());
                int count=images==null?0:images.size();assertEquals(count,dto.imageUrls().size());
                for(int i=0;i<count;i++)assertEquals("/api/services/10/ratings/100/images/"+i,dto.imageUrls().get(i));
                var captor=org.mockito.ArgumentCaptor.forClass(ServiceRating.class);verify(ratings).saveAndFlush(captor.capture());
                assertSame(row,captor.getValue().getService());assertSame(customer,captor.getValue().getAuthor());
                for(int i=0;i<count;i++){assertArrayEquals(images.get(i).getBytes(),captor.getValue().getImages().get(i).getContent());assertEquals(images.get(i).getContentType(),captor.getValue().getImages().get(i).getContentType());}
                var order=inOrder(users,em,publication,ratings);order.verify(users).findForRegistrationUpdate(30);order.verify(em).refresh(row);order.verify(publication).isPublic(row);order.verify(ratings).existsByService_ServiceIdAndAuthor_UserId(10,20);order.verify(ratings).saveAndFlush(any());
            }
            case "reply"->{var dto=(ServiceRatingService.Rating)result;assertEquals(content.trim(),dto.reply());assertNotNull(dto.repliedAt());assertEquals(3,dto.stars());assertEquals("Original review",dto.content());assertEquals(20,dto.authorId());assertEquals(2,dto.imageUrls().size());assertEquals(rating.getCreatedAt(),dto.createdAt());verify(ratings).saveAndFlush(rating);verifyNoInteractions(publication);}
            case "image"->{var actual=(StaffService.FileContent)result;var image=rating.getImages().get(in.get("index").asInt());assertArrayEquals(image.getContent(),actual.bytes());assertEquals(image.getContentType(),actual.contentType());}
            case "list"->{
                var actual=(ServiceRatingService.Results)result;verify(ratings).ratings(10,stars,pageable);assertEquals(page,actual.page());assertEquals(items.size(),actual.items().size());
                long total=pre.path("emptyCounts").asBoolean()?0:pre.path("zeroCounts").asBoolean()?2:4;
                assertEquals(total,actual.total());assertEquals(total==0?null:pre.path("zeroCounts").asBoolean()?0.0:2.0,actual.average());assertEquals(pre.path("emptyCounts").asBoolean()?List.of(0L,0L,0L,0L,0L,0L):pre.path("zeroCounts").asBoolean()?List.of(2L,0L,0L,0L,0L,0L):List.of(2L,0L,0L,1L,0L,1L),actual.counts());
                var expectedPage=new PageImpl<>(items,pageable,pre.path("emptyCounts").asBoolean()?0:4);assertEquals(expectedPage.getTotalElements(),actual.filteredTotal());assertEquals(expectedPage.getTotalPages(),actual.totalPages());
                if(pre.path("mine").asBoolean()){assertNotNull(actual.mine());assertEquals(100,actual.mine().ratingId());}else assertNull(actual.mine());
                if(!authentication.equals("user"))verifyNoInteractions(auth);
                if(!items.isEmpty()){var dto=actual.items().get(0);assertEquals(List.of("/api/services/10/ratings/100/images/0","/api/services/10/ratings/100/images/1"),dto.imageUrls());assertEquals("Customer",dto.authorName());assertEquals("Original review",dto.content());}
            }
        }
        if (op.equals("submit") || op.equals("reply")) helpers.verify(() -> ServiceFeedbackImages.text(content, 1));
        if (op.equals("submit")) helpers.verify(() -> ServiceFeedbackImages.read(images));
        helpers.verifyNoMoreInteractions();
        if(!op.equals("submit")&&!op.equals("reply"))verify(ratings,never()).saveAndFlush(any());
    }
}
