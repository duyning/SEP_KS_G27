package org.hlrcs;

import org.hlrcs.entity.User;
import org.hlrcs.entity.enums.UserStatus;
import org.hlrcs.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.util.List;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.*;

/** Explicit opt-in: makes one real Gemini call with synthetic facts, using local backend configuration. */
@SpringBootTest @ActiveProfiles("test") @TestPropertySource("classpath:application-test.properties")
@EnabledIfSystemProperty(named="hlrcs.ai.live-test",matches="true")
class PropertyDescriptionLiveTests {
 @MockitoBean AuthService auth;
 @Autowired PropertyDescriptionService service;
 @Test void configuredSpringServiceGeneratesDescriptionFromSyntheticFacts(){
  var user=new User();user.setUserId(12345);user.setStatus(UserStatus.ACTIVE);when(auth.getCurrentUser()).thenReturn(user);
  var result=service.generate(new PropertyDescriptionService.Facts("Nhà trọ kiểm thử","Ký túc xá tư nhân","Tân Xã","",List.of("Wifi chung"),List.of(),""));
  assertTrue(result.description().length()>=30);assertTrue(result.description().length()<=2000);
 }
}
