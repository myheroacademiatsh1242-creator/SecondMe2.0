export const HERO_MAX_HP = { mage: 85, swordsman: 115, mechanical: 100 } as const;
export const HERO_COMBO_ATTACK = { mage: 12, swordsman: 16 } as const;
export const GUARDIAN_HP = 520;
export const EMBER_DEMON_HP = 1440;
export const BOSS_PLAYER_DAMAGE = { guardian: 1.35, demon: 1.4 } as const;
export const SWORD_WAVE_RANGE = 96;

const ENCOUNTER_HEALTH = [.6, 1, 1.11, 1.23, 1.37, 1.5, 1.65, 1.8, 1.98, 2.17, 2.38, 2.6, 2.85];
const ENCOUNTER_DAMAGE = [.65, 1, 1.08, 1.16, 1.24, 1.33, 1.42, 1.52, 1.62, 1.73, 1.84, 1.95, 2.08];

export function encounterBalance(levelId: number) {
  const index = Math.max(0, Math.min(12, levelId - 1));
  const late = Math.max(0, index - 5);
  return {
    health: ENCOUNTER_HEALTH[index],
    damage: ENCOUNTER_DAMAGE[index],
    speed: 1 + late * .025,
    recovery: 1 - late * .035,
  };
}

export const PUZZLE_BALANCE = [
  { legSeconds:12, shardInterval:5, threeStars:16 },
  { legSeconds:17, shardInterval:7, threeStars:38 },
  { legSeconds:21, shardInterval:9, threeStars:55 },
  { legSeconds:26, shardInterval:11, threeStars:65 },
  { legSeconds:25, shardInterval:10, threeStars:80 },
  {legSeconds:0, shardInterval:0,threeStars:120},
  {legSeconds:44, shardInterval:18,threeStars:140},
  {legSeconds:39, shardInterval:16,threeStars:160},
  {legSeconds:48, shardInterval:20,threeStars:200},
  {legSeconds:52, shardInterval:22,threeStars:230},
  {legSeconds:55, shardInterval:23,threeStars:250},
  {legSeconds:52, shardInterval:22,threeStars:290},
] as const;
export const SHARD_BONUS = 5;
export const ENEMY_TIME_BONUS = 1;
export const PUZZLE_HINTS = [
  'Ghi đường tới rune 1 bằng E, nhấn E để lưu rồi Q gọi Echo. Để Echo giữ rune khi bạn đi qua cổng.',
  'Cổng cuối cần rune 1 và 2 cùng sáng. Giữ Echo đầu, rồi ghi đường cho Echo thứ hai.',
  'Hai rune ở hai nhánh mở cổng đầu. Ghi đường và để hai Echo ở lại trước khi vượt sang phía đông.',
  'Giữ chuỗi bốn rune bằng bốn Echo. Dùng 1–4 để chọn, C dừng/phát lại; hoán đổi Shift+Q chỉ qua đường không bị chặn.',
  'Năm rune nhưng chỉ bốn Echo. Đọc số rune bên cổng để biết ký ức nào cần giữ, ký ức nào có thể thu hồi bằng X.',
] as const;
export const puzzleBalance = (levelId:number) => PUZZLE_BALANCE[Math.max(0,Math.min(PUZZLE_BALANCE.length-1,levelId-1))];
