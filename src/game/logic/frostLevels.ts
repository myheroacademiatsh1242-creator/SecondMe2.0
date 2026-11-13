import type {LevelData,Rect,Trap} from './types.ts';
const edge:Rect[]=[{x:0,y:0,width:1280,height:40},{x:0,y:680,width:1280,height:40},{x:0,y:40,width:40,height:640},{x:1240,y:40,width:40,height:640}];
const rune=(id:string,x:number,y:number)=>({id,x,y,width:50,height:50,isPressed:false,color:'#9be9ff'});
const gate=(id:string,x:number,y:number,h:number,requiredPlates:string[])=>({id,x,y,width:36,height:h,orientation:'vertical' as const,isOpen:false,openProgress:0,requiredPlates});
const split=(x:number,y:number,h=120):Rect[]=>[{x,y:40,width:36,height:y-40},{x,y:y+h,width:36,height:680-y-h}];
const hazard=(kind:Trap['kind'],x:number,y:number,w=64,h=64,period=5,offset=0):Trap=>({kind,x,y,width:w,height:h,period,offset});
function map(id:number,subtitle:string,description:string,x:number,y:number,difficulty:number):LevelData{return{id,name:`LEVEL ${id.toString().padStart(2,'0')}`,subtitle,description,difficulty,playerSpawn:{x,y,direction:'right'},walls:edge.map(r=>({...r})),plates:[],doors:[],traps:[],exit:{x:1140,y:520,width:60,height:60,radius:36}};}
const a=map(7,'ĐÈO TUYẾT ĐẦU MÙA','Giữ I để vào đèo tuyết. Thêm Echo giữ II để mở cổng cuối; dọn quái trước khi rời đèo.',130,540,3);
a.plates=[rune('snow_I',260,140),rune('snow_II',650,490)];a.walls.push(...split(480,240,160),...split(880,430,150),{x:620,y:220,width:150,height:32});a.doors=[gate('snow_pass',480,240,160,['snow_I']),gate('snow_exit',880,430,150,['snow_I','snow_II'])];a.traps=[hazard('vines',260,340,100,60),hazard('rocks',570,390),hazard('spikes',980,420)];
const b=map(8,'BẢN TRẠI VÁCH ĐÁ','Vượt qua khu trại đèo cao. Giữ I rồi II; chỉ II mở lối qua hàng rào gác phía tây.',160,560,3);
b.plates=[rune('lake_I',320,480),rune('lake_II',970,140)];b.walls.push({x:40,y:340,width:560,height:36},{x:740,y:340,width:500,height:36},{x:450,y:40,width:36,height:100},{x:450,y:270,width:36,height:70},{x:820,y:470,width:160,height:32});b.doors=[{...gate('lake_cross',600,340,36,['lake_I']),width:140,orientation:'horizontal'},gate('lake_vault',450,140,130,['lake_II'])];b.exit={x:160,y:150,width:60,height:60,radius:36};b.traps=[hazard('rocks',640,420),hazard('vines',820,200,90,70),hazard('crusher',500,170),hazard('spikes',270,240)];
const c=map(9,'BẬC THANG VÁCH ĐÁ','Men theo bậc đá cheo leo xuống vực. I mở lối tây, I + II mở gian nam, II + III mở cổng cuối.',1100,160,4);
c.playerSpawn.direction='left';c.plates=[rune('abbey_I',930,120),rune('abbey_II',180,180),rune('abbey_III',300,520)];c.walls.push({x:640,y:40,width:36,height:120},{x:640,y:300,width:36,height:190},{x:640,y:630,width:36,height:50},{x:40,y:350,width:170,height:36},{x:350,y:350,width:290,height:36},{x:676,y:350,width:564,height:36});c.doors=[gate('abbey_west',640,160,140,['abbey_I']),{...gate('abbey_south',210,350,36,['abbey_I','abbey_II']),width:140,orientation:'horizontal'},gate('abbey_final',640,490,140,['abbey_II','abbey_III'])];c.traps=[hazard('rocks',800,220),hazard('spikes',440,140),hazard('vines',120,440,100,70),hazard('crusher',470,530),hazard('rocks',920,540)];
export const WIND_BRIDGE:Rect={x:320,y:170,width:580,height:390};
const d=map(10,'CẦU TREO VỰC THÁC','',110,180,4);
d.plates=[rune('wind_I',165,415),rune('wind_II',405,220),rune('wind_III',620,465),rune('wind_IV',950,270)];
d.walls.push(
 {x:WIND_BRIDGE.x,y:40,width:WIND_BRIDGE.width,height:WIND_BRIDGE.y-40},
 {x:WIND_BRIDGE.x,y:WIND_BRIDGE.y+WIND_BRIDGE.height,width:WIND_BRIDGE.width,height:680-WIND_BRIDGE.y-WIND_BRIDGE.height},
 ...split(284,245,236),...split(1020,240,240),
 {x:520,y:170,width:36,height:140},{x:520,y:510,width:36,height:50},
 {x:750,y:170,width:36,height:50},{x:750,y:426,width:36,height:134},
);
d.doors=[
 {...gate('wind_1',284,245,236,['wind_I']),liftBridge:true},
 gate('wind_2',520,310,200,['wind_I','wind_II']),
 gate('wind_3',750,220,206,['wind_II','wind_III']),
 gate('wind_4',1020,240,240,['wind_II','wind_III','wind_IV']),
];
d.exit={x:1130,y:375,width:60,height:60,radius:36};
d.traps=[
 hazard('rocks',175,250,65,60,5.2),
 hazard('spikes',391,392,75,54,5.4,.8),
 hazard('crusher',608,257,64,62,5.8,1.5),
 hazard('spikes',835,421,51,69,5,2),
 hazard('rocks',944,490,59,62,5.5,.5),
];
const horizontalGate=(id:string,x:number,y:number,width:number,height:number,requiredPlates:string[])=>({
 ...gate(id,x,y,height,requiredPlates),width,orientation:'horizontal' as const,
});

// The courtyard route loops east, then north and west into the watchtower vault.
const e=map(11,'THÁP CANH CỔ THẠCH','',140,570,5);
e.plates=[rune('crypt_I',265,445),rune('crypt_II',1080,535),rune('crypt_III',820,135),rune('crypt_IV',325,240)];
e.walls.push(
 {x:40,y:340,width:840,height:36},{x:1020,y:340,width:220,height:36},
 {x:420,y:376,width:36,height:124},{x:420,y:640,width:36,height:40},
 {x:560,y:40,width:36,height:140},{x:560,y:300,width:36,height:40},
 {x:40,y:140,width:140,height:36},{x:320,y:140,width:240,height:36},
 {x:650,y:480,width:180,height:36},{x:1000,y:215,width:160,height:36},
);
e.doors=[
 gate('crypt_down',420,500,140,['crypt_I']),
 horizontalGate('crypt_back',880,340,140,36,['crypt_I','crypt_II']),
 gate('crypt_seal',560,180,120,['crypt_II','crypt_III']),
 horizontalGate('crypt_exit',180,140,140,36,['crypt_III','crypt_IV']),
];
e.exit={x:390,y:57,width:60,height:60,radius:32};
e.traps=[hazard('rocks',305,560),hazard('spikes',830,555),hazard('crusher',1000,290,65,42),hazard('rocks',670,210),hazard('spikes',100,225)];

// Three bridges cross the same lava river. Two stone gates link the paths along its banks.
export const LAVA_RIVER:Rect={x:40,y:310,width:1200,height:96};
const f=map(12,'THUNG LŨNG NHAM THẠCH','',105,580,5);
f.plates=[rune('night_I',215,475),rune('night_II',245,95),rune('night_III',625,125),rune('night_IV',590,535),rune('night_V',1095,500)];
f.walls.push(
 ...[[40,140],[280,490],[630,970],[1110,1240]].map(([x,end])=>({...LAVA_RIVER,x,width:end-x})),
 {x:380,y:40,width:36,height:100},{x:380,y:270,width:36,height:40},
 {x:380,y:406,width:36,height:274},{x:790,y:40,width:36,height:270},
 {x:790,y:406,width:36,height:94},{x:790,y:630,width:36,height:50},
 {x:920,y:170,width:150,height:36},
);
f.doors=[
 horizontalGate('night_1',140,310,140,96,['night_I']),
 gate('night_2',380,140,130,['night_I','night_II']),
 horizontalGate('night_3',490,310,140,96,['night_I','night_II','night_III']),
 gate('night_4',790,500,130,['night_II','night_III','night_IV']),
 {...horizontalGate('night_5',970,310,140,96,['night_II','night_III','night_IV','night_V']),releasedPlate:'night_I'},
];
f.exit={x:1090,y:80,width:60,height:60,radius:36};
f.traps=[hazard('rocks',90,445),hazard('spikes',100,220),hazard('rocks',625,230),hazard('crusher',470,565),hazard('rocks',910,535),hazard('spikes',1120,245)];
export const FROST_LEVELS:LevelData[]=[a,b,c,d,e,f];

// Introduce one rule at a time, then combine them in the final two trails.
function ward(level:LevelData,runeIndex:number,...enemyIndices:number[]){level.plates[runeIndex].wardEnemyIds=enemyIndices.map(i=>`enemy-${level.id}-${i}`);}
ward(a,1,2);
ward(b,1,2,3);b.doors[0].pulse={period:8,openSeconds:4};
ward(c,0,0);ward(c,1,2);ward(c,2,3,4);c.doors[2].pulse={period:8,openSeconds:3.5,offset:2};
ward(d,1,1,2);ward(d,2,3);ward(d,3,4,5);
d.doors[1].pulse={period:8,openSeconds:3.5};d.doors[2].releasedPlate='wind_I';d.doors[3].requiredPlates=['wind_II','wind_III','wind_IV'];d.doors[3].releasedPlate='wind_I';d.doors[3].pulse={period:9,openSeconds:4};
ward(e,2,4,5);ward(e,3,6);e.doors[1].pulse={period:8,openSeconds:3.5};e.doors[2].releasedPlate='crypt_I';e.doors[3].releasedPlate='crypt_II';
ward(f,0,0);ward(f,1,1,2);ward(f,2,3,4);ward(f,3,5);ward(f,4,6,7);f.doors[1].pulse={period:8,openSeconds:3.5};f.doors[3].pulse={period:8,openSeconds:3.5,offset:2};f.doors[4].pulse={period:9,openSeconds:3.5};
a.description='Ấn II bị phong ấn: hạ lính gác nối với ấn để kích hoạt. Giữ I + II và hạ hết quái để rời đèo tuyết.';
b.description='Cổng trại mở theo nhịp 4 giây mỗi chu kỳ 8 giây. Giữ I, đợi nhịp xanh rồi qua. Hạ lính gác để mở khóa ấn II.';
c.description='Ba rune trên dốc đá có lính canh riêng. Hạ đúng nhóm gác, để Echo giữ ấn rồi canh nhịp cổng cuối; không bỏ Echo đang giữ lối cần dùng.';
d.description='Giữ ấn I ở bờ tuyết đến khi cầu nâng lên. Giữ I + II để qua cổng II theo nhịp, rồi thu Echo I khi đã có Echo III. Trên bờ núi lửa, giữ II + III + IV để mở cổng cuối.';
e.description='Đi vòng qua sân đá phía đông rồi quay về kho tháp ở phía tây bắc. Giữ II + III và thu Echo I để qua cổng III. Khi có IV, thu Echo II để mở kho bằng III + IV.';
f.description='Vượt ba cầu qua sông dung nham. Hạ lính gác để mở các ấn, canh nhịp cổng II và IV. Sau cầu giữa, thu Echo I, giữ II–V rồi canh nhịp qua cầu cuối.';
