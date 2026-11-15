/**
 * The player guide's content (PlayerGuide.tsx draws it). Every number is read from the game's own constants so the guide
 * cannot drift from the game; level pages are generated from the level data (levelFacts.ts). Screenshots are real captures
 * of the running game (tools/guide-shots/capture.mjs → public/assets/guide, shots.json); a shot that has not been captured
 * shows a "no picture yet" frame instead of anything made up.
 */
import { HERO_MAX_HP, HERO_COMBO_ATTACK, SHARD_BONUS, ENEMY_TIME_BONUS, GUARDIAN_HP, EMBER_DEMON_HP, BOSS_PLAYER_DAMAGE } from '../../game/logic/balance.ts';
import { MAX_MP, MP_REGEN_PER_SECOND, MP_REGEN_DELAY, skillManaCost, COMBO_MP } from '../../game/logic/mana.ts';
import { ICE_MAGIC, ENEMY_CHILL, FROST_STRIKE } from '../../game/logic/iceMagic.ts';
import { AERIS_ULT, RAGE } from '../../game/logic/ultimate.ts';
import { ECHO_RUNES } from '../../game/logic/echoRunes.ts';
import { SHOP_ITEMS, ITEM_LOADOUT_LIMIT } from '../../game/logic/shopItems.ts';
import { CHEST_PRICES } from '../../game/logic/chest.ts';
import { HERO_UPGRADE_PRICES, HERO_MAX_RANK, HERO_RESET_FEE_PERCENT } from '../../game/logic/heroUpgrades.ts';
import { SKILL_PICKUPS } from '../../game/logic/skillPickups.ts';
import { PILLAR_SUMMON } from '../../game/logic/pillarSummon.ts';
import { DAMAGE } from '../../game/logic/damage.ts';
import { ICE_BARRAGE } from '../../game/logic/iceBarrage.ts';
import { MAX_RECORDING_DURATION_MS } from '../../game/logic/recorder.ts';
import { ENEMY_STATS } from '../../game/logic/enemies.ts';
import { GUIDE_TOPICS, type GuideTopic } from '../../game/logic/tutorials.ts';
import { CLASS_SKILLS } from '../../game/GameEngine.ts';

export type L = { vi: string; en: string };
const t = (vi: string, en: string): L => ({ vi, en });

/** Where an annotation points: a named mark recorded with the screenshot (shots.json), or canvas/image pixels. */
export type At = string | { x: number; y: number };
export type Annotation =
  | { kind: 'ring'; at: At; r?: number; n?: number; text?: L }
  | { kind: 'arrow'; from: At; to: At; text?: L }
  | { kind: 'key'; at: At; key: string };
export interface Figure { shot: string; alt: L; caption?: L; notes?: Annotation[] }
export interface ControlRow { keys: string; touch: L | null; action: L }
export type Block =
  | { t: 'p'; text: L }
  | { t: 'list'; items: L[] }
  | { t: 'note'; text: L; tone?: 'warn' | 'tip' }
  | { t: 'figure'; fig: Figure }
  | { t: 'steps'; steps: { fig: Figure; text: L }[] }
  | { t: 'table'; head: L[]; rows: (L | string)[][] }
  | { t: 'controls'; rows: ControlRow[] }
  | { t: 'level'; id: number }
  | { t: 'topic'; id: GuideTopic };
export interface Page { id: string; title: L; blocks: Block[]; topics?: GuideTopic[] }
export interface Section { id: string; letter: string; title: L; pages: Page[] }

const SEC = MAX_RECORDING_DURATION_MS / 1000;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const hit = (n: number, k: number) => Math.round(n * k);

// ---------------------------------------------------------------- Controls (one table for the pages and the quick sheet)
export const CONTROLS: { group: L; rows: ControlRow[] }[] = [
  { group: t('Di chuyển & Echo', 'Movement & Echo'), rows: [
    { keys: 'W A S D / ← ↑ → ↓', touch: t('Cần điều khiển (cột trái)', 'Stick (left column)'), action: t('Di chuyển', 'Move') },
    { keys: 'E', touch: t('Nút Ghi hình / Dừng ghi', 'Record / Stop button'), action: t(`Bắt đầu ghi đường đi; bấm lần nữa để lưu (tối đa ${SEC} giây, đủ ${SEC} giây tự lưu)`, `Start recording your path; press again to save (up to ${SEC} s, saved automatically at ${SEC} s)`) },
    { keys: 'Q', touch: t('Nút Gọi Echo', 'Summon Echo button'), action: t('Gọi Echo phát lại bản ghi (tốn 1 lượt Echo)', 'Summon an Echo that replays the recording (costs 1 Echo charge)') },
    { keys: 'C', touch: t('Nút ❚❚ / ▶ trên dải Echo', '❚❚ / ▶ on the Echo strip'), action: t('Tạm dừng / cho Echo đang chọn chạy tiếp', 'Pause / resume the selected Echo') },
    { keys: 'X', touch: t('Nút Thu Echo', 'Recall Echo button'), action: t('Thu hồi Echo đã gọi lâu nhất', 'Recall the oldest Echo') },
    { keys: 'Shift + Q', touch: t('Nút ⇄ trên dải Echo', '⇄ on the Echo strip'), action: t('Đổi chỗ với Echo đang chọn (đường thẳng không được có tường/cổng; tốn 30 ổn định, chờ 7 giây)', 'Swap places with the selected Echo (no wall or gate on the straight line; costs 30 stability, 7 s cooldown)') },
    { keys: 'Shift + chuột trái', touch: t('Nút ⌖ trên dải Echo, rồi chạm vào mục tiêu', '⌖ on the Echo strip, then tap the target'), action: t('Đánh dấu mục tiêu: trong 4 giây, đòn phát lại của Echo ưu tiên mục tiêu đó', 'Mark a target: for 4 s the Echoes’ replayed attacks favour it') },
  ] },
  { group: t('Chiến đấu', 'Combat'), rows: [
    { keys: 'Chuột trái', touch: t('Nút đánh lớn (giữ để đánh liên tục) hoặc chạm vào bản đồ', 'Big attack button (hold to keep attacking) or tap the arena'), action: t('Đánh / bắn về phía con trỏ hoặc chỗ chạm; bấm đều tay để ra combo 4 đòn', 'Attack toward the cursor or the tap; keep pressing for a 4-hit combo') },
    { keys: 'Space / chuột phải', touch: t('Nút kỹ năng', 'Skill button'), action: t('Kỹ năng riêng của nhân vật (tốn MP)', 'Your hero’s skill (costs MP)') },
    { keys: 'V / chuột giữa', touch: t('Nút Tuyệt kỹ (chỉ Aeris)', 'Ultimate button (Aeris only)'), action: t('Đại chiêu khi thanh Nộ đầy (chỉ Aeris có)', 'Ultimate when Rage is full (Aeris only)') },
    { keys: 'Shift', touch: t('Nút Né tránh', 'Dodge button'), action: t('Lướt né (chỉ khi còn quái hoặc boss; chờ 1,2 giây)', 'Dodge (only while enemies or a boss remain; 1.2 s cooldown)') },
  ] },
  { group: t('Vật phẩm & hệ thống', 'Items & system'), rows: [
    { keys: '1 – 3', touch: t('Túi đồ → DÙNG ở vật phẩm mang theo', 'Inventory → USE on a carried item'), action: t(`Dùng vật phẩm ở ô mang theo 1–${ITEM_LOADOUT_LIMIT} (chọn trước khi vào trận)`, `Use the item in carried slot 1–${ITEM_LOADOUT_LIMIT} (packed before the battle)`) },
    { keys: 'R', touch: t('Túi đồ → Bình thời gian → DÙNG', 'Inventory → Time potion → USE'), action: t('Dùng Bình thời gian đã mang theo: +2 giây cho chặng', 'Use a carried Time potion: +2 s for this leg') },
    { keys: 'Tab', touch: t('Nút Túi đồ', 'Inventory button'), action: t('Mở Kho đồ: vật phẩm mang theo và ấn nâng Echo (trận tạm dừng khi mở)', 'Open the inventory: carried items and Echo runes (play pauses while open)') },
    { keys: 'Esc / P', touch: t('Nút ❚❚ góc trên', '❚❚ at the top'), action: t('Tạm dừng / tiếp tục', 'Pause / resume') },
    { keys: 'T', touch: t('Tạm dừng → Chơi lại màn', 'Pause → Retry level'), action: t('Chơi lại màn (qua bước chọn vật phẩm mang theo)', 'Retry the level (through the item-packing step)') },
    { keys: 'M', touch: t('Tạm dừng → Cài đặt → Tắt âm', 'Pause → Settings → Mute'), action: t('Bật/tắt âm thanh', 'Mute / unmute') },
    { keys: 'F', touch: null, action: t('Bật/tắt toàn màn hình', 'Toggle full screen') },
    { keys: '—', touch: t('Nút ? góc trên / Tạm dừng → Sổ tay', '? at the top / Pause → Guide'), action: t('Mở sổ tay này', 'Open this guide') },
  ] },
];

// ---------------------------------------------------------------- Shared bits
const heroRow = (label: L, mage: L | string, kael: L | string): (L | string)[] => [label, mage, kael];
const shopRows = SHOP_ITEMS.filter(i => i.id !== 'aid').map(i => [t(i.vi, i.en), `${i.price}`, t(i.detailVi, i.detailEn)]);
const runeRows = ECHO_RUNES.map(r => [`${r.glyph} ` as string, t(r.vi, r.en), t(r.detailVi, r.detailEn)]);
const pickupRows = (Object.keys(SKILL_PICKUPS) as (keyof typeof SKILL_PICKUPS)[]).map(k => {
  const p = SKILL_PICKUPS[k];
  const who = [CLASS_SKILLS.mage.includes(k) ? 'Aeris' : '', CLASS_SKILLS.swordsman.includes(k) ? 'Kael' : ''].filter(Boolean).join(', ');
  return [t(p.vi, p.en), t(p.effectVi, p.effectEn), who];
});
const enemyName: Record<string, L> = {
  goblin: t('Goblin', 'Goblin'), bear: t('Gấu', 'Bear'), skull: t('Đầu lâu', 'Skull'), shaman: t('Shaman (bắn xa)', 'Shaman (ranged)'), minotaur: t('Minotaur', 'Minotaur'),
};
export const ENEMY_NAMES = enemyName;
const enemyRows = (['goblin', 'bear', 'skull', 'shaman', 'minotaur'] as const).map(k => [enemyName[k], `${ENEMY_STATS[k].hp}`, `${ENEMY_STATS[k].damage}`, `${ENEMY_STATS[k].reach}`]);

// ---------------------------------------------------------------- Sections A–G
export const GUIDE: Section[] = [
  { id: 'start', letter: 'A', title: t('Bắt đầu chơi', 'Getting started'), pages: [
    { id: 'what', title: t('Second Me là game gì?', 'What is Second Me?'), blocks: [
      { t: 'p', text: t('Second Me là game giải đố + hành động nhìn từ trên xuống. Trên đường đi có cổng đá bị khóa; cổng chỉ mở khi có người đứng giữ trên các ấn (công tắc phát sáng). Bạn chỉ có một mình — nên bạn ghi lại đường đi của chính mình rồi gọi ra Echo, một bản sao tự đi lại đúng đường đó và đứng giữ ấn thay bạn.',
        'Second Me is a top-down puzzle-action game. Stone gates block the way and only open while someone stands on their runes (glowing switches). You are alone — so you record your own path and summon an Echo, a copy that walks the same path and holds the rune for you.') },
      { t: 'figure', fig: { shot: 'l1-05-echo-holds', alt: t('Echo đứng trên ấn, cổng đã mở', 'An Echo on the rune, the gate open'), caption: t('Echo (bản sao màu xanh) giữ ấn, cổng mở cho bạn đi qua.', 'The Echo (the blue copy) holds the rune and the gate opens for you.'), notes: [{ kind: 'ring', at: 'echo', n: 1, text: t('Echo', 'Echo') }, { kind: 'ring', at: 'gate1', r: 70, n: 2, text: t('Cổng mở', 'Gate open') }] } },
      { t: 'list', items: [
        t('Mục tiêu: vượt lần lượt 13 màn — 11 màn giải đố và 2 trận boss (Thủ vệ băng ở màn 6, Quỷ Tâm Hỏa ở màn 13).', 'Goal: clear 13 levels in order — 11 puzzle trails and 2 boss fights (the Frost Guardian at level 6, the Ember Demon at level 13).'),
        t('Mỗi chặng đường có đồng hồ đếm ngược; tới ấn kế tiếp là nạp lại giờ.', 'Each leg has a countdown; reaching the next rune refills it.'),
        t('Có quái và bẫy; Echo cũng tự đánh quái giúp bạn.', 'There are enemies and traps; Echoes fight them for you too.'),
      ] },
    ] },
    { id: 'echo', title: t('Echo hoạt động thế nào?', 'How Echoes work'), topics: ['echo'], blocks: [
      { t: 'list', items: [
        t(`E bắt đầu ghi; E lần nữa lưu. Bản ghi dài tối đa ${SEC} giây (đủ ${SEC} giây tự lưu).`, `E starts recording; E again saves it. A recording lasts up to ${SEC} s (saved automatically at ${SEC} s).`),
        t('Q gọi một Echo: nó xuất hiện ở điểm bắt đầu bản ghi, đi lại đúng đường và đứng ở điểm cuối. Echo cũng lặp lại các đòn đánh bạn đã đánh trong lúc ghi.', 'Q summons an Echo: it appears where the recording started, walks the same path and stays at its end. It also repeats the attacks you made while recording.'),
        t('Mỗi lần gọi tốn 1 lượt Echo. Đầu màn có 3 lượt; tới mỗi ấn mới hoặc hạ một quái được +1 lượt (không quá giới hạn Echo).', 'Each summon costs 1 Echo charge. You start a level with 3; each new rune reached and each enemy defeated gives +1 (up to the Echo limit).'),
        t('Tối đa 4 Echo trên sân cùng lúc (6 khi dùng Nhẫn giới hạn Echo). X thu Echo cũ nhất để lấy chỗ.', 'Up to 4 Echoes at once (6 with an Echo limit ring). X recalls the oldest to free a slot.'),
        t('Mỗi Echo có 100 "ổn định" — như máu. Bị đánh thì giảm; về 0 thì Echo biến mất. Echo đang tạm dừng cũng hao dần ổn định.', 'Each Echo has 100 "stability" — its health. Hits lower it; at 0 the Echo is gone. A paused Echo slowly loses stability too.'),
        t('Gặp quái trong khoảng 3 mét, Echo tạm dừng bản ghi để đánh rồi quay lại đi tiếp. Ở màn boss, Echo thấy cả bản đồ (trừ sau tường) và đánh theo thứ tự: quái nhỏ → trụ → boss khi hết khiên.', 'When an enemy comes within about 3 m, the Echo pauses its recording to fight, then carries on. In boss arenas an Echo sees the whole map (not through walls) and works in order: small enemies → pillars → the boss once its shield is down.'),
      ] },
    ] },
    { id: 'first-level', title: t('Màn đầu tiên — từng bước', 'Your first level, step by step'), blocks: [
      { t: 'p', text: t('Màn 1 "Echo Grove" có 1 ấn phía bắc và 1 cổng. Ảnh dưới đây chụp trực tiếp từ game khi làm đúng các bước.', 'Level 1 "Echo Grove" has one rune to the north and one gate. The pictures below were captured from the game while doing exactly these steps.') },
      { t: 'steps', steps: [
        { fig: { shot: 'l1-01-start', alt: t('Nhân vật ở điểm xuất phát', 'The hero at the start'), notes: [{ kind: 'ring', at: 'player', n: 1 }, { kind: 'key', at: 'player', key: 'E' }, { kind: 'ring', at: 'rune1', n: 2, text: t('Ấn I', 'Rune I') }] },
          text: t('Đứng ở điểm xuất phát. Nhấn E để bắt đầu ghi (góc trên hiện "ĐANG GHI").', 'Stand at the start. Press E to start recording ("RECORDING" appears).') },
        { fig: { shot: 'l1-02-walk', alt: t('Đang ghi, đi về phía ấn', 'Recording, walking to the rune'), notes: [{ kind: 'arrow', from: 'start', to: 'corner' }, { kind: 'arrow', from: 'corner', to: 'rune1', text: t('Đi tới ấn', 'Walk to the rune') }] },
          text: t('Đi tới ấn phát sáng (đi đường ngắn nhất, dưới 8 giây).', 'Walk to the glowing rune (shortest way, under 8 s).') },
        { fig: { shot: 'l1-03-on-rune', alt: t('Đứng trên ấn', 'Standing on the rune'), notes: [{ kind: 'ring', at: 'player', n: 3 }, { kind: 'key', at: 'player', key: 'E' }] },
          text: t('Đứng lên ấn rồi nhấn E lần nữa để lưu bản ghi.', 'Step onto the rune and press E again to save the recording.') },
        { fig: { shot: 'l1-04-summon', alt: t('Echo vừa xuất hiện', 'The Echo has appeared'), notes: [{ kind: 'ring', at: 'echo', n: 4, text: t('Echo', 'Echo') }, { kind: 'key', at: 'player', key: 'Q' }] },
          text: t('Đi ra khỏi ấn rồi nhấn Q: Echo xuất hiện ở điểm bắt đầu bản ghi và đi lại đường của bạn.', 'Step off the rune and press Q: the Echo appears where you started recording and walks your path.') },
        { fig: { shot: 'l1-05-echo-holds', alt: t('Echo giữ ấn, cổng mở', 'The Echo holds the rune, the gate opens'), notes: [{ kind: 'ring', at: 'echo', n: 5, text: t('Echo giữ ấn', 'Echo on the rune') }, { kind: 'ring', at: 'gate1', r: 70, text: t('Cổng mở', 'Gate open') }] },
          text: t('Chờ Echo đứng vào ấn — cổng mở.', 'Wait until the Echo stands on the rune — the gate opens.') },
        { fig: { shot: 'l1-06-cross', alt: t('Đi qua cổng', 'Crossing the gate'), notes: [{ kind: 'ring', at: 'player', n: 6 }, { kind: 'ring', at: 'exit', text: t('Lối ra', 'Exit') }] },
          text: t('Đi qua cổng trong lúc Echo vẫn giữ ấn, rồi vào cổng thoát.', 'Cross while the Echo still holds the rune, then enter the exit portal.') },
      ] },
      { t: 'note', tone: 'warn', text: t('Lỗi hay gặp: đi tới cổng trước khi Echo vào ấn; ghi quá 8 giây; quên bấm E lần hai (Q sẽ báo "Chưa có bản ghi").', 'Common mistakes: reaching the gate before the Echo is on the rune; recording past 8 s; forgetting the second E (Q then says "No recording yet").') },
    ] },
  ] },

  { id: 'controls', letter: 'B', title: t('Điều khiển', 'Controls'), pages: [
    { id: 'pc', title: t('Bàn phím & chuột (PC)', 'Keyboard & mouse (PC)'), blocks: [
      { t: 'controls', rows: CONTROLS.flatMap(g => g.rows) },
      { t: 'figure', fig: { shot: 'hud-desktop', alt: t('Giao diện chơi trên máy tính', 'The desktop play screen'), caption: t('Cột phải: máu (HP), năng lượng (MP) và các nút chiêu kèm phím tắt. Cột trái: màn, thời gian, ấn Echo, ô vật phẩm mang theo (1–3), cài đặt, túi đồ và sổ tay.', 'Right column: HP, MP and the ability buttons with their keys. Left column: level, time, Echo runes, carried item slots (1–3), settings, inventory and this guide.') } },
    ] },
    { id: 'touch', title: t('Điện thoại & máy tính bảng', 'Phones & tablets'), blocks: [
      { t: 'p', text: t('Trên điện thoại, game cần cầm ngang. Tất cả chức năng của bàn phím đều có nút cảm ứng tương ứng (bảng dưới).', 'On phones the game needs landscape. Every keyboard function has a touch equivalent (table below).') },
      { t: 'figure', fig: { shot: 'mobile-hud', alt: t('Giao diện cảm ứng', 'The touch controls'), caption: t('Trái: dải Echo (khi có Echo) và cần điều khiển. Phải: thanh MP và cụm nút chiêu. Góc trên phải: túi đồ và tạm dừng.', 'Left: the Echo strip (while an Echo is out) and the stick. Right: the MP bar and the ability buttons. Top right: inventory and pause.'),
        notes: [{ kind: 'ring', at: 'stick', n: 1, text: t('Di chuyển', 'Move') }, { kind: 'ring', at: 'echoStrip', n: 2, text: t('Dải Echo', 'Echo strip') }, { kind: 'ring', at: 'attack', n: 3, text: t('Đánh', 'Attack') }, { kind: 'ring', at: 'pause', n: 4, text: t('Tạm dừng', 'Pause') }] } },
      { t: 'table', head: [t('Phím (PC)', 'Key (PC)'), t('Trên điện thoại', 'On a phone'), t('Tác dụng', 'Does')],
        rows: CONTROLS.flatMap(g => g.rows).map(r => [r.keys, r.touch ?? t('— (không cần trên điện thoại)', '— (not needed on phones)'), r.action]) },
      { t: 'figure', fig: { shot: 'mobile-echo', alt: t('Dải Echo cảm ứng', 'The touch Echo strip'), caption: t('Dải Echo: số = chọn Echo (bấm để chuyển), ❚❚/▶ = dừng/chạy tiếp, ⇄ = đổi chỗ, ⌖ = đánh dấu mục tiêu rồi chạm vào mục tiêu. Vạch xanh trên cùng = ổn định của Echo đang chọn.', 'Echo strip: number = select (tap to cycle), ❚❚/▶ = pause/resume, ⇄ = swap, ⌖ = mark, then tap the target. The green line on top = the selected Echo’s stability.') } },
      { t: 'note', tone: 'tip', text: t('Có thể giữ cần điều khiển và bấm nút đánh cùng lúc bằng hai ngón.', 'You can hold the stick and press attack at the same time with two thumbs.') },
    ] },
  ] },

  { id: 'mechanics', letter: 'C', title: t('Cơ chế', 'Mechanics'), pages: [
    { id: 'runes', title: t('Ấn và cổng', 'Runes and gates'), topics: ['links', 'ward', 'release', 'rhythm'], blocks: [
      { t: 'list', items: [
        t('Mỗi ấn có số La Mã (I, II, III…). Cạnh mỗi cổng ghi các số cần giữ.', 'Every rune has a Roman numeral (I, II, III…). The numbers beside a gate are the runes it needs.'),
        t('Cổng nhiều số chỉ mở khi tất cả các ấn đó được giữ cùng lúc — cần nhiều Echo.', 'A gate with several numbers opens only while all of them are held at once — you need several Echoes.'),
        t('"Nhả ấn I": cổng cần ấn I để trống — rời ấn I hoặc thu Echo đang giữ nó (X).', '"Release rune I": the gate needs rune I empty — leave it or recall the Echo holding it (X).'),
        t('Ấn bị phong ấn (viền tím, đường nét đứt tới lính gác): hạ hết lính gác được nối thì ấn mới hoạt động.', 'A sealed rune (purple ring, dashed lines to sentries): defeat the linked sentries to wake it.'),
        t('Cổng theo nhịp: chỉ mở một lúc trong mỗi chu kỳ ("Nhịp mở"). Giữ đủ ấn, đứng sát cổng và qua ngay khi thanh chắn rút.', 'Timed gate: it only opens part of each cycle ("Open beat"). Hold the runes, wait by the gate and cross as the barrier retracts.'),
      ] },
      { t: 'topic', id: 'links' }, { t: 'topic', id: 'ward' }, { t: 'topic', id: 'release' }, { t: 'topic', id: 'rhythm' },
    ] },
    { id: 'multi', title: t('Nhiều Echo, hoán đổi, thu hồi', 'Several Echoes, swapping, recalling'), topics: ['multi', 'recycle'], blocks: [
      { t: 'list', items: [
        t('Mỗi Echo giữ bản ghi riêng. Chọn bằng Shift + 1–6 hoặc 4–6 (điện thoại: nút số trên dải Echo).', 'Each Echo keeps its own recording. Select with Shift + 1–6 or 4–6 (phones: the number on the Echo strip).'),
        t('C tạm dừng / cho Echo đang chọn chạy tiếp.', 'C pauses / resumes the selected Echo.'),
        t('X luôn thu Echo đã gọi lâu nhất.', 'X always recalls the oldest Echo.'),
        t('Shift + Q đổi chỗ với Echo đang chọn khi đường thẳng giữa hai bên không có tường hay cổng. Tốn 30 ổn định của Echo, chờ 7 giây (ấn Hoán ảnh: 15 và 4 giây).', 'Shift + Q swaps places with the selected Echo when the straight line between you is free of walls and gates. Costs 30 of its stability, 7 s cooldown (Phasewalk rune: 15 and 4 s).'),
        t('Shift + bấm chuột (điện thoại: ⌖ rồi chạm) đánh dấu mục tiêu: trong 4 giây, đòn phát lại của Echo ưu tiên mục tiêu đó.', 'Shift + click (phones: ⌖ then tap) marks a target: for 4 s the Echoes’ replayed attacks favour it.'),
      ] },
      { t: 'topic', id: 'multi' }, { t: 'topic', id: 'recycle' },
    ] },
    { id: 'timer', title: t('Đồng hồ chặng, sao và phần thưởng', 'Leg timer, stars and rewards'), topics: ['time'], blocks: [
      { t: 'list', items: [
        t('Mỗi chặng (từ ấn này tới ấn kế tiếp) có thời gian riêng; hết giờ là thua. Tới ấn kế tiếp là nạp lại. Trận boss không tính giờ.', 'Each leg (rune to rune) has its own time; when it runs out you lose. Reaching the next rune refills it. Boss fights are untimed.'),
        t(`Đồng hồ cát xuất hiện gần bạn: nhặt được +${SHARD_BONUS} giây, mỗi chặng một mảnh.`, `An hourglass appears near you: +${SHARD_BONUS} s, one per leg.`),
        t('Bình thời gian: +2 giây. Chỉ dùng được bình đã mang theo vào trận (R, phím ô 1–3, hoặc trong túi đồ).', 'Time potion: +2 s. Only potions packed for the battle can be used (R, its slot key 1–3, or the inventory).'),
        t(`Hạ quái: +${ENEMY_TIME_BONUS} giây (không vượt thời gian của chặng) và +1 lượt Echo.`, `Defeating an enemy: +${ENEMY_TIME_BONUS} s (never above the leg's budget) and +1 Echo charge.`),
        t('Xong màn càng nhanh càng nhiều sao (0–3) và xu (0 / 4 / 8 / 12). Mỗi lần thắng được chọn 1 trong 3 ấn nâng Echo.', 'The faster you finish, the more stars (0–3) and coins (0 / 4 / 8 / 12). Every win lets you pick 1 of 3 Echo runes.'),
      ] },
      { t: 'figure', fig: { shot: 'hud-desktop', alt: t('Đồng hồ chặng trên giao diện', 'The leg timer on screen'), caption: t('Đồng hồ "CÒN LẠI" ở trên cùng giữa màn hình.', 'The "TIME LEFT" counter at the top centre.') } },
    ] },
  ] },

  { id: 'heroes', letter: 'D', title: t('Nhân vật', 'Heroes'), pages: [
    { id: 'compare', title: t('Aeris và Kael', 'Aeris and Kael'), blocks: [
      { t: 'figure', fig: { shot: 'heroes', alt: t('Màn chọn nhân vật', 'The hero select screen'), caption: t('Đổi nhân vật ở trại (bấm vào nhân vật).', 'Change hero at the camp (tap the hero).') } },
      { t: 'table', head: [t('Chỉ số', 'Stat'), t('Aeris — pháp sư', 'Aeris — mage'), t('Kael — kiếm sĩ', 'Kael — swordsman')], rows: [
        heroRow(t('Máu', 'Health'), `${HERO_MAX_HP.mage}`, `${HERO_MAX_HP.swordsman}`),
        heroRow(t('Đòn thường', 'Basic attack'), t('Bắn phép tầm xa, combo 4 đòn', 'Ranged spells, 4-hit combo'), t('Chém cận chiến, combo 4 đòn (đòn cuối lướt tới)', 'Melee slashes, 4-hit combo (the finisher dashes in)')),
        heroRow(t('Tấn công gốc', 'Base attack'), `${HERO_COMBO_ATTACK.mage}`, `${HERO_COMBO_ATTACK.swordsman}`),
        heroRow(t('MP cả combo', 'MP per full combo'), `${(COMBO_MP.mage as readonly number[]).reduce((a, b) => a + b, 0)}`, `${(COMBO_MP.swordsman as readonly number[]).reduce((a, b) => a + b, 0)}`),
        heroRow(t('Kỹ năng (Space)', 'Skill (Space)'),
          t(`Gai băng — ${skillManaCost('mage')} MP, chờ ${ICE_MAGIC.COOLDOWN} giây. Vùng băng nổ sau ${ICE_MAGIC.WARNING} giây, ${ICE_MAGIC.DAMAGE} sát thương, làm quái chậm ${pct(1 - ENEMY_CHILL.SPEED)} trong ${ENEMY_CHILL.SECONDS} giây. Tự nhắm boss → quái gần nhất → con trỏ.`, `Ice Spikes — ${skillManaCost('mage')} MP, ${ICE_MAGIC.COOLDOWN} s cooldown. Bursts after ${ICE_MAGIC.WARNING} s for ${ICE_MAGIC.DAMAGE} damage and slows enemies ${pct(1 - ENEMY_CHILL.SPEED)} for ${ENEMY_CHILL.SECONDS} s. Aims at the boss → nearest enemy → cursor.`),
          t(`Thánh vực — ${skillManaCost('swordsman')} MP, chờ 9 giây. Vòng sáng 5 giây tại chỗ: đứng trong vòng hồi 20 máu mỗi 2 giây và đánh mạnh hơn 20%.`, `Sanctuary — ${skillManaCost('swordsman')} MP, 9 s cooldown. A 5 s ring of light: inside it you heal 20 every 2 s and hit 20% harder.`)),
        heroRow(t('Đại chiêu (V)', 'Ultimate (V)'),
          t(`Cần Nộ đầy ${RAGE.MAX}. Đứng yên: Mưa băng (${AERIS_ULT.RAIN.COUNT} nhũ băng, ${AERIS_ULT.RAIN.DAMAGE} mỗi cái). Đi về phía mục tiêu: Tia bí thuật (${AERIS_ULT.BEAM.TICKS} nhịp × ${AERIS_ULT.BEAM.DAMAGE}). Đi lùi: Ngưng đọng thời gian ${AERIS_ULT.STOP.TIME} giây.`, `Needs full Rage (${RAGE.MAX}). Still: Icicle Rain (${AERIS_ULT.RAIN.COUNT} icicles, ${AERIS_ULT.RAIN.DAMAGE} each). Moving at the target: Arcane Beam (${AERIS_ULT.BEAM.TICKS} ticks × ${AERIS_ULT.BEAM.DAMAGE}). Moving away: Time Stop for ${AERIS_ULT.STOP.TIME} s.`),
          t('Chưa có đại chiêu.', 'No Ultimate yet.')),
        heroRow(t('Nguyên tố', 'Element'), t('Băng', 'Ice'), t('Lửa — gây gấp đôi sát thương lên Thủ vệ băng, trụ băng, Pha Lê Băng và slime băng (cả Echo của Kael).', 'Fire — double damage to the Frost Guardian, its pillars, Frost Crystals and ice slimes (Kael’s Echoes too).')),
      ] },
      { t: 'list', items: [
        t(`MP tối đa ${MAX_MP}; tự hồi ${MP_REGEN_PER_SECOND} MP/giây sau ${MP_REGEN_DELAY} giây không dùng.`, `Max MP ${MAX_MP}; regenerates ${MP_REGEN_PER_SECOND} MP/s after ${MP_REGEN_DELAY} s unused.`),
        t(`Nộ tăng khi đánh trúng (+${RAGE.HIT}, đòn mạnh +${RAGE.HEAVY}) và khi bị đánh (+${RAGE.HURT}).`, `Rage grows when you land hits (+${RAGE.HIT}, heavy +${RAGE.HEAVY}) and when you are hit (+${RAGE.HURT}).`),
        t('Bị trúng đòn hoặc lướt né sẽ làm mất combo đang đánh.', 'Getting hit or dodging breaks your current combo.'),
      ] },
      { t: 'note', tone: 'tip', text: t('Người mới: Kael nhiều máu hơn và tự hồi máu bằng Thánh vực. Aeris đánh từ xa an toàn hơn nhưng máu mỏng.', 'New players: Kael has more health and heals with Sanctuary. Aeris fights safely from range but is fragile.') },
    ] },
  ] },

  { id: 'enemies', letter: 'E', title: t('Quái và bẫy', 'Enemies and traps'), pages: [
    { id: 'foes', title: t('Quái vật', 'Enemies'), topics: ['enemies'], blocks: [
      { t: 'p', text: t('Quái báo trước chỗ sắp đánh bằng một vòng tròn dưới đất — rời khỏi vòng (hoặc lướt né) trước khi đòn đáp xuống. Quái bị tường và cổng chặn tầm nhìn, và có thể bị Echo dụ đuổi theo.', 'Enemies mark where they will strike with a ring on the ground — leave it (or dodge) before the blow lands. Walls and gates block their sight, and Echoes can lure them away.') },
      { t: 'figure', fig: { shot: 'enemy-warning', alt: t('Vòng đỏ báo đòn của quái', 'An enemy’s red warning ring'), notes: [{ kind: 'ring', at: 'warning', text: t('Vòng báo đòn', 'Warning ring') }] } },
      { t: 'table', head: [t('Quái', 'Enemy'), t('Máu gốc', 'Base HP'), t('Sát thương gốc', 'Base damage'), t('Tầm đánh', 'Reach')], rows: enemyRows },
      { t: 'note', text: t('Máu và sát thương quái tăng dần theo màn. Shaman bắn đạn xa — đứng sau tường để chặn đạn.', 'Enemy health and damage grow level by level. Shamans shoot from range — stand behind a wall to block their bolts.') },
    ] },
    { id: 'traps', title: t('Bẫy', 'Traps'), topics: ['vines', 'crusher', 'spikes', 'rocks'], blocks: [
      { t: 'table', head: [t('Bẫy', 'Trap'), t('Tác dụng', 'Effect'), t('Cách qua', 'How to pass')], rows: [
        [t('Rễ gai', 'Thorn roots'), t('Làm chậm 45%, không gây sát thương', 'Slows you 45%, no damage'), t('Đi vòng nếu có lối khác', 'Go around when you can')],
        [t('Hàm đá', 'Stone jaws'), t(`Báo trước rồi dập: ${DAMAGE.trap} sát thương, giữ chân 0,25 giây`, `Warns, then snaps: ${DAMAGE.trap} damage, holds you 0.25 s`), t('Chờ ngoài bẫy tới lúc hàm mở', 'Wait outside until the jaws open')],
        [t('Bàn gai', 'Spikes'), t(`Có chu kỳ; đầu gai nhú lên là cảnh báo; ${DAMAGE.trap} sát thương`, `Cycles; rising tips warn you; ${DAMAGE.trap} damage`), t('Qua khi gai rút hẳn', 'Cross once they retract')],
        [t('Đá rơi', 'Falling rocks'), t(`Vòng vàng + bóng đen báo chỗ rơi; ${DAMAGE.trap} sát thương`, `A gold ring and shadow mark the spot; ${DAMAGE.trap} damage`), t('Rời vòng trước khi đá chạm đất', 'Leave the ring before it lands')],
      ] },
      { t: 'topic', id: 'vines' }, { t: 'topic', id: 'crusher' }, { t: 'topic', id: 'spikes' }, { t: 'topic', id: 'rocks' },
    ] },
    { id: 'pickups', title: t('Ấn tiếp sức ở đấu trường boss', 'Boss-arena pickups'), topics: ['skillPickups'], blocks: [
      { t: 'p', text: t('Trong trận boss, ấn phát sáng rơi xuống gần bạn. Đi chạm vào là có tác dụng ngay, không tốn MP. Echo không nhặt được.', 'In boss fights glowing pickups drop near you. Walk over one for an instant effect, no MP. Echoes cannot pick them up.') },
      { t: 'table', head: [t('Ấn', 'Pickup'), t('Tác dụng', 'Effect'), t('Rơi cho', 'Drops for')], rows: pickupRows },
    ] },
  ] },

  { id: 'levels', letter: 'F', title: t('Từng màn chơi', 'Level by level'), pages: [
    ...Array.from({ length: 13 }, (_, i): Page => ({ id: `level-${i + 1}`, title: t(`Màn ${i + 1}`, `Level ${i + 1}`), blocks: [{ t: 'level', id: i + 1 }] })),
    { id: 'boss-guardian', title: t('Boss 1 — Thủ vệ băng', 'Boss 1 — Frost Guardian'), topics: ['shield', 'shieldRestored', 'bossPatterns', 'decoy', 'vulnerable'], blocks: [
      { t: 'figure', fig: { shot: 'boss1-overview', alt: t('Đấu trường Thủ vệ băng', 'The Frost Guardian arena'), notes: [{ kind: 'ring', at: 'boss', r: 60, text: t('Thủ vệ', 'Guardian') }, { kind: 'ring', at: 'pillar1', n: 1 }, { kind: 'ring', at: 'pillar2', n: 2 }, { kind: 'ring', at: 'pillar3', n: 3 }, { kind: 'ring', at: 'pillar4', n: 4 }] } },
      { t: 'list', items: [
        t('Mở màn chỉ có Pha Lê Băng; phá vỡ 2 con thì hai con còn lại hợp thể thành Thủ vệ.', 'It opens with Frost Crystals only; shatter 2 and the other two fuse into the Guardian.'),
        t(`Thủ vệ có ${GUARDIAN_HP} máu và 4 trụ băng ở bốn góc (mỗi trụ 60 máu). Còn ít nhất 1 trụ thì boss MIỄN sát thương — đừng đánh boss lúc này, hãy phá trụ.`, `The Guardian has ${GUARDIAN_HP} HP and 4 ice pillars in the corners (60 HP each). While even one stands the boss is IMMUNE — don't hit it, break the pillars.`),
        t('Trụ còn đứng thì hồi máu cho boss và thả Pha Lê Băng: tất cả trụ cùng thả một lúc, ngay khi trụ xuất hiện rồi cứ mỗi ' + PILLAR_SUMMON.EVERY + ' giây. Mỗi trụ thả ' + PILLAR_SUMMON.PER_PILLAR.join(' / ') + ' con (đầu trận / sau 75% máu / sau 50% máu).',
          'Standing pillars heal the boss and release Frost Crystals: all at once, as soon as they appear and then every ' + PILLAR_SUMMON.EVERY + ' s, ' + PILLAR_SUMMON.PER_PILLAR.join(' / ') + ' per pillar (start / after 75% / after 50%).'),
        t('Phá trụ cuối → khiên vỡ, boss khựng lại ~1,8 giây; đòn của bạn lúc boss "hồi sức" mạnh hơn 35%.', 'Break the last pillar → the shield shatters and the boss staggers ~1.8 s; your hits during its "recovery" deal 35% more.'),
        t('Khi boss xuống 75% và 50% máu, khiên bật lại và 4 trụ hồi sinh — phá lại. Từ 50% trở xuống, sau khi phá trụ lần này thì không còn trụ nữa: dồn lực kết liễu.', 'At 75% and 50% health the shield returns and the 4 pillars rise again — break them again. Below 50%, once those pillars fall there are no more: finish it.'),
        t('Mỗi đoạn máu về sau boss nghỉ giữa các đòn ít hơn.', 'Each later part of its health, the boss rests less between attacks.'),
      ] },
      { t: 'table', head: [t('Đòn', 'Attack'), t('Báo trước', 'Warning'), t('Cách né', 'How to avoid')], rows: [
        [t('Đập băng (cận chiến)', 'Ice slam (melee)'), t(`Nhãn "CẬN CHIẾN · NÉ CÚ ĐẤM" trên đầu boss, rồi cú đấm vào chỗ bạn đứng; ${hit(DAMAGE.bossSlam, BOSS_PLAYER_DAMAGE.guardian)} sát thương`, `"MELEE · EVADE THE PUNCH" over the boss, then a punch at where you stand; ${hit(DAMAGE.bossSlam, BOSS_PLAYER_DAMAGE.guardian)} damage`), t('Lùi xa boss hoặc lướt né ngay khi thấy nhãn', 'Back away from the boss or dodge as soon as the label shows')],
        [t('Ba tia băng', 'Three ice rays'), t(`Nhãn "TAM TRỌNG HÀN KÍCH · NÉ BA TIA BĂNG"; ba dải gai băng toả về phía mục tiêu; ${hit(FROST_STRIKE.DAMAGE, BOSS_PLAYER_DAMAGE.guardian)} sát thương mỗi nhịp, làm chậm`, `"TRIPLE FROST" label; three lanes of ice spikes fan toward the target; ${hit(FROST_STRIKE.DAMAGE, BOSS_PLAYER_DAMAGE.guardian)} per tick, slows`), t('Bước ra ngoài các dải, đứng giữa hai dải', 'Step out of the lanes, between two of them')],
        [t('Bão đạn', 'Ice barrage'), t(`Nhãn "BÃO ĐẠN BĂNG · TỎA 360°"; ${ICE_BARRAGE.WAVES.join('/')} loạt đạn toả tròn theo pha; ${hit(DAMAGE.bossProjectile, BOSS_PLAYER_DAMAGE.guardian)} mỗi viên`, `"ICE BARRAGE · 360°" label; ${ICE_BARRAGE.WAVES.join('/')} rings of shards by phase; ${hit(DAMAGE.bossProjectile, BOSS_PLAYER_DAMAGE.guardian)} each`), t('Đi qua khe giữa các viên đạn; đứng xa boss thì khe rộng hơn', 'Slip through the gaps; farther from the boss the gaps are wider')],
      ] },
      { t: 'note', text: t('Thủ vệ báo mọi đòn bằng nhãn chữ trên đầu. Nhãn xanh lá "SƠ HỞ · ĐÁNH NGAY +35%" nghĩa là khiên đã vỡ và boss đang hồi sức — lúc tốt nhất để đánh.', 'The Guardian announces every attack with a label over its head. The green "OPENING · STRIKE +35%" means the shield is down and it is recovering — the best moment to hit.') },
      { t: 'steps', steps: [
        { fig: { shot: 'boss1-slam', alt: t('Thủ vệ báo đòn đập băng', 'The Guardian winds up a slam'), notes: [{ kind: 'ring', at: 'boss', r: 95, text: t('Nhãn báo đòn', 'Attack label') }, { kind: 'ring', at: 'target', r: 30, n: 1 }] }, text: t('Đập băng: thấy nhãn "CẬN CHIẾN" thì lùi xa hoặc lướt né.', 'Ice slam: see "MELEE", back off or dodge.') },
        { fig: { shot: 'boss1-rays', alt: t('Ba tia băng', 'Three ice rays') }, text: t('Ba tia băng: đứng ngoài ba dải gai băng.', 'Ice rays: stay out of the three spike lanes.') },
        { fig: { shot: 'boss1-volley', alt: t('Bão đạn băng', 'The ice barrage') }, text: t('Bão đạn: tìm khe giữa các viên đạn.', 'Barrage: find the gaps between shards.') },
        { fig: { shot: 'boss1-open', alt: t('Khiên vỡ, boss sơ hở', 'Shield down, the boss exposed') }, text: t('Hết trụ: khiên vỡ — giờ mới đánh boss.', 'No pillars left: the shield is down — now hit the boss.') },
      ] },
      { t: 'note', tone: 'tip', text: t('Gọi Echo sớm: ở màn boss Echo tự dọn Pha Lê Băng rồi phá trụ, và boss chia bớt đòn sang Echo ở gần nó — bạn có thêm thời gian né và đánh. Kael gây gấp đôi sát thương lên boss, trụ và Pha Lê Băng.', 'Summon Echoes early: in this arena they clear the Frost Crystals and then break pillars, and the boss sends part of its attacks at a nearby Echo — giving you room. Kael deals double damage to the boss, its pillars and the crystals.') },
    ] },
    { id: 'boss-demon', title: t('Boss 2 — Quỷ Tâm Hỏa', 'Boss 2 — Ember Demon'), blocks: [
      { t: 'figure', fig: { shot: 'boss2-overview', alt: t('Hang Tâm Hỏa', 'The Ember Hollow'), notes: [{ kind: 'ring', at: 'boss', r: 70, text: t('Quỷ Tâm Hỏa', 'Ember Demon') }] } },
      { t: 'list', items: [
        t(`Quỷ có ${EMBER_DEMON_HP} máu, không có trụ khiên. Đòn của nó mạnh hơn Thủ vệ (×${BOSS_PLAYER_DAMAGE.demon} so với ×${BOSS_PLAYER_DAMAGE.guardian}). Bị đánh trúng có thể bị thiêu đốt (mất máu theo thời gian).`, `It has ${EMBER_DEMON_HP} HP and no pillar shield. Its hits are stronger than the Guardian's (×${BOSS_PLAYER_DAMAGE.demon} vs ×${BOSS_PLAYER_DAMAGE.guardian}). Being hit can set you burning (damage over time).`),
        t('Mở màn: trong hang có slime và quái thường (Đầu lâu, Goblin, Shaman, Gấu). Hạ slime lửa ở giữa thì Quỷ thức tỉnh; quái thường vẫn ở lại trong trận.', 'Opening: the cave holds slimes and regular enemies (Skulls, Goblins, Shamans, a Bear). Defeat the fire slime in the middle to wake the demon; the regular enemies stay for the fight.'),
        t('Bổ đao ("BỔ ĐAO · NÉ KHỎI VÙNG CAM"): vùng hình quạt trước mặt nó, tầm khoảng 155 — ra khỏi quạt hoặc lướt né.', 'Cleave ("CLEAVE · LEAVE THE ORANGE ZONE"): a fan in front of it, about 155 reach — get out of the fan or dodge.'),
        t('Loạt cầu lửa: bắn hình quạt 5 viên (pha cuối 7–9) — lách qua khe.', 'Fireball volley: a fan of 5 (7–9 in the last phase) — slip between them.'),
        t('Phun trào (từ pha 2): các vòng dưới đất nổ sau ~1 giây — rời vòng.', 'Eruptions (from phase 2): rings on the ground burst after ~1 s — leave them.'),
        t('Triệu hồi: sóng xung kích quanh nó và đầu lâu dung nham (tối đa 6 con cùng lúc).', 'Summon: a shockwave around it and magma skulls (up to 6 at once).'),
        t('Tế lễ ở 66% và 33% máu ("NGHI THỨC TỤ HỎA"): nó nhảy về giữa, ba lõi nguyên tố sáng lên — Lam diễm (lửa lạnh), Dung nham (hỏa ngục), Hắc hỏa (bóng tối) — và gọi thêm quái. Bạn hoặc Echo đứng lên một lõi khoảng 1 giây để phong ấn; lõi đó thành trụ tản nhiệt. Quỷ hấp thụ nguyên tố của một lõi khác và khoác giáp kháng hỏa (chỉ nhận 50% sát thương). Lam diễm làm nó chạy nhanh hơn; Dung nham để lại vũng lửa sau cú bổ và ở pha cuối bắn 9 thay vì 7 cầu lửa.', 'Ritual at 66% and 33% HP ("RITUAL"): it leaps to the centre, three elemental cores light up — Frostfire, Magma, Shadowflame — and more enemies appear. You or an Echo stand on a core about 1 s to seal it; that core becomes the cooling vent. The demon absorbs another core’s element and gains a heat shield (takes only 50% damage). Frostfire makes it faster; Magma leaves lava after its cleave and, in the last phase, fires 9 fireballs instead of 7.'),
        t('Khi có giáp, nó lao húc vào bạn hoặc Echo. Dụ nó húc vào trụ tản nhiệt (đứng gần trụ, hoặc để Echo đứng cạnh trụ) → sốc nhiệt: mất giáp, choáng 4,5 giây và nhận ×2,5 sát thương — đánh dồn lúc này.', 'While shielded it charges at you or an Echo. Bait it into the cooling vent (stand near it, or leave an Echo beside it) → thermal shock: the shield breaks, it is stunned 4.5 s and takes ×2.5 damage — unload now.'),
      ] },
      { t: 'steps', steps: [
        { fig: { shot: 'boss2-cleave', alt: t('Quạt bổ đao', 'The cleave fan'), notes: [{ kind: 'ring', at: 'target', r: 44, text: t('Bạn đang trong quạt', 'You are inside the fan') }] }, text: t('Bổ đao: rời vùng hình quạt trước mặt nó.', 'Cleave: leave the fan in front of it.') },
        { fig: { shot: 'boss2-ritual', alt: t('Tế lễ, ba lõi nguyên tố', 'Ritual, three elemental cores'), notes: [{ kind: 'ring', at: 'core1', r: 52, n: 1 }, { kind: 'ring', at: 'core2', r: 52, n: 2 }, { kind: 'ring', at: 'core3', r: 52, n: 3 }] }, text: t('Tế lễ: đứng (hoặc để Echo đứng) lên một lõi để phong ấn.', 'Ritual: stand (or leave an Echo) on a core to seal it.') },
        { fig: { shot: 'boss2-charge', alt: t('Quỷ chuẩn bị lao húc', 'The demon about to charge') }, text: t('Lao húc: dải cam là đường nó sẽ lao. Dụ nó vào trụ tản nhiệt (lõi đã phong ấn, có ghi "TRỤ TẢN NHIỆT").', 'Charge: the orange lane is its path. Lure it into the cooling vent (the sealed core, labelled "COOLING VENT").') },
        { fig: { shot: 'boss2-stunned', alt: t('Quỷ bị choáng', 'The demon stunned') }, text: t('Choáng: đánh dồn, sát thương ×2,5.', 'Stunned: hit hard, ×2.5 damage.') },
      ] },
      { t: 'note', tone: 'warn', text: t('Không áp dụng cách đánh Thủ vệ băng: Quỷ không có trụ, Kael không được nhân đôi sát thương ở đây.', 'The Guardian plan does not apply: the demon has no pillars, and Kael gets no double damage here.') },
    ] },
  ] },

  { id: 'items', letter: 'G', title: t('Vật phẩm và nâng cấp', 'Items and upgrades'), pages: [
    { id: 'runes', title: t('Ấn nâng Echo', 'Echo runes'), topics: ['upgradeRunes'], blocks: [
      { t: 'p', text: t('Mỗi lần thắng màn, chọn 1 trong 3 ấn ngẫu nhiên (12 loại). Ấn nằm trong túi; mang tối đa 4 ô ấn. Mở túi đồ (hoặc thanh ấn bên trái trên máy tính) để dùng trong màn 2 trở đi; mỗi lần dùng tốn 1 ấn, hiệu ứng hết khi rời hoặc chơi lại màn.', 'Each win lets you pick 1 of 3 random runes (12 kinds). They go to your bag; you equip up to 4. Use them from the inventory (or the rune bar on the left on desktop) from level 2 on; each use spends one, and the effect ends when you leave or retry the level.') },
      { t: 'table', head: [t('Ký hiệu', 'Glyph'), t('Ấn', 'Rune'), t('Tác dụng', 'Effect')], rows: runeRows },
    ] },
    { id: 'shop', title: t('Cửa hàng, túi đồ, rương', 'Shop, inventory, chests'), blocks: [
      { t: 'figure', fig: { shot: 'shop', alt: t('Cửa hàng', 'The shop') } },
      { t: 'table', head: [t('Vật phẩm', 'Item'), t('Giá (xu)', 'Price (coins)'), t('Tác dụng', 'Effect')], rows: shopRows },
      { t: 'figure', fig: { shot: 'inventory', alt: t('Túi đồ trong màn', 'The in-level inventory'), caption: t('Túi đồ: dùng bình hồi phục, năng lượng, bình thời gian và ấn nâng Echo.', 'Inventory: use healing and energy potions, time potions and Echo runes.') } },
      { t: 'list', items: [
        t(`Rương Phàm Phẩm: ${CHEST_PRICES.wood.single} xu mỗi lần mở. Rương Hoàng Phẩm: ${CHEST_PRICES.royal.single} Tanuki phàm tinh thể mỗi lần. Phần thưởng ngẫu nhiên (xu, bình, tinh thể…), có lịch sử mở rương. Các rương khác đang được hoàn thiện.`, `Common chest: ${CHEST_PRICES.wood.single} coins per pull. Royal chest: ${CHEST_PRICES.royal.single} Tanuki Common Crystals per pull. Random rewards (coins, potions, crystals…), with a pull history. The other chests are still being finished.`),
        t('Tinh thể nhận được khi thắng màn có sao và khi hạ boss.', 'Crystals come from starred level wins and boss victories.'),
      ] },
    ] },
    { id: 'loadout', title: t('Mang vật phẩm vào trận', 'Packing items for a battle'), blocks: [
      { t: 'p', text: t(`Trước mỗi trận (vào màn, chơi lại, sang màn kế) hiện cửa sổ "CHỌN VẬT PHẨM VÀO TRẬN". Chọn 1–${ITEM_LOADOUT_LIMIT} loại vật phẩm từ kho; mỗi ô chứa một loại, bấm − / + để chỉnh số lượng. Kho trống thì có nút "VÀO TAY KHÔNG".`, `Before each battle (entering a level, retrying, the next level) the "PACK ITEMS FOR THE BATTLE" window opens. Pick 1–${ITEM_LOADOUT_LIMIT} kinds from your stock; each slot holds one kind, − / + sets the amount. With an empty stock there is an "ENTER EMPTY-HANDED" button.`) },
      { t: 'figure', fig: { shot: 'battle-prep', alt: t('Cửa sổ chọn vật phẩm vào trận', 'The item-packing window') } },
      { t: 'list', items: [
        t('Trong trận chỉ dùng được vật phẩm đã mang theo: phím 1–3 theo từng ô (máy tính có ô vật phẩm ở cột trái), hoặc nút DÙNG trong túi đồ (Tab).', 'In battle only packed items can be used: keys 1–3 by slot (desktop shows the slots in the left column), or USE in the inventory (Tab).'),
        t('Nhẫn giới hạn Echo, Trục phục sinh và 3 cơ hội: mỗi trận mang tối đa 1.', 'Echo limit ring, Revival scroll and Three chances: at most 1 per battle.'),
      ] },
    ] },
    { id: 'upgrades', title: t('Nâng cấp nhân vật', 'Hero upgrades'), blocks: [
      { t: 'p', text: t(`Ở màn chọn nhân vật, bấm "Nâng cấp" để tăng 3 chỉ số của Aeris hoặc Kael bằng xu, mỗi chỉ số tối đa cấp ${HERO_MAX_RANK}: máu tối đa, sát thương cộng thêm, và chỉ số riêng (Aeris: giảm MP dùng Gai băng; Kael: giảm sát thương nhận). Giá cấp 1 là ${HERO_UPGRADE_PRICES[0]} xu, cấp ${HERO_MAX_RANK} là ${HERO_UPGRADE_PRICES[HERO_MAX_RANK - 1]} xu. Có thể đặt lại, mất ${HERO_RESET_FEE_PERCENT}% số xu đã dùng.`,
        `On the hero screen, "Upgrades" raises three stats of Aeris or Kael with coins, each up to rank ${HERO_MAX_RANK}: max health, bonus damage, and a specialty (Aeris: cheaper Ice Spikes; Kael: less damage taken). Rank 1 costs ${HERO_UPGRADE_PRICES[0]} coins, rank ${HERO_MAX_RANK} costs ${HERO_UPGRADE_PRICES[HERO_MAX_RANK - 1]}. You can reset for a ${HERO_RESET_FEE_PERCENT}% fee of the coins spent.`) },
    ] },
  ] },
];

/** Every legacy mechanic topic is reachable from a page (PlayerGuide opens that page for replayGuide(topic)). */
export function pageForTopic(topic: GuideTopic): { section: string; page: string } | null {
  for (const s of GUIDE) for (const p of s.pages) if (p.topics?.includes(topic)) return { section: s.id, page: p.id };
  return null;
}
export const TOPIC_IDS = Object.keys(GUIDE_TOPICS) as GuideTopic[];

/** Accent- and case-insensitive text for search. */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export function pageText(p: Page, lang: 'vi' | 'en'): string {
  const parts: string[] = [p.title[lang]];
  const add = (x: L | string) => parts.push(typeof x === 'string' ? x : x[lang]);
  for (const b of p.blocks) {
    if (b.t === 'p' || b.t === 'note') add(b.text);
    else if (b.t === 'list') b.items.forEach(add);
    else if (b.t === 'table') { b.head.forEach(add); b.rows.flat().forEach(add); }
    else if (b.t === 'controls') b.rows.forEach(r => { parts.push(r.keys); add(r.action); if (r.touch) add(r.touch); });
    else if (b.t === 'steps') b.steps.forEach(s => add(s.text));
    else if (b.t === 'figure') { add(b.fig.alt); if (b.fig.caption) add(b.fig.caption); }
    else if (b.t === 'topic') { const c = GUIDE_TOPICS[b.id][lang]; parts.push(c[0], c[1]); }
  }
  return fold(parts.join(' '));
}
