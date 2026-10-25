# HL_RCS Frontend

React + Vite. Migration prototype Code/html dang duoc thuc hien theo nhom.
Xem FRONTEND-MIGRATION-REPORT.md: 32 screen da co mapping/route, nhung phan lon
workflow nghiep vu van BLOCKED vi backend chua co API. Khong coi shell la migration hoan tat.

## Cau truc

```text
src/
  components/   AuthLayout, Brand va FormField dung chung
  context/      Phien dang nhap va AuthProvider
  layouts/      Shared portal shell, navigation rieng theo actor
  routing/      Screen registry, legacy mapping, role matrix
  pages/        Auth, ho so, cac screen shell theo nhom nghiep vu
  services/     HTTP API va token storage
  styles/       CSS responsive
  App.jsx       Routes va bao ve trang can dang nhap
  main.jsx      React entry point
reference/auth/ Ban goc HTML, CSS, JS cua login/register, giu nguyen noi dung
migration/      Inventory source va dependencies, SHA-256, integration gaps
scripts/        Audit prototype va kiem thu browser
tests/          Unit tests routing, role matrix, API/token/error handling
```

## Nguon thiet ke goc

Toan bo tai nguyen cuc bo cua hai trang duoc giu trong `reference/auth/` theo
thu muc `html/`, `css/`, `js/`. Xem `reference/auth/README.md` va `manifest.json`
de doi chieu nguon va SHA-256. CSS/JS inline va cac SVG van nam nguyen trong HTML.
Day la nguon tham chieu, khong phai giao dien cu duoc phuc vu boi backend.
Ung dung dang chay van la React trong `src/`, dung API Spring Boot va MySQL.

## Chay

Trong IntelliJ: chon **HL-RCS Full Stack** va bam Run de chay ca backend va frontend.
Mo http://127.0.0.1:5173/login. Bam Stop se dung ca hai.
Xem README.md o thu muc project de biet dieu kien MySQL/Node.js.

Neu muon chay rieng bang terminal:

1. Chay Spring Boot/MySQL tren cong 8080 bang run.cmd o thu muc cha cua project.
2. Chay run-frontend.cmd cung thu muc voi run.cmd.
3. Mo http://localhost:5173/login hoac http://127.0.0.1:5173/login.

Neu dung pnpm thu cong trong thu muc frontend:

```powershell
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm audit:prototype
```

Neu chi co npm: npm install, npm run dev, npm run build.
Frontend can Node.js 22.12+ hoac 20.19+.

API mac dinh duoc proxy sang http://localhost:8080. Neu backend tren cong khac:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ..\..\start-frontend.ps1 -ApiTarget http://localhost:8081
```

Co the copy .env.example thanh .env.local va sua API_TARGET khi chay pnpm dev truc tiep.
Khong dat mat khau MySQL hay JWT secret trong frontend.

## Dang nhap va dang ky

- /login: email hoac so dien thoai, mat khau, ghi nho dang nhap.
- /register: ho ten, email, so dien thoai tuy chon, mat khau, xac nhan va vai tro.
- /profile: thong tin tai khoan, cap nhat ho so va doi mat khau bang API that.
- /account: alias chuyen sang /profile.
- Dang nhap chuyen ve route da yeu cau hoac portal tuong ung vai tro that.
- Chi USER va ROOM_HOST duoc chon khi dang ky cong khai.
- Token luu trong sessionStorage; chi dung localStorage khi chon ghi nho.
- Khi reload, frontend goi /api/auth/me de xac minh phien.
- Tai khoan demo chi hien trong che do development, duoc dien vao form de dang nhap bang API that.
- Khong co mock authentication hay tai khoan luu trong localStorage nhu prototype cu.

API: POST /api/auth/login, POST /api/auth/register, GET /api/auth/me, POST /api/auth/logout.
Ho so: PUT /api/auth/profile, PUT /api/auth/change-password.
Trang /login.html va /register.html cu tren backend chuyen huong sang React.

## Portal va integration gaps

`/`, `/search`, `/map`, `/community`, `/services` la khu vuc cong khai.
`/favorites`, `/bookings`, `/notifications`, `/profile` can dang nhap.
`/host/*` chi ROOM_HOST/ADMIN; `/staff/*` chi STAFF/ADMIN; `/admin` chi ADMIN.
Guard frontend dung role backend tra ve; Spring Security van la lop enforcement API.
Toan bo 32 ten HTML cu deu co alias React, giu query id va hash.
Availability duoc merge vao `/host/rooms`, khong tao module rieng.

Nhung screen thieu API hien "Du lieu chua kha dung"; KPI hien dau gach thay vi
so lieu gia. Cac action ghi du lieu bi disabled. Form nha tro/phan hoi chi la UI
state tam thoi, khong duoc luu vao localStorage hoac gui endpoint tu doan.
Prototype Code/html, Code/css, Code/js va reference/auth khong bi xoa.

Kiem thu trinh duyet (can Playwright va Edge, frontend/backend dang chay):

```powershell
node scripts/check-browser.cjs
```

Co the dat PLAYWRIGHT_MODULE den package Playwright da cai, CHECK_OUTPUT den
thu muc artifact, FRONTEND_URL neu URL khac. Script dang nhap cac tai khoan demo
that trong backend; khong ghi profile hay doi du lieu MySQL. Neu tai khoan demo
tren may da thay doi mat khau, can sua test fixture tuong ung, khong reset account.

Production: pnpm build tao dist/. Khi deploy dist tren web server, bat SPA fallback ve index.html
va reverse proxy /api den Spring Boot. Cau hinh app.frontend-url tren backend trung voi dia chi frontend.

Tham khao: https://react.dev/learn/build-a-react-app-from-scratch va https://vite.dev/guide/.
