import { useEffect } from 'react';

/** Registers a global keyboard shortcut. `combo` like "mod+k", "a", "shift+?". */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const needMod = parts.includes('mod');
    const needShift = parts.includes('shift');
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName));
      if (!needMod && typing) return;
      if (needMod !== (e.metaKey || e.ctrlKey)) return;
      if (needShift && !e.shiftKey) return;
      if (e.key.toLowerCase() !== key) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler, enabled]);
}
