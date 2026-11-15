import { ArrowRight, ChevronsUp } from 'lucide-react';
import type { GameEngine, HUDState } from '../game/GameEngine.ts';
import { HERO_MAX_RANK, HERO_UPGRADE_STATS, isUpgradeHero } from '../game/logic/heroUpgrades.ts';

export function CampHeroCaption({engine, hud}: {
  engine: GameEngine | null;
  hud: HUDState;
}) {
  const vi = hud.language === 'vi';
  const hero = hud.characterClass;
  return <div className="rest-scene-caption">
    <strong>{hero === 'swordsman' ? 'Kael' : hero === 'mechanical' ? 'Rivet' : 'Aeris'}</strong>
    <button type="button" onClick={() => engine?.openCharacters()}>{vi ? 'Đổi nhân vật' : 'Change hero'} <ArrowRight size={14}/></button>
  </div>;
}

export function CampHeroUpgrade({hud, onOpen, frost = false}: {
  hud: HUDState;
  onOpen: () => void;
  frost?: boolean;
}) {
  const hero = hud.characterClass;
  if (!isUpgradeHero(hero)) return null;
  const vi = hud.language === 'vi';
  const ranks = hud.heroRanks?.[hero];
  const total = HERO_UPGRADE_STATS.reduce((sum, stat) => sum + (ranks?.[stat] ?? 0), 0);
  const max = HERO_MAX_RANK * HERO_UPGRADE_STATS.length;
  return <div className={frost ? 'rest-kit frost-kit' : 'rest-kit'}>
    <div>
      <span>{vi ? 'NÂNG CẤP HERO' : 'HERO UPGRADES'}</span>
      <p>{total} / {max} {vi ? 'cấp đã nâng' : 'ranks earned'}</p>
    </div>
    <button type="button" className={frost ? 'rest-prepare frost-prepare' : 'rest-prepare'} onClick={onOpen}>
      <ChevronsUp size={18} aria-hidden="true"/>{vi ? 'Nâng cấp' : 'Upgrade'}
    </button>
  </div>;
}
