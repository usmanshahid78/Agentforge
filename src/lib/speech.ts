/**
 * Thin wrappers over the browser Web Speech APIs.
 * - Recognition (voice input) is Chromium/Safari only; callers must check `canListen()`.
 * - Synthesis (spoken replies) is widely supported; voices load asynchronously.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceConfig } from '@/types';

/* ------------------------------- Recognition ------------------------------- */

interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const canListen = () => !!recognitionCtor();

/** Voice input hook: streams interim transcript, calls onFinal with the final text. */
export function useVoiceInput(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string>();
  const rec = useRef<Recognition>();
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError('Voice input is not supported in this browser.');
      return;
    }
    const r = new Ctor();
    r.lang = navigator.language || 'en-GB';
    r.interimResults = true;
    r.continuous = false;
    let finalText = '';
    r.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res) continue;
        if (res.isFinal) finalText += res[0].transcript;
        else text += res[0].transcript;
      }
      setInterim(finalText + text);
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Could not hear that.');
    r.onend = () => {
      setListening(false);
      setInterim('');
      if (finalText.trim()) finalRef.current(finalText.trim());
    };
    rec.current = r;
    setError(undefined);
    setListening(true);
    r.start();
  }, []);

  useEffect(() => () => rec.current?.abort(), []);

  return { listening, interim, error, start, stop, supported: canListen() };
}

/* -------------------------------- Synthesis -------------------------------- */

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!canSpeak()) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  return voices;
}

/**
 * Speaks text and exposes an approximate "mouth openness" level for lip-sync.
 *
 * Honest caveat: SpeechSynthesis gives no audio stream to analyse, so true
 * amplitude-driven lip-sync is impossible here. We approximate it: each word
 * boundary event kicks the mouth open, then it decays every frame, with a
 * little jitter so it reads as speech. A real TTS service that returns audio
 * should instead drive `level` from an AnalyserNode on that audio.
 */
export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState('');
  const [level, setLevel] = useState(0);
  const target = useRef(0);
  const raf = useRef<number>();
  const fallbackTimer = useRef<number>();

  const loop = useCallback(() => {
    target.current *= 0.86;
    setLevel((l) => l + (target.current - l) * 0.5);
    raf.current = requestAnimationFrame(loop);
  }, []);

  const stop = useCallback(() => {
    if (canSpeak()) window.speechSynthesis.cancel();
    if (raf.current) cancelAnimationFrame(raf.current);
    window.clearInterval(fallbackTimer.current);
    target.current = 0;
    setLevel(0);
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, voice?: Partial<VoiceConfig>, onEnd?: () => void) => {
      stop();
      setCaption(text);
      setSpeaking(true);
      raf.current = requestAnimationFrame(loop);
      const kick = () => {
        target.current = 0.55 + Math.random() * 0.45;
      };
      const finish = () => {
        if (raf.current) cancelAnimationFrame(raf.current);
        window.clearInterval(fallbackTimer.current);
        target.current = 0;
        setLevel(0);
        setSpeaking(false);
        onEnd?.();
      };

      if (!canSpeak()) {
        // No TTS: animate captions-only for a plausible duration.
        fallbackTimer.current = window.setInterval(kick, 140);
        window.setTimeout(finish, Math.min(12000, 300 + text.split(/\s+/).length * 320));
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => x.voiceURI === voice?.voiceURI);
      if (v) u.voice = v;
      u.pitch = voice?.pitch ?? 1;
      u.rate = voice?.rate ?? 1;
      u.onboundary = kick;
      // Some voices never fire boundary events; keep the mouth moving anyway.
      fallbackTimer.current = window.setInterval(() => {
        if (target.current < 0.15) kick();
      }, 180);
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.speak(u);
    },
    [loop, stop],
  );

  useEffect(() => stop, [stop]);

  return { speak, stop, speaking, level, caption };
}
