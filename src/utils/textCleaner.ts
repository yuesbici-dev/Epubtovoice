import { FilterRules, IpaRule } from '../types';

/**
 * Applies IPA pronunciation replacements, symbol exclusions, and sentence filter rules.
 */
export function cleanChapterText(
  rawText: string,
  ipaRules: IpaRule[],
  filterRules: FilterRules
): { cleanedText: string; sentences: string[] } {
  if (!rawText) return { cleanedText: '', sentences: [] };

  let text = rawText;

  // 1. Remove Markdown symbols if enabled
  if (filterRules.removeMarkdown) {
    text = text.replace(/[*_#~`>]/g, ' ');
  }

  // 2. Remove citations if enabled (e.g. [1], [23], [citation needed])
  if (filterRules.removeCitations) {
    text = text.replace(/\[\d+\]/g, ' ');
    text = text.replace(/\[(?:citation|note|source)[^\]]*\]/gi, ' ');
  }

  // 3. Remove custom ignored symbols
  if (filterRules.ignoredSymbols && filterRules.ignoredSymbols.length > 0) {
    const symbolsPattern = filterRules.ignoredSymbols
      .map((s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
      .join('|');
    if (symbolsPattern) {
      text = text.replace(new RegExp(symbolsPattern, 'g'), ' ');
    }
  }

  // 4. Clean up stray whitespace
  text = text.replace(/[ \t]+/g, ' ');

  // 5. Break into paragraphs/lines to apply custom omit patterns and footnote rules
  const lines = text.split(/\r?\n+/);
  const retainedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check custom omit patterns
    let shouldOmit = false;
    for (const pattern of filterRules.customOmitPatterns) {
      if (!pattern.trim()) continue;
      try {
        const regex = new RegExp(pattern.trim(), 'i');
        if (regex.test(trimmed)) {
          shouldOmit = true;
          break;
        }
      } catch {
        if (trimmed.toLowerCase().includes(pattern.trim().toLowerCase())) {
          shouldOmit = true;
          break;
        }
      }
    }

    if (filterRules.removeFootnotes) {
      if (/^(?:footnote|note|ref\.?|\d+\.)/i.test(trimmed)) {
        shouldOmit = true;
      }
    }

    if (!shouldOmit) {
      retainedLines.push(trimmed);
    }
  }

  text = retainedLines.join('\n');

  // 6. Apply IPA / Phonetic pronunciations
  // If a word has a phonetic substitution, replace it whole-word
  for (const rule of ipaRules) {
    if (!rule.word.trim()) continue;
    const replacement = rule.phonetic.trim() || rule.ipa.trim();
    if (!replacement) continue;

    const escaped = rule.word.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    text = text.replace(regex, replacement);
  }

  // 7. Split into natural sentence chunks
  // Handles punctuation like '.', '!', '?', ';'
  const rawSentences = text
    .split(/(?<=[.?!])\s+(?=[A-Z0-9"“'‘])/g)
    .flatMap((s) => s.split(/\n+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    cleanedText: text,
    sentences: rawSentences,
  };
}

/**
 * Estimates duration in seconds based on word count and speaking speed.
 * Baseline: 150 words per minute at 1.0x speed.
 */
export function estimateDuration(wordCount: number, speed: number = 1.0): number {
  if (wordCount <= 0) return 0;
  const safeSpeed = Math.max(0.5, Math.min(2.5, speed));
  const wpm = 150 * safeSpeed;
  return Math.ceil((wordCount / wpm) * 60);
}

/**
 * Estimates MP3 file size in bytes based on duration and bitrate.
 * Baseline: 128 kbps (16,000 bytes per second) + 4KB ID3 tag buffer.
 */
export function estimateFileSize(durationSec: number, kbps: number = 128): number {
  if (durationSec <= 0) return 0;
  const bytesPerSec = (kbps * 1000) / 8;
  return Math.ceil(durationSec * bytesPerSec + 4096);
}

/**
 * Formats duration seconds into readable string (e.g. "14m 20s" or "1h 12m")
 */
export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Formats byte size into human readable string (e.g. "12.4 MB")
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sanitizes chapter title to create safe filename
 * e.g. "Chapter 1: The Beginning?" -> "01_The_Beginning.mp3"
 */
export function createChapterFileName(index: number, title: string): string {
  const paddedIndex = String(index).padStart(2, '0');
  const safeTitle = title
    .replace(/^chapter\s*\d+\s*[:.-]?\s*/i, '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40);

  const name = safeTitle ? `${paddedIndex}_${safeTitle}` : `${paddedIndex}_Chapter`;
  return `${name}.mp3`;
}
