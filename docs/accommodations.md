# View Accommodation List (GB-07, GB-11)

Trang `/search` doc database qua API `/api/properties/search`, khong dung fixture.
Sau khi merge voi main, trang `/` giu giao dien HomeLandingPage hien tai va doc
database qua `/api/public/properties`; khong thay giao dien home bang ban cu cua nhanh.
Guest va Platform Member duoc xem cung mot tap du lieu cong khai, khong can JWT.

## Dieu kien cong khai dung chung

`PublicAccommodationPolicy.visible()` la nguon quy tac cho list, summary va anh:

- Property co status `ACTIVE` va lien ket toi ho so `APPROVED`.
- Chu nha co status `ACTIVE`.
- Loai phong co gia va dien tich lon hon 0, du de hien thi.
- Ho so chua duyet, bi tu choi, can bo sung, thieu ho so hoac nha tro bi an/ngung hoat dong deu khong duoc tra ve.

Loai phong het cho van hien thi voi `availableRooms: 0`. So phong trong chi dem `Room.status = VACANT`
thuoc dung property va room type, khong suy tu tong so phong hay booking.
Danh sach chi gom loai phong; nha tro chua co loai phong khong tao the gia lap.

## API

`GET /api/properties/search?page=0&size=6`

API danh so trang tu 0, giao dien danh so tu 1. `size` tu 1 den 50; trang am, so khong hop le
hoac bo loc khong duoc ho tro tra HTTP 400. Trang vuot gioi han tra danh sach rong kem tong so chinh xac.

Bo loc tuy chon: `q` (toi da 200 ky tu), `location` (`all`, `tan-xa`, `thach-hoa`, `binh-yen`, `cnc`),
`price` (`all`, `under-15`, `15-25`, `25-35`, `above-35`), `type` (`all`, `khep-kin`, `gac-lung`, `chung-cu-mini`).
Loc khu vuc va loai phong dua tren dia chi/ten loai phong dang luu; schema chua co ma phan loai chuan hoa.
Khoang gia 1.5-2.5 trieu bao gom hai dau; khoang tiep theo la tren 2.5 den 3.5 trieu de khong trung bien.
`sort`: `newest` (mac dinh), `price-asc`, `price-desc`. Gia trung nhau duoc sap tiep theo room type ID,
giu phan trang on dinh. URL cu `recommended` duoc hieu la `newest`, khong gia lap diem de xuat/danh gia.

Response van theo envelope `ApiResponse`: `data.items`, `page`, `size`, `totalElements`, `totalPages`.
Moi item dung chung `AccommodationSummary`:

| Truong | Y nghia |
| --- | --- |
| propertyId, roomTypeId | ID that trong database |
| propertyName, roomTypeName | Ten nha tro va loai phong |
| address | Dia chi nha tro |
| imageUrl | URL anh cong khai hoac null neu chua co anh |
| price, areaSqm | Gia thang (VND), dien tich m2 |
| verificationStatus | APPROVED |
| availableRooms | So phong VACANT cua loai phong |

`GET /api/properties/{propertyId}/room-types/{roomTypeId}` tra cung DTO cho link thong tin tu danh sach,
tranh hien thi nham du lieu prototype co cung ID. Day la thong tin tom tat, chua gom dat lich/danh gia/yeu thich.

`GET /api/properties/{propertyId}/room-types/{roomTypeId}/details` cung cap trang chi tiet moi:
`summary`, `gallery`, `capacity`, cac muc phi/deposit, mo ta, tien nghi, quy dinh, ngay duyet,
link Google Maps theo dia chi da cong khai, thong tin lan can, `reviews` va toi da 3 loai phong goi y
thuoc nha tro khac dang cong khai. API tom tat cu duoc giu nguyen.
Khong tra JSON ho so goc, tai lieu rieng tu, email hay so dien thoai ca nhan cua tai khoan chu tro.
Theo xac nhan cua nguoi dung, `publicContact.phone` va `publicContact.zaloPhone` duoc cong khai tu
`contactPhone`/`zaloPhone` trong ho so dang ky nha tro da duyet. Chi tra so Viet Nam hop le, chuan hoa
khoang trang/dau cham/gach ngang; khong lay so rieng `User.phoneNumber`, khong suy so Zalo tu so dien thoai.
Ho so khong co so hop le tra `publicContact: null`; khong tu gan so lien he mau.

Trang chi tiet dung bo cuc anh lon + bon anh nho, hop xem tat ca anh co phim mui ten/Escape,
cot gia/lien he ben phai, tong quan, bieu phi, mo ta/quy dinh, vi tri, chu tro, danh gia va goi y.
Don vi phi theo form chu tro: dien VND/kWh, nuoc VND/m3, Internet VND/phong/thang,
dich vu chung VND/nguoi/thang. Tong ban dau chi cong gia thue va tien coc neu ca hai da co;
khong gia lap tong dien nuoc hay cam ket hoan coc, mien phi gui xe.

Danh gia duoc doc tu `Feedback`, thong ke tren rating 1-5 cua tai khoan ACTIVE; chi hien 3 bai moi nhat.
Schema chua co du lieu xac minh da thue/hop dong hay trang thai duyet feedback nen khong gan nhan
"da thue", "da xac thuc hop dong". Khi rong, hien "Chua co danh gia", khong dung diem 4.9/42 luot mau.
Khoang cach/toa do chua duoc xac nhan khong duoc tu suy ra; link ban do chi dung dia chi cong khai.
Luu tin chua co luong backend trong pham vi nay; nut duoc khoa. Nut hen xem mo cac cach lien he,
khong tao thong bao dat lich thanh cong gia. Chia se sao chep duong dan that.

`GET /api/properties/{propertyId}/room-types/{roomTypeId}/images/{imageId}` chi tra anh JPG/PNG/WEBP
thuoc dung loai phong dang cong khai. Tat ca cac route doc truc tiep tra 404 neu khong du dieu kien.
Anh upload duoc uu tien; URL HTTPS cua loai phong duoc dung neu khong co anh upload. Khong tra tai lieu xac minh rieng tu.

Trang dang tai, loi (co thu lai), rong, anh thieu/loi deu co hien thi rieng, khong quay ve fixture.
Bo loc va trang duoc luu tren URL; doi bo loc reset ve trang 1, response cu bi huy khi doi yeu cau.
Database khong du du lieu cong khai se hien danh sach rong, khong tu dong chen du lieu mau.

## Du lieu demo local

Theo yeu cau, co the nap thu cong `sql/seed-accommodations-demo.sql` vao database local:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\seed-demo-accommodations.ps1
```

Can chay backend it nhat mot lan de tao bang va tai khoan `host@hlrcs.com`, `staff@hlrcs.com`.
Script dung tai khoan database local trong `.local/mysql-client.cnf`, khong chua mat khau.
Moi nha tro deu co tien to `DEMO`; dia chi, tinh trang duyet, gia va anh la du lieu gia lap/minh hoa.
Bo du lieu co 8 nha tro, 16 loai phong va 48 phong vat ly: 6 nha tro voi 12 loai phong cong khai
(2 trang, moi trang 6), 1 nha tro cho duyet va 1 nha tro da an khong duoc hien tren danh sach.
Loai phong co ca phong trong, da thue va het cho de kiem tra cac trang thai.
Chu so huu la `host@hlrcs.com`; dang nhap tai khoan demo nay de xem/chinh sua trong khu vuc chu tro.
Script chi bo sung du lieu, khong doi tai khoan hay cap nhat cac ban ghi da co; chay lai khong tao trung.
Nap du lieu la thao tac chu dong, khong tu dong nap khi khoi dong backend.

Bo sung thu vien 5 anh minh hoa vao cac loai phong DEMO chua co anh:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\seed-demo-detail-photos.ps1
```

Anh duoc luu duoi dang JPEG trong database de ca trang cong khai va trang chu tro doc duoc.
Khong ghi de anh cua chu tro; script chay lai khong tao them anh neu loai phong da co thu vien.

## Kiem thu

`AccommodationTests` kiem thu HTTP tren H2 tach biet: quyen Guest/Member, loai ho so khong cong khai,
chu nha ngung hoat dong, dem VACANT, phan trang/tong so/thu tu on dinh, loc truoc phan trang,
chan anh sai loai phong/anh nha tro bi an, kiem tra tham so va khong mo quyen POST.
`frontend/tests/accommodations.test.js` kiem thu hop dong API, loi/abort, khong gui token cho route cong khai,
khong fallback du lieu mau va thanh phan trang co gioi han so nut.
