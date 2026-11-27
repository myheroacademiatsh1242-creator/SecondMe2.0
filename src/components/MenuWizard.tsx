import {getOutfit} from '../game/logic/outfits.ts';
import {getWizardSheet,WIZARD_WALK_URL} from '../game/rendering/wizardSprite.ts';
import {outfitSheet} from '../game/rendering/outfitSprites.ts';
import { useEffect, useRef } from 'react';
import { ANCHOR, CELL, SPRITE_K, T, wizardPose, type WizardPose } from './menuWizardEntrance.ts';
import { SANTA_HAT_URL } from './HeroSantaHat.ts';

// Plays once per page load; coming back to the menu shows her already standing there.
let played = false;
let winterPlayed = false;

/** Aeris on the main menu: steps out of the portal, walks to her spot, then idles (inside IntroEffects' SVG). */
export function MenuWizard({ winter = false, reducedMotion = false }: { winter?: boolean; reducedMotion?: boolean } = {}) {
  const outfit=getOutfit('mage');
  const snowman=outfit==='snowman';
  const sprite=useRef<SVGImageElement>(null),shadow=useRef<SVGEllipseElement>(null);
  const clip = useRef<SVGGElement>(null), body = useRef<SVGGElement>(null), idle = useRef<SVGGElement>(null);
  const cell = useRef<SVGSVGElement>(null), flare = useRef<SVGEllipseElement>(null);
  const hat = useRef<SVGSVGElement>(null);

  useEffect(()=>{
    if (outfit==='default'||snowman) return;
    let frame=0, disposed=false, url:string|undefined;
    const ready=()=>{
      const sheet=getWizardSheet();
      if (!sheet) { frame=requestAnimationFrame(ready); return; }
      const variant=outfitSheet(sheet,'mage',outfit);
      if (variant instanceof HTMLCanvasElement) variant.toBlob(blob=>{
        if (!blob||disposed) return;
        url=URL.createObjectURL(blob);
        sprite.current?.setAttribute('href',url);
      });
    };
    ready();
    return ()=>{disposed=true;cancelAnimationFrame(frame);if(url)URL.revokeObjectURL(url);};
  },[outfit,snowman]);
  useEffect(() => {
    const portal = Array.from(clip.current?.ownerSVGElement?.querySelectorAll('.portal-swirl,.plasma-wave,.portal-core,.portal-breath') ?? []);
    const setRate = (rate: number) => portal.forEach(el => el.getAnimations().forEach(a => { a.playbackRate = rate; }));
    const apply = (p: WizardPose) => {
      clip.current?.setAttribute('clip-path', p.inPortal ? `url(#${winter ? 'winter-portal-clip' : 'intro-portal-clip'})` : 'none');
      if (clip.current) clip.current.style.filter = p.glow > 0.01 ? `brightness(${1 + p.glow * 0.7}) drop-shadow(0 0 ${3 + p.glow * 5}px rgba(126,255,224,${p.glow * 0.9}))` : '';
      const x = winter ? 310 + (p.x - 318) * .6 : p.x;
      const y = winter ? 548 + (p.y - 565) * .55 : p.y;
      body.current?.setAttribute('transform', `translate(${x} ${y}) scale(${p.s * (winter ? .8 : 1)})`);
      body.current?.setAttribute('opacity', String(p.opacity));
      shadow.current?.setAttribute('opacity',p.inPortal?'0':'.48');
      if(snowman){
        const side=p.row===1;
        cell.current?.setAttribute('viewBox', (side?(p.frame%6)*200:0)+' '+(side?400:0)+' 200 200');
      } else cell.current?.setAttribute('viewBox', `${p.frame * CELL} ${p.row * CELL} ${CELL} ${CELL}`);
      const crown = p.row === 2 ? 27 : [24, 24, 24, 24, 25, 25, 26, 25][p.frame];
      hat.current?.setAttribute('y', String((crown - ANCHOR.y) * SPRITE_K - 33));
      flare.current?.setAttribute('opacity', String(p.flare));
      idle.current?.classList.toggle('is-idle', p.done);
    };
    const still = reducedMotion || document.body.classList.contains('reduced-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ((winter ? winterPlayed : played) || still) { apply(wizardPose(T.walkEnd)); return; }
    let frame = 0, start = 0, portalRate = 1;
    apply(wizardPose(0));
    const tick = (now: number) => {
      // The menu mounts under the studio card and the intro film (AdventureApp); start the clock once both are gone.
      if (!start && document.querySelector('.cinematic-intro, .studio-splash')) { frame = requestAnimationFrame(tick); return; }
      start ||= now;
      const p = wizardPose((now - start) / 1000);
      apply(p);
      if (p.portalRate !== portalRate) {
        portalRate = p.portalRate;
        setRate(portalRate);
      }
      if (p.done) {
        if (winter) winterPlayed = true;
        else played = true;
      }
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); setRate(1); };
  }, [winter, reducedMotion,snowman]);

  const k = SPRITE_K;
  return <g className="menu-wizard-entrance">
    <defs>
      {winter && <clipPath id="winter-portal-clip"><ellipse cx="299" cy="416" rx="113" ry="155"/></clipPath>}
      {/* Same hard alpha edge as the game's sprite loader (alpha >= 180 -> opaque). */}
      <filter id="menu-wizard-alpha"><feComponentTransfer><feFuncA type="discrete" tableValues="0 0 0 0 0 0 0 1 1 1"/></feComponentTransfer></filter>
      <filter id="menu-wizard-ground-shadow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="1.7"/></filter>
    </defs>
    {!winter && <ellipse ref={flare} cx="309" cy="445" rx="100" ry="152" fill="url(#intro-portal-core)" opacity="0"/>}
    <g ref={clip}>
      <g ref={body} opacity="0">
        <ellipse ref={shadow} cx="2" cy="23" rx="29" ry="7" fill="#010b0a" opacity="0" filter="url(#menu-wizard-ground-shadow)"/>

        <g ref={idle} className="menu-wizard">
          <svg ref={cell} x={-ANCHOR.x * k} y={-ANCHOR.y * k} width={CELL * k} height={CELL * k} viewBox={`0 ${2 * CELL} ${CELL} ${CELL}`} overflow="hidden">
            <image ref={sprite} href={snowman?import.meta.env.BASE_URL+'assets/christmas-outfits/snowman-walk.png':WIZARD_WALK_URL} width={snowman?1600:CELL*8} height={snowman?800:CELL*3} filter="url(#menu-wizard-alpha)"/>
          </svg>
          {winter && !snowman && <svg ref={hat} className="menu-wizard-hat" x="-42" width="76" height="54" viewBox="425 300 650 465" overflow="hidden">
            <image href={SANTA_HAT_URL} width="1536" height="1024"/>
          </svg>}
        </g>
      </g>
    </g>
  </g>;
}
