import { Mp3Encoder } from '@breezystack/lamejs';
import { ChapterEndIndicator } from '../types';

/**
 * Creates a standard WAV Blob from an AudioBuffer as a zero-dependency fallback.
 */
function encodeAudioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const rawPcm = audioBuffer.getChannelData(0);
  const sampleCount = rawPcm.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = sampleCount * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true); // file length - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // format chunk length
  view.setUint16(20, 1, true); // sample format: PCM
  view.setUint16(22, numChannels, true); // channel count
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, byteRate, true); // byte rate
  view.setUint16(32, blockAlign, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true); // data chunk length

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < sampleCount; i++) {
    const s = Math.max(-1, Math.min(1, rawPcm[i]));
    const sampleInt16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, sampleInt16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Encodes an AudioBuffer into an MP3 Blob entirely client-side using @breezystack/lamejs.
 * Falls back to lossless WAV if any browser environment issue occurs.
 */
export function encodeAudioBufferToMp3(
  audioBuffer: AudioBuffer,
  kbps: number = 128
): Blob {
  try {
    const channels = 1; // Mono for speech
    const sampleRate = audioBuffer.sampleRate;
    const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data: Uint8Array[] = [];

    const rawPcm = audioBuffer.getChannelData(0);
    const sampleCount = rawPcm.length;
    const pcm16 = new Int16Array(sampleCount);

    // Convert Float32 to Int16
    for (let i = 0; i < sampleCount; i++) {
      const s = Math.max(-1, Math.min(1, rawPcm[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Encode in 1152 sample chunks (standard MP3 frame size)
    const chunkSize = 1152;
    for (let i = 0; i < sampleCount; i += chunkSize) {
      const chunk = pcm16.subarray(i, Math.min(i + chunkSize, sampleCount));
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf && mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }

    // Final flush
    const mp3buf = mp3encoder.flush();
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    if (mp3Data.length > 0) {
      return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
    }

    // Fallback if encoder returned empty
    return encodeAudioBufferToWav(audioBuffer);
  } catch (err) {
    console.warn('MP3 encoding encountered error, falling back to WAV format:', err);
    return encodeAudioBufferToWav(audioBuffer);
  }
}

/**
 * Generates an acoustic chapter-end chime or bell using OfflineAudioContext.
 */
export async function createEndIndicatorAudioBuffer(
  type: ChapterEndIndicator,
  sampleRate: number = 44100
): Promise<AudioBuffer | null> {
  if (type === 'none' || type === 'speech') {
    return null;
  }

  const durationSec = type === 'bell' ? 2.5 : 1.6;
  const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * durationSec), sampleRate);

  if (type === 'chime') {
    // 2-note ascending harmonic chime (E5 -> G#5 -> B5)
    const notes = [
      { freq: 659.25, time: 0.0, dur: 0.8 },
      { freq: 830.61, time: 0.25, dur: 0.8 },
      { freq: 987.77, time: 0.5, dur: 1.0 },
    ];

    for (const note of notes) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, note.time);

      gain.gain.setValueAtTime(0, note.time);
      gain.gain.linearRampToValueAtTime(0.3, note.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.time + note.dur);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(note.time);
      osc.stop(note.time + note.dur);
    }
  } else if (type === 'bell') {
    // Tibetan / Zen singing bell with harmonic resonance
    const freqs = [440, 880, 1320, 1760];
    const amps = [0.4, 0.2, 0.1, 0.05];

    freqs.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, 0);

      gain.gain.setValueAtTime(0, 0);
      gain.gain.linearRampToValueAtTime(amps[idx], 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, durationSec);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(0);
      osc.stop(durationSec);
    });
  }

  return await offlineCtx.startRendering();
}

/**
 * Concatenates two AudioBuffers together seamlessly.
 */
export function concatAudioBuffers(
  buffer1: AudioBuffer,
  buffer2: AudioBuffer
): AudioBuffer {
  const sampleRate = buffer1.sampleRate;
  const totalLength = buffer1.length + buffer2.length;
  const audioCtx = new AudioContext({ sampleRate });
  const outputBuffer = audioCtx.createBuffer(1, totalLength, sampleRate);

  const outputData = outputBuffer.getChannelData(0);
  outputData.set(buffer1.getChannelData(0), 0);
  outputData.set(buffer2.getChannelData(0), buffer1.length);

  return outputBuffer;
}
