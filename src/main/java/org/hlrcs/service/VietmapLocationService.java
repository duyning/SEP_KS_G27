package org.hlrcs.service;

import org.hlrcs.exception.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

/** Read-only VIETMAP v4 adapter. Credentials and provider URLs never come from the browser. */
@Service
public class VietmapLocationService {
    private final ObjectMapper json;
    private final boolean configured;
    private final String key,base;
    private final int maximum;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).followRedirects(HttpClient.Redirect.NEVER).build();
    private final Map<String,Cached> cache=new LinkedHashMap<>();
    private final Map<String,List<String>> administrativeHints=new LinkedHashMap<>();
    private long window;private int calls;
    private record Cached(long until,JsonNode value) {}
    public record Suggestion(String refId,String display,String commune) {}
    public record Status(boolean enabled,String provider) {}

    public VietmapLocationService(ObjectMapper json,@Value("${app.maps.vietmap.enabled:false}") boolean enabled,
            @Value("${app.maps.vietmap.api-key:}") String key,
            @Value("${app.maps.vietmap.base-url:https://maps.vietmap.vn/api}") String base,
            @Value("${app.maps.vietmap.requests-per-minute:120}") int maximum) {
        this.json=json;this.key=key.trim();this.configured=enabled&&!this.key.isBlank();this.base=base.replaceAll("/+$","");this.maximum=Math.max(1,maximum);
    }
    public boolean enabled(){return configured;}
    public Status status(){return new Status(enabled(),enabled()?"vietmap":"legacy");}
    private void requireConfigured(){if(!enabled())throw new AppException("Tìm địa chỉ Vietmap chưa được cấu hình. Bạn vẫn có thể dán liên kết hoặc chọn ghim thủ công.",HttpStatus.SERVICE_UNAVAILABLE);}
    private synchronized JsonNode cached(String id){var entry=cache.get(id);return entry!=null&&entry.until()>System.currentTimeMillis()?entry.value():null;}
    private synchronized void remember(String id,JsonNode value){if(cache.size()>=256)cache.remove(cache.keySet().iterator().next());cache.put(id,new Cached(System.currentTimeMillis()+300_000,value));}
    private synchronized void budget(){long minute=System.currentTimeMillis()/60_000;if(window!=minute){window=minute;calls=0;}if(++calls>maximum)throw new AppException("Dịch vụ vị trí đang có nhiều yêu cầu. Vui lòng chờ một lát rồi thử lại.",HttpStatus.TOO_MANY_REQUESTS);}
    private JsonNode get(String endpoint,Map<String,String> parameters) {
        requireConfigured();String cacheKey=endpoint+parameters;var previous=cached(cacheKey);if(previous!=null)return previous;budget();
        var query=new StringJoiner("&");parameters.forEach((name,value)->query.add(encode(name)+"="+encode(value)));query.add("apikey="+encode(key));
        try {
            var response=http.send(HttpRequest.newBuilder(URI.create(base+"/"+endpoint+"?"+query)).timeout(Duration.ofSeconds(8)).header("Accept","application/json").GET().build(),HttpResponse.BodyHandlers.ofInputStream());
            try(var body=response.body()) {
                if(response.statusCode()==401)throw new AppException("Dịch vụ vị trí chưa xác thực được. Vui lòng kiểm tra cấu hình Vietmap.",HttpStatus.SERVICE_UNAVAILABLE);
                if(response.statusCode()==423||response.statusCode()==429)throw new AppException("Dịch vụ vị trí tạm hết hạn mức hoặc chưa được cấp quyền. Bạn có thể chọn ghim và nhập địa chỉ thủ công.",HttpStatus.SERVICE_UNAVAILABLE);
                if(response.statusCode()!=200)throw new java.io.IOException();
                byte[] bytes=body.readNBytes(512_001);if(bytes.length>512_000)throw new java.io.IOException();
                var data=json.readTree(new String(bytes,StandardCharsets.UTF_8));
                if(data==null)throw new java.io.IOException();
                if(endpoint.startsWith("place/")?(!data.isObject()||!data.path("lat").isNumber()||!data.path("lng").isNumber()):!data.isArray())throw malformed();
                remember(cacheKey,data);return data;
            }
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new AppException("Đã dừng tra vị trí.",HttpStatus.SERVICE_UNAVAILABLE);}
        catch(tools.jackson.core.JacksonException e){throw malformed();}
        catch(java.io.IOException|IllegalArgumentException e){throw new AppException("Chưa tải được vị trí từ Vietmap. Vui lòng thử lại hoặc chọn ghim thủ công.",HttpStatus.BAD_GATEWAY);}
    }
    private static String encode(String value){return URLEncoder.encode(value,StandardCharsets.UTF_8);}
    private static String text(JsonNode node,String field){return node.path(field).isString()?node.path(field).asString().trim():"";}
    private static String clipped(String value,int length){return value.length()>length?value.substring(0,length):value;}
    private static List<String> areas(JsonNode value){
        var names=new ArrayList<String>();
        for(var node:List.of(value,value.path("data_old"),value.path("data_new"))){
            if(!text(node,"ward").isEmpty())names.add(text(node,"ward"));
            if(node.path("boundaries").isArray())for(var boundary:node.path("boundaries"))if(boundary.path("type").asInt(-1)==2)names.add(text(boundary,"full_name"));
        }
        return names;
    }
    public List<Suggestion> autocomplete(String input,Double latitude,Double longitude) {
        requireConfigured();String query=input==null?"":input.trim();
        if(query.length()<3)return List.of();if(query.length()>200)throw new BadRequestException("Từ khóa địa chỉ tối đa 200 ký tự.");
        if((latitude==null)!=(longitude==null))throw new BadRequestException("Cần đủ vĩ độ và kinh độ.");
        double lat=latitude==null?21.01354:latitude,lng=longitude==null?105.52522:longitude;PropertyLocationService.validate(lat,lng);
        var data=get("autocomplete/v4",Map.of("text",query,"focus",lat+","+lng,"display_type","5"));
        if(!data.isArray())throw malformed();var result=new ArrayList<Suggestion>();
        for(var item:data){String ref=text(item,"ref_id"),display=text(item,"display");if(ref.isBlank()||ref.length()>4096||display.isBlank())continue;
            var names=areas(item);synchronized(this){if(administrativeHints.size()>=256)administrativeHints.remove(administrativeHints.keySet().iterator().next());administrativeHints.put(ref,List.copyOf(names));}
            result.add(new Suggestion(ref,clipped(display,512),PropertyAreas.fromAdministrativeNames(names)));if(result.size()==10)break;
        }
        return result;
    }
    public PropertyLocationService.Location place(String ref) {
        if(ref==null||ref.length()>4096||!ref.matches("(?:auto|geocode):[^\\s\\p{Cntrl}]+"))throw new BadRequestException("Địa chỉ được chọn không hợp lệ. Vui lòng tìm và chọn lại.");
        var data=get("place/v4",Map.of("refid",ref));
        if(!data.isObject()||!data.path("lat").isNumber()||!data.path("lng").isNumber())throw malformed();
        var names=new ArrayList<>(areas(data));synchronized(this){names.addAll(administrativeHints.getOrDefault(ref,List.of()));}
        return location(data.path("lat").asDouble(),data.path("lng").asDouble(),data,names);
    }
    public PropertyLocationService.Location reverse(double latitude,double longitude) {
        PropertyLocationService.validate(latitude,longitude);
        var data=get("reverse/v4",Map.of("lat",Double.toString(latitude),"lng",Double.toString(longitude),"display_type","5"));
        if(!data.isArray())throw malformed();
        // The user's pin is authoritative; never snap it to the returned road/POI coordinates.
        return location(latitude,longitude,data.isEmpty()?json.createObjectNode():data.get(0),data.isEmpty()?List.of():areas(data.get(0)));
    }
    private PropertyLocationService.Location location(double lat,double lng,JsonNode data,List<String> names) {
        PropertyLocationService.validate(lat,lng);String address=text(data,"display");String area=PropertyAreas.fromAdministrativeNames(names);var warnings=new ArrayList<String>();
        if(address.isBlank())warnings.add("Chưa tìm thấy địa chỉ tại vị trí này. Địa chỉ đã nhập được giữ nguyên.");
        if(area==null)warnings.add("Chưa đối chiếu được khu vực Hòa Lạc. Vui lòng kiểm tra và chọn khu vực phù hợp.");
        if(address.length()>255)warnings.add("Địa chỉ gợi ý dài hơn giới hạn. Hãy kiểm tra lại địa chỉ trước khi gửi.");
        return new PropertyLocationService.Location(lat,lng,address.isBlank()?null:clipped(address,255),area,null,List.of(),List.copyOf(warnings),"VIETMAP");
    }
    private static AppException malformed(){return new AppException("Vietmap chưa trả về địa chỉ hợp lệ. Vui lòng chọn lại hoặc đặt ghim thủ công.",HttpStatus.BAD_GATEWAY);}
}
