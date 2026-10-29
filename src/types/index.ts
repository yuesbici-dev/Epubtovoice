export type VoiceGender = 'female' | 'male';
export type VoiceTone = 'warm' | 'harsh' | 'strong' | 'melodic';
export type ChapterEndIndicator = 'none' | 'chime' | 'bell' | 'speech';
export type ChapterStatus = 'idle' | 'queued' | 'synthesizing' | 'completed' | 'error';

export interface Chapter {
  id: string;
  index: number;
  title: string;
  cleanText: string;
  wordCount: number;
  estimatedDurationSec: number;
  estimatedFileSizeBytes: number;
  status: ChapterStatus;
  progress: number; // 0 to 100
  currentSentenceIndex?: number;
  totalSentences?: number;
  errorMsg?: string;
  audioBlobUrl?: string;
  audioDurationSec?: number;
  audioSizeBytes?: number;
  fileName?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  chapters: Chapter[];
  totalWords: number;
  calculatedDurationSec: number;
  calculatedFileSizeBytes: number;
}

export interface VoiceConfig {
  lang: string;
  gender: VoiceGender;
  tone: VoiceTone;
  accent: string;
  speed: number; // 0.5 to 2.5
  pitch: number; // 0.7 to 1.3
}

export interface IpaRule {
  id: string;
  word: string;
  ipa: string;
  phonetic: string;
}

export interface FilterRules {
  ignoredSymbols: string[];
  removeCitations: boolean; // e.g. [1], [2]
  removeFootnotes: boolean;
  removeMarkdown: boolean; // e.g. *, #, _, ~
  customOmitPatterns: string[]; // Lines matching pattern to skip
}

export interface ResourceConfig {
  level: number; // 1 to 5
  label: string;
  dutyCycleMs: number; // cooling pause between synthesis sentences
  memoryWindowMb: number; // chunk buffer memory ceiling
  description: string;
}

export interface AutomationConfig {
  onlyWhenCharging: boolean;
  overnightEnabled: boolean;
  startHour: number; // 0 - 23 (e.g. 23)
  endHour: number; // 0 - 23 (e.g. 7)
}

export interface HistoryItem {
  id: string;
  bookId: string;
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterIndex: number;
  audioBlob: Blob;
  audioBlobUrl: string;
  durationSec: number;
  fileSizeBytes: number;
  timestamp: number;
  fileName: string;
}

export interface BatteryInfo {
  supported: boolean;
  charging: boolean;
  level: number; // 0.0 to 1.0
  chargingTime: number;
  dischargingTime: number;
}
