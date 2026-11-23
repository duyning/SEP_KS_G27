// Prototype Demo Fixtures for nhân viên Portal (HL_RCS)
export const MOCK_STAFF_VERIFICATIONS = [
  {
    "id": "VR-101",
    "propertyId": 101,
    "propertyTitle": "Chung cư mini Riverside Tân Xã - View hồ",
    "propertyAddress": "Thôn 3, Tân Xã, Thạch Thất, Hà Nội",
    "propertyType": "Chung cư mini có ban công",
    "propertyImages": [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    "propertyDescription": "Chung cư mini mới xây dựng hoàn thiện tại thôn 3 Tân Xã, ban công lộng gió ngắm trực diện hồ Tân Xã. Thang máy thẻ từ, khóa vân tay và camera an ninh 24/7.",
    "amenities": [
      "Ban công riêng",
      "Khóa vân tay 2 lớp",
      "Thang máy thẻ từ",
      "Bảo vệ 24/7",
      "Chỗ để xe máy rộng rãi"
    ],
    "hostId": "0977889900",
    "hostName": "Đỗ Văn D",
    "hostPhone": "0977889900",
    "hostEmail": "dovand@gmail.com",
    "status": "PENDING",
    "statusLabel": "Chờ xác minh",
    "submittedAt": "2026-10-21T05:00:00.000Z",
    "updatedAt": "2026-10-21T05:00:00.000Z",
    "documents": {
      "ownership": {
        "type": "Giấy tờ quyền sở hữu / Hợp đồng ủy quyền",
        "fileName": "so_do_quyen_so_huu_nha_o_dat_o_dovand.pdf",
        "fileSize": "2.4 MB"
      },
      "idCard": {
        "type": "CCCD người đại diện quản lý nhà trọ",
        "fileName": "cccd_mat_truoc_sau_do_van_d.pdf",
        "fileSize": "1.8 MB"
      },
      "fireSafety": {
        "type": "Biên bản / Cam kết an toàn PCCC",
        "fileName": "bien_ban_kiem_tra_pccc_nam_2026.pdf",
        "fileSize": "3.2 MB"
      }
    },
    "history": [
      {
        "timestamp": "2026-10-21T05:00:00.000Z",
        "actor": "Đỗ Văn D (Chủ trọ)",
        "action": "SUBMITTED",
        "note": "Chủ trọ gửi hồ sơ đăng ký thẩm định và cấp huy hiệu xác thực nhà trọ."
      }
    ]
  },
  {
    "id": "VR-102",
    "propertyId": 102,
    "propertyTitle": "Nhà trọ Sinh Viên Xanh Tân Xã",
    "propertyAddress": "Khu Cổng số 2 ĐH FPT, Tân Xã, Thạch Thất, Hà Nội",
    "propertyType": "Nhà trọ sinh viên",
    "propertyImages": [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80"
    ],
    "propertyDescription": "Khu trọ sinh viên cách cổng số 2 trường ĐH FPT 400m, an ninh tốt, giờ giấc tự do không chung chủ.",
    "amenities": [
      "Wifi tốc độ cao",
      "Khóa vân tay",
      "Chỗ phơi đồ có mái che"
    ],
    "hostId": "0999000111",
    "hostName": "Lê Tuấn Mới",
    "hostPhone": "0999000111",
    "hostEmail": "letuanmoi@gmail.com",
    "status": "NEED_MORE_INFO",
    "statusLabel": "Cần bổ sung",
    "submittedAt": "2026-10-20T10:00:00.000Z",
    "updatedAt": "2026-10-21T02:00:00.000Z",
    "reviewedBy": "Nguyễn Văn An",
    "reviewedAt": "2026-10-21T02:00:00.000Z",
    "reviewNote": "Vui lòng chụp lại rõ nét giấy tờ quyền sử dụng đất và biên bản PCCC có dấu mộc đỏ.",
    "documents": {
      "ownership": {
        "type": "Giấy tờ quyền sở hữu / Hợp đồng ủy quyền",
        "fileName": "hop_dong_thue_dat_chua_cong_chung.pdf",
        "fileSize": "1.2 MB"
      },
      "idCard": {
        "type": "CCCD người đại diện quản lý nhà trọ",
        "fileName": "cccd_le_tuan_moi.pdf",
        "fileSize": "1.5 MB"
      }
    },
    "history": [
      {
        "timestamp": "2026-10-20T10:00:00.000Z",
        "actor": "Lê Tuấn Mới (Chủ trọ)",
        "action": "SUBMITTED",
        "note": "Chủ trọ gửi yêu cầu xác minh ban đầu."
      },
      {
        "timestamp": "2026-10-21T02:00:00.000Z",
        "actor": "Nguyễn Văn An (nhân viên)",
        "action": "REQUEST_MORE_INFO",
        "note": "Yêu cầu bổ sung tài liệu PCCC có dấu đỏ."
      }
    ]
  },
  {
    "id": "VR-001",
    "propertyId": 1,
    "propertyTitle": "Nhà trọ Minh Quân - Studio khép kín ban công",
    "propertyAddress": "Thôn 2, Tân Xã, Thạch Thất, Hà Nội",
    "propertyType": "Nhà trọ truyền thống",
    "propertyImages": [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    ],
    "hostId": "0987654321",
    "hostName": "Trần Gia Huy",
    "hostPhone": "0987654321",
    "status": "APPROVED",
    "statusLabel": "Đã xác minh",
    "submittedAt": "2026-02-15T08:00:00.000Z",
    "updatedAt": "2026-02-16T14:00:00.000Z",
    "reviewedBy": "Nguyễn Văn An",
    "reviewedAt": "2026-02-16T14:00:00.000Z",
    "reviewNote": "Hồ sơ pháp lý và PCCC đầy đủ, hợp lệ.",
    "documents": {},
    "history": []
  }
];
export const MOCK_STAFF_ASSISTANCE = [
  {
    "id": "REQ-2026-001",
    "code": "SP-7701",
    "title": "Yêu cầu kiểm tra & cấp lại badge Xác minh nhà trọ sau khi hoàn thiện PCCC",
    "category": "VERIFICATION",
    "categoryLabel": "Xác minh / xét duyệt",
    "description": "Chào nhân viên, tôi đã hoàn thiện bổ sung đầy đủ hệ thống bình bọt và tiêu lệnh PCCC theo biên bản hướng dẫn. Nhờ nhân viên kiểm tra lại hồ sơ để khôi phục huy hiệu Xác minh xanh cho nhà trọ Minh Quân.",
    "hostId": "0987654321",
    "hostName": "Trần Gia Huy (Host A)",
    "hostPhone": "0987654321",
    "propertyTitle": "Nhà trọ Minh Quân - Studio khép kín ban công",
    "assignedStaff": "Nguyễn Văn An",
    "assignedStaffId": "staff_01",
    "status": "PENDING",
    "statusLabel": "Chờ tiếp nhận",
    "createdAt": "2026-10-21T03:15:00.000Z",
    "updatedAt": "2026-10-21T03:15:00.000Z",
    "messages": [
      {
        "id": "M1",
        "senderRole": "HOST",
        "senderName": "Trần Gia Huy",
        "text": "Chào nhân viên, tôi đã hoàn thiện hồ sơ PCCC bổ sung.",
        "timestamp": "2026-10-21T03:15:00.000Z"
      }
    ],
    "history": [
      {
        "timestamp": "2026-10-21T03:15:00.000Z",
        "actor": "Trần Gia Huy",
        "action": "CREATED",
        "note": "Tạo yêu cầu hỗ trợ thẩm định PCCC"
      }
    ]
  },
  {
    "id": "REQ-2026-002",
    "code": "SP-7702",
    "title": "Cập nhật giá điện sinh hoạt theo thông tư mới",
    "category": "ROOMS_AVAILABILITY",
    "categoryLabel": "Phòng & giá dịch vụ",
    "description": "Tôi muốn điều chỉnh lại bảng biểu phí điện từ 3.800đ xuống 3.500đ/kWh cho toàn bộ các phòng.",
    "hostId": "0911223344",
    "hostName": "Hoàng Văn B (Host B)",
    "hostPhone": "0911223344",
    "propertyTitle": "Nhà trọ Sen Chiểu - Bình Yên",
    "assignedStaff": "Lê Thanh Thảo",
    "assignedStaffId": "staff_02",
    "status": "RESOLVED",
    "statusLabel": "Đã giải quyết",
    "createdAt": "2026-10-18T08:30:00.000Z",
    "updatedAt": "2026-10-19T10:00:00.000Z",
    "messages": [
      {
        "id": "M2",
        "senderRole": "HOST",
        "senderName": "Hoàng Văn B",
        "text": "Tôi muốn cập nhật biểu phí điện.",
        "timestamp": "2026-10-18T08:30:00.000Z"
      },
      {
        "id": "M3",
        "senderRole": "STAFF",
        "senderName": "Lê Thanh Thảo (nhân viên)",
        "text": "Đã cập nhật biểu phí mới 3.500đ cho nhà trọ Sen Chiểu.",
        "timestamp": "2026-10-19T10:00:00.000Z"
      }
    ],
    "history": []
  }
];
