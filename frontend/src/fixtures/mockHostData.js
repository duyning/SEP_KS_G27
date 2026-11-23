// Prototype Demo Fixtures for Host Portal (HL_RCS)
export const MOCK_HOST_PROPERTY = {
  "id": 1,
  "title": "Nhà trọ Minh Quân - Studio khép kín ban công",
  "hostId": "0987654321",
  "hostName": "Trần Gia Huy",
  "hostPhone": "0987654321",
  "propertyType": "Nhà trọ truyền thống",
  "commune": "Tân Xã",
  "addressDetail": "Thôn 2, Tân Xã, Thạch Thất, Hà Nội",
  "description": "Nhà trọ Minh Quân thoáng mát, đầy đủ tiện nghi, an ninh 24/7 gần ĐH FPT và ĐHQG Hà Nội.",
  "amenities": [
    "Chỗ để xe máy rộng rãi",
    "Wifi internet tốc độ cao",
    "Camera an ninh 24/7",
    "Khóa cổng vân tay",
    "Thang máy",
    "Khu giặt đồ chung"
  ],
  "rules": [
    "Giữ trật tự sau 23h",
    "Không hút thuốc trong phòng",
    "Đóng cổng an toàn khi ra vào"
  ],
  "images": [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80"
  ],
  "location": "Thôn 2, Tân Xã, Thạch Thất, Hà Nội",
  "locationShort": "Tân Xã, Thạch Thất",
  "priceDisplay": "2.200.000 đ",
  "status": "ACTIVE",
  "statusLabel": "Đang hiển thị",
  "verified": true,
  "rating": 4.9,
  "ratingCount": 42,
  "createdAt": "2026-02-15T08:00:00.000Z",
  "updatedAt": "2026-10-01T10:00:00.000Z",
  "lastAvailabilityConfirmedAt": "2026-10-19T17:31:48.654Z"
};
export const MOCK_HOST_ROOM_TYPES = [
  {
    "id": "RT_1_1",
    "propertyId": 1,
    "name": "Studio khép kín ban công",
    "area": "25m²",
    "price": 2200000,
    "priceDisplay": "2.200.000 đ",
    "deposit": "2.200.000 đ",
    "capacity": "2 người",
    "description": "Phòng Studio khép kín có ban công thoáng mát, view đón ánh sáng tự nhiên. Đã trang bị điều hòa Inverter, bình nóng lạnh, kệ bếp nấu ăn riêng.",
    "amenities": [
      "Điều hòa Inverter",
      "Bình nóng lạnh",
      "Ban công",
      "Kệ bếp",
      "Wifi"
    ],
    "fees": {
      "electricity": "3.500 đ/kWh",
      "water": "30.000 đ/m³",
      "internet": "100.000 đ/phòng",
      "service": "50.000 đ/người"
    },
    "image": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
  },
  {
    "id": "RT_1_2",
    "propertyId": 1,
    "name": "Phòng đơn khép kín tiêu chuẩn",
    "area": "18m²",
    "price": 1800000,
    "priceDisplay": "1.800.000 đ",
    "deposit": "1.800.000 đ",
    "capacity": "1 người",
    "description": "Phòng đơn khép kín gọn gàng, cửa sổ trời thông thoáng, thích hợp cho 1 bạn sinh viên.",
    "amenities": [
      "Điều hòa",
      "Bình nóng lạnh",
      "Wifi"
    ],
    "fees": {
      "electricity": "3.500 đ/kWh",
      "water": "30.000 đ/m³",
      "internet": "100.000 đ/phòng",
      "service": "50.000 đ/người"
    },
    "image": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80"
  }
];
export const MOCK_HOST_ROOMS = [
  {
    "id": "R_1_101",
    "propertyId": 1,
    "roomTypeId": "RT_1_1",
    "roomNumber": "P.101",
    "floor": "Tầng 1",
    "status": "OCCUPIED",
    "price": 2200000,
    "tenantName": "Lê Văn Tuấn",
    "lastUpdated": "2026-10-01"
  },
  {
    "id": "R_1_102",
    "propertyId": 1,
    "roomTypeId": "RT_1_1",
    "roomNumber": "P.102",
    "floor": "Tầng 1",
    "status": "AVAILABLE",
    "price": 2200000,
    "lastUpdated": "2026-10-08"
  },
  {
    "id": "R_1_201",
    "propertyId": 1,
    "roomTypeId": "RT_1_2",
    "roomNumber": "P.201",
    "floor": "Tầng 2",
    "status": "OCCUPIED",
    "price": 1800000,
    "tenantName": "Nguyễn Hải Đăng",
    "lastUpdated": "2026-09-25"
  },
  {
    "id": "R_1_202",
    "propertyId": 1,
    "roomTypeId": "RT_1_2",
    "roomNumber": "P.202",
    "floor": "Tầng 2",
    "status": "AVAILABLE",
    "price": 1800000,
    "lastUpdated": "2026-10-07"
  },
  {
    "id": "R_1_301",
    "propertyId": 1,
    "roomTypeId": "RT_1_1",
    "roomNumber": "P.301",
    "floor": "Tầng 3",
    "status": "OCCUPIED",
    "price": 2200000,
    "tenantName": "Phạm Thu Hương",
    "lastUpdated": "2026-09-15"
  },
  {
    "id": "R_1_302",
    "propertyId": 1,
    "roomTypeId": "RT_1_1",
    "roomNumber": "P.302",
    "floor": "Tầng 3",
    "status": "AVAILABLE",
    "price": 2200000,
    "lastUpdated": "2026-10-05"
  }
];
export const MOCK_HOST_VIEWINGS = [
  {
    "id": "VR-2026-001",
    "bookingCode": "BK8921",
    "roomId": 1,
    "roomTitle": "Nhà trọ Minh Quân - Studio khép kín ban công",
    "roomNumber": "P.102",
    "tenantName": "Nguyễn Văn Tuấn",
    "tenantPhone": "0968 111 222",
    "tenantRole": "Sinh viên K18 ĐH FPT",
    "date": "2026-10-25",
    "time": "15:30",
    "note": "Em muốn qua xem phòng ban công và kiểm tra đồng hồ điện nước.",
    "status": "PENDING",
    "statusLabel": "Chờ xác nhận",
    "createdAt": "2026-10-21T09:15:00.000Z"
  },
  {
    "id": "VR-2026-002",
    "bookingCode": "BK8922",
    "roomId": 1,
    "roomTitle": "Nhà trọ Minh Quân - Studio khép kín ban công",
    "roomNumber": "P.202",
    "tenantName": "Trần Thị Mai",
    "tenantPhone": "0977 333 444",
    "tenantRole": "Sinh viên ĐHQG",
    "date": "2026-10-24",
    "time": "09:00",
    "note": "Xem phòng tầng 2.",
    "status": "CONFIRMED",
    "statusLabel": "Đã xác nhận",
    "createdAt": "2026-10-20T14:30:00.000Z"
  },
  {
    "id": "VR-2026-003",
    "bookingCode": "BK8920",
    "roomId": 1,
    "roomTitle": "Nhà trọ Minh Quân",
    "roomNumber": "P.302",
    "tenantName": "Đỗ Quốc Bảo",
    "tenantPhone": "0988 555 666",
    "date": "2026-10-18",
    "time": "16:00",
    "status": "COMPLETED",
    "statusLabel": "Đã hoàn thành",
    "createdAt": "2026-10-17T11:00:00.000Z"
  }
];
export const MOCK_HOST_SUPPORT = [
  {
    "id": "REQ-2026-001",
    "ticketCode": "SP-7701",
    "subject": "Yêu cầu kiểm tra & cấp lại badge Xác minh nhà trọ sau khi hoàn thiện PCCC",
    "category": "VERIFICATION",
    "categoryLabel": "Xác minh / xét duyệt",
    "content": "Chào nhân viên, tôi đã hoàn thiện bổ sung đầy đủ hệ thống bình bọt và tiêu lệnh PCCC theo biên bản hướng dẫn. Nhờ nhân viên kiểm tra lại hồ sơ để khôi phục huy hiệu Xác minh xanh cho nhà trọ Minh Quân.",
    "status": "PENDING",
    "statusLabel": "Chờ tiếp nhận",
    "createdAt": "2026-10-20T10:15:00.000Z",
    "assignedStaff": "Nguyễn Văn An",
    "replies": [
      {
        "id": 1,
        "author": "Trần Gia Huy",
        "role": "HOST",
        "time": "2026-10-20 10:15",
        "text": "Chào nhân viên, tôi đã hoàn thiện hồ sơ PCCC bổ sung."
      }
    ]
  },
  {
    "id": "REQ-2026-002",
    "ticketCode": "SP-7702",
    "subject": "Cập nhật giá điện sinh hoạt theo thông tư mới",
    "category": "ROOMS_AVAILABILITY",
    "categoryLabel": "Phòng & giá dịch vụ",
    "content": "Tôi muốn điều chỉnh lại bảng biểu phí điện từ 3.800đ xuống 3.500đ/kWh cho toàn bộ các phòng.",
    "status": "RESOLVED",
    "statusLabel": "Đã hoàn tất",
    "createdAt": "2026-10-15T08:30:00.000Z",
    "assignedStaff": "Lê Thanh Thảo",
    "replies": []
  }
];
