export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'alert';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const SIZE_PX: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 44, lg: 72, xl: 128, '2xl': 240 };
