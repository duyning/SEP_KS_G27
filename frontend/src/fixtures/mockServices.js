// Prototype Demo Fixtures for Supporting Services (HL_RCS)
export const MOCK_SERVICE_PROVIDERS = [
  {
    "id": "sp-001",
    "name": "Hòa Lạc Moving",
    "slug": "hoa-lac-moving",
    "avatar": null,
    "initials": "HM",
    "description": "Đơn vị chuyển trọ uy tín hàng đầu tại khu vực Hòa Lạc – Thạch Thất. Hoạt động từ 2019, phục vụ hàng ngàn sinh viên ĐH FPT và kỹ sư khu CNC chuyển phòng mỗi năm. Xe tải đa dạng, thợ có kinh nghiệm đóng gói đồ đạc cẩn thận.",
    "category": "moving",
    "serviceArea": [
      "Tân Xã",
      "Thạch Hòa",
      "Bình Yên",
      "Hòa Lạc",
      "Thạch Thất"
    ],
    "phone": "0912 111 222",
    "zalo": "0912111222",
    "email": null,
    "operatingHours": "07:00 - 20:00 (Tất cả các ngày trong tuần)",
    "verified": true,
    "status": "active",
    "createdAt": "2024-01-15"
  },
  {
    "id": "sp-002",
    "name": "Hòa Lạc Laundry",
    "slug": "hoa-lac-laundry",
    "avatar": null,
    "initials": "HL",
    "description": "Dịch vụ giặt là chuyên nghiệp tại khu vực Tân Xã và Thạch Hòa. Sử dụng máy giặt công nghiệp, bột giặt thân thiện da, sấy khô nhanh. Nhận giặt hàng ngày, giao nhận tận nơi trong bán kính 3km.",
    "category": "laundry",
    "serviceArea": [
      "Tân Xã",
      "Thạch Hòa",
      "Khu ĐH FPT"
    ],
    "phone": "0913 222 333",
    "zalo": "0913222333",
    "email": null,
    "operatingHours": "06:30 - 21:00 (Thứ 2 - Chủ nhật)",
    "verified": true,
    "status": "active",
    "createdAt": "2024-02-10"
  },
  {
    "id": "sp-003",
    "name": "Vệ sinh Sao Hòa Lạc",
    "slug": "ve-sinh-sao-hoa-lac",
    "avatar": null,
    "initials": "VS",
    "description": "Dịch vụ vệ sinh phòng trọ, nhà ở và văn phòng tại khu Hòa Lạc. Đội ngũ nhân viên nữ chuyên nghiệp, có đồng phục, mang đầy đủ dụng cụ vệ sinh. Làm việc theo đặt lịch, đúng giờ, đảm bảo sạch sẽ.",
    "category": "cleaning",
    "serviceArea": [
      "Tân Xã",
      "Thạch Hòa",
      "Bình Yên",
      "Toàn khu Hòa Lạc"
    ],
    "phone": "0914 333 444",
    "zalo": "0914333444",
    "email": null,
    "operatingHours": "08:00 - 18:00 (Thứ 2 - Thứ 7)",
    "verified": false,
    "status": "active",
    "createdAt": "2024-03-05"
  },
  {
    "id": "sp-004",
    "name": "Giặt Nhanh FPT Zone",
    "slug": "giat-nhanh-fpt-zone",
    "avatar": null,
    "initials": "GN",
    "description": "Tiệm giặt sấy phục vụ sinh viên ĐH FPT Hòa Lạc. Nhận giặt đồ ngay tại điểm hoặc qua điện thoại, trả đồ trong 3-5 tiếng. Giặt sạch, thơm, gấp gọn gàng.",
    "category": "laundry",
    "serviceArea": [
      "Tân Xã",
      "Khu ĐH FPT",
      "Bình Yên"
    ],
    "phone": "0915 444 555",
    "zalo": "0915444555",
    "email": null,
    "operatingHours": "07:00 - 22:00 (Hàng ngày)",
    "verified": false,
    "status": "active",
    "createdAt": "2024-04-20"
  },
  {
    "id": "sp-005",
    "name": "Chuyển Nhà An Toàn HN",
    "slug": "chuyen-nha-an-toan-hn",
    "avatar": null,
    "initials": "CN",
    "description": "Dịch vụ chuyển trọ, chuyển nhà tại Hòa Lạc và toàn bộ Thạch Thất. Có nhiều loại xe: xe tải nhỏ 500kg, xe tải 1 tấn, xe tải 2 tấn. Phù hợp cho sinh viên chuyển phòng đến nhóm gia đình chuyển nhà.",
    "category": "moving",
    "serviceArea": [
      "Toàn bộ Hòa Lạc",
      "Thạch Thất",
      "Khu CNC"
    ],
    "phone": "0916 555 666",
    "zalo": "0916555666",
    "email": null,
    "operatingHours": "06:00 - 21:00 (Tất cả ngày)",
    "verified": true,
    "status": "active",
    "createdAt": "2024-05-01"
  }
];
export const MOCK_SERVICES = [
  {
    "id": "svc-001",
    "providerId": "sp-001",
    "category": "moving",
    "categoryLabel": "Chuyển trọ",
    "name": "Chuyển trọ sinh viên – Xe tải nhỏ",
    "slug": "chuyen-tro-sinh-vien-xe-tai-nho",
    "shortDesc": "Chuyển đồ cá nhân, phòng ở đơn, xe tải 500kg – 1 tấn. Phù hợp sinh viên chuyển phòng nội khu Hòa Lạc.",
    "description": "Dịch vụ chuyển trọ dành riêng cho sinh viên và người thuê phòng đơn tại khu vực Hòa Lạc. Đội ngũ kinh nghiệm, xe sạch sẽ, đóng gói đồ đạc bằng thùng carton và màng bọc chuyên dụng.\n\nPhù hợp nhất khi bạn cần chuyển:\n– Phòng ở đơn (giường, tủ, bàn ghế, quần áo, đồ điện tử)\n– Lượng đồ vừa phải trong khu Hòa Lạc – Thạch Thất\n\nThời gian hoàn thành trung bình: 2 - 4 giờ tùy khoảng cách và lượng đồ.",
    "serviceArea": [
      "Tân Xã",
      "Thạch Hòa",
      "Bình Yên",
      "Khu CNC"
    ],
    "serviceAreaDisplay": "Tân Xã • Thạch Hòa • Bình Yên",
    "operatingHours": "07:00 - 20:00 hàng ngày",
    "priceInfo": "Liên hệ để báo giá",
    "priceNote": "Báo giá dựa trên khoảng cách và lượng đồ",
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
        "caption": "Xe tải chuyên dụng chuyển trọ"
      },
      {
        "url": "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=80",
        "caption": "Đóng gói đồ đạc cẩn thận trước khi vận chuyển"
      }
    ],
    "serviceTypes": [
      "Chuyển phòng đơn",
      "Đóng gói đồ đạc",
      "Xe tải 500kg - 1 tấn",
      "Nội khu Hòa Lạc"
    ],
    "status": "active",
    "createdAt": "2024-01-20"
  },
  {
    "id": "svc-002",
    "providerId": "sp-001",
    "category": "moving",
    "categoryLabel": "Chuyển trọ",
    "name": "Chuyển nhà trọn gói – Xe tải lớn",
    "slug": "chuyen-nha-tron-goi-xe-tai-lon",
    "shortDesc": "Chuyển nhà nguyên căn, xe tải 1.5 - 2 tấn, nhân công bốc xếp chuyên nghiệp. Phục vụ nội ngoại khu Thạch Thất.",
    "description": "Gói chuyển nhà trọn gói dành cho hộ gia đình và nhóm thuê căn hộ lớn tại Hòa Lạc. Đội ngũ nhân công kinh nghiệm, xe tải lớn, có dịch vụ đóng gói đầy đủ đồ đạc.\n\nPhạm vi phục vụ: Toàn khu Hòa Lạc và các xã lân cận Thạch Thất.\n\nBao gồm:\n– Đóng gói đồ đạc, bọc bảo vệ đồ dễ vỡ\n– Bốc xếp lên xe an toàn\n– Vận chuyển đến địa điểm mới\n– Dỡ và sắp xếp cơ bản tại nơi đến",
    "serviceArea": [
      "Toàn khu Hòa Lạc",
      "Thạch Thất",
      "Hà Nội (nội thành – báo thêm phí)"
    ],
    "serviceAreaDisplay": "Hòa Lạc • Thạch Thất • Hà Nội",
    "operatingHours": "07:00 - 20:00 hàng ngày",
    "priceInfo": "Liên hệ để báo giá",
    "priceNote": "Báo giá dựa trên khoảng cách, loại xe và lượng đồ",
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
        "caption": "Dịch vụ chuyển nhà trọn gói chuyên nghiệp"
      }
    ],
    "serviceTypes": [
      "Chuyển nhà nguyên căn",
      "Đóng gói đầy đủ",
      "Xe tải 1.5 - 2 tấn",
      "Nội ngoại khu Thạch Thất"
    ],
    "status": "active",
    "createdAt": "2024-01-20"
  },
  {
    "id": "svc-003",
    "providerId": "sp-005",
    "category": "moving",
    "categoryLabel": "Chuyển trọ",
    "name": "Chuyển trọ nhanh sinh viên FPT",
    "slug": "chuyen-tro-nhanh-sinh-vien-fpt",
    "shortDesc": "Dịch vụ chuyển trọ tốc hành trong ngày, phục vụ sinh viên ĐH FPT và khu CNC. Liên hệ là có xe trong 2 tiếng.",
    "description": "Dịch vụ chuyển trọ tốc hành, không cần đặt trước nhiều ngày. Liên hệ qua Zalo hoặc gọi điện, chúng tôi báo giá ngay và có thể sắp xếp xe trong vòng 2 tiếng (tùy thời điểm).\n\nĐặc biệt phù hợp khi:\n– Sinh viên chuyển phòng đột xuất cuối học kỳ\n– Chuyển trong nội khu gần ĐH FPT\n– Cần chuyển gấp trong ngày\n\nTất cả xe đều có bạt che đồ đạc, tránh mưa nắng.",
    "serviceArea": [
      "Tân Xã",
      "Khu ĐH FPT",
      "Thạch Hòa",
      "Bình Yên"
    ],
    "serviceAreaDisplay": "Tân Xã • Khu ĐH FPT • Thạch Hòa",
    "operatingHours": "06:00 - 21:00 tất cả ngày",
    "priceInfo": "Liên hệ để báo giá",
    "priceNote": "Giá theo quãng đường và lượng đồ, báo giá miễn phí",
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=1200&q=80",
        "caption": "Chuyển trọ nhanh trong ngày tại Hòa Lạc"
      }
    ],
    "serviceTypes": [
      "Chuyển trong ngày",
      "Phòng đơn – nhóm nhỏ",
      "Đa dạng loại xe",
      "Báo giá miễn phí"
    ],
    "status": "active",
    "createdAt": "2024-05-10"
  },
  {
    "id": "svc-004",
    "providerId": "sp-002",
    "category": "laundry",
    "categoryLabel": "Giặt là",
    "name": "Giặt sấy theo ký – Hòa Lạc Laundry",
    "slug": "giat-say-theo-ky-hoa-lac-laundry",
    "shortDesc": "Giặt sấy quần áo, đồ vải theo cân. Có giao nhận tận nơi trong bán kính 3km. Thơm tho, gấp gọn gàng.",
    "description": "Dịch vụ giặt sấy theo ký tại Hòa Lạc Laundry – phù hợp cho sinh viên và người đi làm bận rộn. Bạn có thể mang đồ đến tiệm hoặc đặt dịch vụ nhận đồ tận nơi qua Zalo.\n\nQuy trình:\n1. Gọi Zalo hoặc điện thoại đặt lịch nhận đồ\n2. Chúng tôi đến tận phòng nhận đồ trong khung giờ hẹn\n3. Giặt, sấy, gấp, đóng túi\n4. Giao trả trong 24 giờ (tùy lượng đồ)\n\nLưu ý: Đồ trắng, đồ delicate giặt riêng theo yêu cầu.",
    "serviceArea": [
      "Tân Xã",
      "Thạch Hòa",
      "Khu ĐH FPT"
    ],
    "serviceAreaDisplay": "Tân Xã • Thạch Hòa • Khu ĐH FPT",
    "operatingHours": "06:30 - 21:00 thứ Hai đến Chủ nhật",
    "priceInfo": "Liên hệ để biết giá",
    "priceNote": "Giá theo cân, nhận đồ tận nơi có phụ phí nhỏ theo khoảng cách",
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1521656958802-a9c59c58fecb?auto=format&fit=crop&w=1200&q=80",
        "caption": "Máy giặt công nghiệp tại Hòa Lạc Laundry"
      },
      {
        "url": "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80",
        "caption": "Đồ sau giặt được gấp gọn và đóng túi cẩn thận"
      }
    ],
    "serviceTypes": [
      "Giặt sấy theo ký",
      "Giặt đồ thường",
      "Giặt chăn ga gối",
      "Giao nhận tận nơi"
    ],
    "status": "active",
    "createdAt": "2024-02-15"
  },
  {
    "id": "svc-005",
    "providerId": "sp-002",
    "category": "laundry",
    "categoryLabel": "Giặt là",
    "name": "Giặt chăn ga – Đồ lớn Hòa Lạc",
    "slug": "giat-chan-ga-do-lon-hoa-lac",
    "shortDesc": "Giặt chuyên dụng chăn, ga, gối, đệm, rèm. Máy giặt công nghiệp lồng lớn. Sấy khô hoàn toàn, không ẩm mốc.",
    "description": "Dịch vụ giặt chuyên biệt cho đồ lớn: chăn, ga, gối, đệm cuộn, rèm cửa, khăn tắm dày. Sử dụng máy giặt công nghiệp lồng lớn, không làm hỏng sợi vải.\n\nĐặc biệt phù hợp cho:\n– Chăn bông dày, chăn lông vũ\n– Ga đôi, ga đơn\n– Gối ôm, gối đầu\n– Rèm cửa, màn\n\nThời gian hoàn thành: Trong ngày (nếu đặt trước 10h sáng).",
    "serviceArea": [
      "Tân Xã",
      "Thạch Hòa",
      "Khu ĐH FPT"
    ],
    "serviceAreaDisplay": "Tân Xã • Thạch Hòa • Khu ĐH FPT",
    "operatingHours": "06:30 - 21:00 thứ Hai đến Chủ nhật",
    "priceInfo": "Liên hệ để biết giá",
    "priceNote": "Giá theo loại và kích thước đồ",
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80",
        "caption": "Giặt chăn ga chuyên dụng – sạch và không xù lông"
      }
    ],
    "serviceTypes": [
      "Giặt chăn",
      "Giặt ga gối",
      "Giặt đệm cuộn",
      "Giặt rèm cửa"
    ],
    "status": "active",
    "createdAt": "2024-02-15"
  },
  {
    "id": "svc-006",
    "providerId": "sp-004",
    "category": "laundry",
    "categoryLabel": "Giặt là",
    "name": "Giặt sấy nhanh FPT Zone",
    "slug": "giat-say-nhanh-fpt-zone",
    "shortDesc": "Tiệm giặt sấy ngay gần khu ĐH FPT. Nộp đồ sáng, lấy chiều. Hoặc giặt nhanh 2 tiếng theo yêu cầu.",
    "description": "Tiệm Giặt Nhanh FPT Zone tọa lạc ngay tại khu Tân Xã, gần cổng ĐH FPT Hòa Lạc. Thuận tiện cho sinh viên ghé nộp đồ và lấy đồ trong ngày.\n\nDịch vụ:\n– Giặt + Sấy thông thường (hoàn trả trong ngày)\n– Giặt nhanh 2 tiếng (phụ phí nhanh áp dụng)\n– Nhận đồ tại tiệm hoặc gọi đặt lịch giao nhận\n\nCam kết: Đồ sạch, thơm, gấp ngay ngắn. Không làm lẫn đồ khách.",
    "serviceArea": [
      "Tân Xã",
      "Khu ĐH FPT",
      "Bình Yên"
    ],
    "serviceAreaDisplay": "Tân Xã • Khu ĐH FPT • Bình Yên",
    "operatingHours": "07:00 - 22:00 hàng ngày (kể cả cuối tuần)",
    "priceInfo": "Liên hệ để biết giá",
    "priceNote": "Giá cạnh tranh cho sinh viên, báo giá qua Zalo",
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1604335398980-ededb702a8f1?auto=format&fit=crop&w=1200&q=80",
        "caption": "Tiệm giặt sấy phục vụ sinh viên FPT"
      }
    ],
    "serviceTypes": [
      "Giặt trong ngày",
      "Giặt nhanh 2 tiếng",
      "Giặt quần áo",
      "Giao nhận tại tiệm"
    ],
    "status": "active",
    "createdAt": "2024-04-25"
  },
  {
    "id": "svc-007",
    "providerId": "sp-003",
    "category": "cleaning",
    "categoryLabel": "Vệ sinh",
    "name": "Vệ sinh phòng trọ định kỳ",
    "slug": "ve-sinh-phong-tro-dinh-ky",
    "shortDesc": "Dọn dẹp phòng trọ, nhà trọ theo tuần hoặc theo tháng. Nhân viên nữ chuyên nghiệp, có đồng phục, mang dụng cụ.",
    "description": "Dịch vụ vệ sinh phòng trọ định kỳ của Sao Hòa Lạc – phù hợp cho sinh viên bận học và người đi làm không có thời gian dọn phòng.\n\nNội dung bao gồm:\n– Quét hút bụi sàn nhà\n– Lau sàn (sạch khuẩn theo yêu cầu)\n– Lau bụi bề mặt bàn ghế, kệ tủ\n– Dọn nhà vệ sinh, nhà tắm\n– Đổ rác, sắp xếp gọn gàng\n\nNhân viên mang đầy đủ dụng cụ và hóa chất tẩy rửa an toàn. Bạn không cần chuẩn bị gì thêm.\n\nLên lịch linh hoạt: hàng tuần, 2 tuần/lần hoặc theo yêu cầu.",
    "serviceArea": [
      "Tân Xã",
      "Thạch Hòa",
      "Bình Yên",
      "Toàn khu Hòa Lạc"
    ],
    "serviceAreaDisplay": "Tân Xã • Thạch Hòa • Bình Yên • Toàn khu Hòa Lạc",
    "operatingHours": "08:00 - 18:00 thứ Hai đến thứ Bảy",
    "priceInfo": "Liên hệ để biết giá",
    "priceNote": "Giá theo diện tích phòng và tần suất dọn",
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
        "caption": "Nhân viên vệ sinh chuyên nghiệp dọn dẹp phòng trọ"
      },
      {
        "url": "https://images.unsplash.com/photo-1527515637462-cff94abb904d?auto=format&fit=crop&w=1200&q=80",
        "caption": "Phòng trọ sạch bóng sau khi được vệ sinh"
      }
    ],
    "serviceTypes": [
      "Vệ sinh phòng đơn",
      "Vệ sinh nhà tắm WC",
      "Lau sàn, hút bụi",
      "Dọn định kỳ theo tuần/tháng"
    ],
    "status": "active",
    "createdAt": "2024-03-10"
  },
  {
    "id": "svc-008",
    "providerId": "sp-003",
    "category": "cleaning",
    "categoryLabel": "Vệ sinh",
    "name": "Tổng vệ sinh nhà – Cuối thuê / Bàn giao",
    "slug": "tong-ve-sinh-nha-cuoi-thue",
    "shortDesc": "Vệ sinh toàn diện khi kết thúc hợp đồng thuê hoặc chuẩn bị bàn giao phòng. Làm sạch sâu mọi ngóc ngách.",
    "description": "Gói tổng vệ sinh toàn diện, phù hợp khi:\n– Kết thúc hợp đồng thuê phòng, trả lại cho chủ nhà\n– Chủ nhà cần dọn phòng để đón người thuê mới\n– Dọn sạch sau thời gian dài không dọn dẹp\n\nNội dung tổng vệ sinh:\n– Lau toàn bộ sàn, tường, trần phòng\n– Vệ sinh sâu nhà tắm, toilet (tẩy cặn, mốc, rêu)\n– Lau kính cửa sổ, cửa kính\n– Lau bụi quạt trần, điều hòa (bên ngoài)\n– Dọn sạch bếp, bồn rửa\n– Thu gom rác, đổ rác toàn bộ\n\nĐội 2 - 3 người, thời gian 3 - 5 tiếng tùy diện tích.",
    "serviceArea": [
      "Tân Xã",
      "Thạch Hòa",
      "Bình Yên",
      "Toàn khu Hòa Lạc"
    ],
    "serviceAreaDisplay": "Tân Xã • Thạch Hòa • Toàn khu Hòa Lạc",
    "operatingHours": "08:00 - 18:00 thứ Hai đến thứ Bảy",
    "priceInfo": "Liên hệ để biết giá",
    "priceNote": "Báo giá theo diện tích và tình trạng phòng",
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=1200&q=80",
        "caption": "Tổng vệ sinh toàn diện trước khi bàn giao phòng"
      }
    ],
    "serviceTypes": [
      "Tổng vệ sinh phòng",
      "Vệ sinh bàn giao",
      "Tẩy mốc WC",
      "Lau kính cửa"
    ],
    "status": "active",
    "createdAt": "2024-03-10"
  }
];
export default { providers: MOCK_SERVICE_PROVIDERS, services: MOCK_SERVICES };
