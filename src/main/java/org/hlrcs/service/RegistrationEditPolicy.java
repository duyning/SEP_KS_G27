package org.hlrcs.service;

import org.hlrcs.entity.PropertyRegistration;
import org.hlrcs.entity.enums.RegistrationStatus;
import org.hlrcs.exception.BadRequestException;
import tools.jackson.databind.ObjectMapper;
import java.util.*;

public final class RegistrationEditPolicy {
    private RegistrationEditPolicy() {}
    public static final Map<String,List<String>> GROUPS;
    public static final Map<String,String> LEGACY_LABELS;
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
            Map.entry("OWNERSHIP","Giấy tờ quyền sở hữu hoặc hợp đồng quản lý"),Map.entry("ID_CARD","Căn cước công dân (CCCD / CMND) chủ trọ"),Map.entry("FIRE_SAFETY","Biên bản kiểm tra hoặc Cam kết an toàn PCCC"));
    }
    public static List<String> check(List<String> fields) {
        if(fields==null)return null;
        if(fields.isEmpty()||fields.size()>GROUPS.size()||fields.stream().anyMatch(key->!GROUPS.containsKey(Objects.toString(key,""))))throw new BadRequestException("Danh sách mục cần bổ sung không hợp lệ.");
        return fields.stream().distinct().toList();
    }
    public static List<String> requested(PropertyRegistration registration,ObjectMapper json) {
        if(registration.getRequestedFieldsJson()!=null)try{return check(Arrays.asList(json.readValue(registration.getRequestedFieldsJson(),String[].class)));}catch(Exception error){throw new BadRequestException("Danh sách yêu cầu bổ sung không đọc được. Vui lòng liên hệ staff.");}
        var note=Objects.toString(registration.getReasonNote(),"");
        return GROUPS.keySet().stream().filter(key->note.lines().anyMatch(line->line.strip().equals("- "+LEGACY_LABELS.get(key)))).toList();
    }
    public static Set<String> allowed(PropertyRegistration registration,ObjectMapper json) {
        var keys=registration.getStatus()==RegistrationStatus.NEEDS_SUPPLEMENT?requested(registration,json):List.<String>of();
        // Old free-text requests have no machine-readable scope; permit a full resubmission for staff to review.
        if(keys.isEmpty())keys=new ArrayList<>(GROUPS.keySet());
        var result=new LinkedHashSet<String>();for(var key:keys)result.addAll(GROUPS.get(key));
        return result;
    }
}
