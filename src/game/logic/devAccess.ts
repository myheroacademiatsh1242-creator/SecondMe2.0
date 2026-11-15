// Headless tests run without Vite. Browser tools require an opted-in local dev server.
const env = import.meta.env;
export const gameDevToolsEnabled = env === undefined
  ? typeof window === 'undefined'
  : env.DEV && env.VITE_GAME_DEV_TOOLS === '1' && typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
