package org.hlrcs.service;
import org.hlrcs.dto.request.PropertyRegistrationRequest;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class PropertyReverificationTests {
    private PropertyRegistrationRequest form(String address,String commune,String latitude,String longitude,String manager,String description) {
        return new PropertyRegistrationRequest("Nhà trọ", "Nhà trọ", description, manager,"0912345678",null,commune,address,null,latitude,longitude,List.of(),List.of(),null,true);
    }
    private PropertyRegistrationRequest base(){return form("Số 18, thôn 2","Tân Xã","21.0188","105.5215","Nguyễn Văn An","Mô tả ban đầu");}
    @Test void detectsEveryCriticalFieldAndBothDocumentKinds() {
        assertEquals(List.of("Địa chỉ nhà trọ"),PropertyReverification.changes(base(),form("Số 20, thôn 2","Tân Xã","21.0188","105.5215","Nguyễn Văn An","Mô tả"),false,false));
        assertEquals(List.of("Địa chỉ nhà trọ"),PropertyReverification.changes(base(),form("Số 18, thôn 2","Bình Yên","21.0188","105.5215","Nguyễn Văn An","Mô tả"),false,false));
        assertEquals(List.of("Vị trí trên bản đồ"),PropertyReverification.changes(base(),form("Số 18, thôn 2","Tân Xã","21.02","105.5215","Nguyễn Văn An","Mô tả"),false,false));
        assertEquals(List.of("Vị trí trên bản đồ"),PropertyReverification.changes(base(),form("Số 18, thôn 2","Tân Xã","21.0188","105.55","Nguyễn Văn An","Mô tả"),false,false));
        assertEquals(List.of("Người quản lý nhà trọ"),PropertyReverification.changes(base(),form("Số 18, thôn 2","Tân Xã","21.0188","105.5215","Nguyễn Văn Bình","Mô tả"),false,false));
        assertEquals(List.of("Giấy tờ quyền sở hữu / quyền quản lý"),PropertyReverification.changes(base(),base(),true,false));
        assertEquals(List.of("Giấy tờ định danh chủ trọ"),PropertyReverification.changes(base(),base(),false,true));
    }
    @Test void descriptionAndEquivalentFormattingDoNotRequireReverification() {
        assertTrue(PropertyReverification.changes(base(),form(" SỐ 18,  thôn 2 ","TÂN XÃ","21.018800","105.521500"," Nguyễn Văn An ","Mô tả hoàn toàn mới"),false,false).isEmpty());
        assertFalse(PropertyReverification.changes(null,base(),false,false).isEmpty());
    }
}
