package org.hlrcs.service;

import org.hlrcs.entity.PropertyRegistration;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.BadRequestException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import java.util.*;

public final class RegistrationEditPolicy {
    private RegistrationEditPolicy() {}
    public static final Map<String,List<String>> GROUPS;
    public static final Map<String,String> LEGACY_LABELS;
    private static final Map<String,List<String>> LABEL_ALIASES;
    static {
        var fields=new LinkedHashMap<String,List<String>>();
        fields.put("name",List.of("name"));fields.put("propertyType",List.of("propertyType"));fields.put("description",List.of("description"));
        fields.put("contact",List.of("managerName","contactPhone","zaloPhone"));
        fields.put("address",List.of("addressDetail"));fields.put("commune",List.of("commune"));fields.put("nearby",List.of("nearby"));
        fields.put("coordinates",List.of("latitude","longitude"));fields.put("amenities",List.of("amenities"));fields.put("rules",List.of("selectedRules","rules"));
        for(var key:List.of("exterior","parking","common","corridor","safety"))fields.put(key,List.of("photos"));
        for(var key:List.of("OWNERSHIP","ID_CARD","FIRE_SAFETY"))fields.put(key,List.of(key));
        GROUPS=Collections.unmodifiableMap(fields);
        LEGACY_LABELS=Map.ofEntries(Map.entry("name","Tên nhà trọ"),Map.entry("propertyType","Loại hình nhà trọ"),Map.entry("description","Mô tả nhà trọ"),
            Map.entry("contact","Thông tin liên hệ quản lý tiếp khách"),Map.entry("address","Địa chỉ chi tiết (Số nhà, ngõ, xóm, thôn)"),Map.entry("commune","Xã / Khu vực tại Hòa Lạc"),
            Map.entry("nearby","Vị trí gần các địa điểm chính"),Map.entry("coordinates","Vị trí ghim trên bản đồ (Tọa độ GPS)"),Map.entry("amenities","Tiện ích & Cơ sở vật chất chung"),
            Map.entry("rules","Quy định & Nội quy lưu trú"),Map.entry("exterior","Ảnh chụp mặt tiền & Biển hiệu nhà trọ"),Map.entry("parking","Ảnh cổng ra vào & Ngõ / Lối vào"),
            Map.entry("common","Ảnh khu vực để xe máy & Bãi xe chung"),Map.entry("corridor","Ảnh hành lang & Cầu thang / Thang máy"),Map.entry("safety","Ảnh thiết bị & Tiêu lệnh PCCC chung"),
            Map.entry("OWNERSHIP","Giấy phép kinh doanh"),Map.entry("ID_CARD","Căn cước công dân (CCCD / CMND) chủ trọ"),Map.entry("FIRE_SAFETY","Chứng nhận an toàn PCCC"));
        var aliases=new LinkedHashMap<String,List<String>>();
        LEGACY_LABELS.forEach((key,label)->aliases.put(key,new ArrayList<>(List.of(label))));
        aliases.get("OWNERSHIP").addAll(List.of("Giấy tờ quyền sở hữu hoặc hợp đồng quản lý","Giấy tờ chứng minh quyền sở hữu hoặc quyền quản lý"));
        aliases.get("FIRE_SAFETY").add("Biên bản kiểm tra hoặc Cam kết an toàn PCCC");
        LABEL_ALIASES=Collections.unmodifiableMap(aliases);
    }
    public static List<String> check(List<String> fields) {
        if(fields==null)return null;
        if(fields.isEmpty()||fields.size()>GROUPS.size()||fields.stream().anyMatch(key->!GROUPS.containsKey(Objects.toString(key,""))))throw new BadRequestException("Danh sách mục cần bổ sung không hợp lệ.");
        return fields.stream().distinct().toList();
    }
    public static Map<String,String> checkNotes(Map<String,String> notes,List<String> requestedFields) {
        if(notes==null||notes.isEmpty())return Map.of();
        var allowedSet=requestedFields==null?GROUPS.keySet():new HashSet<>(requestedFields);
        var cleaned=new LinkedHashMap<String,String>();
        for(var entry:notes.entrySet()){
            var key=Objects.toString(entry.getKey(),"");
            if(!GROUPS.containsKey(key)||!allowedSet.contains(key))throw new BadRequestException("Ghi chú mục cần bổ sung không hợp lệ.");
            var text=Objects.toString(entry.getValue(),"").trim();
            if(text.length()>500)throw new BadRequestException("Ghi chú cho từng mục tối đa 500 ký tự.");
            if(!text.isEmpty())cleaned.put(key,text);
        }
        return cleaned;
    }
    private static boolean matchesLine(String stripped,String label) {
        return stripped.equals("- "+label)||stripped.startsWith("- "+label+":");
    }
    public static List<String> requested(PropertyRegistration registration,ObjectMapper json) {
        if(registration==null||registration.getStatus()!=RegistrationStatus.NEEDS_SUPPLEMENT)return List.of();
        if(registration.getRequestedFieldsJson()!=null)try{return check(Arrays.asList(json.readValue(registration.getRequestedFieldsJson(),String[].class)));}catch(Exception error){throw new BadRequestException("Danh sách yêu cầu bổ sung không đọc được. Vui lòng liên hệ staff.");}
        var note=Objects.toString(registration.getReasonNote(),"");
        return GROUPS.keySet().stream().filter(key->LABEL_ALIASES.getOrDefault(key,List.of()).stream().anyMatch(label->note.lines().anyMatch(line->matchesLine(line.strip(),label)))).toList();
    }
    public static Map<String,String> fieldNotes(PropertyRegistration registration,ObjectMapper json) {
        if(registration==null||registration.getStatus()!=RegistrationStatus.NEEDS_SUPPLEMENT)return Map.of();
        var result=new LinkedHashMap<String,String>();
        if(registration.getFieldNotesJson()!=null&&!registration.getFieldNotesJson().isBlank()){
            try{
                var parsed=json.readValue(registration.getFieldNotesJson(),new TypeReference<Map<String,String>>(){});
                if(parsed!=null)parsed.forEach((k,v)->{if(GROUPS.containsKey(k)&&v!=null&&!v.isBlank())result.put(k,v.trim());});
            }catch(Exception ignored){}
        }
        var note=Objects.toString(registration.getReasonNote(),"");
        for(var line:note.lines().map(String::strip).toList()){
            if(!line.startsWith("- "))continue;
            for(var key:GROUPS.keySet()){
                if(result.containsKey(key))continue;
                for(var label:LABEL_ALIASES.getOrDefault(key,List.of())){
                    var prefix="- "+label+":";
                    if(line.startsWith(prefix)){
                        var extracted=line.substring(prefix.length()).trim();
                        if(!extracted.isEmpty())result.put(key,extracted);
                    }
                }
            }
        }
        return Collections.unmodifiableMap(result);
    }
    public static Set<String> allowed(PropertyRegistration registration,ObjectMapper json) {
        var keys=registration.getStatus()==RegistrationStatus.NEEDS_SUPPLEMENT?requested(registration,json):List.<String>of();
        // Old free-text requests have no machine-readable scope; permit a full resubmission for staff to review.
        if(keys.isEmpty())keys=new ArrayList<>(GROUPS.keySet());
        var result=new LinkedHashSet<String>();for(var key:keys)result.addAll(GROUPS.get(key));
        return result;
    }
}
