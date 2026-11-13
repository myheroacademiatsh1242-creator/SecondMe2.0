# BÁO CÁO KỸ THUẬT & ĐẶC TẢ HOÀN THIỆN: 2D SIDE-VIEW COMBAT VFX & ANIMATION
## BOSS MAGMA (ID: `BOSS_MAGMA_001`)

Tài liệu kiểm toán, khắc phục lỗi kỹ thuật và chuẩn hóa toàn bộ hệ thống Hoạt cảnh (Animation) cùng Hiệu ứng chiến đấu (Combat VFX) theo chuẩn **2D Pixel Art Side-View (Góc nhìn ngang)**.

---

### I. BÁO CÁO PHÂN TÍCH & NGUYÊN NHÂN LỖI TRƯỚC ĐÓ

#### 1. Lỗi phối cảnh (Perspective Mismatch)
* **Vấn đề**: Trước đây VFX được tạo theo hình chiếu mắt chim từ trên xuống (Top-down circular), trong khi nhân vật và thế giới game là **2D Side-View (Góc nhìn ngang - ngang tầm mắt)**.
* **Hậu quả**: Vệt chém Cleave bị xoay chéo tròn không theo quỹ đạo đao bổ từ trên xuống; vũng dung nham và vòng nổ bị hình elip top-down thay vì bám phẳng trên mặt sàn nằm ngang ($Y = \text{Ground Plane}$).

#### 2. Lỗi Boss bị quay ngược hướng khi ra chiêu (`facingRight` invert)
* **Nguyên nhân cốt lõi**: Trong tệp gốc [`public/assets/demon-boss/sheet.png`](file:///d:/Download/taogame/SecondMe2.0/public/assets/demon-boss/sheet.png), tất cả các animation (idle, walk, cleave, hit, death) đều được vẽ **hướng mặt sang TRÁI (Facing Left) mặc định**.
* Ở code cũ có đoạn `if (!d.facingRight) ctx.scale(-1, 1);`: Khi người chơi đứng bên trái (`facingRight = false`), lệnh này lật ngược ảnh (`scale -1, 1`), khiến Boss quay lưng về phía người chơi và chém ra đằng sau!
* Hơn nữa, trong các trạng thái `warning`, `strike`, và `recover`, biến `d.facingRight` không được liên tục cập nhật theo vị trí mục tiêu.

#### 3. Chuyển động bị đơ cứng, cơ học (Stiff / Mechanical Timing)
* Code cũ chia đều thời gian cho mọi frame (`Math.floor(d.modeAge * 10)`), khiến frame nào cũng chạy tốc độ bằng nhau, không có gia tốc, thiếu đà, thiếu khựng đòn (hit-stop), và thiếu độ rướn.
* Khi hết đòn chém (`strike`), Boss đột ngột bị nhảy thẳng về frame `idle` đứng thở thay vì hoàn thành chuyển động thu đao (*Follow-through & Recovery*).

---

### II. CÁC BIỆN PHÁP KHẮC PHỤC ĐÃ TRIỂN KHAI

#### 1. Chuẩn hóa Phối cảnh 2D Side-View (Task 4)
* **Cleave Slash**: Vệt chém lưỡi liềm hỏa ngục quét theo đường vòng cung thẳng đứng từ trên cao phía sau đầu $\to$ bổ thẳng xuống phía trước $\to$ dậm chặt xuống mặt sàn nằm ngang.
* **Ground Shockwave**: Sóng chấn động lan tỏa phẳng theo phương ngang sang Trái & Phải dọc theo đường chân sàn ($Y = b.y + 24$), kèm các cột đá và tia lửa phụt ngược lên trời.
* **Magma Pool**: Bám phẳng trên mặt sàn ($128 \times 48\text{ px}$), bọt khí dung nham sôi sục và các hạt tro tàn bay bổng thẳng đứng lên trời.
* **Triple Eruption**: Cột địa hỏa phụt thẳng đứng từ khe nứt sàn nhà lên không trung ($96 \times 160\text{ px}$), khối đá nham thạch bắn tung tóe lên cao rồi rơi ngược xuống.
* **Fire Fan Projectiles**: Đạn đầu lâu lửa bay theo phương ngang với chùm đuôi lửa dạt về phía sau.

#### 2. Định thời hoạt ảnh phi tuyến tính (Deliberate Non-linear Timing - Task 1, 2, 3)
* **Cleave Attack**:
  * $0.00\text{s} - 0.30\text{s}$ (Lấy đà): Nhấc đại đao lùi về sau (Frames 0 $\to$ 2).
  * $0.30\text{s} - 0.65\text{s}$ (Giương đao cực hạn): Thân người dồn trọng tâm ra sau, đao giương cao quá đầu (Frames 3 $\to$ 5).
  * $0.65\text{s} - 0.90\text{s}$ (Gồng năng lượng): Đao run bần bật tích tụ hỏa ngục (Frames 6 $\to$ 8).
  * $0.90\text{s} - 0.98\text{s}$ (Chém thần tốc): Bổ đao xé gió cực nhanh (Frame 9).
  * $0.98\text{s} - 1.12\text{s}$ (Hit-stop & Dậm đất): Đao chạm sàn, cơ thể co nén (*Squash & Stretch*), rung chấn nổ tung (Frame 10).
  * $1.12\text{s} - 1.28\text{s}$ (Quán tính chôn đất): Đao găm sâu vào lòng đất (Frame 11).
  * $1.28\text{s} - 1.50\text{s}$ (Bẩy đao nhấc lên): Dùng sức nhấc vũ khí nặng (Frames 12 $\to$ 13).
  * $1.50\text{s} - 1.75\text{s}$ (Thu thế hồi chiêu): Đứng thẳng trở về tư thế chiến đấu (Frame 14) rồi mới chuyển sang thế thở Idle.
* **Fire Fan (Volley)**:
  * $0.0\text{s} - 0.4\text{s}$: Ngửa người, sừng bốc hỏa, tụ năng lượng hắc hỏa (Frames 2 $\to$ 3).
  * $0.4\text{s} - 0.9\text{s}$: Dang vuốt nhắm thẳng mục tiêu (Frame 4).
  * $0.9\text{s} - 1.5\text{s}$: Vung vuốt bắn chùm cầu lửa nan quạt xé gió (Frames 5 $\to$ 7).
* **Triple Eruption**:
  * Giương hai tay cầm đại đao lên trời (Frames 3 $\to$ 4), truyền nhiệt lượng vào lòng đất rồi dậm cắm lưỡi đao xuống sàn (Frame 10), duy trì thế cắm đao khi các cột địa hỏa bùng lên xung quanh sàn đấu.

#### 3. Sửa triệt để lỗi quay ngược hướng (Task 5)
* Sửa logic lật hình trong render: `if (d.facingRight) ctx.scale(-1, 1);`
  * Khi mục tiêu ở bên TRÁI: Giữ nguyên ảnh gốc (vốn đã quay mặt sang trái).
  * Khi mục tiêu ở bên PHẢI: Lật đối xứng gương (`scale -1, 1`) quanh trục $X = 144\text{ px}$.
* Cập nhật hướng quay mặt liên tục trong mọi trạng thái: `stalking`, `warning`, `strike`, `recover`, `charge_warning`, `charge_dash`, `ritual`.

---

### III. DANH SÁCH TỆP ĐÃ SỬA ĐỔI & KIỂM TRA

1. [`src/game/rendering/demonBoss.ts`](file:///d:/Download/taogame/SecondMe2.0/src/game/rendering/demonBoss.ts):
   * Viết lại hàm `demonFrame()` chuẩn định thời gia tốc, anticipation, hit-stop và recovery.
   * Cập nhật căn chỉnh tọa độ vệt chém Side-view Cleave, vũng nham, cột địa hỏa và hướng lật sprite.
2. [`src/game/logic/demonBoss.ts`](file:///d:/Download/taogame/SecondMe2.0/src/game/logic/demonBoss.ts):
   * Duy trì hướng `d.facingRight` bám sát tọa độ mục tiêu trong các nhịp ra chiêu và hồi chiêu.
3. [`src/game/logic/demonBoss.test.ts`](file:///d:/Download/taogame/SecondMe2.0/src/game/logic/demonBoss.test.ts):
   * Bổ sung unit test xác minh hướng nhìn của Boss trong cả 4 trạng thái (`stalking`, `warning`, `strike`, `recover`).
4. [`tools/buildBossVFX.cjs`](file:///d:/Download/taogame/SecondMe2.0/tools/buildBossVFX.cjs):
   * Tái tạo toàn bộ 224 frame và sprite sheet theo chuẩn 2D Side-View.
5. [`public/assets/demon-boss/vfx/`](file:///d:/Download/taogame/SecondMe2.0/public/assets/demon-boss/vfx/):
   * Cập nhật toàn bộ sprite sheet và PNG frames sang chuẩn Side-View.

Tất cả 12/12 bài kiểm tra đơn vị và Typecheck đều đạt kết quả **100% PASS**.
