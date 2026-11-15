/** Local games accept YYYY in both production builds and the Vite dev server. */
export const gameDevToolsEnabled = typeof window === 'undefined' ||
  ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
