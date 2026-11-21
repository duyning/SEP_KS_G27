package org.hlrcs.service;

import lombok.RequiredArgsConstructor;
import org.hlrcs.dto.request.RentalContractRequest;
import org.hlrcs.entity.*;
import org.hlrcs.exception.*;
import org.hlrcs.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class RentalContractService {
    private final RentalContractRepository contracts;
    private final RoomRepository rooms;
    private final UserRepository users;
    private final AuthService auth;
    private final ObjectMapper json;
    public record Template(String id,String name,String description,String terms) { }
    public record View(Long id,String status,String propertyName,String propertyAddress,String roomNumber,
                       LocalDate startDate,LocalDate endDate,LocalDateTime createdAt,LocalDateTime closedAt,RentalContractRequest details) { }
    public static List<Template> templates(){return List.of(
        new Template("BASIC","Mẫu 1 · Hợp đồng thuê phòng trọ","Trách nhiệm bên A, bên B và các thỏa thuận chung.",
            "1. Trách nhiệm của bên A\n"
            +"- Tạo mọi điều kiện thuận lợi để bên B thực hiện theo hợp đồng.\n"
            +"- Cung cấp nguồn điện, nước, wifi cho bên B sử dụng.\n\n"
            +"2. Trách nhiệm của bên B\n"
            +"- Thanh toán đầy đủ các khoản tiền theo đúng thỏa thuận.\n"
            +"- Bảo quản các trang thiết bị và cơ sở vật chất của bên A trang bị cho ban đầu (làm hỏng phải sửa, mất phải đền).\n"
            +"- Không được tự ý sửa chữa, cải tạo cơ sở vật chất khi chưa được sự đồng ý của bên A.\n"
            +"- Giữ gìn vệ sinh trong và ngoài khuôn viên của phòng trọ.\n"
            +"- Bên B phải chấp hành mọi quy định của pháp luật Nhà nước và quy định của địa phương.\n"
            +"- Nếu bên B cho khách ở qua đêm thì phải báo và được sự đồng ý của chủ nhà đồng thời phải chịu trách nhiệm về các hành vi vi phạm pháp luật của khách trong thời gian ở lại.\n\n"
            +"3. Trách nhiệm chung\n"
            +"- Hai bên phải tạo điều kiện cho nhau thực hiện hợp đồng.\n"
            +"- Trong thời gian hợp đồng còn hiệu lực nếu bên nào vi phạm các điều khoản đã thỏa thuận thì bên còn lại có quyền đơn phương chấm dứt hợp đồng; nếu sự vi phạm hợp đồng đó gây tổn thất cho bên bị vi phạm hợp đồng thì bên vi phạm hợp đồng phải bồi thường thiệt hại.\n"
            +"- Một trong hai bên muốn chấm dứt hợp đồng trước thời hạn thì phải báo trước cho bên kia ít nhất 30 ngày và hai bên phải có sự thống nhất.\n"
            +"- Bên A phải trả lại tiền đặt cọc cho bên B.\n"
            +"- Bên nào vi phạm điều khoản chung thì phải chịu trách nhiệm trước pháp luật.\n"
            +"- Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ một bản."),
        new Template("HOUSE_RENTAL", "Mẫu 2 · Hợp đồng thuê nhà trọ", "Bốn điều về nội dung thuê, quyền và nghĩa vụ, chấm dứt và cam kết.",
            """
            ĐIỀU 1: NỘI DUNG HỢP ĐỒNG
            1.2 Mục đích thuê nhà
            Bên thuê nhà thuê nhà để ở.

            1.4 Thời hạn cho thuê
            Trong trường hợp gia hạn Hợp đồng thuê, hai bên sẽ cùng nhau thoả thuận về việc gia hạn.
            Trong bất cứ trường hợp nào, đề xuất về việc gia hạn sẽ được đưa ra trước 30 (ba mươi) ngày trước khi hết hạn.

            ĐIỀU 2: QUYỀN VÀ NGHĨA VỤ CÁC BÊN
            Quyền và nghĩa vụ của bên cho thuê
            - Yêu cầu bên thuê trả đủ tiền thuê đúng thời hạn và sửa chữa, bồi thường thiệt hại do lỗi của bên thuê gây ra.
            - Thực hiện quyền chấm dứt hợp đồng theo thỏa thuận và quy định áp dụng.
            - Bảo trì, cải tạo nơi thuê khi được bên thuê đồng ý và kiểm tra tình trạng nhà, trang thiết bị sau khi đã thông báo.
            - Nhận lại nơi thuê khi hợp đồng chấm dứt.
            Quyền và nghĩa vụ của bên thuê
            - Nhận nơi thuê và trang thiết bị, nếu có, theo ngày đã thỏa thuận.
            - Bảo quản nhà và trang thiết bị, thanh toán tiền thuê đúng hạn.
            - Không cho bên thứ ba thuê lại. Bồi thường hư hỏng hoặc mất mát do mình gây ra, trừ hao mòn tự nhiên.
            - Giữ vệ sinh, an ninh và trật tự trong thời gian thuê.

            ĐIỀU 3: CHẤM DỨT HỢP ĐỒNG
            - Hợp đồng chấm dứt khi hết thời hạn hoặc khi hai bên thỏa thuận chấm dứt.
            - Khi đơn phương chấm dứt, các bên thông báo trước 02 tháng và thực hiện đầy đủ các nghĩa vụ theo hợp đồng.
            - Hợp đồng chấm dứt khi nơi thuê phải sửa chữa do hư hỏng nặng hoặc do thực hiện quy hoạch xây dựng.

            ĐIỀU 4: CAM KẾT CỦA CÁC BÊN
            - Hai bên cam kết thực hiện đúng nội dung đã ký. Nội dung bổ sung có thể được ghi trong phụ lục do hai bên thống nhất.
            - Hợp đồng được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản.
            """.strip()),
        new Template("SHARED","Hợp đồng thuê phòng có người ở cùng","Bổ sung trách nhiệm đại diện bên thuê và người ở cùng.",
            "1. Trách nhiệm của bên A\n"
            +"- Tạo mọi điều kiện thuận lợi để bên B và người ở cùng thực hiện theo hợp đồng.\n"
            +"- Cung cấp nguồn điện, nước, wifi cho bên B sử dụng.\n\n"
            +"2. Trách nhiệm của bên B và người ở cùng\n"
            +"- Bên B là người đại diện chịu trách nhiệm khai báo danh sách người ở cùng và thanh toán đầy đủ các khoản tiền theo đúng thỏa thuận.\n"
            +"- Bảo quản các trang thiết bị và cơ sở vật chất của bên A trang bị cho ban đầu (làm hỏng phải sửa, mất phải đền).\n"
            +"- Không được tự ý sửa chữa, cải tạo cơ sở vật chất hoặc thêm/đổi người ở khi chưa được sự đồng ý của bên A.\n"
            +"- Giữ gìn vệ sinh trong và ngoài khuôn viên của phòng trọ; chấp hành mọi quy định của pháp luật Nhà nước và quy định của địa phương.\n"
            +"- Nếu cho khách ở qua đêm phải báo và được sự đồng ý của chủ nhà đồng thời chịu trách nhiệm về mọi hành vi của khách.\n\n"
            +"3. Trách nhiệm chung\n"
            +"- Hai bên phải tạo điều kiện cho nhau thực hiện hợp đồng.\n"
            +"- Trong thời gian hợp đồng còn hiệu lực nếu bên nào vi phạm các điều khoản đã thỏa thuận thì bên còn lại có quyền đơn phương chấm dứt hợp đồng và yêu cầu bồi thường thiệt hại nếu có.\n"
            +"- Một trong hai bên muốn chấm dứt hợp đồng trước thời hạn thì phải báo trước cho bên kia ít nhất 30 ngày và hai bên phải có sự thống nhất.\n"
            +"- Bên A phải trả lại tiền đặt cọc cho bên B khi hoàn tất bàn giao và đối soát chi phí.\n"
            +"- Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ một bản."));}
    @Transactional(readOnly=true)
    public Room owned(Integer id){
        return rooms.findByRoomIdAndProperty_Owner_UserId(id,auth.getCurrentUser().getUserId())
            .orElseThrow(()->new ResourceNotFoundException("Không tìm thấy phòng trong nhà trọ của bạn."));
    }
    @Transactional(readOnly=true) public List<View> list(Integer roomId){var r=owned(roomId);return contracts.findByRoomIdAndOwnerIdOrderByCreatedAtDescIdDesc(roomId,r.getProperty().getOwner().getUserId()).stream().map(this::view).toList();}
    @Transactional public View create(Integer roomId,RentalContractRequest request){
        users.findForRegistrationUpdate(auth.getCurrentUser().getUserId()).orElseThrow();
        var room=owned(roomId);
        if(!roomId.equals(request.roomId()))throw new BadRequestException("Hợp đồng không khớp phòng đang chọn.");
        if(!"OCCUPIED".equals(room.getStatus())||room.getLeaseStartDate()==null||room.getLeaseEndDate()==null)throw new BadRequestException("Cập nhật phòng sang Đang thuê và nhập đầy đủ ngày thuê trước khi tạo hợp đồng.");
        validateDates(room,room.getStatus(),room.getLeaseStartDate(),room.getLeaseEndDate());
        return view(record(room,request));
    }
    // Called from the same transaction/owner lock as room status changes.
    public void validateDates(Room room,String status,LocalDate start,LocalDate end){
        if(!"OCCUPIED".equals(status))return;
        var active=contracts.findByRoomIdAndOwnerIdAndStatus(room.getRoomId(),room.getProperty().getOwner().getUserId(),"ACTIVE");
        if(active.stream().anyMatch(c->start!=null&&!start.equals(c.getStartDate())||end!=null&&!end.equals(c.getEndDate())))
            throw new AppException("Phòng "+room.getRoomNumber()+" đã có hợp đồng. Kết thúc đợt thuê hiện tại trước khi đổi khoảng ngày thuê.",HttpStatus.CONFLICT);
    }
    public void close(Room room){
        var active=contracts.findByRoomIdAndOwnerIdAndStatus(room.getRoomId(),room.getProperty().getOwner().getUserId(),"ACTIVE");
        active.forEach(c->{c.setStatus("CLOSED");c.setClosedAt(LocalDateTime.now());});contracts.saveAll(active);
    }
    public RentalContract record(Room room,RentalContractRequest request){
        if(!request.reviewed())throw new BadRequestException("Vui lòng kiểm tra và xác nhận nội dung hợp đồng.");
        var owner=room.getProperty().getOwner().getUserId();
        if(!contracts.findByRoomIdAndOwnerIdAndStatus(room.getRoomId(),owner,"ACTIVE").isEmpty())throw new AppException("Phòng "+room.getRoomNumber()+" đã có hợp đồng đang quản lý. Tải lại để xem hợp đồng đã lưu.",HttpStatus.CONFLICT);
        var c=new RentalContract();c.setRoomId(room.getRoomId());c.setOwnerId(owner);c.setStatus("ACTIVE");
        c.setPropertyName(room.getProperty().getName());c.setPropertyAddress(room.getProperty().getAddress());c.setRoomNumber(room.getRoomNumber());
        var details = (ObjectNode) json.valueToTree(request);
        if ("HOUSE_RENTAL".equals(request.template())) {
            details.put("contractDate", LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString());
        }
        c.setStartDate(room.getLeaseStartDate());c.setEndDate(room.getLeaseEndDate());c.setDetailsJson(json.writeValueAsString(details));
        return contracts.saveAndFlush(c);
    }
    private View view(RentalContract c){return new View(c.getId(),c.getStatus(),c.getPropertyName(),c.getPropertyAddress(),c.getRoomNumber(),c.getStartDate(),c.getEndDate(),c.getCreatedAt(),c.getClosedAt(),json.readValue(c.getDetailsJson(),RentalContractRequest.class));}
}
