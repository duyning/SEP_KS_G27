-- Local demo only. Reuses an already eligible provider; does not alter users or permissions.
-- Idempotent: demo records are identified by the [DEMO-SV-*] prefix.
SET NAMES utf8mb4;
START TRANSACTION;
SET @provider = (SELECT MIN(u.user_id) FROM users u
 JOIN user_capabilities uc ON uc.user_id=u.user_id AND uc.status='ACTIVE'
 JOIN capabilities c ON c.capability_id=uc.capability_id AND c.code='MANAGE_SERVICE'
 WHERE u.status='ACTIVE');
CREATE TEMPORARY TABLE demo_services_input (
 code VARCHAR(30), category_word VARCHAR(40), title VARCHAR(255), area VARCHAR(500),
 pricing VARCHAR(20), price DECIMAL(12,2), description TEXT
);
INSERT INTO demo_services_input VALUES
('01','Chuyển','Chuyển trọ gọn nhẹ An Tâm','Tân Xã, Khu ĐH FPT','FROM',250000,'Hỗ trợ vận chuyển đồ cá nhân, thùng sách và đồ dùng sinh viên. Báo giá theo quãng đường và số lượng đồ. Dữ liệu demo để xem giao diện.'),
('02','Chuyển','Xe tải nhỏ chuyển phòng cuối tuần','Thạch Hòa, Bình Yên','FROM',350000,'Nhận chuyển phòng trong khu vực Hòa Lạc, có hỗ trợ bốc xếp theo thỏa thuận. Dữ liệu demo để xem giao diện.'),
('03','Chuyển','Đóng gói và chuyển đồ phòng trọ','Tân Xã, Khu Công nghệ cao','NEGOTIABLE',NULL,'Trao đổi trước về tầng nhà, đồ dễ vỡ và lịch chuyển. Chi phí được xác nhận trước khi thực hiện. Dữ liệu demo.'),
('04','Giặt','Giặt sấy quần áo sinh viên','Tân Xã, Khu ĐH FPT','FROM',15000,'Giặt sấy quần áo theo kg, phân loại đồ trước khi nhận. Liên hệ xác nhận đơn giá và thời gian nhận đồ. Dữ liệu demo.'),
('05','Giặt','Giặt chăn ga và áo khoác','Bình Yên, Thạch Hòa','FROM',50000,'Nhận giặt chăn, ga, vỏ gối và áo khoác. Giá tùy kích thước và chất liệu. Dữ liệu demo để kiểm tra thẻ dài.'),
('06','Giặt','Vệ sinh giày quanh Hòa Lạc','Khu ĐH FPT, Tân Xã','FIXED',40000,'Vệ sinh giày vải thông thường. Những chất liệu đặc biệt cần trao đổi và xác nhận riêng. Dữ liệu demo.'),
('07','Dọn','Dọn phòng trước khi nhận trọ','Tân Xã, Thạch Hòa','FROM',180000,'Lau sàn, vệ sinh bàn ghế, cửa và khu bếp trong phòng trống. Báo giá theo diện tích. Dữ liệu demo.'),
('08','Dọn','Vệ sinh bếp và nhà tắm','Bình Yên, Khu Công nghệ cao','FROM',200000,'Vệ sinh khu bếp và nhà tắm phòng trọ. Khách cung cấp ảnh hiện trạng để thống nhất phạm vi. Dữ liệu demo.'),
('09','Dọn','Dọn dẹp định kỳ phòng ở ghép','Tân Xã, Bình Yên','NEGOTIABLE',NULL,'Nhận lịch dọn định kỳ theo tuần hoặc theo tháng. Số người, diện tích và hạng mục sẽ được trao đổi trước. Dữ liệu demo.'),
('10','Sửa','Sửa điện nước phòng trọ','Thạch Hòa, Tân Xã','NEGOTIABLE',NULL,'Kiểm tra vòi nước, đường ống và thiết bị điện dân dụng. Vật tư và tiền công báo riêng trước khi sửa. Dữ liệu demo.'),
('11','Sửa','Lắp kệ và sửa đồ dùng nhỏ','Khu ĐH FPT, Bình Yên','FROM',100000,'Hỗ trợ lắp kệ, siết vít và sửa đồ dùng nhỏ tại phòng. Trao đổi với chủ trọ trước khi khoan tường. Dữ liệu demo.'),
('12','Sửa','Kiểm tra điều hòa và quạt','Khu Công nghệ cao, Thạch Hòa','FROM',150000,'Kiểm tra và vệ sinh thiết bị theo tình trạng thực tế. Chưa bao gồm linh kiện thay thế. Dữ liệu demo.');
INSERT INTO service_registrations (user_id, category_id, service_name, applicant_name, contact_info,
 pricing_type, service_area, price, description, status, capability_decision, listing_decision, reason_note, created_at, reviewed_at)
SELECT @provider,c.category_id,CONCAT('[DEMO-SV-',d.code,'] ',d.title),u.full_name,NULL,
 d.pricing,d.area,d.price,d.description,'APPROVED','APPROVE','APPROVE',
 'Dữ liệu demo cục bộ để kiểm tra giao diện; không phải dịch vụ thật.',NOW(),NOW()
FROM demo_services_input d JOIN service_categories c ON c.name LIKE CONCAT(d.category_word,'%')
JOIN users u ON u.user_id=@provider
WHERE NOT EXISTS (SELECT 1 FROM service_registrations r WHERE r.service_name LIKE CONCAT('[DEMO-SV-',d.code,']%'));
INSERT INTO services (provider_id,category_id,registration_id,service_name,contact_info,pricing_type,service_area,price,description,status,created_at)
SELECT r.user_id,r.category_id,r.registration_id,r.service_name,NULL,r.pricing_type,r.service_area,r.price,r.description,'ACTIVE',NOW()
FROM service_registrations r WHERE r.service_name LIKE '[DEMO-SV-%'
AND NOT EXISTS (SELECT 1 FROM services s WHERE s.registration_id=r.registration_id);
DROP TEMPORARY TABLE demo_services_input;
COMMIT;
SELECT service_id,service_name,pricing_type,price FROM services WHERE service_name LIKE '[DEMO-SV-%' ORDER BY service_id;
