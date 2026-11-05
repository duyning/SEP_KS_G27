package org.hlrcs.service;

import org.hlrcs.exception.BadRequestException;
import org.hlrcs.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/** Read-only provider adapter. Never persists a suggestion or bypasses registration review. */
@Service
public class PropertyLocationService {
    private final ObjectMapper json;
    private final String reverseUrl, nearbyUrl, userAgent, provider;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER).build();
    private long lastReverse, lastNearby;
    private final Map<String, Cached> cache = new LinkedHashMap<>();
    private static final Set<String> HOSTS = Set.of("maps.app.goo.gl", "goo.gl", "google.com", "www.google.com", "maps.google.com");
    private static final Pattern POINT = Pattern.compile("!3d([+-]?[\\d.]+)!4d([+-]?[\\d.]+)");
    private static final Pattern PAIR = Pattern.compile("^([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))\\s*,\\s*([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))$");
    public record Place(String id, String name, String category, double latitude, double longitude, long distanceMeters) {}
    public record Nearby(List<Place> places, String attribution) {}
    public record Location(double latitude, double longitude, String addressDetail, String commune, String nearby,
                           List<Place> places, List<String> warnings, String attribution) {}
    private record Cached(long at, Object value) {}

    public PropertyLocationService(ObjectMapper json,
            @Value("${app.maps.reverse-url:}") String reverseUrl,
            @Value("${app.maps.nearby-url:https://overpass-api.de/api/interpreter}") String nearbyUrl,
            @Value("${app.maps.user-agent:NestHub/1.0 (property location lookup)}") String userAgent,
            @Value("${app.maps.provider:nominatim}") String provider) {
        this.json=json; this.reverseUrl=reverseUrl; this.nearbyUrl=nearbyUrl; this.userAgent=userAgent; this.provider=provider;
    }
    static void validate(double lat, double lng) {
        if (!Double.isFinite(lat)||!Double.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)
            throw new BadRequestException("Vị trí bản đồ không hợp lệ.");
    }
    private static URI googleUri(String value) {
        try {
            URI uri=URI.create(value);
            if (!"https".equalsIgnoreCase(uri.getScheme())||!HOSTS.contains(uri.getHost())
                    ||uri.getUserInfo()!=null||(uri.getPort()!=-1&&uri.getPort()!=443)) throw new IllegalArgumentException();
            return uri;
        } catch (IllegalArgumentException e) { throw new BadRequestException("Chỉ nhận liên kết Google Maps HTTPS hợp lệ."); }
    }
    static double[] coordinates(String value) {
        try{return parseCoordinates(value);}catch(IllegalArgumentException e){throw new BadRequestException("Liên kết hoặc tọa độ không hợp lệ.");}
    }
    private static double[] parseCoordinates(String value) {
        var pair=PAIR.matcher(value.trim());
        if(pair.matches()){double lat=Double.parseDouble(pair.group(1)),lng=Double.parseDouble(pair.group(2));validate(lat,lng);return new double[]{lat,lng};}
        var uri=googleUri(value.trim());
        String decoded=URLDecoder.decode(uri.toString(),StandardCharsets.UTF_8);
        var point=POINT.matcher(decoded);
        if(point.find()){double lat=Double.parseDouble(point.group(1)),lng=Double.parseDouble(point.group(2));validate(lat,lng);return new double[]{lat,lng};}
        for(var part:Objects.toString(uri.getRawQuery(),"").split("&")){
            var entry=part.split("=",2);
            if(entry.length==2&&Set.of("q","query","destination").contains(entry[0])){
                var match=PAIR.matcher(URLDecoder.decode(entry[1],StandardCharsets.UTF_8));
                if(match.matches()){double lat=Double.parseDouble(match.group(1)),lng=Double.parseDouble(match.group(2));validate(lat,lng);return new double[]{lat,lng};}
            }
        }
        return null; // An @lat,lng viewport is not an exact property location.
    }
    private double[] resolve(String input) throws IOException, InterruptedException {
        if(input==null||input.trim().length()<3||input.length()>1500)throw new BadRequestException("Dán liên kết bản đồ hoặc tọa độ hợp lệ (tối đa 1500 ký tự).");
        var point=coordinates(input);if(point!=null)return point;
        URI uri=googleUri(input.trim());
        if(!Set.of("maps.app.goo.gl","goo.gl").contains(uri.getHost()))throw new BadRequestException("Liên kết chưa chứa vị trí cụ thể. Hãy chọn một địa điểm hoặc ghim trên bản đồ.");
        for(int count=0;count<4;count++){
            var response=http.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(8)).header("User-Agent",userAgent).GET().build(),HttpResponse.BodyHandlers.ofInputStream());
            try(var body=response.body()){
                if(response.statusCode()<300||response.statusCode()>=400)break;
                String location=response.headers().firstValue("location").orElse("");
                uri=googleUri(uri.resolve(location).toString()); // Validate EVERY redirect; no arbitrary outbound URLs.
                point=coordinates(uri.toString());if(point!=null)return point;
            }
        }
        throw new BadRequestException("Chưa đọc được vị trí từ link này. Hãy dùng link đầy đủ có tọa độ hoặc chọn ghim trên bản đồ.");
    }
    private JsonNode fetch(URI uri,String body) throws IOException,InterruptedException {
        var builder=HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(12)).header("User-Agent",userAgent).header("Accept","application/json");
        if(body==null)builder.GET();else builder.header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(body));
        var response=http.send(builder.build(),HttpResponse.BodyHandlers.ofInputStream());
        try(var stream=response.body()){
            if(response.statusCode()!=200)throw new IOException("Provider status "+response.statusCode());
            byte[] bytes=stream.readNBytes(1_000_001);if(bytes.length>1_000_000)throw new IOException("Provider response too large");
            return json.readTree(new String(bytes,StandardCharsets.UTF_8));
        }
    }
    private Object cached(String key){var value=cache.get(key);return value!=null&&System.currentTimeMillis()-value.at<600_000?value.value:null;}
    private void remember(String key,Object value){if(cache.size()>=256)cache.remove(cache.keySet().iterator().next());cache.put(key,new Cached(System.currentTimeMillis(),value));}
    private static String key(double lat,double lng){return String.format(Locale.ROOT,"%.5f,%.5f",lat,lng);}
    private static String text(JsonNode node,String field){var value=node.path(field);return value.isString()?value.asString().trim():"";}
    private static String normalize(String value){return Normalizer.normalize(value,Normalizer.Form.NFD).replaceAll("\\p{M}","").replace('đ','d').replace('Đ','D').toLowerCase(Locale.ROOT);}

    public synchronized Location lookup(String input) {
        try {
            String inputKey="input:"+Objects.toString(input,"").trim();var known=cached(inputKey);if(known instanceof Location result)return result;
            var savedPoint=cached("point:"+inputKey);double[] point=savedPoint instanceof double[] saved?saved:resolve(input);remember("point:"+inputKey,point);var warnings=new ArrayList<String>();String address=null,commune=null;
            if(!reverseUrl.isBlank()){
                try {
                    String reverseKey="reverse:"+key(point[0],point[1]);var stored=cached(reverseKey);JsonNode data;
                    if(stored instanceof JsonNode node)data=node;else{
                        long wait=1100-(System.currentTimeMillis()-lastReverse);if(wait>0)Thread.sleep(wait);
                        lastReverse=System.currentTimeMillis();
                        data=fetch(URI.create(reverseUrl+(reverseUrl.contains("?")?"&":"?")+("photon".equals(provider)?"limit=1&lat=":"format=jsonv2&addressdetails=1&accept-language=vi&lat=")+point[0]+"&lon="+point[1]),null);
                        remember(reverseKey,data);
                    }
                    String display=text(data,"display_name"),areaSource=data.path("address").toString();
                    if(data.path("features").isArray()&&!data.path("features").isEmpty()){
                        var properties=data.path("features").get(0).path("properties");
                        var parts=new LinkedHashSet<String>();
                        for(var field:List.of("housenumber","street","locality","district","city","state","country")){var part=text(properties,field);if(!part.isBlank())parts.add(part);}
                        display=String.join(", ",parts);
                        areaSource=List.of("locality","district","city","state").stream().map(field->text(properties,field)).reduce("",(a,b)->a+", "+b);
                        if(text(properties,"street").isBlank()&&text(properties,"housenumber").isBlank()&&text(properties,"locality").isBlank())display="";
                    }if(!display.isBlank())address=display.substring(0,Math.min(255,display.length()));
                    var areas=new ArrayList<String>();String source=normalize(areaSource);
                    for(var area:List.of("Tân Xã","Thạch Hòa","Bình Yên","Khu Công nghệ cao Hòa Lạc"))if(source.contains(normalize(area)))areas.add(area);
                    if(areas.size()==1)commune=areas.get(0);
                    if(address==null)warnings.add("OSM chưa có địa chỉ chi tiết tại ghim này; giữ nguyên địa chỉ đã nhập.");
                    if(commune==null)warnings.add("Chưa đối chiếu được khu vực với danh sách hiện có; hãy kiểm tra và chọn lại nếu cần.");
                }catch(IOException|RuntimeException e){warnings.add("Chưa tải được địa chỉ gợi ý. Vị trí ghim vẫn dùng được; địa chỉ đã nhập được giữ nguyên.");}
            }else warnings.add("Dịch vụ gợi ý địa chỉ chưa được cấu hình.");
            List<Place> places=List.of();
            try{places=nearby(point[0],point[1]).places();}catch(AppException e){warnings.add(e.getMessage());}
            if(places.isEmpty())warnings.add("Chưa tìm được địa điểm lân cận có tên trên OSM; ghi chú cũ được giữ để bạn kiểm tra lại.");
            String summary=places.stream().limit(3).map(place->place.name()+" ("+place.distanceMeters()+" m)").reduce((a,b)->a+", "+b).orElse(null);
            if(summary!=null){summary="Gần "+summary+" — khoảng cách đường chim bay";summary=summary.substring(0,Math.min(255,summary.length()));}
            var result=new Location(point[0],point[1],address,commune,summary,places,List.copyOf(warnings),"© OpenStreetMap contributors");
            // Cache only complete suggestions; transient provider failures can be retried.
            if(warnings.isEmpty())remember(inputKey,result);
            return result;
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new AppException("Đã dừng tra vị trí.",HttpStatus.SERVICE_UNAVAILABLE);}
        catch(IOException e){throw new AppException("Không mở được liên kết bản đồ. Thử lại hoặc dùng link đầy đủ.",HttpStatus.BAD_GATEWAY);}
    }
    public synchronized Nearby nearby(double lat,double lng){
        validate(lat,lng);String cacheKey="nearby:"+key(lat,lng);var known=cached(cacheKey);if(known instanceof Nearby result)return result;
        if(System.currentTimeMillis()-lastNearby<1500)throw new AppException("Vui lòng chờ một lát trước khi tìm khu vực khác.",HttpStatus.TOO_MANY_REQUESTS);
        lastNearby=System.currentTimeMillis();
        try{
            String around="(around:1500,"+lat+","+lng+")";
            String query="[out:json][timeout:8];(nwr[amenity~\"^(school|university|college|pharmacy|hospital|clinic|marketplace|restaurant|cafe|bank|atm)$\"]"+around+";nwr[shop~\"^(supermarket|convenience)$\"]"+around+";node[highway=bus_stop]"+around+";);out center tags 80;";
            JsonNode data;
            if("photon".equals(provider)){
                long wait=1100-(System.currentTimeMillis()-lastReverse);if(wait>0)Thread.sleep(wait);lastReverse=System.currentTimeMillis();
                data=fetch(URI.create(nearbyUrl+(nearbyUrl.contains("?")?"&":"?")+"lat="+lat+"&lon="+lng+"&radius=1.5&limit=24&osm_tag=amenity&osm_tag=shop&osm_tag=highway:bus_stop"),null);
                if(!data.path("features").isArray())throw new IOException("Invalid nearby response");
                var photonPlaces=new ArrayList<Place>();
                for(var feature:data.path("features")){
                    var props=feature.path("properties");var coords=feature.path("geometry").path("coordinates");String name=text(props,"name");
                    if(name.isBlank()||name.length()>180||coords.size()<2||!coords.get(0).isNumber()||!coords.get(1).isNumber())continue;
                    double plng=coords.get(0).asDouble(),plat=coords.get(1).asDouble();
                    if(!Double.isFinite(plat)||!Double.isFinite(plng)||Math.abs(plat)>90||Math.abs(plng)>180)continue;
                    long meters=distance(lat,lng,plat,plng);if(meters<=1500)photonPlaces.add(new Place(text(props,"osm_type")+"/"+props.path("osm_id").asString(),name,text(props,"osm_value"),plat,plng,meters));
                }
                photonPlaces.sort(Comparator.comparingLong(Place::distanceMeters));var result=new Nearby(photonPlaces.stream().limit(24).toList(),"© OpenStreetMap contributors");remember(cacheKey,result);return result;
            }
            data=fetch(URI.create(nearbyUrl),"data="+URLEncoder.encode(query,StandardCharsets.UTF_8));
            if(data.has("remark")||!data.path("elements").isArray())throw new IOException("Invalid places response");
            var places=new ArrayList<Place>();var names=new HashSet<String>();
            for(var item:data.path("elements")){
                var tags=item.path("tags");String name=text(tags,"name:vi");if(name.isBlank())name=text(tags,"name");if(name.isBlank()||name.length()>180)continue;
                var center=item.has("lat")?item:item.path("center");if(!center.path("lat").isNumber()||!center.path("lon").isNumber())continue;
                double plat=center.path("lat").asDouble(),plng=center.path("lon").asDouble();validate(plat,plng);
                long distance=distance(lat,lng,plat,plng);if(distance>1500)continue;
                String category=text(tags,"amenity");if(category.isBlank())category=text(tags,"shop");if(category.isBlank())category="bus_stop";
                if(names.add(normalize(name)+":"+key(plat,plng)))places.add(new Place(text(item,"type")+"/"+item.path("id").asString(),name,category,plat,plng,distance));
            }
            places.sort(Comparator.comparingLong(Place::distanceMeters));var result=new Nearby(places.stream().limit(24).toList(),"© OpenStreetMap contributors");remember(cacheKey,result);return result;
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new AppException("Đã dừng tải địa điểm lân cận.",HttpStatus.SERVICE_UNAVAILABLE);}
        catch(IOException|IllegalArgumentException e){throw new AppException("Chưa tải được địa điểm lân cận từ OSM. Bạn có thể thử lại.",HttpStatus.BAD_GATEWAY);}
    }
    static long distance(double lat,double lng,double plat,double plng){
        double a=Math.pow(Math.sin(Math.toRadians(plat-lat)/2),2)+Math.cos(Math.toRadians(lat))*Math.cos(Math.toRadians(plat))*Math.pow(Math.sin(Math.toRadians(plng-lng)/2),2);
        return Math.round(6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a))));
    }
}
