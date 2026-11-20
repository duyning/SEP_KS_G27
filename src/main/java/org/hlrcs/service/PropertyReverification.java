package org.hlrcs.service;

import org.hlrcs.dto.request.PropertyRegistrationRequest;
import java.util.*;
import java.math.BigDecimal;
import tools.jackson.databind.ObjectMapper;

/** Critical changes are measured against the approved snapshot, never client supplied flags. */
public final class PropertyReverification {
    private PropertyReverification() { }
    public static List<String> changes(PropertyRegistrationRequest approved, PropertyRegistrationRequest proposed,
                                       boolean ownershipChanged, boolean identityChanged) {
        var reasons=new ArrayList<String>();
        if(approved==null) reasons.add("Không đủ dữ liệu đối chiếu bản đã duyệt");
        else {
            if(!text(approved.addressDetail()).equals(text(proposed.addressDetail())) || !text(approved.commune()).equals(text(proposed.commune()))) reasons.add("Địa chỉ nhà trọ");
            if(!coordinate(approved.latitude()).equals(coordinate(proposed.latitude())) || !coordinate(approved.longitude()).equals(coordinate(proposed.longitude()))) reasons.add("Vị trí trên bản đồ");
            if(!text(approved.managerName()).equals(text(proposed.managerName()))) reasons.add("Người quản lý nhà trọ");
        }
        if(ownershipChanged)reasons.add("Giấy tờ quyền sở hữu / quyền quản lý");
        if(identityChanged)reasons.add("Giấy tờ định danh chủ trọ");
        return List.copyOf(reasons);
    }
    private static String text(String value) {
        return java.text.Normalizer.normalize(Objects.toString(value, "").strip(), java.text.Normalizer.Form.NFC).replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
    private static String coordinate(String value) {
        try{return new BigDecimal(Objects.toString(value, "").strip()).stripTrailingZeros().toPlainString();}
        catch(NumberFormatException ignored){return text(value);}
    }
    public static List<String> reasons(String stored,ObjectMapper json) {
        if(stored==null||stored.isBlank())return List.of();
        try{return List.copyOf(Arrays.asList(json.readValue(stored,String[].class)));}
        catch(Exception ignored){return List.of("Cần đối chiếu lại thông tin xác minh");}
    }
}
