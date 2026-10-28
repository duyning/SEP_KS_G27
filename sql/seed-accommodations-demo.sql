-- Local development/demo only. All properties are fictional and visibly labelled DEMO.
-- Run against hlrcs after the application has created tables and demo accounts.
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
    (8, 'DEMO - Nhà trọ đã ẩn', 'Khu demo 08, Bình Yên, Hòa Lạc, Hà Nội', 'binh-yen', 'HIDDEN', 'APPROVED', 'Studio khép kín đã ẩn', 2100000, 26, 2, 'Phòng xép đã ẩn', 1700000, 22, 1);

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
        'latitude', '21.0188', 'longitude', '105.5215',
        'amenities', JSON_ARRAY('wifi', 'parking', 'security'), 'selectedRules', JSON_ARRAY(),
        'rules', 'Dữ liệu mô phỏng, không dùng để giao dịch.', 'termsAccepted', TRUE)
FROM tmp_hlrcs_demo_properties d
WHERE NOT EXISTS (SELECT 1 FROM property_registrations r WHERE r.user_id = @demo_host AND r.name = d.name);

INSERT INTO properties (owner_id, registration_id, name, address, contact_info, description, status, created_at, updated_at)
SELECT @demo_host, r.registration_id, d.name, d.address, 'Dữ liệu demo, không phải thông tin liên hệ thực tế.',
    '[HLRCS_DEMO_ACCOMMODATION_V1] Nhà trọ giả lập để kiểm thử. Không phải tin cho thuê thực tế.',
    d.property_status, NOW(6), NOW(6)
FROM tmp_hlrcs_demo_properties d
JOIN property_registrations r ON r.user_id = @demo_host AND r.name = d.name
WHERE NOT EXISTS (SELECT 1 FROM properties p WHERE p.registration_id = r.registration_id);

CREATE TEMPORARY TABLE tmp_hlrcs_demo_types AS
SELECT p.property_id, n.type_no,
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
     electricity_price, water_price, internet_price, service_price, created_at, updated_at)
SELECT d.property_id, d.room_type, d.price, d.area_sqm, 2, d.price, d.image_url,
    'Loại phòng DEMO để thử giao diện. Ảnh chỉ mang tính minh họa, không phải phòng cho thuê thực tế.',
    JSON_ARRAY('wifi', 'privateBathroom', 'bed', 'kitchen'),
    3500, 80000, 100000, 50000, NOW(6), NOW(6)
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

