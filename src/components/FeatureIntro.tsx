import { useSyncExternalStore } from 'react';
import { FEATURE_TIPS, featureIntro, type FeatureId } from '../game/logic/featureIntro.ts';

function useFeatureIntro() { useSyncExternalStore(featureIntro.subscribe, featureIntro.snapshot); }

/** Glowing dot on a button whose feature the player has not opened yet (the button needs no extra class). */
export function NewDot({ feature, show = true, acquired = false }: { feature: FeatureId; show?: boolean; acquired?: boolean }) {
  useFeatureIntro();
  return acquired || (show && featureIntro.isNew(feature)) ? <span className="new-dot" aria-hidden="true"/> : null;
}

/** One line of explanation at the top of a panel the first time it opens; "Got it" marks the feature seen. */
export function FirstTip({ feature, vi }: { feature: FeatureId; vi: boolean }) {
  useFeatureIntro();
  if (!featureIntro.isNew(feature)) return null;
  return <div className="first-tip stone-frame" role="note">
    <b>{vi ? 'MỚI' : 'NEW'}</b><span>{FEATURE_TIPS[feature][vi ? 'vi' : 'en']}</span>
    <button type="button" onClick={() => featureIntro.markSeen(feature)}>{vi ? 'Đã hiểu' : 'Got it'}</button>
  </div>;
}
