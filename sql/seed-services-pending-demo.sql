-- Local-only pending applications. No permissions or public listings are created.
SET NAMES utf8mb4;
START TRANSACTION;
SET @provider = (SELECT MIN(u.user_id) FROM users u
 JOIN user_capabilities uc ON uc.user_id=u.user_id AND uc.status='ACTIVE'
 JOIN capabilities c ON c.capability_id=uc.capability_id AND c.code='MANAGE_SERVICE'
 WHERE u.status='ACTIVE' AND u.role NOT IN ('STAFF','ADMIN'));
CREATE TEMPORARY TABLE demo_pending_input (code VARCHAR(30),category_word VARCHAR(40),title VARCHAR(255),area VARCHAR(500),pricing VARCHAR(20),price DECIMAL(12,2),description TEXT);
INSERT INTO demo_pending_input VALUES
('01','Chuyển','Chuyển trọ Hòa Lạc - chờ xét duyệt','Tân Xã, Thạch Hòa','FROM',280000,'Nhận chuyển đồ sinh viên trong khu vực Hòa Lạc. Trao đổi số lượng đồ và tầng nhà trước khi báo giá. Hồ sơ demo để kiểm thử duyệt.'),
('02','Giặt','Giặt sấy lấy đồ cuối tuần - chờ xét duyệt','Bình Yên, Khu ĐH FPT','FIXED',20000,'Giặt sấy quần áo thông thường theo kg. Xác nhận chất liệu và lịch nhận đồ trước khi sử dụng. Hồ sơ demo để kiểm thử duyệt.'),
('03','Dọn','Dọn phòng ở ghép - chờ xét duyệt','Tân Xã, Bình Yên','NEGOTIABLE',NULL,'Lau dọn khu sinh hoạt chung và nhà tắm. Báo giá dựa trên diện tích và hiện trạng thực tế. Hồ sơ demo để kiểm thử duyệt.'),
('04','Sửa','Sửa vòi nước và thiết bị nhỏ - chờ xét duyệt','Thạch Hòa, Khu Công nghệ cao','FROM',120000,'Kiểm tra rò nước và các thiết bị dân dụng nhỏ, báo riêng vật tư nếu cần thay thế. Hồ sơ demo để kiểm thử duyệt.');
INSERT INTO service_registrations (user_id,category_id,service_name,applicant_name,pricing_type,service_area,price,description,status,created_at)
SELECT @provider,c.category_id,CONCAT('[DEMO-PENDING-',d.code,'] ',d.title),u.full_name,d.pricing,d.area,d.price,d.description,'PENDING',NOW()
FROM demo_pending_input d JOIN service_categories c ON c.name LIKE CONCAT(d.category_word,'%')
JOIN users u ON u.user_id=@provider
WHERE NOT EXISTS(SELECT 1 FROM service_registrations r WHERE r.service_name LIKE CONCAT('[DEMO-PENDING-',d.code,']%'));
-- Explicitly labelled sample PDF, not a real verification document.
INSERT INTO service_documents (registration_id,document_name,verification_status,content_type,file_content)
SELECT r.registration_id,'DEMO_ONLY_service_application.pdf','PENDING','application/pdf',UNHEX('255044462d312e340a312030206f626a0a3c3c202f54797065202f436174616c6f67202f5061676573203220302052203e3e0a656e646f626a0a322030206f626a0a3c3c202f54797065202f5061676573202f4b696473205b33203020525d202f436f756e742031203e3e0a656e646f626a0a332030206f626a0a3c3c202f54797065202f50616765202f506172656e74203220302052202f4d65646961426f78205b30203020353935203834325d202f5265736f7572636573203c3c202f466f6e74203c3c202f4631203420302052203e3e203e3e202f436f6e74656e7473203520302052203e3e0a656e646f626a0a342030206f626a0a3c3c202f54797065202f466f6e74202f53756274797065202f5479706531202f42617365466f6e74202f48656c766574696361203e3e0a656e646f626a0a352030206f626a0a3c3c202f4c656e67746820313239203e3e0a73747265616d0a4254202f463120313620546620353020373530205464202844454d4f204f4e4c59202d2053657276696365206170706c69636174696f6e2055492074657374696e672920546a2030202d333020546420284e6f7420616e206964656e74697479206f7220766572696669636174696f6e20646f63756d656e742e2920546a2045540a656e6473747265616d0a656e646f626a0a787265660a3020360a303030303030303030302036353533352066200a30303030303030303039203030303030206e200a30303030303030303538203030303030206e200a30303030303030313135203030303030206e200a30303030303030323431203030303030206e200a30303030303030333131203030303030206e200a747261696c65720a3c3c202f53697a652036202f526f6f74203120302052203e3e0a7374617274787265660a3439310a2525454f460a')
FROM service_registrations r WHERE r.service_name LIKE '[DEMO-PENDING-%'
AND NOT EXISTS(SELECT 1 FROM service_documents d WHERE d.registration_id=r.registration_id);
DROP TEMPORARY TABLE demo_pending_input;
COMMIT;
SELECT r.registration_id,r.service_name,r.status,r.reviewed_at,
 (SELECT COUNT(*) FROM service_documents d WHERE d.registration_id=r.registration_id) AS documents,
 (SELECT COUNT(*) FROM services s WHERE s.registration_id=r.registration_id) AS public_listings
FROM service_registrations r WHERE r.service_name LIKE '[DEMO-PENDING-%';
