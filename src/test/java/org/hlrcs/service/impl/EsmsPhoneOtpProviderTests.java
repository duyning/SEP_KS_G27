package org.hlrcs.service.impl;

import com.sun.net.httpserver.HttpServer;
import org.hlrcs.exception.AppException;
import org.junit.jupiter.api.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import tools.jackson.databind.ObjectMapper;
import java.net.*;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class EsmsPhoneOtpProviderTests {
    HttpServer server;
    final ObjectMapper json=new ObjectMapper();
    final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(4);
    String response,requestBody;int status;
    EsmsPhoneOtpProvider provider;
    @BeforeEach void start()throws Exception{
        status=200;response="{\"CodeResult\":\"100\",\"SMSID\":\"accepted-test-sms\"}";
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/sms",exchange->{
            requestBody=new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8);
            byte[] bytes=response.getBytes(StandardCharsets.UTF_8);exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(status,bytes.length);exchange.getResponseBody().write(bytes);exchange.close();
        });server.start();
        provider=new EsmsPhoneOtpProvider("fake-api","fake-secret","Baotrixemay","Ma xac nhan cua ban la {code}",json,encoder,HttpClient.newHttpClient(),URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/sms"));
    }
    @AfterEach void close(){server.stop(0);}
    @Test void postsRealDeliveryContractAndStoresOnlyHash()throws Exception{
        var sent=provider.send("+84934567812");var body=json.readTree(requestBody);
        assertEquals("0934567812",body.path("Phone").asString());assertEquals("Baotrixemay",body.path("Brandname").asString());
        assertEquals("2",body.path("SmsType").asString());assertEquals("0",body.path("Sandbox").asString());
        assertEquals("0",body.path("IsUnicode").asString());assertEquals("fake-api",body.path("ApiKey").asString());
        String content=body.path("Content").asString();assertTrue(content.matches("Ma xac nhan cua ban la [0-9]{6}"));
        String otp=content.substring(content.length()-6);assertTrue(encoder.matches(otp,sent.codeHash()));assertNotEquals(otp,sent.codeHash());
        assertEquals("accepted-test-sms",sent.reference());String first=body.path("RequestId").asString();
        provider.send("0934567812");assertNotEquals(first,json.readTree(requestBody).path("RequestId").asString());
        assertFalse(provider.check("old-twilio-ref","123456"));
    }
    @Test void providerErrorsAndMalformedAcknowledgementsNeverCreateChallenge(){
        for(String code:new String[]{"101","103","104","146","177","124"}){
            response="{\"CodeResult\":\""+code+"\",\"ErrorMessage\":\"fake-secret raw provider details\"}";
            var ex=assertThrows(AppException.class,()->provider.send("0934567812"));
            assertFalse(ex.getMessage().contains("fake-secret"));assertEquals(502,ex.getStatus().value());
        }
        response="{\"CodeResult\":\"100\"}";assertThrows(AppException.class,()->provider.send("0934567812"));
        response="not json";assertThrows(AppException.class,()->provider.send("0934567812"));
        status=500;assertThrows(AppException.class,()->provider.send("0934567812"));
        status=429;assertEquals(429,assertThrows(AppException.class,()->provider.send("0934567812")).getStatus().value());
    }
    @Test void missingCredentialsFailBeforeNetworkCall(){
        var missing=new EsmsPhoneOtpProvider("","","","Ma xac nhan cua ban la {code}",json,encoder);
        assertEquals(503,assertThrows(AppException.class,()->missing.send("0934567812")).getStatus().value());assertNull(requestBody);
    }
    @Test void springSelectsExactlyOneProviderAndPreservesOtpPlaceholder(){
        var runner=new org.springframework.boot.test.context.runner.ApplicationContextRunner()
            .withBean(ObjectMapper.class,ObjectMapper::new)
            .withBean(org.springframework.security.crypto.password.PasswordEncoder.class,()->encoder)
            .withUserConfiguration(EsmsPhoneOtpProvider.class,TwilioPhoneOtpProvider.class,DisabledPhoneOtpProvider.class);
        runner.withPropertyValues("app.phone-otp.provider=esms").run(context->{
            assertNull(context.getStartupFailure());assertEquals(1,context.getBeansOfType(org.hlrcs.service.PhoneOtpProvider.class).size());
            var bean=context.getBean(org.hlrcs.service.PhoneOtpProvider.class);assertInstanceOf(EsmsPhoneOtpProvider.class,bean);
            assertEquals("Ma xac nhan cua ban la {code}",org.springframework.test.util.ReflectionTestUtils.getField(bean,"template"));
        });
        runner.withPropertyValues("app.phone-otp.provider=twilio").run(context->{
            assertNull(context.getStartupFailure());assertEquals(1,context.getBeansOfType(org.hlrcs.service.PhoneOtpProvider.class).size());
            assertInstanceOf(TwilioPhoneOtpProvider.class,context.getBean(org.hlrcs.service.PhoneOtpProvider.class));
        });
        runner.withPropertyValues("app.phone-otp.provider=disabled").run(context->{
            assertNull(context.getStartupFailure());assertEquals(1,context.getBeansOfType(org.hlrcs.service.PhoneOtpProvider.class).size());
            var bean=context.getBean(org.hlrcs.service.PhoneOtpProvider.class);assertInstanceOf(DisabledPhoneOtpProvider.class,bean);
            assertEquals(503,assertThrows(AppException.class,()->bean.send("0934567812")).getStatus().value());
        });
    }
}
