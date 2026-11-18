import type { CharacterAvatarConfig } from '@/types';

// Avatar appearance data (skin, hair, outfit) is content, not UI theme colour.
export const SKIN_TONES = ['#F9D7C0', '#F1C27D', '#E0AC69', '#C68863', '#8D5524', '#5C3A21'];
export const HAIR_COLORS = ['#1A1A1A', '#2B1B14', '#6B4226', '#B5651D', '#D6B370', '#9CA3AF', '#7C3AED'];
export const OUTFIT_COLORS = ['#7C3AED', '#0EA5E9', '#DB2777', '#059669', '#1F2937', '#F59E0B'];

export const FACE_SHAPES: CharacterAvatarConfig['faceShape'][] = ['oval', 'round', 'square', 'heart'];
export const HAIR_STYLES: CharacterAvatarConfig['hairStyle'][] = ['short', 'long', 'bun', 'buzz', 'curly', 'none'];
export const OUTFITS: CharacterAvatarConfig['outfit'][] = ['blazer', 'hoodie', 'shirt', 'turtleneck'];
export const ACCESSORIES: CharacterAvatarConfig['accessory'][] = ['none', 'glasses', 'headset', 'earring'];
export const GLOWS: CharacterAvatarConfig['glow'][] = ['violet', 'cyan', 'magenta'];

export const CHARACTER_PRESETS: Record<'analyst' | 'strategist' | 'support', CharacterAvatarConfig> = {
  analyst: { faceShape: 'oval', skinTone: '#E0AC69', hairStyle: 'short', hairColor: '#2B1B14', outfit: 'shirt', outfitColor: '#0EA5E9', accessory: 'glasses', glow: 'cyan' },
  strategist: { faceShape: 'heart', skinTone: '#C68863', hairStyle: 'long', hairColor: '#1A1A1A', outfit: 'blazer', outfitColor: '#7C3AED', accessory: 'earring', glow: 'violet' },
  support: { faceShape: 'round', skinTone: '#F1C27D', hairStyle: 'bun', hairColor: '#6B4226', outfit: 'hoodie', outfitColor: '#DB2777', accessory: 'headset', glow: 'magenta' },
};

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)] as T;

export function randomCharacter(): CharacterAvatarConfig {
  return {
    faceShape: pick(FACE_SHAPES),
    skinTone: pick(SKIN_TONES),
    hairStyle: pick(HAIR_STYLES),
    hairColor: pick(HAIR_COLORS),
    outfit: pick(OUTFITS),
    outfitColor: pick(OUTFIT_COLORS),
    accessory: pick(ACCESSORIES),
    glow: pick(GLOWS),
  };
}
