-- Local development/demo only. All properties are fictional and visibly labelled DEMO.
-- Run against hlrcs after the application has created tables and demo accounts.
-- Requires the room availability and property reverification migrations.
-- Additive and repeatable: never changes existing users, approvals, properties or rooms.
SET NAMES utf8mb4;
SET @demo_host = (SELECT user_id FROM users WHERE email = 'host@hlrcs.com' AND role = 'ROOM_HOST' AND status = 'ACTIVE');
SET @demo_staff = (SELECT user_id FROM users WHERE email = 'staff@hlrcs.com' AND role = 'STAFF' AND status = 'ACTIVE');

-- Fail before writing any real rows when required demo users are missing.
CREATE TEMPORARY TABLE tmp_hlrcs_demo_users (user_id INT NOT NULL);
INSERT INTO tmp_hlrcs_demo_users VALUES (@demo_host), (@demo_staff);

CREATE TEMPORARY TABLE tmp_hlrcs_demo_properties (
    ordinal INT PRIMARY KEY, name VARCHAR(100), address VARCHAR(255), commune VARCHAR(30),
    property_status VARCHAR(20), approval VARCHAR(20),
    type1 VARCHAR(100), price1 DECIMAL(12,2), area1 FLOAT, vacant1 INT,
    type2 VARCHAR(100), price2 DECIMAL(12,2), area2 FLOAT, vacant2 INT
);
INSERT INTO tmp_hlrcs_demo_properties VALUES
    (1, 'DEMO - An Nhiên Tân Xã', 'Khu demo 01, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Studio khép kín ban công', 1800000, 22, 2, 'Phòng khép kín tiêu chuẩn', 1400000, 18, 1),
    (2, 'DEMO - Minh Quân Tân Xã', 'Khu demo 02, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Studio khép kín rộng', 2600000, 30, 3, 'Phòng gác lửng', 2200000, 26, 1),
    (3, 'DEMO - Bình Minh Thạch Hòa', 'Khu demo 03, Thạch Hòa, Hòa Lạc, Hà Nội', 'thach-hoa', 'ACTIVE', 'APPROVED', 'Phòng khép kín tiết kiệm', 1200000, 16, 2, 'Phòng xép có bếp', 1700000, 23, 0),
    (4, 'DEMO - Sinh Viên Bình Yên', 'Khu demo 04, Bình Yên, Hòa Lạc, Hà Nội', 'binh-yen', 'ACTIVE', 'APPROVED', 'Phòng gác lửng cho hai người', 2000000, 25, 2, 'Studio khép kín yên tĩnh', 2400000, 28, 1),
    (5, 'DEMO - Căn hộ Hòa Lạc', 'Khu demo 05, gần Khu Công nghệ cao Hòa Lạc, Hà Nội', 'cnc', 'ACTIVE', 'APPROVED', 'Chung cư mini một phòng ngủ', 3800000, 38, 1, 'Chung cư mini hai người', 4200000, 42, 2),
    (6, 'DEMO - Vườn Xanh Thạch Hòa', 'Khu demo 06, Thạch Hòa, Hòa Lạc, Hà Nội', 'thach-hoa', 'ACTIVE', 'APPROVED', 'Studio khép kín hướng vườn', 2800000, 32, 0, 'Phòng khép kín đầy đủ nội thất', 3200000, 35, 2),
    (7, 'DEMO - Nhà trọ chờ duyệt', 'Khu demo 07, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'PENDING', 'Studio khép kín chờ duyệt', 1900000, 24, 2, 'Phòng gác lửng chờ duyệt', 1600000, 20, 1),
    (8, 'DEMO - Nhà trọ đã ẩn', 'Khu demo 08, Bình Yên, Hòa Lạc, Hà Nội', 'binh-yen', 'HIDDEN', 'APPROVED', 'Studio khép kín đã ẩn', 2100000, 26, 2, 'Phòng xép đã ẩn', 1700000, 22, 1),
    (9, 'DEMO - Cổng FPT', 'Khu demo 09, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Phòng khép kín sát điểm gốc', 1500000, 18, 3, 'Studio khép kín có ban công', 2500000, 24, 2),
    (10, 'DEMO - Đường Tre Tân Xã', 'Khu demo 10, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Phòng gác lửng có bếp', 2499999, 25, 2, 'Chung cư mini hai người', 3500000, 37, 1),
    (11, 'DEMO - Ngõ Sấu Tân Xã', 'Khu demo 11, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Phòng khép kín giá thấp', 1499999, 17, 2, 'Studio khép kín có máy giặt', 2500001, 29, 1),
    (12, 'DEMO - Mốc Một Km', 'Khu demo 12, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Phòng khép kín tại biên bán kính', 2200000, 22, 2, 'Phòng gác lửng tại biên bán kính', 2500000, 30, 1),
    (13, 'DEMO - Sau Mốc Một Km', 'Khu demo 13, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Phòng khép kín ngoài bán kính', 2200000, 22, 2, 'Chung cư mini trên 3,5 triệu', 3500001, 36, 1),
    (14, 'DEMO - Vườn Mít Thạch Hòa', 'Khu demo 14, Thạch Hòa, Hòa Lạc, Hà Nội', 'thach-hoa', 'ACTIVE', 'APPROVED', 'Phòng khép kín có tủ lạnh', 1850000, 21, 1, 'Phòng gác lửng hai người', 2750000, 28, 3),
    (15, 'DEMO - Bến Xe Thạch Hòa', 'Khu demo 15, Thạch Hòa, Hòa Lạc, Hà Nội', 'thach-hoa', 'ACTIVE', 'APPROVED', 'Phòng khép kín cạnh bến xe', 1600000, 20, 0, 'Studio khép kín rộng', 2350000, 30, 2),
    (16, 'DEMO - Nắng Sớm Bình Yên', 'Khu demo 16, Bình Yên, Hòa Lạc, Hà Nội', 'binh-yen', 'ACTIVE', 'APPROVED', 'Phòng gác lửng đón nắng', 2000000, 26, 1, 'Chung cư mini có ban công', 4100000, 45, 2),
    (17, 'DEMO - Vườn Cau Bình Yên', 'Khu demo 17, Bình Yên, Hòa Lạc, Hà Nội', 'binh-yen', 'ACTIVE', 'APPROVED', 'Phòng khép kín tầng trệt', 1450000, 16, 2, 'Phòng gác lửng tầng hai', 1900000, 24, 0),
    (18, 'DEMO - Hồ Sen Bình Yên', 'Khu demo 18, Bình Yên, Hòa Lạc, Hà Nội', 'binh-yen', 'ACTIVE', 'APPROVED', 'Studio khép kín có ban công', 2600000, 30, 2, 'Chung cư mini hai phòng ngủ', 4800000, 55, 1),
    (19, 'DEMO - Kỹ Sư Hòa Lạc', 'Khu demo 19, gần Khu Công nghệ cao Hòa Lạc, Hà Nội', 'cnc', 'ACTIVE', 'APPROVED', 'Chung cư mini có thang máy', 3200000, 32, 2, 'Chung cư mini có máy giặt', 4300000, 43, 1),
    (20, 'DEMO - Ca Đêm Hòa Lạc', 'Khu demo 20, gần Khu Công nghệ cao Hòa Lạc, Hà Nội', 'cnc', 'ACTIVE', 'APPROVED', 'Studio khép kín giờ tự do', 2600000, 26, 1, 'Phòng gác lửng có điều hòa', 3100000, 31, 3),
    (21, 'DEMO - Thiếu Tọa Độ', 'Khu demo 21, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Phòng khép kín chưa ghim', 1750000, 19, 2, 'Studio khép kín chưa ghim', 2150000, 27, 1),
    (22, 'DEMO - Tọa Độ Một Phần', 'Khu demo 22, Thạch Hòa, Hòa Lạc, Hà Nội', 'thach-hoa', 'ACTIVE', 'APPROVED', 'Phòng khép kín thiếu kinh độ', 1950000, 22, 1, 'Phòng gác lửng thiếu kinh độ', 2450000, 29, 2),
    (23, 'DEMO - Đã Hết Phòng', 'Khu demo 23, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Phòng khép kín đã thuê hết', 1300000, 19, 0, 'Studio khép kín đã thuê hết', 1800000, 26, 0),
    (24, 'DEMO - Chờ Tái Xác Minh', 'Khu demo 24, Tân Xã, Hòa Lạc, Hà Nội', 'tan-xa', 'ACTIVE', 'APPROVED', 'Studio khép kín tạm ẩn', 1000000, 28, 3, 'Chung cư mini tạm ẩn', 1500000, 42, 2);

START TRANSACTION;
INSERT INTO property_registrations
    (user_id, name, address, contact_info, status, created_at, reviewed_at, reviewed_by, reason_note, registration_details)
SELECT @demo_host, d.name, d.address, 'Dữ liệu demo, không phải thông tin liên hệ thực tế.', d.approval,
    NOW(6), IF(d.approval = 'APPROVED', NOW(6), NULL),
    IF(d.approval = 'APPROVED', @demo_staff, NULL),
    '[HLRCS_DEMO_ACCOMMODATION_V1] Hồ sơ giả lập để kiểm thử, không phải kết quả thẩm định thực tế.',
    JSON_OBJECT('name', d.name, 'propertyType', 'Nhà trọ', 'description',
        'Nhà trọ DEMO phục vụ kiểm thử danh sách, phân trang và quản lý phòng. Không phải tin cho thuê thực tế.',
        'managerName', 'Chủ trọ Demo', 'contactPhone', '', 'zaloPhone', '', 'commune', d.commune,
        'addressDetail', d.address, 'nearby', 'Khu vực demo Hòa Lạc',
        'latitude', CASE d.ordinal WHEN 1 THEN '21.01354' WHEN 2 THEN '21.01854'
            WHEN 3 THEN '21.022533216059187' WHEN 4 THEN '21.04354' WHEN 5 THEN NULL
            WHEN 9 THEN '21.01354' WHEN 10 THEN '21.01754' WHEN 11 THEN '21.01754'
            WHEN 12 THEN '21.022533216059187' WHEN 13 THEN '21.022634'
            WHEN 21 THEN NULL ELSE CAST(21.01354 + (d.ordinal - 12) * 0.0017 AS CHAR) END,
        'longitude', CASE WHEN d.ordinal IN (5, 21, 22) THEN NULL
            WHEN d.ordinal <= 4 OR d.ordinal BETWEEN 9 AND 13 THEN '105.52522'
            ELSE CAST(105.5200 + MOD(d.ordinal, 4) * 0.002 AS CHAR) END,
        'amenities', CASE MOD(d.ordinal, 4)
            WHEN 0 THEN JSON_ARRAY('wifi', 'parking', 'elevator', 'camera', 'fireSafety')
            WHEN 1 THEN JSON_ARRAY('wifi', 'parking', 'flexibleHours', 'separateOwner')
            WHEN 2 THEN JSON_ARRAY('wifi', 'laundry', 'fingerprint', 'camera')
            ELSE JSON_ARRAY('wifi', 'parking', 'security') END,
        'selectedRules', JSON_ARRAY(),
        'rules', 'Dữ liệu mô phỏng, không dùng để giao dịch.', 'termsAccepted', TRUE)
FROM tmp_hlrcs_demo_properties d
WHERE NOT EXISTS (SELECT 1 FROM property_registrations r WHERE r.user_id = @demo_host AND r.name = d.name);

INSERT INTO properties (owner_id, registration_id, name, address, contact_info, description, status,
    reverification_required, reverification_reasons_json, created_at, updated_at)
SELECT @demo_host, r.registration_id, d.name, d.address, 'Dữ liệu demo, không phải thông tin liên hệ thực tế.',
    '[HLRCS_DEMO_ACCOMMODATION_V1] Nhà trọ giả lập để kiểm thử. Không phải tin cho thuê thực tế.',
    d.property_status, d.ordinal = 24, IF(d.ordinal = 24, JSON_ARRAY('Địa chỉ nhà trọ'), NULL), NOW(6), NOW(6)
FROM tmp_hlrcs_demo_properties d
JOIN property_registrations r ON r.user_id = @demo_host AND r.name = d.name
WHERE NOT EXISTS (SELECT 1 FROM properties p WHERE p.registration_id = r.registration_id);

CREATE TEMPORARY TABLE tmp_hlrcs_demo_types AS
SELECT p.property_id, d.ordinal, n.type_no,
    IF(n.type_no = 1, d.type1, d.type2) AS room_type,
    IF(n.type_no = 1, d.price1, d.price2) AS price,
    IF(n.type_no = 1, d.area1, d.area2) AS area_sqm,
    IF(n.type_no = 1, d.vacant1, d.vacant2) AS vacant_count,
    CASE MOD(d.ordinal + n.type_no, 4)
        WHEN 0 THEN 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80'
        WHEN 1 THEN 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80'
        WHEN 2 THEN 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80'
        ELSE 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=80'
    END AS image_url
FROM tmp_hlrcs_demo_properties d
JOIN property_registrations r ON r.user_id = @demo_host AND r.name = d.name
JOIN properties p ON p.registration_id = r.registration_id AND p.owner_id = @demo_host
CROSS JOIN (SELECT 1 AS type_no UNION ALL SELECT 2) n;

INSERT INTO room_types
    (property_id, room_type, price, area_sqm, capacity, deposit, image_url, description, amenities_json,
     electricity_price, water_price, internet_price, service_price, availability_confirmed_at, availability_confirmed_by,
     created_at, updated_at)
SELECT d.property_id, d.room_type, d.price, d.area_sqm,
    CASE WHEN d.area_sqm >= 38 THEN 4 WHEN d.area_sqm < 20 THEN 1 ELSE 2 END,
    CASE MOD(d.ordinal, 3) WHEN 0 THEN 0 WHEN 1 THEN d.price ELSE d.price * 2 END, d.image_url,
    'Loại phòng DEMO để thử giao diện. Ảnh chỉ mang tính minh họa, không phải phòng cho thuê thực tế.',
    CASE
        WHEN d.ordinal = 9 AND d.type_no = 2 THEN JSON_ARRAY('airConditioner', 'balcony', 'waterHeater')
        WHEN d.ordinal = 10 AND d.type_no = 1 THEN JSON_ARRAY('airConditioner', 'kitchen')
        WHEN d.ordinal IN (11, 19) AND d.type_no = 2 THEN JSON_ARRAY('washingMachine', 'refrigerator')
        WHEN d.ordinal = 14 AND d.type_no = 1 THEN JSON_ARRAY('refrigerator', 'waterHeater')
        WHEN d.ordinal IN (16, 18) AND d.room_type LIKE '%ban công%' THEN JSON_ARRAY('balcony', 'airConditioner')
        WHEN d.ordinal = 20 AND d.type_no = 2 THEN JSON_ARRAY('airConditioner', 'waterHeater')
        ELSE CASE MOD(d.ordinal + d.type_no, 5)
        WHEN 0 THEN JSON_ARRAY('airConditioner', 'kitchen', 'privateBathroom')
        WHEN 1 THEN JSON_ARRAY('airConditioner', 'balcony', 'waterHeater', 'privateBathroom')
        WHEN 2 THEN JSON_ARRAY('washingMachine', 'refrigerator', 'kitchen')
        WHEN 3 THEN JSON_ARRAY('airConditioner', 'refrigerator', 'waterHeater')
        ELSE JSON_ARRAY('bed', 'privateBathroom') END
    END,
    3500, 80000, 100000, 50000,
    CASE MOD(d.ordinal + d.type_no, 3)
        WHEN 0 THEN NULL WHEN 1 THEN UTC_TIMESTAMP(6) - INTERVAL 8 DAY ELSE UTC_TIMESTAMP(6) END,
    IF(MOD(d.ordinal + d.type_no, 3) = 0, NULL, @demo_host), NOW(6), NOW(6)
FROM tmp_hlrcs_demo_types d
WHERE NOT EXISTS (SELECT 1 FROM room_types t WHERE t.property_id = d.property_id AND t.room_type = d.room_type);

INSERT INTO rooms (property_id, room_type_id, room_number, floor, status, confirmed_at, created_at, updated_at)
SELECT d.property_id, t.room_type_id, CONCAT(d.type_no, '0', n.room_no), CAST(d.type_no AS CHAR),
    IF(n.room_no <= d.vacant_count, 'VACANT', 'OCCUPIED'), NOW(6), NOW(6), NOW(6)
FROM tmp_hlrcs_demo_types d
JOIN room_types t ON t.property_id = d.property_id AND t.room_type = d.room_type
CROSS JOIN (SELECT 1 AS room_no UNION ALL SELECT 2 UNION ALL SELECT 3) n
WHERE NOT EXISTS (SELECT 1 FROM rooms existing
    WHERE existing.property_id = d.property_id AND existing.room_number = CONCAT(d.type_no, '0', n.room_no));

INSERT INTO moderation_logs (staff_id, target_type, target_id, action, note, created_at)
SELECT @demo_staff, 'PROPERTY_REGISTRATION', r.registration_id, 'APPROVED',
    '[HLRCS_DEMO_ACCOMMODATION_V1] Giả lập duyệt hồ sơ demo; không phải thẩm định thực tế.', NOW(6)
FROM tmp_hlrcs_demo_properties d
JOIN property_registrations r ON r.user_id = @demo_host AND r.name = d.name
WHERE d.approval = 'APPROVED'
    AND NOT EXISTS (SELECT 1 FROM moderation_logs m WHERE m.target_type = 'PROPERTY_REGISTRATION'
        AND m.target_id = r.registration_id AND m.action = 'APPROVED');
COMMIT;

SELECT p.name, p.status, r.status AS approval, COUNT(DISTINCT t.room_type_id) AS room_types,
       COUNT(rooms.room_id) AS rooms, SUM(rooms.status = 'VACANT') AS vacant_rooms
FROM tmp_hlrcs_demo_properties d
JOIN property_registrations r ON r.user_id = @demo_host AND r.name = d.name
JOIN properties p ON p.registration_id = r.registration_id AND p.owner_id = @demo_host
JOIN room_types t ON t.property_id = p.property_id
JOIN rooms ON rooms.room_type_id = t.room_type_id AND rooms.property_id = p.property_id
GROUP BY p.property_id, p.name, p.status, r.status ORDER BY p.property_id;
