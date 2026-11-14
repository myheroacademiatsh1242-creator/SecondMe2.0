import {PANEL_ART,warmPanelArt} from './components/panelArt.ts';

import {sounds} from './game/logic/sound.ts';

import './components/PlayHudLayout.css';
import './components/ResponsivePlayLayout.css';
import './components/LevelOneLayout.css';
import { PauseMenu } from './components/PauseMenu.tsx';
import './components/ForestDialogs.css';
import {LandscapeGate} from './components/LandscapeGate.tsx';
import {readLandscapeRequirement,isTouchDevice} from './game/logic/orientation.ts';
import { installScreenControls, FullscreenButton } from './components/FullscreenButton.tsx';
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, readSavedSettings, type HUDState } from './game/GameEngine.ts';
import { Intro, Lobby, Shop, Characters, AdventureHUD, Completion, EndScreen } from './components/CampaignUI.tsx';
import { CinematicIntro } from './components/CinematicIntro.tsx';
import { StudioSplash } from './components/StudioSplash.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { flushSync } from 'react-dom';
import { localize } from './localize.tsx';
import { BossIntro } from './components/BossIntro.tsx';
import { MechanicGuide } from './components/MechanicGuide.tsx';

const initial: HUDState = { screen:'intro', levelName:'LEVEL 01', levelSubtitle:'ECHO GROVE', recordingStatus:'idle', echoCharges:2, echoStability:0, echoElapsedMs:0, echoDurationMs:0, echoEvents:[], dissonanceSeconds:0,
  recordingTimeRemaining:8000, echoStatus:'none', echoCount:0, isMuted:false, bannerMessage:'', elapsedLevelTime:0,
  completed:[], lastReward:null, health:100, bossHp:0, bossPhase:0, attackCooldown:0, dodgeCooldown:0, legTimeRemaining:null, checkpointIndex:0, checkpointCount:0, slowed:false, defeatReason:'damage', volume:.25, effectsVolume:1, musicVolume:1, voiceVolume:1, reducedMotion:false, showHints:true, devUnlocked:false, language:'vi', characterClass:'mage', weapon:'staff', coins:0, timeItems:0, limitRings:0, chestKeys:0, echoLimit:4, limitRingActive:false, bestStars:{}, lastRating:null, skillCooldown:0, bossArmor:0, pillarsRemaining:0, activeBuff:'', skillDrop:null, mechanicalOwned:false };
const SESSION_DESTINATION = 'secondme.sessionDestination';

function shouldRestoreCamp() {
  try { return sessionStorage.getItem(SESSION_DESTINATION) === 'camp'; }
  catch { return false; }
}

export default function AdventureApp({ prepare }: { prepare?: (engine: GameEngine) => void } = {}) {
  const [touchControls]=useState(isTouchDevice);
  // Keep the 1280×720 arena and its 78/142px HUD rails in one coordinate system.
  // Recompute in CSS pixels when moving between monitors or changing browser zoom.
  const [desktopScale, setDesktopScale] = useState(1);
  useEffect(() => {
    const update = () => setDesktopScale(touchControls ? 1 : Math.max(1,
      Math.min(window.innerWidth / 1280, window.innerHeight / 940)));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [touchControls]);
  const [portraitBlocked,setPortraitBlocked]=useState(readLandscapeRequirement);
  useEffect(()=>{
    const wake=()=>{sounds.graph();};
    const visible=()=>{if(document.visibilityState==='visible')wake();};
    window.addEventListener('pointerdown',wake,true);window.addEventListener('touchend',wake,true);window.addEventListener('keydown',wake,true);document.addEventListener('visibilitychange',visible);
    return()=>{window.removeEventListener('pointerdown',wake,true);window.removeEventListener('touchend',wake,true);window.removeEventListener('keydown',wake,true);document.removeEventListener('visibilitychange',visible);};
  },[]);
  useEffect(() => installScreenControls(), []);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ref = useRef<GameEngine | null>(null);
  const [restoreCamp] = useState(shouldRestoreCamp);
  const [hud, setHud] = useState<HUDState>(() => ({ ...initial, ...readSavedSettings(), screen: restoreCamp ? 'loading' : 'intro' }));
  const [introRun, setIntroRun] = useState(restoreCamp ? 0 : 1);
  const [splash, setSplash] = useState(!restoreCamp);
  const [revealLobby, setRevealLobby] = useState(false);
  useEffect(() => {
    const engine = new GameEngine(); ref.current = engine;
    engine.tutorialEnabled = true;
    engine.levelLoading = true;   // levels open through the loading screen
    if (import.meta.env.DEV) (window as unknown as { __engine?: GameEngine }).__engine = engine;   // console checks
    engine.setOrientationBlocked(readLandscapeRequirement());
    engine.setCanvas(canvas.current);
    let previousScreen: HUDState['screen'] | undefined;
    engine.onHUDChange = state => {
      if (state.screen !== previousScreen) {
        previousScreen = state.screen;
        try { sessionStorage.setItem(SESSION_DESTINATION, state.screen === 'intro' ? 'menu' : 'camp'); }
        catch { /* The game can run when browser storage is unavailable. */ }
      }
      setHud({ ...state });
    };
    engine.start(false, restoreCamp);
    prepare?.(engine);
    return () => engine.stop();
  }, []);
  useEffect(()=>{
    const update=()=>{const blocked=readLandscapeRequirement();ref.current?.setOrientationBlocked(blocked);setPortraitBlocked(blocked);};update();
    const media=window.matchMedia('(pointer: coarse)');window.addEventListener('resize',update);window.addEventListener('orientationchange',update);media.addEventListener('change',update);
    return()=>{window.removeEventListener('resize',update);window.removeEventListener('orientationchange',update);media.removeEventListener('change',update);};
  },[]);
  const filmPlaying = hud.screen === 'intro' && (splash || introRun > 0);
  useEffect(() => { if (ref.current) ref.current.suspendVisuals = filmPlaying; }, [filmPlaying]);
  const timedLevel=hud.legTimeRemaining!==null;
  useEffect(()=>{
    if(hud.screen!=='playing')return;
    warmPanelArt(PANEL_ART.defeat[hud.characterClass==='swordsman'?'swordsman':'mage']);
    if(timedLevel)warmPanelArt(PANEL_ART.defeat.timeout);
    warmPanelArt(PANEL_ART.reward);
    warmPanelArt(PANEL_ART.pause);
  },[hud.screen,hud.characterClass,timedLevel]);
  const engine = ref.current;
  const lang = hud.language === 'vi' ? 'vi' : 'en';
  const bossIntroVisible = hud.screen === 'playing' && hud.bossIntroduction;
  return localize(<main className="adventure-app" style={{'--desktop-scale': desktopScale} as React.CSSProperties} lang={hud.language} translate="no">{portraitBlocked&&<LandscapeGate vi={hud.language==='vi'}/>}<div className="game-stage" data-screen={hud.screen} data-level={['playing','paused','victory','defeat','ending'].includes(hud.screen)?'one':undefined} data-touch-controls={touchControls} inert={portraitBlocked || bossIntroVisible}><canvas ref={canvas} width={1280} height={720} data-testid="game-canvas"/>
    {hud.screen === 'intro' && <Intro engine={engine} hud={hud}/>}
    {hud.screen === 'intro' && splash && <StudioSplash paused={portraitBlocked} onDone={() => setSplash(false)}/>}
    {hud.screen === 'intro' && !splash && introRun > 0 && <CinematicIntro key={introRun} lang={hud.language} reducedMotion={hud.reducedMotion} paused={portraitBlocked} onDone={() => setIntroRun(0)}/>}
    {(hud.screen === 'lobby' || (hud.screen === 'loading' && revealLobby)) &&
      <div className="lobby-handoff overlay" inert={hud.screen === 'loading'}><Lobby engine={engine} hud={hud}/></div>}
    {hud.screen === 'loading' && engine && <LoadingScreen key={hud.loadingLevel ?? 'lobby'} language={lang} reducedMotion={hud.reducedMotion}
      level={hud.loadingLevel == null ? null : { levelId: hud.loadingLevel, character: hud.characterClass, lang }} portal={!!hud.loadingFromMenu} lobbyTheme={(engine?.currentLevel.id ?? 1) >= 7 && engine?.canSelectLevel(6) ? 'frost' : 'forest'}
      onReveal={() => { if (hud.loadingLevel == null) flushSync(() => setRevealLobby(true)); else engine?.revealLoadedLevel(); }}
      onDone={() => { engine?.finishLoading(); setRevealLobby(false); }}/>}
    {hud.screen === 'shop' && <Shop engine={engine} hud={hud}/>}
    {hud.screen === 'characters' && <Characters engine={engine} hud={hud}/>}
    {(hud.screen === 'playing' || hud.screen === 'paused') && <AdventureHUD engine={engine} hud={hud}/>}
    {/* Combat hints appear only once the arena is playable. */}
    {hud.screen === 'playing' && !hud.bossIntroduction && <MechanicGuide engine={engine} hud={hud} touch={touchControls}/>}
    {hud.screen === 'victory' && <Completion engine={engine} hud={hud}/>}
    {(hud.screen === 'ending' || hud.screen === 'defeat') && <EndScreen engine={engine} hud={hud}/>}
    {!['lobby', 'playing', 'paused', 'loading', 'shop'].includes(hud.screen) && <FullscreenButton floating vi={hud.language === 'vi'}/>}
    {hud.screen === 'paused' && <PauseMenu engine={engine} hud={hud}/>}

  </div>
    {bossIntroVisible && <div className="boss-intro-viewport" data-boss={hud.bossKind ?? 'guardian'} inert={portraitBlocked}>
      <BossIntro engine={engine} hud={hud}/>
    </div>}
  </main>);
}
