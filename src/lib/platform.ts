export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Label for the platform's command modifier key. */
export const modKey = isMac ? 'Cmd' : 'Ctrl';
