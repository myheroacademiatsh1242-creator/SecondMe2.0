/**
 * Burning: any hit the Ember Demon fight lands on the player sets them alight. They take a little damage every
 * half second for a few seconds; a new hit restarts the clock (burns never stack, so it can't snowball).
 */
export const BURN = { TIME: 3.5, TICK: 0.5, DAMAGE: 2 };

export interface Burn { remaining: number; tick: number }

export const newBurn = (): Burn => ({ remaining: 0, tick: 0 });

/** Sets (or refreshes) the burn. Returns true when this lit it fresh rather than refreshing it. */
export function ignite(b: Burn): boolean {
  const fresh = b.remaining <= 0;
  b.remaining = BURN.TIME;
  if (fresh) b.tick = BURN.TICK;
  return fresh;
}

/** Advances the burn by `dt` seconds; returns the damage due this step (0 when no tick fell). */
export function stepBurn(b: Burn, dt: number): number {
  if (b.remaining <= 0) return 0;
  const step = Math.min(dt, b.remaining);
  b.remaining -= step;
  b.tick -= step;
  if (b.tick > 1e-9) return 0;
  b.tick += BURN.TICK;
  return BURN.DAMAGE;
}
