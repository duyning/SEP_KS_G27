package org.hlrcs.service;

import com.sun.net.httpserver.HttpServer;
import org.hlrcs.exception.BadRequestException;
import org.junit.jupiter.api.*;
import tools.jackson.databind.ObjectMapper;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class PropertyLocationServiceTests {
    private HttpServer provider;
    private String base;
    private final AtomicInteger reverseCalls=new AtomicInteger(), nearbyCalls=new AtomicInteger();
    @BeforeEach void start() throws Exception {
        provider=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        provider.createContext("/reverse",exchange->{
            reverseCalls.incrementAndGet();assertTrue(exchange.getRequestHeaders().getFirst("User-Agent").contains("NestHub"));
            byte[] body="{\"display_name\":\"Số 12, Tân Xã, Hà Nội\",\"address\":{\"village\":\"Tân Xã\"}}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200,body.length);try(var out=exchange.getResponseBody()){out.write(body);}
        });
        provider.createContext("/nearby",exchange->{
            nearbyCalls.incrementAndGet();String query=new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8);
            assertTrue(query.contains("1500"));
            byte[] body="{\"elements\":[{\"type\":\"node\",\"id\":1,\"lat\":21.0189,\"lon\":105.5215,\"tags\":{\"name\":\"Chợ Tân Xã\",\"amenity\":\"marketplace\"}},{\"type\":\"node\",\"id\":2,\"lat\":23,\"lon\":105,\"tags\":{\"name\":\"Quá xa\",\"shop\":\"supermarket\"}},{\"type\":\"node\",\"id\":3,\"lat\":21.0189,\"lon\":105.5215,\"tags\":{\"amenity\":\"cafe\"}}]}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200,body.length);try(var out=exchange.getResponseBody()){out.write(body);}
        });
        provider.start();base="http://127.0.0.1:"+provider.getAddress().getPort();
    }
    @AfterEach void stop(){provider.stop(0);}
    private PropertyLocationService service(){return new PropertyLocationService(new ObjectMapper(),base+"/reverse",base+"/nearby","NestHub-tests/1.0","nominatim");}

    @Test void parsesOnlyExactCoordinatesAndRejectsArbitraryOutboundTargets(){
        assertArrayEquals(new double[]{21.0124167,105.5252892},PropertyLocationService.coordinates("https://www.google.com/maps/place/FPT/data=!3d21.0124167!4d105.5252892"));
        assertArrayEquals(new double[]{0,0},PropertyLocationService.coordinates("0,0"));
        assertArrayEquals(new double[]{21.1,105.2},PropertyLocationService.coordinates("https://maps.google.com/?q=21.1,105.2"));
        assertNull(PropertyLocationService.coordinates("https://www.google.com/maps/@21,105,15z"));
        for(var value:new String[]{"https://127.0.0.1/?q=21,105","https://google.com.evil.test/?q=21,105","http://maps.google.com/?q=21,105","https://user:pass@google.com/?q=21,105","https://maps.google.com:8443/?q=21,105","91,105","21,181","NaN,105","https://google.com/?q=%XX"})
            assertThrows(BadRequestException.class,()->PropertyLocationService.coordinates(value),value);
    }
    @Test void returnsProviderSuggestionsAndCachesUserTriggeredLookups(){
        var service=service();var result=service.lookup("21.0188,105.5215");
        assertEquals("Số 12, Tân Xã, Hà Nội",result.addressDetail());assertEquals("Tân Xã",result.commune());
        assertEquals(1,result.places().size());assertEquals("Chợ Tân Xã",result.places().get(0).name());
        assertTrue(result.nearby().contains("đường chim bay"));assertTrue(result.warnings().isEmpty());
        assertEquals(result,service.lookup("21.0188,105.5215"));assertEquals(1,reverseCalls.get());assertEquals(1,nearbyCalls.get());
        assertEquals(result.places(),service.nearby(21.0188,105.5215).places());
    }
    @Test void providerFailureDoesNotLoseTheSelectedCoordinatesOrInventAddress(){
        var service=new PropertyLocationService(new ObjectMapper(),base+"/missing",base+"/missing","NestHub-tests/1.0","nominatim");
        var result=service.lookup("21.0188,105.5215");assertEquals(21.0188,result.latitude());assertEquals(105.5215,result.longitude());
        assertNull(result.addressDetail());assertNull(result.commune());assertNull(result.nearby());assertTrue(result.places().isEmpty());assertFalse(result.warnings().isEmpty());
        assertThrows(BadRequestException.class,()->service.nearby(91,105));
    }
    @Test void photonUsesStreetAndAdministrativeFieldsInsteadOfInventingAHouseAddress() throws Exception {
        provider.createContext("/photon",exchange->{
            byte[] body="{\"features\":[{\"properties\":{\"osm_type\":\"N\",\"osm_id\":7,\"osm_key\":\"amenity\",\"osm_value\":\"school\",\"name\":\"Trường Bình Yên\",\"street\":\"Đường N16\",\"locality\":\"Tân Xã\",\"city\":\"Hà Nội\"},\"geometry\":{\"coordinates\":[105.5215,21.0189]}}]}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200,body.length);try(var out=exchange.getResponseBody()){out.write(body);}
        });
        var service=new PropertyLocationService(new ObjectMapper(),base+"/photon",base+"/photon","NestHub-tests/1.0","photon");
        var result=service.lookup("21.0188,105.5215");
        assertEquals("Đường N16, Tân Xã, Hà Nội",result.addressDetail());
        assertEquals("Tân Xã",result.commune()); // A school's name must not change the commune.
        assertEquals("Trường Bình Yên",result.places().get(0).name());
        assertFalse(result.addressDetail().contains("Trường"));
    }
}
