package org.hlrcs.service;
import jakarta.persistence.*;
import jakarta.persistence.criteria.*;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.*;
import org.hlrcs.repository.*;
import org.junit.jupiter.api.*;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CommunityFeedServiceUnitTest extends CommunityUnitSupport {
    static class F {
        EntityManager em=mock(EntityManager.class);PostRepository posts=mock(PostRepository.class);CommunityService community=mock(CommunityService.class);AuthService auth=mock(AuthService.class);
        CommunityFeedService s=new CommunityFeedService(em,posts,community,auth,JSON);Post p=post();
        @SuppressWarnings("unchecked") TypedQuery<Post> query=mock(TypedQuery.class,RETURNS_SELF);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> totals=mock(TypedQuery.class,RETURNS_SELF);
        @SuppressWarnings("unchecked") F(){when(auth.getCurrentUser()).thenReturn(p.getAuthor());when(posts.findById(10)).thenReturn(Optional.of(p));
            CriteriaBuilder cb=mock(CriteriaBuilder.class,RETURNS_DEEP_STUBS);when(em.getCriteriaBuilder()).thenReturn(cb);
            when(em.createQuery(any(CriteriaQuery.class))).thenReturn(query);when(query.getResultList()).thenReturn(List.of());
            when(em.createQuery(anyString(),eq(Object[].class))).thenReturn(totals);when(totals.getResultList()).thenReturn(List.of());
            when(community.responses(anyList(),anyBoolean())).thenAnswer(i->{List<Post> rows=i.getArgument(0);return rows.stream().map(x->new org.hlrcs.dto.response.CommunityPostResponse(x.getPostId(),1,"ROOMMATE","Roommate",x.getTitle(),x.getDescription(),x.getPrice(),x.getLocation(),"Contact",null,null,null,x.getStatus().name(),null,null,null,null,null,List.of(),List.of(),0,null)).toList();});}
        String token(Map<String,Object> change){var c=new HashMap<String,Object>();c.put("id",10);c.put("time","2026-11-20T00:00:00");c.put("price",1000);c.put("scope",JSON.writeValueAsString(Arrays.asList(null,"ALL","","all","newest")));c.putAll(change);return Base64.getUrlEncoder().withoutPadding().encodeToString(JSON.writeValueAsBytes(c));}
    }
    @TestFactory List<DynamicTest> feedCases(){
        add("CommunityFeedService.mineCount","Normal","caller=1; repository count=7","Count restricted to caller",()->{F f=new F();when(f.posts.countByAuthor_UserId(1)).thenReturn(7L);assertEquals(7,f.s.mineCount());});
        for(boolean mine:List.of(false,true))for(String condition:List.of("missing","approved-owner","pending-owner","approved-other","pending-other"))add("CommunityFeedService.one","Normal","mine="+mine+", "+condition,"Public requires APPROVED; private requires ownership; absent =>404",()->{
            F f=new F();if(condition.equals("missing"))when(f.posts.findById(10)).thenReturn(Optional.empty());if(condition.startsWith("approved"))f.p.setStatus(PostStatus.APPROVED);if(condition.endsWith("other"))f.p.setAuthor(user(2,UserRole.USER));
            boolean allowed=!condition.equals("missing")&&(mine?condition.endsWith("owner"):condition.startsWith("approved"));if(allowed)assertEquals(10,f.s.one(10,mine).id());else status(404,()->f.s.one(10,mine));
        });
        for(String invalid:List.of("category","keyword","zone","sort"))add("CommunityFeedService.page","Abnormal","invalid "+invalid,"400 before query",()->{F f=new F();status(400,()->f.s.page(false,invalid.equals("category")?"BAD":"ALL",invalid.equals("keyword")?"x".repeat(201):"",invalid.equals("zone")?"BAD":"all",invalid.equals("sort")?"BAD":"newest",null));verifyNoInteractions(f.em);});
        for(boolean mine:List.of(false,true))for(String category:List.of("ALL","ROOM_TRANSFER","ROOMMATE","SECOND_HAND"))for(String sort:List.of("newest","oldest","price-asc","price-desc"))add("CommunityFeedService.page","Normal","mine="+mine+", category="+category+", sort="+sort+", empty feed","No cursor/hasMore; counts mapped for all 3 categories; correct scope",()->{
            F f=new F();when(f.totals.getResultList()).thenReturn(Arrays.asList(new Object[]{PostType.PASS_ROOM,2L},new Object[]{PostType.ROOMMATE,3L},new Object[]{PostType.PASS_ITEM,4L}));
            var r=f.s.page(mine,category,"","all",sort,null);assertFalse(r.hasMore());assertNull(r.nextCursor());assertEquals(9L,r.counts().get("ALL"));assertEquals(2L,r.counts().get("ROOM_TRANSFER"));assertEquals(3L,r.counts().get("ROOMMATE"));assertEquals(4L,r.counts().get("SECOND_HAND"));
        });
        for(String zone:List.of("all","tan-xa","thach-hoa","binh-yen","cnc","khac"))for(String location:Arrays.asList("Tân Xã","Thạch Hòa","Bình Yên","Công nghệ cao","Khu CNC","Somewhere",null))add("CommunityFeedService.zone","Normal","filter="+zone+", location="+location,"Accent-insensitive zone match; unknown/null => khac",()->{
            F f=new F();f.p.setLocation(location);f.p.setContactName(null);when(f.query.getResultList()).thenReturn(List.of(f.p));String expected=location==null||location.equals("Somewhere")?"khac":location.equals("Tân Xã")?"tan-xa":location.equals("Thạch Hòa")?"thach-hoa":location.equals("Bình Yên")?"binh-yen":"cnc";
            assertEquals(zone.equals("all")||zone.equals(expected)?1:0,f.s.page(false,"ALL","",zone,"newest",null).items().size());
        });
        for(String keyword:List.of(""," cộng ĐỒNG ","absent","x".repeat(200)))add("CommunityFeedService.normalize","Boundary","query="+keyword,"Trim/case/accent normalization; 200 char boundary accepted",()->{F f=new F();f.p.setTitle("Cộng đồng");when(f.query.getResultList()).thenReturn(List.of(f.p));assertEquals(keyword.isEmpty()||keyword.contains("ĐỒNG")?1:0,f.s.page(false,"ALL",keyword,"all","newest",null).items().size());});
        for(int count:List.of(0,1,8,9,64))add("CommunityFeedService.page","Boundary","matching batch size="+count,"Maximum 8 visible; ninth implies continuation cursor; 64 scan batch handles loop",()->{
            F f=new F();List<Post> values=new ArrayList<>();for(int i=0;i<count;i++){Post p=post();p.setPostId(i+1);if(i==0)p.setCreatedAt(null);values.add(p);}when(f.query.getResultList()).thenReturn(values,List.of());
            var r=f.s.page(false,"ALL","","all","newest",null);assertEquals(Math.min(8,count),r.items().size());assertEquals(count>8,r.hasMore());assertEquals(count>8,r.nextCursor()!=null);
        });
        add("CommunityFeedService.page","Normal","64 nonmatching rows then matching row","Scan beyond first candidate batch",()->{F f=new F();List<Post> rows=new ArrayList<>();for(int i=0;i<64;i++)rows.add(post());Post p=post();p.setTitle("unique marker");when(f.query.getResultList()).thenReturn(rows,List.of(p));assertEquals(1,f.s.page(false,"ALL","unique marker","all","newest",null).items().size());});
        for(String token:Arrays.asList(null,""," ","invalid","x".repeat(4097)))add("CommunityFeedService.decode","Boundary","cursor="+(token==null?"null":token.length()>50?"length=4097":token),"Blank cursor accepted; malformed/oversize =>400",()->{F f=new F();if(token==null||token.isBlank())assertFalse(f.s.page(false,"ALL","","all","newest",token).hasMore());else status(400,()->f.s.page(false,"ALL","","all","newest",token));});
        for(String condition:List.of("null-id","zero-id","null-time","wrong-scope","negative-price","null-price","valid"))add("CommunityFeedService.decode","Abnormal",condition,"Reject each invalid cursor operand independently; null/nonnegative price valid",()->{
            F f=new F();var c=new HashMap<String,Object>();switch(condition){case "null-id"->c.put("id",null);case "zero-id"->c.put("id",0);case "null-time"->c.put("time",null);case "wrong-scope"->c.put("scope","other");case "negative-price"->c.put("price",-1);case "null-price"->c.put("price",null);}
            String token=f.token(c);if(condition.equals("valid")||condition.equals("null-price"))assertNotNull(f.s.page(false,"ALL","","all","newest",token));else status(400,()->f.s.page(false,"ALL","","all","newest",token));
        });
        for(String sort:List.of("newest","oldest","price-asc","price-desc"))for(boolean nullPrice:List.of(false,true))add("CommunityFeedService.candidates","Normal","cursor present; sort="+sort+", null price="+nullPrice,"Execute timestamp/id and null-price continuation criteria",()->{
            F f=new F();var c=new HashMap<String,Object>();c.put("scope",JSON.writeValueAsString(Arrays.asList(null,"ALL","","all",sort)));if(nullPrice)c.put("price",null);assertNotNull(f.s.page(false,"ALL","","all",sort,f.token(c)));verify(f.query).setMaxResults(64);
        });
        return cases;
    }
}
