package org.hlrcs.service;
import org.hlrcs.entity.*;
import org.hlrcs.entity.enums.MediaType;
import org.junit.jupiter.api.*;
import java.net.*;
import java.io.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** HTTPS is intercepted inside this isolated test JVM. No request can reach Gemini. */
class CommunityScannerUnitTest extends CommunityUnitSupport {
    record Reply(int status,String body,String uploadUrl){}
    static final Deque<Reply> replies=new ArrayDeque<>();
    static final List<FakeConnection> requests=new ArrayList<>();
    static final ThreadLocal<Boolean> fakeHttps=ThreadLocal.withInitial(()->false);
    static final URL defaultHttps;
    static { try { defaultHttps=new URL("https://generativelanguage.googleapis.com/"); } catch(MalformedURLException e){throw new ExceptionInInitializerError(e);} }
    static { URL.setURLStreamHandlerFactory(protocol->protocol.equals("https")?new URLStreamHandler(){protected URLConnection openConnection(URL url)throws IOException{
        if(!fakeHttps.get())return new URL(defaultHttps,url.toExternalForm()).openConnection();
        if(replies.isEmpty())throw new IOException("No fake response configured; real network prohibited");
        var c=new FakeConnection(url,replies.remove());requests.add(c);return c;
    }}:null); }
    static class FakeConnection extends HttpURLConnection {
        final Reply reply; final ByteArrayOutputStream output=new ByteArrayOutputStream();boolean disconnected;
        FakeConnection(URL url,Reply reply){super(url);this.reply=reply;}
        public void connect(){} public void disconnect(){disconnected=true;}public boolean usingProxy(){return false;}
        public int getResponseCode(){return reply.status();}public InputStream getInputStream(){return new ByteArrayInputStream(reply.body().getBytes(java.nio.charset.StandardCharsets.UTF_8));}
        public OutputStream getOutputStream(){return output;}public String getHeaderField(String name){return name.equals("X-Goog-Upload-URL")?reply.uploadUrl():null;}
    }
    static void reset(){replies.clear();requests.clear();fakeHttps.set(true);}
    @Override void afterCase(){fakeHttps.remove();}
    static void response(int code,String body){replies.add(new Reply(code,body,null));}
    static String generated(String verdict,Object timestamp){var answer=new HashMap<String,Object>();answer.put("code",verdict);if(timestamp!=null)answer.put("timestampSeconds",timestamp);return JSON.writeValueAsString(Map.of("candidates",List.of(Map.of("finishReason","STOP","content",Map.of("parts",List.of(Map.of("thought",true,"text","ignore"),Map.of("text",JSON.writeValueAsString(answer))))))));}
    static PostMedia media(boolean video){return PostMedia.builder().mediaId(8).fileName(video?"a.mp4":"a.png").contentType(video?"video/mp4":"image/png").fileContent(new byte[]{1,2}).mediaType(video?MediaType.VIDEO:MediaType.IMAGE).build();}
    static GeminiCommunityScanner scanner(){return new GeminiCommunityScanner(JSON," fake-test-key ","model-test");}
    static void upload(String name,String state,String uri){replies.add(new Reply(200,"{}","https://generativelanguage.googleapis.com/upload/mock"));response(200,JSON.writeValueAsString(Map.of("file",Map.of("name",name,"state",state,"uri",uri))));}
    @TestFactory List<DynamicTest> scannerCases(){
        for(String key:List.of(""," ","dummy"))add("GeminiCommunityScanner.configured","Normal","key blank="+key.isBlank(),"Only nonblank trimmed key configured",()->assertEquals(!key.isBlank(),new GeminiCommunityScanner(JSON,key,"model").configured()));
        add("GeminiCommunityScanner.constructor","Abnormal","invalid model contains slash","IllegalArgumentException",()->assertThrows(IllegalArgumentException.class,()->new GeminiCommunityScanner(JSON,"dummy","models/bad")));
        for(String kind:List.of("text","image","video"))for(String code:List.of("CLEAR","SEXUAL","FLAGGED","OFF_TOPIC","UNSURE","INVALID"))add("GeminiCommunityScanner.scan","Normal","kind="+kind+", verdict="+code,"Whitelist verdicts; OFF_TOPIC only allowed for image; cleanup video; return media identity",()->{
            reset();boolean video=kind.equals("video");PostMedia m=kind.equals("text")?null:media(video);if(video)upload("files/mock","ACTIVE","https://example.invalid/mock");response(200,generated(code,12));if(video)response(200,"{}");
            boolean invalid=code.equals("INVALID")||code.equals("OFF_TOPIC")&&!kind.equals("image");if(invalid)assertThrows(IOException.class,()->scanner().scan("context",m));else{var r=scanner().scan("context",m);if(code.equals("CLEAR"))assertNull(r);else{assertEquals(code,r.code());assertEquals(m==null?null:8,r.mediaId());assertEquals(video?12:null,r.timestampSeconds());}}
            assertTrue(requests.stream().allMatch(x->x.disconnected));assertEquals(video?4:1,requests.size());
        });
        for(Object offset:Arrays.asList(-1,0,179,180,2147483648L,1.5,"1",null))add("GeminiCommunityScanner.scan","Boundary","video timestamp="+offset,"Only integer offsets 0..179 accepted; out-of-range/noninteger =>null",()->{
            reset();upload("files/mock","ACTIVE","https://example.invalid/mock");response(200,generated("FLAGGED",offset));response(200,"{}");var r=scanner().scan("context",media(true));assertEquals(offset instanceof Integer&&((Integer)offset)>=0&&((Integer)offset)<180?offset:null,r.timestampSeconds());
        });
        for(String condition:List.of("missing-bytes","missing-mime","missing-upload-url","http-upload-url","wrong-host","bad-file-name","missing-uri","processing-failed","cleanup-failed","processing-active","interrupted"))add("GeminiCommunityScanner.scan","Abnormal",condition,"Malformed upload/media/provider data rejected; cleanup errors ignored; active video proceeds",()->{
            reset();PostMedia m=media(true);switch(condition){case "missing-bytes"->m.setFileContent(null);case "missing-mime"->m.setContentType(null);case "missing-upload-url"->response(200,"{}");case "http-upload-url"->replies.add(new Reply(200,"{}","http://generativelanguage.googleapis.com/upload"));case "wrong-host"->replies.add(new Reply(200,"{}","https://evil.invalid/upload"));case "bad-file-name"->upload("../bad","ACTIVE","x");case "missing-uri"->{upload("files/mock","ACTIVE","");response(200,"{}");}case "processing-failed"->{upload("files/mock","FAILED","uri");response(200,"{}");}case "cleanup-failed"->{upload("files/mock","ACTIVE","uri");response(200,generated("CLEAR",null));response(500,"{}");}case "processing-active"->{upload("files/mock","PROCESSING","uri");response(200,"{\"state\":\"ACTIVE\",\"uri\":\"uri\"}");response(200,generated("CLEAR",null));response(200,"{}");}case "interrupted"->{upload("files/mock","PROCESSING","uri");response(200,"{}");Thread.currentThread().interrupt();}}
            try{if(condition.equals("cleanup-failed")||condition.equals("processing-active"))assertNull(scanner().scan("context",m));else if(condition.equals("interrupted"))assertThrows(InterruptedException.class,()->scanner().scan("context",m));else assertThrows(IOException.class,()->scanner().scan("context",m));}finally{Thread.interrupted();}
        });
        for(String reason:List.of("SAFETY","PROHIBITED_CONTENT","IMAGE_SAFETY","LENGTH","STOP","PROMPT_BLOCKED"))add("GeminiCommunityScanner.generate","Normal","finish="+reason,"Safety blocks =>UNSURE; incomplete =>IOException; STOP concatenate nonthought parts",()->{
            reset();String body=reason.equals("PROMPT_BLOCKED")?"{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}":reason.equals("STOP")?generated("CLEAR",null):JSON.writeValueAsString(Map.of("candidates",List.of(Map.of("finishReason",reason))));response(200,body);
            if(reason.equals("LENGTH"))assertThrows(IOException.class,()->scanner().scan("context",null));else if(reason.equals("STOP"))assertNull(scanner().scan("context",null));else assertEquals("UNSURE",scanner().scan("context",null).code());
        });
        for(int status:List.of(199,200,299,300,401,500))add("GeminiCommunityScanner.send","Boundary","HTTP status="+status,"Only 200..299 accepted; timeouts, no redirects, API header and disconnect enforced",()->{
            reset();response(status,generated("CLEAR",null));if(status>=200&&status<300)assertNull(scanner().scan("context",null));else assertThrows(IOException.class,()->scanner().scan("context",null));var c=requests.get(0);assertEquals(10000,c.getConnectTimeout());assertEquals(45000,c.getReadTimeout());assertFalse(c.getInstanceFollowRedirects());assertEquals("fake-test-key",c.getRequestProperty("x-goog-api-key"));assertTrue(c.disconnected);assertTrue(c.output.size()>0);
        });
        add("GeminiCommunityScanner.awaitVideo","Boundary","Video remains PROCESSING through all 20 polls (3 seconds each)","Stop after 20 attempts, throw IOException and delete uploaded file",()->{
            reset();upload("files/mock","PROCESSING","uri");for(int i=0;i<20;i++)response(200,"{\"state\":\"PROCESSING\"}");response(200,"{}");
            assertThrows(IOException.class,()->scanner().scan("context",media(true)));assertEquals(23,requests.size());assertEquals("DELETE",requests.get(22).getRequestMethod());assertTrue(replies.isEmpty());
        });
        return cases;
    }
}
