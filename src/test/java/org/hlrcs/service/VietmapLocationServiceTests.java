package org.hlrcs.service;

import com.sun.net.httpserver.HttpServer;
import org.hlrcs.exception.*;
import org.junit.jupiter.api.*;
import tools.jackson.databind.ObjectMapper;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class VietmapLocationServiceTests {
    private HttpServer provider;private String base;private final AtomicInteger calls=new AtomicInteger();
    private String auto="[{\"ref_id\":\"auto:test+token\",\"display\":\"Nhà trọ mẫu, Xã Hòa Lạc, Hà Nội\",\"boundaries\":[{\"type\":2,\"full_name\":\"Xã Hòa Lạc\"}],\"data_old\":{\"boundaries\":[{\"type\":2,\"full_name\":\"Xã Tân Xã\"}]}}]";
    private String place="{\"lat\":21.0196169,\"lng\":105.5517238,\"ward\":\"Xã Hòa Lạc\",\"display\":\"Nhà trọ mẫu, Hà Nội\"}";
    private String reverse="[{\"lat\":21.02,\"lng\":105.56,\"display\":\"Đường gần nhà trọ, Hà Nội\",\"boundaries\":[{\"type\":2,\"full_name\":\"Xã Hòa Lạc\"}],\"data_old\":{\"boundaries\":[{\"type\":2,\"full_name\":\"Xã Tân Xã\"}]}}]";
    private int status=200;
    @BeforeEach void start() throws Exception {
        provider=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        provider.createContext("/",exchange->{calls.incrementAndGet();String query=URLDecoder.decode(exchange.getRequestURI().getRawQuery(),StandardCharsets.UTF_8);
            assertTrue(query.contains("apikey=unit-key"));assertNull(exchange.getRequestHeaders().getFirst("Authorization"));
            String path=exchange.getRequestURI().getPath(),data=path.contains("autocomplete")?auto:path.contains("place")?place:reverse;
            if(path.contains("autocomplete")){assertTrue(query.contains("display_type=5"));assertTrue(query.contains("focus="));}
            if(path.contains("place"))assertTrue(query.contains("refid=auto:test+token"));
            byte[] body=(status==200?data:"Do not expose provider error or unit-key").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status,body.length);try(var out=exchange.getResponseBody()){out.write(body);}
        });provider.start();base="http://127.0.0.1:"+provider.getAddress().getPort();
    }
    @AfterEach void stop(){provider.stop(0);}
    private VietmapLocationService service(int maximum){return new VietmapLocationService(new ObjectMapper(),true,"unit-key",base,maximum);}
    @Test void autocompletePlaceCachesAndMapsOldAreaWithoutGuessingFromPoiName(){
        var service=service(120);var values=service.autocomplete("nhà trọ",null,null);assertEquals(1,values.size());assertEquals("Tân Xã",values.get(0).commune());
        service.autocomplete("nhà trọ",null,null);assertEquals(1,calls.get());
        var result=service.place(values.get(0).refId());assertEquals("Tân Xã",result.commune());assertEquals(21.0196169,result.latitude());assertEquals("VIETMAP",result.attribution());
        assertEquals(2,calls.get());assertEquals(0,service.autocomplete("nh",null,null).size());
    }
    @Test void reverseKeepsExactChosenPinAndGoogleLinkResolverUsesSameAdapter(){
        var service=service(120);var result=service.reverse(21.0196169,105.5517238);
        assertEquals(21.0196169,result.latitude());assertEquals(105.5517238,result.longitude());assertEquals("Tân Xã",result.commune());
        var legacy=new PropertyLocationService(new ObjectMapper(),"","","unit","photon");legacy.setVietmap(service);
        var linked=legacy.lookup("https://www.google.com/maps/place/Test/data=!3d21.0196169!4d105.5517238");
        assertEquals(result,linked);assertEquals(1,calls.get());
    }
    @Test void missingOrAmbiguousAreasRemainUnknownAndEmptyResultsKeepPin(){
        reverse="[]";var result=service(120).reverse(21,105);assertEquals(21,result.latitude());assertNull(result.addressDetail());assertNull(result.commune());assertFalse(result.warnings().isEmpty());
        auto="[{\"ref_id\":\"auto:test+token\",\"display\":\"Nhà trọ Tân Xã\",\"boundaries\":[{\"type\":2,\"full_name\":\"Phường khác\"}]}]";
        assertNull(service(120).autocomplete("Nhà trọ Tân Xã",null,null).get(0).commune());
    }
    @Test void badKeyQuotaMalformedResponsesAndRateLimitHaveSafeErrors(){
        for(int code:new int[]{401,423,429,500}){status=code;var error=assertThrows(AppException.class,()->service(120).place("auto:test+token"));assertFalse(error.getMessage().contains("unit-key"));assertFalse(error.getMessage().contains(base));}
        status=200;place="{\"lat\":\"invalid\",\"lng\":105}";assertThrows(AppException.class,()->service(120).place("auto:test+token"));
        var limited=service(1);limited.reverse(21,105);assertThrows(AppException.class,()->limited.reverse(21.1,105));
    }
    @Test void unconfiguredAndInvalidInputsDoNotMakeProviderRequests(){
        var service=service(120);assertThrows(BadRequestException.class,()->service.place("http://127.0.0.1/private"));assertThrows(BadRequestException.class,()->service.autocomplete("test",21.0,null));assertThrows(BadRequestException.class,()->service.reverse(Double.NaN,105));
        var disabled=new VietmapLocationService(new ObjectMapper(),true,"",base,120);assertFalse(disabled.status().enabled());assertThrows(AppException.class,()->disabled.autocomplete("nhà trọ",null,null));assertEquals(0,calls.get());
    }
}
