-- Chỉ dùng cho môi trường không chạy Hibernate ddl-auto=update.
-- Kiểm tra cột trước; thực hiện một lần nếu public_visible chưa tồn tại.
-- SHOW COLUMNS FROM rooms LIKE 'public_visible';
ALTER TABLE rooms ADD COLUMN public_visible BOOLEAN NOT NULL DEFAULT FALSE;
