import {useEffect,useState} from 'react';

const ui = (file: string) => `${import.meta.env.BASE_URL}assets/ui/${file}`;
export const DEFEAT_ART = {
 mage: ui('defeat-mage.webp'),
 swordsman: ui('defeat-swordsman.webp'),
 timeout: ui('defeat-timeout.webp'),
};
const material = [ui('forest-panel-pixel.png'), ui('stone-card-pixel.png')];
const inventory = [ui('inventory-nine-slice-pixel.png'), material[1]];
export const PANEL_ART = {
 defeat: {
  mage: [ui('defeat-forest-frame.png'), DEFEAT_ART.mage],
  swordsman: [ui('defeat-forest-frame.png'), DEFEAT_ART.swordsman],
  timeout: [ui('defeat-forest-frame.png'), DEFEAT_ART.timeout],
 },
 reward: [ui('rune-reward-frame.png'), material[1]],
 pause: [ui('pause-pixel-prototype.png')],
 inventory,
 material,
 shop: [ui('trading-forest-frame.png'), ...material],
 purchase: [inventory[0]],
};

type ArtState = 'loading' | 'ready' | 'fallback';
const requests = new Map<string, {image: HTMLImageElement; done: Promise<boolean>; ready: boolean}>();

function loadArt(src: string) {
 const cached = requests.get(src);
 if(cached)return cached.done;
 const image = new Image();
 const done = new Promise<boolean>(resolve => {
  image.onload = () => {
   const decoded = typeof image.decode === 'function' ? image.decode() : Promise.resolve();
   void decoded.then(() => resolve(true), () => resolve(false));
  };
  image.onerror = () => resolve(false);
 });
 const entry = {image, done, ready: false};
 requests.set(src, entry);
 image.src = src;
 void done.then(ready => {
  entry.ready = ready;
  if(!ready)requests.delete(src);
 });
 return done;
}

export function warmPanelArt(assets: readonly string[]) {
 for(const src of assets)void loadArt(src);
}

export function usePanelArt(assets: readonly string[]): ArtState {
 const [result,setResult] = useState<{assets: readonly string[]; state: ArtState} | null>(null);
 useEffect(()=>{
  if(assets.every(src=>requests.get(src)?.ready))return;
  let active=true;
  const timeout=window.setTimeout(()=>setResult({assets,state:'fallback'}),4500);
  void Promise.all(assets.map(loadArt)).then(ready=>{
   window.clearTimeout(timeout);
   if(active)setResult({assets,state:ready.every(Boolean)?'ready':'fallback'});
  });
  return ()=>{active=false;window.clearTimeout(timeout);};
 },[assets]);
 if(assets.every(src=>requests.get(src)?.ready))return 'ready';
 return result?.assets===assets?result.state:'loading';
}
