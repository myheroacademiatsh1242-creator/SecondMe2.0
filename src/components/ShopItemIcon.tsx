import type {ShopItemId} from '../game/logic/shopItems.ts';
/** Keep the original hourglass and blue Echo ring; new item art comes from the supplied Word file. */
export function ShopItemIcon({id}:{id:ShopItemId}){
 if(id==='time')return <svg className="shop-item-icon shop-original-item" data-item={id} viewBox="643 78 456 784" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style={{overflow:'hidden'}}>
  <image href={`${import.meta.env.BASE_URL}assets/ui/them-mot-chut.png`} width={1695} height={928}/>
 </svg>;
 // The square source canvases have different transparent margins. Fit the visible
 // bottle, rather than the entire canvas, into the shared icon slot.
 if(id==='manaSmall'||id==='manaLarge'){
  const small=id==='manaSmall';
  return <svg className="shop-item-icon shop-original-item" data-item={id} viewBox={small?'170 16 164 472':'149 16 574 840'} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style={{overflow:'hidden'}}>
   <image href={`${import.meta.env.BASE_URL}assets/items/${small?'mana-small':'mana-large'}.png`} width={small?504:872} height={small?504:872}/>
  </svg>;
 }
 const atlasIndex=['healSmall','healLarge','revive','chances','aid'].indexOf(id);
 if(atlasIndex>=0)return <span className="shop-item-icon shop-item-atlas" data-item={id} aria-hidden="true" style={{backgroundImage:`url(${import.meta.env.BASE_URL}assets/shop/item-atlas.png)`,backgroundPosition:`${atlasIndex%3*50}% ${Math.floor(atlasIndex/3)*100}%`}}/>;
 return <img className="shop-item-icon shop-original-item" data-item={id} src={`${import.meta.env.BASE_URL}assets/${id==='ring'?'effects/echo-limit-ring.png':'ui/them-mot-chut.png'}`} alt="" aria-hidden="true"/>;
}
