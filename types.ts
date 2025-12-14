export enum Language {
  ENGLISH = 'English',
  VIETNAMESE = 'Vietnamese'
}

export interface SubtitleSegment {
  id: number;
  original: string;
  translated: string;
  startTime: number;
  endTime: number;
}

export interface VoiceOption {
  name: string;
  id: string;
  gender: 'Male' | 'Female';
}

export const VOICES: VoiceOption[] = [
  { name: 'Puck', id: 'Puck', gender: 'Male' },
  { name: 'Charon', id: 'Charon', gender: 'Male' },
  { name: 'Kore', id: 'Kore', gender: 'Female' },
  { name: 'Fenrir', id: 'Fenrir', gender: 'Male' },
  { name: 'Zephyr', id: 'Zephyr', gender: 'Female' },
];

export interface GenerationResult {
  audioBase64: string;
  segments: SubtitleSegment[];
}