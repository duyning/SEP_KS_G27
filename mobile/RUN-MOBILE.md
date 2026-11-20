# Chạy toàn bộ HL_RCS với cổng cố định

Chạy từ bất kỳ terminal PowerShell:

```powershell
cd C:\Users\ADMIN\Downloads\KS_G27\Code\HL-RCS\HL-RCS\mobile; npm run dev
```

- Web API: 8080.
- App API: 8081, bind 0.0.0.0 để điện thoại truy cập qua LAN.
- Web Vite: http://localhost:5173, proxy API tới 8080.
- Expo Go: 8082. Không tự đổi cổng.

Launcher tự lấy IPv4 Wi-Fi, dùng lại API đang chạy hoặc khởi động API còn thiếu với port override rõ ràng, dùng MySQL Windows service hiện có hoặc script MySQL local. Tiếp theo cập nhật riêng EXPO_PUBLIC_API_URL trong .env.local tới IP LAN:8081, kiểm tra API LAN, mở web nếu chưa chạy, kiểm tra proxy và mở Expo cổng 8082. OAuth ID được giữ nguyên. npm start cũng gọi launcher này.

Nếu 8082 đã có Metro, lệnh in địa chỉ exp://IP:8082 để mở bằng Expo Go. Khi Wi-Fi/IP thay đổi, dừng terminal Expo cũ bằng Ctrl+C rồi chạy lại lệnh để bundle nhận cấu hình mới. Nếu cổng bị dịch vụ khác chiếm, launcher báo lỗi, không kill process hoặc tự đổi cổng. Không chạy đồng thời nhiều launcher khi backend đang khởi động.

Điện thoại và PC cần cùng Wi-Fi, không có client isolation/VPN chặn LAN. Cho phép Node/Java trên mạng Private khi Windows Firewall hỏi; không tắt toàn bộ firewall.

Kiểm tra API/web không mở Expo: npm run dev -- -CheckOnly.
Chọn IP thủ công: npm run dev -- -LanIp <IPv4-Wi-Fi>.
Ctrl+C dừng Expo; API/web/MySQL nền vẫn được giữ và tái sử dụng lần sau.
Log nền trong thư mục project .local: web-backend.log, mobile-backend.log, web-ui.log cùng các file -error.log.

Yêu cầu Node/dependencies, JDK 17+, Maven wrapper và config MySQL có sẵn. Launcher không sửa schema/cấu hình nghiệp vụ, không tự cài MySQL. Không bảo đảm kết nối khi Wi-Fi hoặc database lỗi; kiểm tra sẽ báo nguyên nhân trước khi mở Expo.

Ngày 2026-11-13: kiểm tra cả API 8080/8081, LAN và web/proxy 5173 đạt. Chưa kiểm thử quét QR trên điện thoại thật.
