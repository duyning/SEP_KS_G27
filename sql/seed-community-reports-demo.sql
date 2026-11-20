-- Local development only. Start the updated backend before running this script.
-- Re-run safely to fill missing demo rows without reopening existing reports.
START TRANSACTION;

SET @demo_author = (SELECT user_id FROM users WHERE email = 'host@hlrcs.com' AND role = 'ROOM_HOST' AND status = 'ACTIVE');
SET @demo_reporter = (SELECT user_id FROM users WHERE email = 'user@hlrcs.com' AND role = 'USER' AND status = 'ACTIVE');
SET @demo_admin = (SELECT user_id FROM users WHERE email = 'admin@hlrcs.com' AND role = 'ADMIN' AND status = 'ACTIVE');

INSERT INTO posts (author_id, post_type, title, description, location, contact_name, status, created_at, updated_at)
SELECT @demo_author, 'PASS_ITEM', demo.title, demo.description, 'Tân Xã, Hòa Lạc', 'Tài khoản demo', demo.post_status, NOW(), NOW()
FROM (
    SELECT '[DEMO-BC-01] Bàn học gỗ ở Tân Xã' AS title,
           'Dữ liệu demo: người xem nghi ngờ bài đăng yêu cầu chuyển tiền trước khi xem bàn.' AS description,
           'APPROVED' AS post_status
    UNION ALL SELECT '[DEMO-BC-02] Ghế xoay sinh viên', 'Dữ liệu demo: bài đăng ghế đã được kiểm tra và không phát hiện spam.', 'APPROVED'
    UNION ALL SELECT '[DEMO-BC-03] Thanh lý kệ sách', 'Dữ liệu demo: bài bị ẩn sau khi xử lý báo cáo sai lệch.', 'HIDDEN'
) demo
WHERE @demo_author IS NOT NULL AND @demo_reporter IS NOT NULL AND @demo_admin IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.author_id = @demo_author AND p.title = demo.title);

INSERT INTO reports (reporter_id, target_type, target_id, post_title, reason_code, reason, status,
                     handler_id, resolution_note, resolved_at, created_at)
SELECT @demo_reporter, 'POST', p.post_id, p.title, demo.reason_code, demo.reason, demo.report_status,
       IF(demo.report_status = 'OPEN', NULL, @demo_admin), demo.resolution_note,
       IF(demo.report_status = 'OPEN', NULL, NOW()), NOW()
FROM (
    SELECT '[DEMO-BC-01] Bàn học gỗ ở Tân Xã' AS title, 'FRAUD' AS reason_code,
           'Người bán yêu cầu chuyển cọc trước khi cho xem bàn.' AS reason,
           'OPEN' AS report_status, CAST(NULL AS CHAR(255)) AS resolution_note
    UNION ALL SELECT '[DEMO-BC-02] Ghế xoay sinh viên', 'SPAM', 'Nghi bài đăng bị trùng.', 'DISMISSED',
                     'Đã kiểm tra và không tìm thấy bài đăng trùng.'
    UNION ALL SELECT '[DEMO-BC-03] Thanh lý kệ sách', 'MISLEADING', 'Ảnh sản phẩm khác với món đồ thực tế.', 'RESOLVED',
                     'Đã xác nhận thông tin sai lệch và ẩn bài.'
) demo
JOIN posts p ON p.title = demo.title AND p.author_id = @demo_author
WHERE @demo_reporter IS NOT NULL AND @demo_admin IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM reports r WHERE r.target_type = 'POST' AND r.target_id = p.post_id AND r.reporter_id = @demo_reporter
  );

INSERT INTO moderation_logs (staff_id, target_type, target_id, action, note, created_at)
SELECT r.handler_id, 'COMMUNITY_POST_REPORT', r.report_id, r.status, r.resolution_note, r.resolved_at
FROM reports r
WHERE r.reporter_id = @demo_reporter AND r.target_type = 'POST' AND r.handler_id IS NOT NULL
  AND r.post_title LIKE '[DEMO-BC-%'
  AND NOT EXISTS (
      SELECT 1 FROM moderation_logs m WHERE m.target_type = 'COMMUNITY_POST_REPORT' AND m.target_id = r.report_id
  );

INSERT INTO moderation_logs (staff_id, target_type, target_id, action, note, created_at)
SELECT @demo_admin, 'COMMUNITY_POST', p.post_id, 'HIDDEN', 'Đã xác nhận thông tin sai lệch và ẩn bài.', NOW()
FROM posts p
WHERE p.author_id = @demo_author AND p.title = '[DEMO-BC-03] Thanh lý kệ sách' AND p.status = 'HIDDEN'
  AND @demo_admin IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM moderation_logs m WHERE m.target_type = 'COMMUNITY_POST' AND m.target_id = p.post_id AND m.action = 'HIDDEN'
  );

COMMIT;
