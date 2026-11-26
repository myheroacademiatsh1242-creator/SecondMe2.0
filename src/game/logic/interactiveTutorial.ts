/** Persistent, event-driven onboarding. This module never mutates gameplay or currency. */
export const TUTORIAL_KEY = 'second-me-interactive-tutorial-v1';
export interface TutorialContext {
 screen: string; level: number; completed: number[]; touch: boolean; finalGateCrossed: boolean;
 recording: boolean; recordReady: boolean; echoes: number; canSummon: boolean; canSwap: boolean;
 canSkill: boolean; canDodge: boolean; canUltimate: boolean; canTime: boolean; canItem: boolean;
 hasRunes: boolean; pendingRuneReward:boolean; canRune: boolean; runeEditing: boolean; inventory: boolean; preparing: boolean;
 chestOpen: boolean; chestAvailable: boolean; chestRates: boolean; chestRewards: boolean;
 shopConfirm: boolean; heroUpgrade: boolean; resetOpen: boolean; guide: boolean;
}
export type TutorialStep = { id:string; track:string; title:string; text:string; key:string; target:string; event:string; total?:number; ready?:(c:TutorialContext)=>boolean };
const step=(track:string,id:string,title:string,text:string,key:string,target:string,event:string,ready?:TutorialStep['ready'],total?:number):TutorialStep=>({track,id:track+'.'+id,title,text,key,target,event,ready,total});
export const TUTORIAL_STEPS:TutorialStep[] = [
 step('combat','move','Tiến vào khu chiến đấu','Di chuyển thêm một đoạn sau khi qua cổng để đến gần quái.','WASD / ↑ ↓ ← →','.touch-stick-zone','move'),
 step('combat','aim','Hướng ngắm','Di chuột trên sân để đổi hướng ngắm. Trên điện thoại, kéo joystick để đổi hướng trước khi đánh.','Chuột / Joystick','[data-testid="game-canvas"]','aim'),
 step('combat','attack','Đòn đánh đầu tiên','Bấm tấn công để thực hiện một đòn thật.','Chuột trái','.action-attack, .skill-attack','attack'),
 step('combat','combo','Nối combo','Bấm tấn công liên tiếp theo nhịp để nối sang đòn thứ hai. Điện thoại có thể giữ nút tấn công.','Chuột trái','.action-attack, .skill-attack','combo'),
 step('combat','skill','Kỹ năng & năng lượng','Dùng kỹ năng riêng. Cần đủ MP và hết hồi chiêu; bấm khi chưa sẵn sàng không được tính.','Space / Chuột phải','.action-skill, .skill-skill','skill',c=>c.canSkill),
 step('combat','dodge','Lướt né','Di chuyển rồi lướt theo hướng đó. Chờ nút sáng nếu đang hồi chiêu.','Shift','.action-dodge, .skill-dodge','dodge',c=>c.canDodge),
 step('combat','hud','Thanh kỹ năng','Các nút trên HUD dùng được trực tiếp. Số đếm là hồi chiêu, MP là năng lượng. Bấm một nút sẵn sàng để thử.','Chạm nút','.combat-action-bar, .touch-skills','hud-action'),
 step('combat','finish','Tới cổng thoát','Hạ quái còn lại rồi đi vào cổng thoát. Mục tiêu trên sân sẽ chỉ đường.','','.trail-objective','level-clear'),
 step('chest','open','Rương đã mở khóa','Bạn được tặng 15 phàm tinh thể: đủ đúng 3 lượt rương Hoàng Phẩm, cùng xu mua vật phẩm. Vào Shop rồi bấm Rương thưởng.','Shop → Rương','.shop-reward-chest, [data-tutorial="shop"]','chest-open'),
 step('chest','kind','Chọn rương đang hoạt động','Chọn Hoàng Phẩm: mỗi lượt tốn 5 phàm tinh thể. Rương đang phát triển không nằm trong bài tập.','Hoàng Phẩm','.chest-kind-buttons','chest-kind',c=>c.chestOpen),
 step('chest','rates','Xem xác suất','Bấm Xem tỉ lệ để đọc xác suất. Mỗi lượt độc lập, không bảo đảm nhận một món cụ thể.','Xem tỉ lệ','.chest-rate-toggle','chest-rates',c=>c.chestOpen&&c.chestAvailable),
 step('chest','draw1','Mở lượt thứ nhất','Bấm Mở ×1. Chỉ lượt mở thành công và đã lưu vào kho mới được tính. Không cần mở ×10.','Mở ×1','.chest-draw-buttons, .chest-panel footer','chest-draw',c=>c.chestOpen&&c.chestAvailable),
 step('chest','cards','Xem phần thưởng','Xem thẻ bài vừa nhận. Đồ đã được cộng vào kho; đóng hiệu ứng không làm mất thưởng.','Thẻ phần thưởng','.gacha-reward-modal, .chest-reopen-rewards-btn','chest-cards',c=>c.chestOpen),
 step('chest','draw2','Mở lượt thứ hai','Đóng thẻ thưởng rồi mở tiếp ×1. Bỏ qua không tự mở rương hoặc trừ tinh thể.','Mở ×1','.chest-panel footer','chest-draw',c=>c.chestOpen&&c.chestAvailable),
 step('chest','draw3','Mở lượt thứ ba','Mở thêm một lượt ×1 để hoàn thành ba lượt thực hành.','Mở ×1','.chest-panel footer','chest-draw',c=>c.chestOpen&&c.chestAvailable),
 step('chest','stock','Kiểm tra đồ vừa nhận','Đóng rương, về trại rồi mở túi để kiểm tra thưởng.','Túi đồ','[data-tutorial="bag"]','inventory-open'),
 step('shop','open','Ghé Tanuki','Mở Shop từ trại. Mua hàng và mở rương là hai thao tác riêng.','Shop','[data-tutorial="shop"]','shop-open'),
 step('shop','tabs','Hai quầy hàng','Bấm tab Vật phẩm hoặc Trang phục. Trang phục chỉ thay ngoại hình; Mặc dùng đồ đã sở hữu, Đang mặc là đồ hiện tại.','Chạm tab','.trading-tabs','shop-tab'),
 step('shop','select','Chọn món hàng','Về tab Vật phẩm rồi chọn một món để xem công dụng, giá và số đang có. Thiếu xu hoặc đầy túi thì nút Mua bị khóa.','Chọn món','.trading-items','shop-select'),
 step('shop','buy','Mở xác nhận mua','Bấm Mua để mở bảng xác nhận. Chưa trừ xu ở bước này.','Mua','.trading-buy','shop-confirm'),
 step('shop','quantity','Chọn số lượng','Dùng − / + hoặc nhập số. Chỉ số hợp lệ trong giới hạn xu và kho mới được chấp nhận.','− / +','.trading-quantity','shop-quantity',c=>c.shopConfirm),
 step('shop','purchase','Giao dịch đầu tiên','Xác nhận mua một món. Hủy hoặc Bỏ qua không mua hàng. Chỉ giao dịch thành công mới hoàn thành bước này.','Xác nhận','.trading-confirm footer','purchase',c=>c.shopConfirm),
 step('shop','inventory','Mua xong chưa phải mang theo','Quay lại trại rồi mở kho xem đồ. Bấm Tanuki để trò chuyện; Esc đóng xác nhận trước khi rời cửa hàng.','Túi đồ','[data-tutorial="bag"]','inventory-open'),
 step('echo','record','Ghi một ký ức','Bắt đầu ghi trước khi đi tới ấn.','E','.skill-record','record-start'),
 step('echo','walk','Ghi đường đi có ý nghĩa','Đi một đoạn khi đang ghi, hướng tới ấn đang được đánh dấu.','Di chuyển','.trail-objective','record-move',c=>c.recording),
 step('echo','save','Lưu đường đi','Dừng ghi khi đã đến ấn. Echo sẽ phát lại đường đi và đứng ở điểm cuối.','E','.skill-record','record-save',c=>c.recording),
 step('echo','summon','Gọi Echo','Triệu hồi từ bản ghi đã lưu. Nếu hết lượt hoặc đầy Echo, thu hồi Echo hoặc tiếp tục tới ấn mới.','Q','.action-echo, .skill-echo','echo-summon',c=>c.recordReady&&c.canSummon),
 step('echo','hold','Echo giữ ấn thay bạn','Chờ Echo tới ấn rồi rời khỏi ấn. Nếu Echo đứng sai, ghi lại đường kết thúc trên ấn và gọi lại. Chỉ tính khi Echo thực sự giữ ấn.','Đi khỏi ấn','[data-testid="game-canvas"]','echo-hold',c=>c.echoes>0),
 step('echo','pause','Dừng hoặc phát tiếp Echo','Thử nút dừng/phát. Thao tác áp dụng lên Echo vừa gọi; không có phím chọn Echo.','C','.echo-pause-control','echo-pause',c=>c.echoes>0),
 step('echo','swap','Hoán đổi vị trí','Đổi chỗ với Echo vừa gọi. Cần đường không bị chặn, đủ ổn định và hết hồi chiêu. Mặc định tốn 30 ổn định, hồi 7 giây.','Shift + Q','.echo-swap-control','echo-swap',c=>c.canSwap),
 step('echo','recall','Thu hồi Echo lâu nhất','Thu hồi Echo được gọi đầu tiên. Thao tác này có thể nhả ấn mà Echo đang giữ.','X','.action-recall, .skill-recall','echo-recall',c=>c.echoes>0),
 step('echo','mark','Ưu tiên mục tiêu','Gọi lại Echo nếu cần rồi đánh dấu trên sân. Điện thoại bật nút Đánh dấu rồi chạm sân.','Shift + nhấp chuột','.echo-mark-control','echo-mark',c=>c.echoes>0),
 step('echo','limits','Lượt gọi & ổn định','Số cạnh Gọi Echo là lượt còn lại; giới hạn thường là 4, nhẫn nâng thành 6. Echo mất khi ổn định về 0. Mở túi để kết thúc phần này.','Túi đồ','[data-tutorial="bag"]','inventory-open'),
 step('pack','open','Chuẩn bị sau màn 2','Mở túi ở trại hoặc bảng chuẩn bị. Mở túi trong trận sẽ tạm dừng chiến đấu.','Tab / Túi','[data-tutorial="bag"]','inventory-open'),
 step('pack','add','Sở hữu khác mang theo','Bấm Mang theo để thêm đồ từ kho vào bộ đi trận. Tối đa ba loại, mỗi loại có thể mang nhiều món.','Mang theo','.inventory-supplies','pack-add'),
 step('pack','quantity','Số lượng mang theo','Dùng − / + để chỉnh số lượng; không được vượt số món đang sở hữu. Nếu chỉ có một món, bạn có thể bỏ qua bước này.','− / +','.pack-quantity','pack-quantity'),
 step('pack','remove','Gỡ khỏi bộ mang theo','Bấm × trên một ô. Đồ trở về trạng thái chưa mang; không bị xóa khỏi kho.','×','.inventory-remove-item','pack-remove'),
 step('pack','start','Xác nhận hoặc quay lại','Mang lại món muốn dùng rồi Vào trận. Quay lại hủy bước chuẩn bị. Mở túi không tự trang bị đồ.','Vào trận','.inventory-done','battle-start'),
 step('pack','use','Dùng đồ đã mang','Trong trận, dùng ô 1–3 hoặc mở túi bấm Dùng. Nút chỉ sáng khi đủ điều kiện.','1 / 2 / 3','.combat-items','item-use',c=>c.screen==='playing'&&c.canItem),
 step('pack','time','Bình thời gian','Dùng bình đã mang khi có đồng hồ chặng để cộng đúng 2 giây. Đây là vật phẩm mua, khác đồng hồ cát nhặt trên sân.','R','.combat-items','time-use',c=>c.screen==='playing'&&c.canTime),
 step('rune','reward','Nhận ấn Echo đầu tiên','Chọn một trong ba ấn thưởng. Chỉ ấn được chọn mới được cộng vào kho.','Chọn thưởng','.rune-reward-flow, .rune-reward-roll','rune-reward'),
 step('rune','edit','Bốn ô rune','Mở Đổi rune ở trại hoặc trong túi. Trang bị không tiêu hao ấn.','Đổi rune','.rune-edit-link, .rest-prepare, .inventory-runes-title button','rune-edit'),
 step('rune','slot','Chọn ô muốn thay','Chọn một trong bốn ô. Có đủ số lượng thì có thể lắp cùng loại vào nhiều ô; buff cùng loại không cộng dồn.','Ô 1–4','.rp-slots','rune-slot',c=>c.runeEditing),
 step('rune','equip','Chọn rune sở hữu','Bấm rune trong danh sách. Nếu ô đã có rune, bấm Xác nhận thay. Nếu không có loại khác, có thể bỏ qua.','Chọn rune','.rp-grid','rune-equip',c=>c.runeEditing),
 step('rune','clear','Gỡ rune không mất ấn','Gỡ ô chỉ gỡ trang bị, không tiêu hao ấn.','Gỡ ô','.rune-loadout-editor footer','rune-clear',c=>c.runeEditing),
 step('rune','close','Lưu bộ rune','Lắp lại rune nếu muốn, rồi bấm Xong. Bạn có thể thay bộ rune lần sau.','Xong','.rune-loadout-editor footer','rune-close',c=>c.runeEditing),
 step('rune','inspect','Đọc công năng','Mở túi và chạm ô rune để đọc mô tả. Xem mô tả không tiêu hao.','Chạm rune','.inventory-rune-slots','rune-inspect'),
 step('rune','use','Kích hoạt nâng Echo','Trong trận, bấm Dùng ấn của rune đủ điều kiện. Chỉ khi kích hoạt thành công mới trừ một ấn.','Dùng ấn','.inventory-rune-description button','rune-use',c=>c.screen==='playing'&&c.canRune),
 step('rune','active','Hiệu lực của ấn','Đang hiệu lực nghĩa là đã bật. Buff cả màn không cộng dồn cùng loại, hết khi rời hoặc chơi lại màn; ấn đã dùng không được hoàn lại. Đóng túi để tiếp tục.','Đóng túi','.inventory-done','inventory-close'),
 step('hero','select','Chọn nhân vật','Chạm chân dung để xem nhân vật.','Chọn nhân vật','.hero-roster','hero-select'),
 step('hero','gear','Trang phục & vũ khí','Chạm tab để xem đồ sở hữu. Chọn đồ chưa sở hữu không tự mua.','Trang phục / Vũ khí','.collection-tabs','hero-gear'),
 step('hero','confirm','Xác nhận bộ trang bị','Bấm Trang bị & chọn để xác nhận.','Trang bị & chọn','.hero-info-action button','hero-confirm'),
 step('upgrade','view','Nâng chỉ số','Mỗi mức nâng có giá bằng xu. Bạn không cần mua để hoàn thành hướng dẫn; bấm Bỏ qua nếu muốn giữ xu.','Nâng','.hero-upgrades','upgrade-buy'),
 step('upgrade','reset','Xem trước hoàn xu','Đặt lại nâng cấp cho biết xu hoàn và phí; chỉ Xác nhận đặt lại mới thay đổi chỉ số. Không cần thực hiện reset để học tiếp.','Đặt lại nâng cấp','.hero-reset-button','upgrade-reset-view',c=>c.heroUpgrade),
 step('upgrade','confirm','Xác nhận trước khi reset','Kiểm tra số xu hoàn. Bấm Hủy hoặc Bỏ qua để giữ nguyên; xác nhận mới thực hiện reset thật.','Hủy / Xác nhận','.hero-upgrade-footer','upgrade-reset-close',c=>c.resetOpen),
 step('ultimate','use','Tuyệt kỹ đã sẵn sàng','Đầy thanh Nộ và đã mở tuyệt kỹ. Dùng V, chuột giữa hoặc nút Tuyệt kỹ.','V / Chuột giữa','.action-ultimate, .skill-ultimate','ultimate',c=>c.canUltimate),
 step('menu','pause','Tạm dừng & sổ tay','Tạm dừng để mở Cài đặt, Sổ tay, Chơi lại hoặc Về trại. F đổi toàn màn hình; M đổi âm thanh ở trạng thái hỗ trợ; T yêu cầu chơi lại.','Esc / P','[aria-label="Tạm dừng"], [aria-label="Cài đặt và tạm dừng"]','pause-menu'),
 step('defeat','retry','Lựa chọn khi thất bại','Thử lại để chơi lại màn, hoặc Về trại. Trục phục sinh chỉ dùng được khi đã mang và đủ điều kiện.','Thử lại / Về trại','.defeat-retry, .defeat-return','defeat-choice'),
];
export class InteractiveTutorial {
 readonly done = new Set<string>(); readonly skipped = new Set<string>();
 disabled=false; replayTrack:string|null=null; replayDone=new Set<string>();
 private listeners=new Set<()=>void>(); revision=0;
 context:TutorialContext|null=null; private activeId:string|null=null;
 constructor(private storage:Pick<Storage,'getItem'|'setItem'>|null=typeof localStorage==='undefined'?null:localStorage){
  try{const s=JSON.parse(storage?.getItem(TUTORIAL_KEY)??'{}');for(const id of s.done??[])if(TUTORIAL_STEPS.some(x=>x.id===id))this.done.add(id);for(const id of s.skipped??[])if(TUTORIAL_STEPS.some(x=>x.id===id))this.skipped.add(id);this.disabled=s.disabled===true;}catch{/* Unavailable or malformed storage does not block play. */}
 }
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 snapshot=()=>this.revision;
 private emit(){this.revision++;for(const fn of this.listeners)fn();}
 private save(){try{this.storage?.setItem(TUTORIAL_KEY,JSON.stringify({done:[...this.done],skipped:[...this.skipped],disabled:this.disabled}));}catch{}this.emit();}
 private trackAvailable(track:string,c:TutorialContext){
  if(this.replayTrack&&this.replayTrack!==track)return false;
  // The trail objective guides recording, summoning and crossing before combat lessons.
  if(c.level===1&&c.screen==='playing'&&!c.finalGateCrossed)return false;
  switch(track){
   case 'combat':return c.level===1&&c.screen==='playing';
   case 'echo':return c.level===2&&c.screen==='playing';
   case 'chest':case 'shop':return c.completed.includes(1)&&['lobby','shop'].includes(c.screen)&&!c.inventory&&!c.runeEditing;
   case 'pack':return c.completed.includes(2)&&['lobby','playing'].includes(c.screen);
   case 'rune':return ['victory','lobby','playing'].includes(c.screen)&&(c.hasRunes||c.pendingRuneReward);
   case 'hero':return c.screen==='characters'&&!c.heroUpgrade;
   case 'upgrade':return c.heroUpgrade;
   case 'ultimate':return c.screen==='playing'&&c.canUltimate;
   case 'menu':return c.screen==='playing';
   case 'defeat':return c.screen==='defeat';
   default:return false;
  }
 }
 get active():TutorialStep|null{
  const c=this.context;if(!c||this.disabled&&!this.replayTrack||c.guide||['loading','intro','ending'].includes(c.screen))return null;
  for(const track of [...new Set(TUTORIAL_STEPS.map(s=>s.track))]){
   if(!this.trackAvailable(track,c))continue;
   const next=TUTORIAL_STEPS.find(s=>s.track===track&&!(this.replayTrack?this.replayDone.has(s.id):this.done.has(s.id)||this.skipped.has(s.id)));
   if(next&&track==='shop'&&['shop.quantity','shop.purchase'].includes(next.id)&&!c.shopConfirm&&c.screen==='shop')return {...next,id:next.id+'.recover',event:'shop-confirm',title:'Mở lại xác nhận mua',text:'Chọn món còn chỗ trong kho và đủ xu, rồi bấm Mua để tiếp tục bước đang dở. Đóng hoặc tải lại không tự mua hàng.',key:'Mua',target:'.trading-buy'};
   if(next&&track==='pack'&&['pack.add','pack.quantity','pack.remove'].includes(next.id)&&!c.inventory&&!c.preparing)return {...next,id:next.id+'.recover',event:'inventory-open',title:'Mở túi tại trại',text:'Về trại và mở túi để tiếp tục sắp xếp bộ mang theo. Đồ đã mua vẫn ở trong kho.',key:'Tab / Túi đồ',target:'[data-tutorial="bag"]'};
   if(next&&track==='rune'&&['rune.slot','rune.equip','rune.clear','rune.close'].includes(next.id)&&!c.runeEditing)return {...next,id:next.id+'.recover',event:'rune-edit',title:'Mở lại bảng rune',text:'Mở Đổi rune để tiếp tục bước đang dở. Bộ rune và số ấn sở hữu đã được giữ lại.',key:'Đổi rune',target:'.rune-edit-link, .rest-prepare, .inventory-runes-title button'};
   if(next&&(!next.ready||next.ready(c)))return c.chestRewards&&['chest.draw2','chest.draw3'].includes(next.id)?{...next,target:'.gacha-action-btn.draw-again'}:next;
   // Reloads lose transient recordings/Echoes, but never erase completed lessons.
   if(next&&track==='echo'&&c.screen==='playing'){
    if(c.echoes===0&&['echo.pause','echo.swap','echo.recall','echo.mark','echo.hold'].includes(next.id)||['echo.walk','echo.save'].includes(next.id)&&!c.recording||next.id==='echo.summon'&&!c.recordReady){
     const needsRecording=['echo.walk','echo.save'].includes(next.id)||!c.recordReady;
     const event=c.recording?'record-save':!needsRecording&&c.recordReady&&c.canSummon?'echo-summon':'record-start';
     return {...next,id:next.id+'.recover',event,title:'Khôi phục Echo để học tiếp',text:event==='echo-summon'?'Gọi Echo từ bản ghi đã có để tiếp tục bài đang dở.':'Bắt đầu ghi lại bằng E, di chuyển rồi lưu. Bản ghi có thể đã tự dừng sau 8 giây hoặc bị mất khi tải lại; tiến độ đã học vẫn được giữ.',key:event==='echo-summon'?'Q':'E',target:event==='echo-summon'?'.action-echo, .skill-echo':'.skill-record'};
    }
   }
  }return null;
 }
 update(context:TutorialContext){this.context=context;const id=this.active?.id??null;if(id!==this.activeId){this.activeId=id;this.emit();}}
 event(name:string, ticket?:TutorialStep|null){
  if(this.disabled&&!this.replayTrack)return false;
  let current=ticket===undefined?this.active:ticket;
  if(!current||current.event!==name){
   const c=this.context;
   current=c?TUTORIAL_STEPS.find(s=>s.event===name&&(!s.ready||s.ready(c))&&this.trackAvailable(s.track,c)&&(!this.replayTrack||s.track===this.replayTrack)&&!TUTORIAL_STEPS.some(prior=>prior.track===s.track&&TUTORIAL_STEPS.indexOf(prior)<TUTORIAL_STEPS.indexOf(s)&&!(this.replayTrack?this.replayDone.has(prior.id):this.done.has(prior.id)||this.skipped.has(prior.id))))??null:null;
  }
  if(!current||current.event!==name||(this.replayTrack?this.replayDone.has(current.id):this.done.has(current.id)||this.skipped.has(current.id)))return false;if(current.id.endsWith('.recover')){this.emit();return true;}if(this.replayTrack){this.replayDone.add(current.id);if(!TUTORIAL_STEPS.some(s=>s.track===this.replayTrack&&!this.replayDone.has(s.id)))this.replayTrack=null;}else this.done.add(current.id);this.save();return true;}
 skip(){let current=this.active;if(!current)return;if(current.id.endsWith('.recover'))current={...current,id:current.id.slice(0,-8)};if(this.replayTrack){this.replayDone.add(current.id);if(!TUTORIAL_STEPS.some(s=>s.track===this.replayTrack&&!this.replayDone.has(s.id)))this.replayTrack=null;}else this.skipped.add(current.id);this.save();}
 skipAll(){this.disabled=true;this.replayTrack=null;this.save();}
 replay(track:string){if(!TUTORIAL_STEPS.some(s=>s.track===track))return;this.replayTrack=track;this.replayDone.clear();this.emit();}
 endReplay(){this.replayTrack=null;this.emit();}
}
