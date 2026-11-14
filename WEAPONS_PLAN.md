# Áp dụng "Cẩm nang 200 prompt vũ khí pixel" vào Second Me

Bản thiết kế để duyệt trước khi làm (cùng kiểu với UPGRADE_PLAN.md). Chưa có dòng code nào được đổi.
Nguồn: `Downloads/Cam_Nang_200_Prompt_Vu_Khi_Pixel_Soul_Knight.md` (đã đọc hết 200 mục). Mình chưa mở 2 bản .docx "(1)", "(2)" để so với bản .md.

## 0. Cuốn cẩm nang này là gì, và không phải là gì

- Nó là **bộ prompt để một AI có công cụ tạo ảnh dựng ra file demo** (GIF 960×540, 6 giây, kèm MP4): hiệp sĩ đầu to, súng lơ lửng trước bụng, nhìn ngang như Soul Knight.
- Nó **không phải** dữ liệu hay code vũ khí cho game. Trong Second Me hiện không có hệ thống vũ khí: `weapon` chỉ là `'staff' | 'sword'` suy từ lớp nhân vật (`GameEngine.ts:557`).
- Chính cuốn sách thừa nhận: **chỉ mẫu 001 (súng lục) đã được kiểm chứng**, 199 mẫu còn lại chưa ai render và kiểm tra. Gói `MAU_CHUAN` và thư mục `PROMPT_DAY_DU/*.txt` mà nó nhắc tới không có trong máy này.
- Vậy "áp dụng thật" nghĩa là **lấy nội dung thiết kế** (tên, độ hiếm, cơ chế, nhịp thời gian, hiệu ứng) và **lấy quy tắc làm asset**, không lấy quy trình xuất GIF.

## 1. Chỗ không khớp với game, và cách xử lý

| Cẩm nang | Second Me | Quyết định |
|---|---|---|
| Nhìn ngang, súng trước bụng, không vẽ tay | Nhìn từ trên xuống, đánh theo chuột, sprite có tay cầm vũ khí | Bỏ quy ước "súng trước bụng" |
| 100/200 mẫu là súng hiện đại, laser, tên lửa, hạt nhân (mẫu 001 đến 100) | Thế giới giả tưởng rừng, băng, núi lửa; hai nhân vật là kiếm sĩ và pháp sư | **Không đưa vào game.** Giữ lại làm ý tưởng đòn cho boss (mục 4) |
| 200 vũ khí để nhặt và đổi | Mỗi nhân vật một bộ chiêu cố định (combo 4 đòn, Skill, Ultimate) | Vũ khí = **bộ đồ nghề đổi được** của nhân vật, không phải thêm kho 200 món |
| Sát thương, chí mạng, giáp theo kiểu roguelike | Không có DEF, không có chí mạng (`combo.ts`); mỗi chặng chỉ 16 đến 32 giây | Mọi vũ khí **cùng ngân sách sát thương**; khác biệt là dáng, màu, hiệu ứng, một hiệu ứng phụ nhỏ |
| 6 bậc hiếm: Common, Uncommon, Rare, Very Rare, Epic, Legendary Boss | 5 bậc trong `rarity.ts`: Đại Trà, Tinh Chế, Thượng Hạng, Độc Bản, Tối Thượng | Common→Đại Trà, Uncommon→Tinh Chế, Rare→Thượng Hạng, Very Rare→Độc Bản, Epic và Legendary→Tối Thượng |
| Nhịp 4 đòn mỗi 6 giây | Combo đã chỉnh riêng (3 khung × 0,085 s, đòn kết 6 × 0,09 s) | **Không ép nhịp của cẩm nang lên combo hiện có** |
| Kael chém bằng sprite có sẵn | Thanh kiếm nằm trong ảnh `kael-combo.png`, không tách được | Kael chỉ **đổi màu + hiệu ứng**, không đổi dáng (mục 3) |
| Echo | Echo chỉ ghi `attack` và `skill`, phát lại gây 10 hoặc 15 sát thương trong 150 hoặc 180 px (`GameEngine.ts:1698`) | Vũ khí **chỉ ảnh hưởng người chơi**; không cần thêm loại sự kiện mới cho Echo |

## 2. Những gì lấy được từ cẩm nang

**Bảng nhịp thời gian (dùng cho đòn MỚI, không sửa combo cũ):**

| Loại | Nhịp trong cẩm nang |
|---|---|
| Kiếm | lấy đà 80 đến 120 ms, vung 90 đến 140 ms, hồi 180 đến 250 ms |
| Búa, rìu | lấy đà 120 đến 160 ms, hồi 220 đến 300 ms; hiệu ứng chỉ bùng khi đầu búa **chạm** |
| Giáo, đâm | thu 2 đến 3 px rồi đâm thẳng, kéo về có dư lực |
| Gậy phép | nạp sáng 80 đến 140 ms, rồi chiêu rời đầu gậy |
| Cung | gồng 100 đến 160 ms, nhả dây rung 100 ms |
| Tia | nạp 80 ms, giữ 420 ms, tàn 220 đến 320 ms |
| Mục tiêu trúng | lóe 60 đến 80 ms, đẩy nhẹ, hồi 280 ms; hiệu ứng trúng tàn 0,3 đến 0,5 s |
| Đạn | bay 0,12 đến 0,22 s (nặng 0,24 đến 0,34 s) |

Game đã có hit-stop 30/80 ms và đẩy lùi 10/36 px (`logic/hitFeel.ts`), nên chỉ cần đối chiếu, không làm lại.

**Quy tắc làm sprite (đáng giữ nguyên):** nền alpha thật; chừa ít nhất 8 px trong suốt quanh hình; không xóa nền bằng khóa màu trắng; không "chỉ giữ khối lớn nhất" (đạn rời, tia lửa là một phần của hình); soi trên nền tối và nền sáng; phóng nguyên lần để pixel sắc; hiệu ứng ≤ 30% khung.

**Tên tiếng Việt có sẵn cho cả 200 mục** (vd. "Đũa phép tập sự", "Katana Hàn Băng"). Dùng thẳng cho `i18n.ts`.

## 3. Cắm vào đâu trong code

Dựa trên hệ thống trang phục đã có (`logic/outfits.ts`: đã sở hữu, đang mặc theo nhân vật, cửa hàng có độ hiếm, lưu localStorage). Vũ khí là một "ngăn" thứ hai cùng kiểu.

| Nhân vật | Cách đổi vũ khí | Vì sao |
|---|---|---|
| **Aeris** (gậy) | Đổi dáng gậy: gậy vẽ bằng code (`drawMageStaff`, `mageMagic.ts`) nên đổi hình được; tô màu đạn bí thuật; hiệu ứng phụ (đốt, làm chậm) | Gậy không nằm trong ảnh |
| **Kael** (kiếm) | Chỉ đổi màu lưỡi và sắc hiệu ứng (đã có `outfitPixel` và `outfitTone` cho Băng Lam, Hắc Diệm); đổi sóng kiếm và hiệu ứng trúng | Kiếm nằm trong `kael-combo.png` |
| **Nhặt trong màn** | Thêm vài loại vào `SKILL_PICKUPS` (hiện 6 loại, mỗi loại là một chiêu dùng ngay) | Cấu trúc sẵn có, ít rủi ro nhất |
| **Boss** | Mượn cơ chế đòn từ nhóm súng, pháo, búa làm chiêu mới (mục 4) | Đúng việc UPGRADE_PLAN bước 6 đang cần |
| **Rương** | Có thể thêm phần thưởng vũ khí vào `CHEST_POOL` (hiện chỉ xu và bình) | Làm sau cùng |

## 4. Danh sách rút gọn (thay cho 200 mục)

Hiệu ứng ghi theo sheet pixelfx **đã có trong repo** (✅) hay **phải xuất thêm** (⬇).

**Aeris, 8 món** (cẩm nang nhóm 9)

| Mẫu | Tên | Hiếm (đã quy đổi) | Hiệu ứng |
|---|---|---|---|
| 161 | Đũa phép tập sự (mặc định) | Đại Trà | `magic-missile` ✅ |
| 162 | Đũa phép lửa | Đại Trà | `fireball` ✅, `burning` ✅ |
| 167 | Trượng băng tuyết | Thượng Hạng | `ice-lance` ✅, `frozen` ✅ |
| 168 | Trượng sấm sét | Thượng Hạng | `lightning-strike` ✅ |
| 170 | Sách phép khiên năng lượng | Thượng Hạng | `divine-shield` ✅ |
| 173 | Trượng bão tuyết bắc cực | Độc Bản | `blizzard-vortex` ✅ |
| 172 | Trượng gọi thiên thạch | Độc Bản | `fire/meteor` ⬇ |
| 177 | Trượng đại pháp sư | Tối Thượng | ghép 4 hệ ✅ |

**Kael, 7 món** (nhóm 6, chỉ đổi màu và hiệu ứng)

| Mẫu | Tên | Hiếm | Hiệu ứng |
|---|---|---|---|
| 101 | Kiếm sắt gỉ (mặc định) | Đại Trà | `sword-slash` ✅ |
| 110 | Đại kiếm hiệp sĩ | Thượng Hạng | `heavy-cleave` ✅ |
| 111 | Katana Hàn Băng | Độc Bản | `ice-shatter` ✅ (có sẵn trang phục Băng Lam) |
| 109 | Katana Bóng Đêm | Thượng Hạng | tím, có sẵn Hắc Diệm |
| 114 | Đại đao hỏa ngục | Độc Bản | `fireball` ✅, `burning` ✅ |
| 116 | Đại kiếm thần thánh | Tối Thượng | `holy-pillar` ✅, `smite` ✅ |
| 118 | Ma kiếm Quỷ Vương | Tối Thượng | hợp với boss Quỷ Tâm Hỏa |

**Chiêu mới cho boss** (mượn cơ chế từ các nhóm khác)

| Từ mẫu | Chiêu | Dùng cho |
|---|---|---|
| 058, 049 | Quạt đạn lửa tỏa (đã có "volley") | Quỷ Tâm Hỏa: kiểm tra lại số tia và báo trước |
| 127, 136 | Nện đất, vòng chấn lan ra | Quỷ Tâm Hỏa: `ground-slam` ✅ |
| 172 | Mưa thiên thạch có báo trước | Quỷ Tâm Hỏa: `fire/meteor` ⬇ |
| 133 | Vệt lửa dọc đường vung | Quỷ Tâm Hỏa |
| 173, 167 | Bão tuyết, mưa nhũ băng | Frost Guardian (đã nằm trong UPGRADE_PLAN bước 6) |

**Nhặt trong màn (thêm 3 loại):** Mảnh băng (từ 167, tỏa 3 mảnh), Sét lan (từ 092, nhảy giữa các quái), Thiên thạch (từ 172).

Lệnh xuất thêm (chạy trong PowerShell, không chạy được từ phiên này vì bị chặn):

```powershell
cd C:\Users\Lenovo\Downloads\pixelfx
node tools/render.mjs fire/meteor fire/flame-pillar fire/fire-ring explosions/small-explosion --sheet
```

## 5. Không đưa vào game, và lý do

- **Nhóm 1 đến 5 (súng, shotgun, pháo, laser): 100 mẫu.** Lệch thế giới game. Giữ lại thành kho ý tưởng chiêu boss.
- **Tên có nguồn gốc thương hiệu:** Varkolyn, Zulan, Dragon Bros (vũ khí của chính game Soul Knight, mẫu 039, 077, 079, 097, 196 đến 198); ba kiếm ánh sáng xanh, đỏ, lục (106 đến 108) giống Star Wars; Desert Eagle, AK-47, M4, Uzi, MP5, P90; Death Note; One-Punch; Mjolnir. Nếu phát hành thương mại, đổi tên và dáng. README đã ghi cần rà bản quyền.
- **Trùng nhau trong cẩm nang:** 039 và 198 (cùng súng Varkolyn), 097 và 197 (cùng drone Zulan), 077 và 196 (Dragon Bros). Mẫu "Legendary Boss" kiểu xóa cả màn hình sẽ phá cân bằng, nếu dùng thì chỉ làm đòn boss.

## 6. Thứ tự làm (mỗi bước chơi thử được, có test, rồi mới sang bước sau)

0. **Bạn chốt hướng** (câu hỏi ở cuối).
1. ✅ Xong: `logic/weapons.ts`: danh sách, độ hiếm, tên Việt/Anh, hiệu ứng phụ, lưu `second-me-weapons-v1`, có test (`weapons.test.ts`). Chưa có hình. Quyền sở hữu (`ownedWeapons`) chưa nối vào `Campaign`: làm ở bước 7 cùng cửa hàng và rương. Mẫu 172 tạm dùng sheet `fireball` cho đến khi xuất `fire/meteor`.
2. ✅ Xong (chưa xem bằng mắt trong trình duyệt): tab TRANG PHỤC / VŨ KHÍ trong màn chọn nhân vật; `Campaign.ownedWeapons` được lưu và làm sạch; `GameEngine.setCharacterWeapon`; phím Y×4 (dev) mở khóa mọi vũ khí. Vũ khí chưa đổi gì trong trận.
3. 🟡 Aeris, xong phần nhìn thấy: 8 dáng gậy và màu đạn riêng (`rendering/mageMagic.ts`), khung xem trước ở màn chọn nhân vật (`WeaponPreview.tsx`). Chưa làm: hiệu ứng trúng riêng và tác dụng thật của đặc tính (đốt, làm chậm, lan, chắn). Trong lúc đánh combo, cây gậy trong ảnh `aeris-combo.png` vẫn là gậy gốc; gậy mới hiện khi đứng yên hoặc di chuyển.
4. Kael: đổi màu lưỡi, sóng kiếm, hiệu ứng trúng.
5. 3 loại nhặt mới.
6. Chiêu boss mới (cần xuất thêm sheet ở mục 4).
7. Cửa hàng và rương, cân bằng, thử trên điện thoại.

## 7. Rủi ro và giới hạn

- Môi trường này **không có công cụ tạo ảnh**: mọi hình mới phải lấy từ pixelfx hoặc do bạn tạo bên ngoài (bằng chính các prompt trong cẩm nang) rồi bỏ vào `public/assets/`.
- Chưa có điều khiển cảm ứng đầy đủ (README), nên màn chọn vũ khí chỉ cần dùng được bằng chuột trước.
- Cân bằng chưa đo bằng người chơi thật; mặc định mọi vũ khí cùng ngân sách sát thương.
- Kael chỉ đổi màu, nên 7 món kiếm có cùng một dáng. Muốn đổi dáng thật phải vẽ lại sprite combo.
