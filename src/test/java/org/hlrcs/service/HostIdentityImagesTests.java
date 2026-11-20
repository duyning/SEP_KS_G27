package org.hlrcs.service;
import org.junit.jupiter.api.Test;
import org.hlrcs.exception.BadRequestException;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;
class HostIdentityImagesTests {
 private byte[] image(String format)throws Exception{var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(20,12,java.awt.image.BufferedImage.TYPE_INT_RGB),format,out);return out.toByteArray();}
 @Test void actualImageBytesMustMatchDeclaredTypeAndDecode()throws Exception{
  byte[] png=image("png"),jpeg=image("jpeg");
  assertEquals("image/png",HostIdentityImages.parse("data:image/png;base64,"+Base64.getEncoder().encodeToString(png)).contentType());
  assertEquals("image/jpeg",HostIdentityImages.parse("data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(jpeg)).contentType());
  assertThrows(BadRequestException.class,()->HostIdentityImages.parse("data:image/jpeg;base64,"+Base64.getEncoder().encodeToString(png)));
  assertThrows(BadRequestException.class,()->HostIdentityImages.parse("data:image/svg+xml;base64,PHN2Zz4="));
  assertThrows(BadRequestException.class,()->HostIdentityImages.parse("data:image/png;base64,"+Base64.getEncoder().encodeToString(java.util.Arrays.copyOf(png,24))));
 }
 @Test void maximumDecodedBytesAndEncodedInputAreEnforced(){
  String tooLarge=Base64.getEncoder().encodeToString(new byte[5*1024*1024+1]);
  assertThrows(BadRequestException.class,()->HostIdentityImages.parse("data:image/png;base64,"+tooLarge));
  assertThrows(BadRequestException.class,()->HostIdentityImages.parse("x".repeat(7_000_001)));
  assertNull(HostIdentityImages.parse(null));
 }
}
