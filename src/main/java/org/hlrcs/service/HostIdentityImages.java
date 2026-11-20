package org.hlrcs.service;
import org.hlrcs.exception.BadRequestException;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.util.Base64;
final class HostIdentityImages {
 private HostIdentityImages() { }
 record Image(String contentType,byte[] bytes) { }
 static Image parse(String value){
  if(value==null||value.isBlank())return null;
  if(value.length()>7_000_000)throw new BadRequestException("Ảnh định danh tối đa 5 MB.");
  String mime=value.startsWith("data:image/png;base64,")?"image/png":value.startsWith("data:image/jpeg;base64,")?"image/jpeg":null;
  if(mime==null)throw new BadRequestException("Ảnh định danh phải là JPG hoặc PNG hợp lệ.");
  try{
   byte[] bytes=Base64.getDecoder().decode(value.substring(value.indexOf(',')+1));
   if(bytes.length==0||bytes.length>5*1024*1024)throw new BadRequestException("Ảnh định danh tối đa 5 MB.");
   try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){
    var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw new IllegalArgumentException();
    var reader=readers.next();
    try{
     reader.setInput(stream,true,true);String format=reader.getFormatName();
     if(!(mime.equals("image/png")&&format.equalsIgnoreCase("png")||mime.equals("image/jpeg")&&format.equalsIgnoreCase("JPEG")))throw new IllegalArgumentException();
     int width=reader.getWidth(0),height=reader.getHeight(0);
     if(width<1||height<1||(long)width*height>20_000_000)throw new IllegalArgumentException();
     if(reader.read(0)==null)throw new IllegalArgumentException();
    }finally{reader.dispose();}
   }
   return new Image(mime,bytes);
  }catch(BadRequestException ex){throw ex;}
  catch(Exception ex){throw new BadRequestException("Không đọc được ảnh định danh. Chọn ảnh JPG/PNG rõ nét, tối đa 20 megapixel.");}
 }
}
