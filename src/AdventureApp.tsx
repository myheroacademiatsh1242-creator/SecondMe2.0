import {controls,touchVars} from './game/logic/controlSettings.ts';
import {startGamepadControls} from './game/logic/gamepadControls.ts';
import {MissionBriefing} from './components/MissionBriefing.tsx';
import './components/StoneFrame.css';
import {KeyPromptLayer} from './components/KeyPromptLayer.tsx';
import {SnowHuntHUD} from './components/SnowHuntHUD.tsx';
import {PANEL_ART,warmPanelArt} from './components/panelArt.ts';

import {sounds} from './game/logic/sound.ts';
import {installUISounds} from './game/logic/uiSounds.ts';

import './components/PlayHudLayout.css';
import './components/ResponsivePlayLayout.css';
import './components/LevelOneLayout.css';
import { PauseMenu } from './components/PauseMenu.tsx';
import './components/ForestDialogs.css';
import {LandscapeGate} from './components/LandscapeGate.tsx';
import {readLandscapeRequirement,isTouchDevice} from './game/logic/orientation.ts';
import { installScreenControls, FullscreenButton } from './components/FullscreenButton.tsx';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { GameEngine, readSavedSettings, type HUDState } from './game/GameEngine.ts';
import { gameDevToolsEnabled } from './game/logic/devAccess.ts';
import { Intro, Lobby, Shop, Characters, AdventureHUD, Completion, EndScreen } from './components/CampaignUI.tsx';
import { CinematicIntro, hasWatchedIntro } from './components/CinematicIntro.tsx';
import { StudioSplash } from './components/StudioSplash.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { flushSync } from 'react-dom';
import { localize } from './localize.tsx';
import { BossIntro } from './components/BossIntro.tsx';
import { MechanicGuide } from './components/MechanicGuide.tsx';
import { TrailInventory } from './components/TrailInventory.tsx';
import { PlayerGuide, OPEN_GUIDE_EVENT } from './components/guide/PlayerGuide.tsx';

const initial: HUDState = { screen:'intro', levelName:'LEVEL 01', levelSubtitle:'ECHO GROVE', recordingStatus:'idle', echoCharges:2, echoStability:0, echoElapsedMs:0, echoDurationMs:0, echoEvents:[], dissonanceSeconds:0,
  recordingTimeRemaining:8000, echoStatus:'none', echoCount:0, isMuted:false, bannerMessage:'', elapsedLevelTime:0,
  completed:[], lastReward:null, health:100, bossHp:0, bossPhase:0, attackCooldown:0, dodgeCooldown:0, legTimeRemaining:null, checkpointIndex:0, checkpointCount:0, slowed:false, defeatReason:'damage', volume:.25, effectsVolume:1, musicVolume:1, voiceVolume:1, reducedMotion:false, showHints:true, devUnlocked:false, language:'vi', characterClass:'mage', weapon:'staff', coins:0, timeItems:0, limitRings:0, chestKeys:0, whiteCrystals:0, mysticCrystals:0, echoLimit:4, limitRingActive:false, bestStars:{}, lastRating:null, skillCooldown:0, bossArmor:0, pillarsRemaining:0, activeBuff:'', skillDrop:null, mechanicalOwned:false };
const SESSION_DESTINATION = 'secondme.sessionDestination';

function shouldRestoreCamp() {
  try { return sessionStorage.getItem(SESSION_DESTINATION) === 'camp'; }
  catch { return false; }
}


export default function AdventureApp({ prepare }: { prepare?: (engine: GameEngine) => void } = {}) {
  useEffect(()=>installUISounds(),[]);
  useSyncExternalStore(controls.subscribe,controls.snapshot);
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
  useEffect(() => {
    if (gameDevToolsEnabled) return;
    const blockDevToolsShortcut = (event: KeyboardEvent) => {
      const inspectorKey = ['KeyI', 'KeyJ', 'KeyC'].includes(event.code);
      const opensDevTools = event.key === 'F12' || event.code === 'F12' ||
        (inspectorKey && ((event.ctrlKey && event.shiftKey) || (event.metaKey && event.altKey)));
      if (!opensDevTools) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', blockDevToolsShortcut, true);
    return () => window.removeEventListener('keydown', blockDevToolsShortcut, true);
  }, []);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ref = useRef<GameEngine | null>(null);
  const [restoreCamp] = useState(shouldRestoreCamp);
  const [hud, setHud] = useState<HUDState>(() => ({ ...initial, ...readSavedSettings(), screen: restoreCamp ? 'loading' : 'intro' }));
  // The film plays on the first visit only (skippable); afterwards the studio logo leads straight to the menu.
  const [introRun, setIntroRun] = useState(() => (restoreCamp || hasWatchedIntro() ? 0 : 1));
  const [introFinished, setIntroFinished] = useState(false);
  const [splash, setSplash] = useState(!restoreCamp);
  const [revealLobby, setRevealLobby] = useState(false);
  useEffect(() => {
    const engine = new GameEngine(); ref.current = engine;
    engine.tutorialEnabled = true;
    // In-match help is the key prompt by the hero and the "new here" card (KeyPromptLayer); no blocking briefing or coach pop-ups.
    engine.missionBriefingEnabled = false;
    engine.touchControls = touchControls;
    engine.levelLoading = true;   // levels open through the loading screen
    if (gameDevToolsEnabled) (window as unknown as { __engine?: GameEngine }).__engine = engine;
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
    engine.suspendVisuals = !restoreCamp;
    engine.start(false, restoreCamp);

    const stopGamepad=startGamepadControls(engine);
    const unbindControls=controls.subscribe(()=>engine.clearControlInput());
    prepare?.(engine);
    return () => {stopGamepad();unbindControls();engine.stop();};
  }, []);
  useEffect(()=>{
    const update=()=>{const blocked=readLandscapeRequirement();ref.current?.setOrientationBlocked(blocked);setPortraitBlocked(blocked);};update();
    const media=window.matchMedia('(pointer: coarse)');window.addEventListener('resize',update);window.addEventListener('orientationchange',update);media.addEventListener('change',update);
    return()=>{window.removeEventListener('resize',update);window.removeEventListener('orientationchange',update);media.removeEventListener('change',update);};
  },[]);
  // The guide outside a level (camp, the rotate-to-landscape gate); inside a level it opens through the engine, which freezes play.
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    const open = () => {
      const e = ref.current;
      if (e && e.screen === 'playing') e.openGuide(); else setGuideOpen(true);
    };
    document.addEventListener(OPEN_GUIDE_EVENT, open);
    return () => document.removeEventListener(OPEN_GUIDE_EVENT, open);
  }, []);
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
  const choosingLobbyRune = hud.screen === 'lobby' && !!hud.pendingRuneChoices?.length;
  return localize(<main className="adventure-app" style={{...touchVars(),'--desktop-scale': desktopScale} as React.CSSProperties} lang={hud.language} translate="no">{portraitBlocked&&<LandscapeGate vi={hud.language==='vi'}/>}<div className="game-stage" data-screen={hud.screen} data-level={['playing','paused','victory','defeat','ending'].includes(hud.screen)?'one':undefined} data-touch-controls={touchControls} inert={portraitBlocked || bossIntroVisible || hud.preparingBattle || hud.missionBriefing}><canvas ref={canvas} width={1280} height={720} data-testid="game-canvas"/>
    {hud.screen === 'intro' && <Intro engine={engine} hud={hud} afterFilm={introFinished}/>}
    {hud.screen === 'intro' && splash && <StudioSplash paused={portraitBlocked} reducedMotion={hud.reducedMotion} onDone={() => { setSplash(false); if (introRun === 0) setIntroFinished(true); }}/>}
    {hud.screen === 'intro' && !splash && introRun > 0 && <CinematicIntro key={introRun} lang={hud.language} reducedMotion={hud.reducedMotion} paused={portraitBlocked} onDone={() => {
      setIntroFinished(true);
      setIntroRun(0);
    }}/>}
    {(hud.screen === 'lobby' || (hud.screen === 'loading' && revealLobby)) &&
      <div className="lobby-handoff overlay" inert={hud.screen === 'loading'}><Lobby engine={engine} hud={hud}/></div>}
    {hud.screen === 'loading' && engine && <LoadingScreen key={hud.loadingLevel ?? 'lobby'} language={lang} reducedMotion={hud.reducedMotion} season={engine.devSeasonPreview}
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
    {/* Retry from pause opens battle preparation; the pause menu (inert while it is open) must not cover it. */}
    {hud.screen === 'paused' && !hud.missionBriefing && !hud.preparingBattle && <PauseMenu engine={engine} hud={hud}/>}
    {/* The New card sits inside the stage, under the top bar, so it scales and stays with the arena. */}
    {engine&&!filmPlaying&&!portraitBlocked&&!bossIntroVisible&&hud.screen==='playing'&&<KeyPromptLayer engine={engine} hud={hud} touch={touchControls}/>}
    {engine&&hud.hunt&&(hud.screen==='playing'||hud.screen==='paused')&&<SnowHuntHUD engine={engine} hud={hud}/>}

  </div>
    {hud.missionBriefing&&engine&&!portraitBlocked&&<MissionBriefing engine={engine} hud={hud} touch={touchControls}/>}
    {hud.preparingBattle && engine && <div className="modal-backdrop inventory-backdrop battle-preparation" inert={portraitBlocked}>
      <div className="panel inventory-modal forest-dialog">
        <TrailInventory preparing engine={engine} hud={hud} close={() => engine.cancelBattleStart()}/>
      </div>
    </div>}
    {guideOpen && !hud.guideLibrary && <PlayerGuide progress={engine?.campaign} lang={lang} onClose={() => setGuideOpen(false)} onReplayTutorial={track=>{engine?.onboarding.replay(track);setGuideOpen(false);}}/>}
    {bossIntroVisible && <div className="boss-intro-viewport" data-boss={hud.bossKind ?? 'guardian'} inert={portraitBlocked}>
      <BossIntro engine={engine} hud={hud}/>
    </div>}
  </main>);
}
