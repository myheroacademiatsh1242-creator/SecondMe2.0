import {useEffect,useRef} from 'react';

type Point = readonly [x:number,y:number];
type Stream = { points:readonly Point[]; width:number; speed:number; count:number; lava?:boolean };

// Coordinates in the 768×512 view of the chapter painting.
const STREAMS: readonly Stream[] = [
 {points:[[325,302],[309,317],[285,330],[267,341],[254,351]],width:27,speed:48,count:23},
 {points:[[285,342],[262,358],[253,385],[248,416],[239,451]],width:38,speed:102,count:45},
 {points:[[238,449],[215,462],[193,475],[172,493],[150,511]],width:35,speed:58,count:30},
 {points:[[606,77],[596,98],[582,119],[568,136]],width:8,speed:35,count:8,lava:true},
 {points:[[624,84],[613,106],[607,134],[594,155],[576,182],[552,213]],width:9,speed:39,count:13,lava:true},
 {points:[[635,88],[636,112],[641,136],[652,161],[650,178]],width:8,speed:36,count:9,lava:true},
 {points:[[654,84],[660,108],[677,136],[691,154],[704,181]],width:9,speed:41,count:10,lava:true},
 {points:[[665,76],[680,96],[700,111],[721,124],[743,130]],width:7,speed:38,count:8,lava:true},
 {points:[[682,268],[663,282],[637,287],[620,297],[626,310],[611,332],[600,343],[598,375],[585,390],[564,403],[547,422]],width:10,speed:50,count:20,lava:true},
 {points:[[536,436],[526,449],[498,459],[476,477],[466,492],[432,504],[421,517]],width:13,speed:44,count:15,lava:true},
];

const prepared = STREAMS.map(stream=>{
 let length=0;
 const segments=stream.points.slice(1).map(([x,y],index)=>{
  const [sx,sy]=stream.points[index],dx=x-sx,dy=y-sy;
  const size=Math.hypot(dx,dy);
  const segment={x:sx,y:sy,dx:dx/size,dy:dy/size,start:length,end:length+size};
  length+=size;
  return segment;
 });
 return {...stream,length,segments};
});

export function FrostMapFlow(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d');
  if(!canvas||!ctx||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const water = new Path2D('M324 301L333 320 321 345 296 361 278 394 268 420 266 449 255 457 233 478 216 498 191 512H140L155 494 176 480 197 458 217 452 226 435 236 406 243 365 252 346 275 332 296 321Z M216 460L227 460 235 466 231 474 214 483 206 480Z');
  const start=performance.now();
  let request=0,previous=-1;
  const paint=(now:number)=>{
   request=requestAnimationFrame(paint);
   if(document.hidden)return;
   // A stepped pixel-art update, with independently staggered loops.
   const frame=Math.floor((now-start)*.024);
   if(frame===previous)return;
   previous=frame;
   const t=frame/24;
   ctx.clearRect(0,0,canvas.width,canvas.height);
   for(const stream of prepared){
    ctx.save();
    if(!stream.lava)ctx.clip(water,'evenodd');
    for(let i=0;i<stream.count;i++){
     const distance=(t*stream.speed*(.79+(i%5)*.09)+i*stream.length/stream.count)%stream.length;
     const segment=stream.segments.find(s=>distance<s.end)!;
     const along=distance-segment.start;
     const lateral=(((i*37)%103)/103-.5)*stream.width;
     const x=segment.x+segment.dx*along-segment.dy*lateral;
     const y=segment.y+segment.dy*along+segment.dx*lateral;
     const alpha=Math.min(1,distance/11,(stream.length-distance)/12);
     ctx.globalAlpha=alpha*(stream.lava?.65:.46);
     ctx.fillStyle=stream.lava?(i%3===0?'#ffe17a':'#ff982b'):(i%3===0?'#eefcff':'#9cd9ef');
     const stretch=stream.lava?3+i%4:4+i%9;
     for(let d=0;d<stretch;d+=1.4)ctx.fillRect(Math.round(x-segment.dx*d),Math.round(y-segment.dy*d),i%4===0?2:1,1);
    }
    ctx.restore();
   }
   for(let i=0;i<30;i++){
    const age=(t*(.75+(i%5)*.14)+i*.137)%1;
    const x=236+((i*11)%25-12)*(1+age)-age*16;
    const y=449-age*(9+i%11)+age*age*13;
    ctx.globalAlpha=Math.sin(age*Math.PI)*.58;
    ctx.fillStyle=i%3===0?'#f3fcff':'#a4ccda';
    ctx.fillRect(Math.round(x),Math.round(y),i%4===0?3:2,1);
   }
   ctx.globalAlpha=1;
  };
  request=requestAnimationFrame(paint);
  return ()=>cancelAnimationFrame(request);
 },[]);
 return <canvas ref={ref} className="map-flow-canvas" width={768} height={512}/>;
}
