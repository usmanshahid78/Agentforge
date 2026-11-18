import { useEffect } from 'react';
import type { Severity } from '@/types';
import { useDb } from '@/store/db';

/** Synthetic "live" events so the feed visibly moves while you watch. */
const LIVE: Record<string, Array<[string, string, Severity]>> = {
  'agt-lyra': [['Matched competitor price on 3 lines', 'Dairy and bakery, within the ±5% band.', 'info']],
  'agt-echo': [['Answered a WhatsApp question', 'Opening hours on Sunday. Resolved in 22 seconds.', 'success']],
  'agt-quill': [['Drafted a weekend post', 'Waiting for your approval before publishing.', 'info']],
  'agt-ledger': [['Matched 2 invoices', 'Both within 1% of delivery notes.', 'success']],
  'agt-atlas': [['Updated tomorrow\'s forecast', 'Rain moved earlier; expect 9% fewer visitors after 3pm.', 'info']],
  'agt-vega': [['Drafted a reorder for cold drinks', 'Based on Atlas\'s warm-weekend forecast.', 'info']],
  'agt-pulse': [['Planned a rainy-day promo', 'Soup meal deal, waiting for approval.', 'info']],
};

export function useLiveFeed(enabled: boolean) {
  const addEvent = useDb((s) => s.addEvent);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const working = useDb.getState().agents.filter((a) => a.status === 'working' && LIVE[a.id]);
      const a = working[Math.floor(Math.random() * working.length)];
      const pick = a && LIVE[a.id]?.[0];
      if (a && pick) addEvent({ agentId: a.id, title: pick[0], detail: pick[1], severity: pick[2] });
    }, 14000);
    return () => window.clearInterval(id);
  }, [enabled, addEvent]);
}
