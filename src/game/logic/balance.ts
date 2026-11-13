export const PUZZLE_BALANCE = [
  { legSeconds:16, shardInterval:5, threeStars:16 },
  { legSeconds:24, shardInterval:6, threeStars:38 },
  { legSeconds:30, shardInterval:7, threeStars:55 },
  { legSeconds:32, shardInterval:8, threeStars:65 },
  { legSeconds:30, shardInterval:8, threeStars:80 },
  {legSeconds:0,shardInterval:8,threeStars:120},
  {legSeconds:60,shardInterval:8,threeStars:140},
  {legSeconds:65,shardInterval:8,threeStars:160},
  {legSeconds:65,shardInterval:8,threeStars:200},
  {legSeconds:70,shardInterval:9,threeStars:230},
  {legSeconds:75,shardInterval:9,threeStars:250},
  {legSeconds:70,shardInterval:9,threeStars:290},
] as const;
export const SHARD_BONUS = 3;
export const PUZZLE_HINTS = [
  'Ghi đường tới rune 1 bằng E, nhấn E để lưu rồi Q gọi Echo. Để Echo giữ rune khi bạn đi qua cổng.',
  'Cổng cuối cần rune 1 và 2 cùng sáng. Giữ Echo đầu, rồi ghi đường cho Echo thứ hai.',
  'Hai rune ở hai nhánh mở cổng đầu. Ghi đường và để hai Echo ở lại trước khi vượt sang phía đông.',
  'Giữ chuỗi bốn rune bằng bốn Echo. Dùng 1–4 để chọn, C dừng/phát lại; hoán đổi Shift+Q chỉ qua đường không bị chặn.',
  'Năm rune nhưng chỉ bốn Echo. Đọc số rune bên cổng để biết ký ức nào cần giữ, ký ức nào có thể thu hồi bằng X.',
] as const;
export const puzzleBalance = (levelId:number) => PUZZLE_BALANCE[Math.max(0,Math.min(PUZZLE_BALANCE.length-1,levelId-1))];
