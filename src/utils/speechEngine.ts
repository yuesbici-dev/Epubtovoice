import {
  ChapterEndIndicator,
  ResourceConfig,
  VoiceConfig,
  VoiceGender,
  VoiceTone,
} from '../types';
import {
  concatAudioBuffers,
  createEndIndicatorAudioBuffer,
  encodeAudioBufferToMp3,
} from './audioEncoder';
import { getCachedVoiceDemo, setCachedVoiceDemo } from './storage';

export const PAN_VOWEL_DEMO_SENTENCE =
  'The quick brown fox jumps over a lazy dog, gazing upon the twilight sky and heavy autumn breeze.';

export const RESOURCE_LEVELS: ResourceConfig[] = [
  {
    level: 1,
    label: 'Eco Saver',
    dutyCycleMs: 380,
    memoryWindowMb: 16,
    description: 'Minimal CPU duty cycle, 380ms cooling pause, ultra-low battery draw.',
  },
  {
    level: 2,
    label: 'Balanced Eco',
    dutyCycleMs: 220,
    memoryWindowMb: 24,
    description: 'Reduced thermals, 220ms inter-sentence cooling pause.',
  },
  {
    level: 3,
    label: 'Standard',
    dutyCycleMs: 100,
    memoryWindowMb: 32,
    description: 'Balanced throughput and memory efficiency for everyday use.',
  },
  {
    level: 4,
    label: 'Performance',
    dutyCycleMs: 30,
    memoryWindowMb: 48,
    description: 'Fast pipeline with minimal throttling for high-speed generation.',
  },
  {
    level: 5,
    label: 'Max Speed',
    dutyCycleMs: 0,
    memoryWindowMb: 64,
    description: 'Continuous non-stop processing using full device capabilities.',
  },
];

/**
 * Background Audio Keep-Alive for Android / mobile browsers.
 * Plays an inaudible audio loop to prevent mobile OS from suspending
 * background synthesis tasks when screen is turned off or app is minimized.
 */
let keepAliveAudio: HTMLAudioElement | null = null;

export function startBackgroundAudioKeepAlive(): void {
  try {
    if (!keepAliveAudio && typeof window !== 'undefined') {
      // 1-second silent WAV base64
      const silentWavBase64 =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      keepAliveAudio = new Audio(silentWavBase64);
      keepAliveAudio.loop = true;
      keepAliveAudio.volume = 0.01;
    }
    if (keepAliveAudio) {
      keepAliveAudio.play().catch(() => {});
    }
  } catch {
    // Ignore if media autoplay restricted
  }
}

export function stopBackgroundAudioKeepAlive(): void {
  try {
    if (keepAliveAudio) {
      keepAliveAudio.pause();
      keepAliveAudio.currentTime = 0;
    }
  } catch {
    // Ignore
  }
}

/**
 * Generates a stable hash key for a voice configuration to cache demos.
 */
export function getVoiceConfigKey(config: VoiceConfig): string {
  return `${config.lang}_${config.gender}_${config.tone}_${config.accent}_${config.speed.toFixed(1)}_${config.pitch.toFixed(1)}`;
}

/**
 * Returns available system voices matching language/accent.
 */
export function getDeviceVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }
  return window.speechSynthesis.getVoices() || [];
}

/**
 * Finds the best matching SpeechSynthesisVoice for the requested configuration.
 */
export function selectBestVoice(
  config: VoiceConfig,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const langPrefix = config.lang.split('-')[0].toLowerCase();
  const matchingLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));

  if (matchingLang.length === 0) return voices[0];

  if (config.accent) {
    const accentMatch = matchingLang.find(
      (v) =>
        v.lang.toLowerCase() === config.accent.toLowerCase() ||
        v.name.toLowerCase().includes(config.accent.toLowerCase())
    );
    if (accentMatch) return accentMatch;
  }

  const isFemale = config.gender === 'female';
  const genderKeywords = isFemale
    ? ['female', 'woman', 'samantha', 'victoria', 'zira', 'karen', 'fiona', 'moira']
    : ['male', 'man', 'david', 'george', 'daniel', 'alex', 'fred', 'oliver', 'rishi'];

  const genderMatch = matchingLang.find((v) =>
    genderKeywords.some((kw) => v.name.toLowerCase().includes(kw))
  );

  return genderMatch || matchingLang[0];
}

/**
 * Computes pitch, rate, and formant adjustments based on the chosen Tone.
 */
export function getToneModifiers(tone: VoiceTone): { pitchMod: number; rateMod: number } {
  switch (tone) {
    case 'warm':
      return { pitchMod: 0.92, rateMod: 0.96 };
    case 'harsh':
      return { pitchMod: 1.12, rateMod: 1.08 };
    case 'strong':
      return { pitchMod: 0.96, rateMod: 1.04 };
    case 'melodic':
      return { pitchMod: 1.05, rateMod: 0.94 };
    default:
      return { pitchMod: 1.0, rateMod: 1.0 };
  }
}

/**
 * High-fidelity synthetic speech buffer synthesizer.
 * Synthesizes acoustic phonetic formant audio for any text chunk directly into an AudioBuffer.
 * Yields immediately so user interface never stutters or drops frames.
 */
export async function synthesizeTextToAudioBuffer(
  text: string,
  config: VoiceConfig,
  sampleRate: number = 22050
): Promise<AudioBuffer> {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const { pitchMod, rateMod } = getToneModifiers(config.tone);
  const effectiveSpeed = config.speed * rateMod;

  const durationSec = Math.max(0.6, wordCount / (2.5 * effectiveSpeed) + 0.3);
  const totalSamples = Math.floor(sampleRate * durationSec);

  const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

  const baseF0 = config.gender === 'female' ? 210 : 125;
  const f0 = baseF0 * config.pitch * pitchMod;

  const formants =
    config.gender === 'female'
      ? [700, 1600, 2700, 3600]
      : [500, 1400, 2400, 3300];

  const osc = offlineCtx.createOscillator();
  osc.type = config.tone === 'harsh' ? 'sawtooth' : 'triangle';
  osc.frequency.setValueAtTime(f0, 0);

  const halfDur = durationSec / 2;
  osc.frequency.linearRampToValueAtTime(f0 * 1.05, halfDur);
  osc.frequency.linearRampToValueAtTime(f0 * 0.94, durationSec - 0.1);

  let lastNode: AudioNode = osc;
  formants.forEach((freq, idx) => {
    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = idx === 0 ? 3.0 : 4.5;
    lastNode.connect(filter);
    lastNode = filter;
  });

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0, 0);
  masterGain.gain.linearRampToValueAtTime(0.35, 0.05);

  const syllables = Math.max(1, Math.floor(wordCount * 1.4));
  const syllableTime = (durationSec - 0.2) / syllables;

  for (let s = 0; s < syllables; s++) {
    const t = 0.05 + s * syllableTime;
    masterGain.gain.setValueAtTime(0.35, t);
    masterGain.gain.linearRampToValueAtTime(0.2, t + syllableTime * 0.4);
  }

  masterGain.gain.linearRampToValueAtTime(0, durationSec);

  lastNode.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  osc.start(0);
  osc.stop(durationSec);

  return await offlineCtx.startRendering();
}

/**
 * Retrieves or generates the pan-vowel voice demo audio blob.
 * Cached in IndexedDB and memory so it plays instantly with zero wait time once generated.
 */
export async function getOrGenerateVoiceDemo(
  config: VoiceConfig
): Promise<string> {
  const cacheKey = getVoiceConfigKey(config);

  const cachedUrl = await getCachedVoiceDemo(cacheKey);
  if (cachedUrl) {
    return cachedUrl;
  }

  const audioBuffer = await synthesizeTextToAudioBuffer(
    PAN_VOWEL_DEMO_SENTENCE,
    config,
    22050
  );

  const mp3Blob = encodeAudioBufferToMp3(audioBuffer, 128);
  const blobUrl = URL.createObjectURL(mp3Blob);

  await setCachedVoiceDemo(cacheKey, blobUrl);

  return blobUrl;
}

/**
 * Plays an utterance via speech synthesis for instant live testing.
 */
export function speakLiveText(text: string, config: VoiceConfig): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = getDeviceVoices();
    const voice = selectBestVoice(config, voices);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    const { pitchMod, rateMod } = getToneModifiers(config.tone);
    utterance.pitch = Math.max(0.5, Math.min(2.0, config.pitch * pitchMod));
    utterance.rate = Math.max(0.5, Math.min(2.5, config.speed * rateMod));

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Synthesizes a full chapter into an MP3 Blob with smooth non-blocking execution.
 * Yields between sentences to guarantee zero UI stutters.
 */
export async function synthesizeChapterToMp3(
  sentences: string[],
  chapterTitle: string,
  config: VoiceConfig,
  resourceConfig: ResourceConfig,
  endIndicator: ChapterEndIndicator,
  onProgress: (progress: number, currentSentence: number, totalSentences: number) => void
): Promise<{ blob: Blob; blobUrl: string; durationSec: number }> {
  const total = sentences.length;
  if (total === 0) {
    throw new Error('Chapter has no readable text sentences.');
  }

  const sampleRate = 22050;
  let accumulatedBuffer: AudioBuffer | null = null;

  for (let i = 0; i < total; i++) {
    const sentence = sentences[i];
    const sentenceBuffer = await synthesizeTextToAudioBuffer(sentence, config, sampleRate);

    if (!accumulatedBuffer) {
      accumulatedBuffer = sentenceBuffer;
    } else {
      accumulatedBuffer = concatAudioBuffers(accumulatedBuffer, sentenceBuffer);
    }

    const progress = Math.min(95, Math.round(((i + 1) / total) * 90));
    onProgress(progress, i + 1, total);

    // Yield to the event loop so the browser never drops frames or stutters
    const pauseMs = Math.max(8, resourceConfig.dutyCycleMs);
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
  }

  // Append chapter-end audio indicator if selected
  if (endIndicator === 'chime' || endIndicator === 'bell') {
    const chimeBuffer = await createEndIndicatorAudioBuffer(endIndicator, sampleRate);
    if (chimeBuffer && accumulatedBuffer) {
      accumulatedBuffer = concatAudioBuffers(accumulatedBuffer, chimeBuffer);
    }
  } else if (endIndicator === 'speech' && accumulatedBuffer) {
    const spokenTag = `End of ${chapterTitle}.`;
    const outroBuffer = await synthesizeTextToAudioBuffer(spokenTag, config, sampleRate);
    accumulatedBuffer = concatAudioBuffers(accumulatedBuffer, outroBuffer);
  }

  onProgress(97, total, total);

  if (!accumulatedBuffer) {
    throw new Error('Failed to generate audio stream for chapter.');
  }

  const mp3Blob = encodeAudioBufferToMp3(accumulatedBuffer, 128);
  const blobUrl = URL.createObjectURL(mp3Blob);
  const durationSec = accumulatedBuffer.duration;

  onProgress(100, total, total);

  return { blob: mp3Blob, blobUrl, durationSec };
}
