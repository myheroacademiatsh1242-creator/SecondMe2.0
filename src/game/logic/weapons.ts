import type {Rarity} from './rarity.ts';

/**
 * Weapons: an interchangeable kit for each hero, like outfits. They change the look, the colour of the hit effects and one
 * small trait; every weapon of a hero shares the same damage budget (combo.ts), so none is a pure upgrade.
 * Designs come from the 200-weapon handbook (WEAPONS_PLAN.md); `sample` is its entry number.
 * Data and storage only: drawing the weapon and applying `trait` are later steps of the plan.
 */
export type WeaponHero='mage'|'swordsman';
export type WeaponTrait='none'|'burn'|'slow'|'chain'|'ward';
export interface Weapon{
 id:string;hero:WeaponHero;sample:number;vi:string;en:string;rarity:Rarity;trait:WeaponTrait;
 /** Signature effect, a key of src/game/data/pixelfx.json. */
 fx:string;
}

export const WEAPONS:readonly Weapon[]=[
 {id:'wand-novice',hero:'mage',sample:161,vi:'Đũa phép tập sự',en:'Novice Wand',rarity:'common',trait:'none',fx:'magic-missile'},
 {id:'wand-fire',hero:'mage',sample:162,vi:'Đũa phép lửa',en:'Fire Wand',rarity:'common',trait:'burn',fx:'fireball'},
 {id:'staff-frost',hero:'mage',sample:167,vi:'Trượng băng tuyết',en:'Staff of Frost',rarity:'deluxe',trait:'slow',fx:'ice-lance'},
 {id:'staff-lightning',hero:'mage',sample:168,vi:'Trượng sấm sét',en:'Staff of Lightning',rarity:'deluxe',trait:'chain',fx:'lightning-strike'},
 {id:'grimoire-shield',hero:'mage',sample:170,vi:'Sách phép khiên năng lượng',en:'Grimoire of Shielding',rarity:'deluxe',trait:'ward',fx:'divine-shield'},
 {id:'staff-blizzard',hero:'mage',sample:173,vi:'Trượng bão tuyết bắc cực',en:'Blizzard Staff',rarity:'bespoke',trait:'slow',fx:'blizzard-vortex'},
 // shortcut: fireball stands in until the fire/meteor sheet is exported, then switch fx to 'meteor'.
 {id:'staff-meteor',hero:'mage',sample:172,vi:'Trượng gọi thiên thạch',en:'Meteor Staff',rarity:'bespoke',trait:'burn',fx:'fireball'},
 {id:'staff-archmage',hero:'mage',sample:177,vi:'Trượng đại pháp sư',en:'Grand Wizard Staff',rarity:'ultimate',trait:'chain',fx:'mana-burst'},
 {id:'sword-rusted',hero:'swordsman',sample:101,vi:'Kiếm sắt gỉ',en:'Rusted Iron Sword',rarity:'common',trait:'none',fx:'sword-slash'},
 {id:'sword-knight',hero:'swordsman',sample:110,vi:'Đại kiếm hiệp sĩ',en:'Knight Broadsword',rarity:'deluxe',trait:'ward',fx:'heavy-cleave'},
 {id:'katana-shadow',hero:'swordsman',sample:109,vi:'Katana Bóng Đêm',en:'Shadow Katana',rarity:'deluxe',trait:'none',fx:'spin-slash'},
 {id:'katana-frost',hero:'swordsman',sample:111,vi:'Katana Hàn Băng',en:'Frostbite Katana',rarity:'bespoke',trait:'slow',fx:'ice-shatter'},
 {id:'blade-flame',hero:'swordsman',sample:114,vi:'Đại đao hỏa ngục',en:'Flame Executioner Blade',rarity:'bespoke',trait:'burn',fx:'fireball'},
 {id:'sword-caliburn',hero:'swordsman',sample:116,vi:'Đại kiếm thần thánh Caliburn',en:'Giant Caliburn Sword',rarity:'ultimate',trait:'none',fx:'smite'},
 {id:'sword-demonking',hero:'swordsman',sample:118,vi:'Ma kiếm Quỷ Vương',en:'Demon King Greatsword',rarity:'ultimate',trait:'burn',fx:'ground-slam'},
];
export type WeaponId=string;

/** The weapon each hero has from the start; always usable. */
export const DEFAULT_WEAPON:Record<WeaponHero,WeaponId>={mage:'wand-novice',swordsman:'sword-rusted'};
export const WEAPON_KEY='second-me-weapons-v1';

export const weaponById=(id:unknown)=>WEAPONS.find(w=>w.id===id);
export const weaponsOf=(hero:WeaponHero)=>WEAPONS.filter(w=>w.hero===hero);
export function cleanOwnedWeapons(value:unknown):WeaponId[]{
 return Array.isArray(value)?[...new Set(value.filter((id):id is WeaponId=>typeof id==='string'&&weaponById(id)!==undefined&&!Object.values(DEFAULT_WEAPON).includes(id)))]:[];
}
export function canUseWeapon(hero:WeaponHero,id:unknown,owned:readonly WeaponId[]){
 const w=weaponById(id);
 return !!w&&w.hero===hero&&(id===DEFAULT_WEAPON[hero]||owned.includes(w.id));
}
export function cleanWeapons(value:unknown):Record<WeaponHero,WeaponId>{
 const raw=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const valid=(hero:WeaponHero)=>weaponById(raw[hero])?.hero===hero?raw[hero] as WeaponId:DEFAULT_WEAPON[hero];
 return{mage:valid('mage'),swordsman:valid('swordsman')};
}

let equipped:Record<WeaponHero,WeaponId>={...DEFAULT_WEAPON};
export function restoreWeapons(){try{equipped=cleanWeapons(JSON.parse(localStorage.getItem(WEAPON_KEY)??'{}'));}catch{equipped=cleanWeapons(null);}return{...equipped};}
export const getWeapons=()=>({...equipped});
export const TRAIT_TEXT:Record<WeaponTrait,{vi:string;en:string}>={
 none:{vi:'Không hiệu ứng phụ',en:'No extra effect'},
 burn:{vi:'Đốt mục tiêu',en:'Sets targets alight'},
 slow:{vi:'Làm chậm mục tiêu',en:'Slows targets'},
 chain:{vi:'Tia lan sang mục tiêu gần',en:'Arcs to a nearby target'},
 ward:{vi:'Thêm lớp chắn nhỏ',en:'Adds a small ward'},
};
export const getWeapon=(hero:WeaponHero)=>weaponById(equipped[hero])??weaponById(DEFAULT_WEAPON[hero])!;
export function equipWeapon(hero:WeaponHero,id:WeaponId,owned:readonly WeaponId[]){
 if(!canUseWeapon(hero,id,owned))return false;
 equipped={...equipped,[hero]:id};
 try{localStorage.setItem(WEAPON_KEY,JSON.stringify(equipped));}catch{/* The weapon still works without storage. */}
 return true;
}
