import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Play,
  Square,
  Plus,
  Trash2,
  Check,
  Sliders,
  Filter,
  Type,
} from 'lucide-react';
import { FilterRules, IpaRule, VoiceConfig, VoiceGender, VoiceTone } from '../types';
import {
  PAN_VOWEL_DEMO_SENTENCE,
  getOrGenerateVoiceDemo,
  getVoiceConfigKey,
  speakLiveText,
} from '../utils/speechEngine';

interface VoiceStudioProps {
  voiceConfig: VoiceConfig;
  onUpdateVoiceConfig: (config: VoiceConfig) => void;
  ipaRules: IpaRule[];
  onAddIpaRule: (rule: Omit<IpaRule, 'id'>) => void;
  onDeleteIpaRule: (id: string) => void;
  filterRules: FilterRules;
  onUpdateFilterRules: (rules: FilterRules) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ja', name: 'Japanese (日本語)' },
];

const ACCENTS: Record<string, Array<{ code: string; label: string }>> = {
  en: [
    { code: 'en-US', label: 'American' },
    { code: 'en-GB', label: 'British' },
    { code: 'en-AU', label: 'Australian' },
    { code: 'en-IE', label: 'Irish' },
    { code: 'en-IN', label: 'Indian' },
    { code: 'en-CA', label: 'Canadian' },
  ],
  es: [
    { code: 'es-ES', label: 'Castilian (Spain)' },
    { code: 'es-MX', label: 'Mexican' },
  ],
  fr: [
    { code: 'fr-FR', label: 'Standard (France)' },
    { code: 'fr-CA', label: 'Canadian' },
  ],
  de: [{ code: 'de-DE', label: 'Standard (Germany)' }],
  it: [{ code: 'it-IT', label: 'Standard (Italy)' }],
  pt: [
    { code: 'pt-BR', label: 'Brazilian' },
    { code: 'pt-PT', label: 'European' },
  ],
  ja: [{ code: 'ja-JP', label: 'Standard (Japan)' }],
};

const TONES: Array<{ key: VoiceTone; label: string; desc: string }> = [
  { key: 'warm', label: 'Warm', desc: 'Lower resonance, gentle pacing' },
  { key: 'harsh', label: 'Harsh', desc: 'Crisp upper harmonics, sharp attack' },
  { key: 'strong', label: 'Strong', desc: 'Resonant, authoritative presence' },
  { key: 'melodic', label: 'Melodic', desc: 'Expressive pitch contour & cadence' },
];

export const VoiceStudio: React.FC<VoiceStudioProps> = ({
  voiceConfig,
  onUpdateVoiceConfig,
  ipaRules,
  onAddIpaRule,
  onDeleteIpaRule,
  filterRules,
  onUpdateFilterRules,
}) => {
  const [demoAudioUrl, setDemoAudioUrl] = useState<string | null>(null);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const demoAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const [newWord, setNewWord] = useState('');
  const [newIpa, setNewIpa] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');

  const [newOmitPattern, setNewOmitPattern] = useState('');
  const [ignoredSymbolsInput, setIgnoredSymbolsInput] = useState(
    filterRules.ignoredSymbols.join(' ')
  );

  useEffect(() => {
    let isCancelled = false;

    if (demoAudioRef.current) {
      demoAudioRef.current.pause();
      setIsPlayingDemo(false);
    }

    getOrGenerateVoiceDemo(voiceConfig)
      .then((url) => {
        if (!isCancelled) {
          setDemoAudioUrl(url);
          setIsCached(true);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [voiceConfig]);

  const handlePlayDemo = async () => {
    if (isPlayingDemo && demoAudioRef.current) {
      demoAudioRef.current.pause();
      demoAudioRef.current.currentTime = 0;
      setIsPlayingDemo(false);
      return;
    }

    try {
      setIsDemoLoading(true);
      let url = demoAudioUrl;
      if (!url) {
        url = await getOrGenerateVoiceDemo(voiceConfig);
        setDemoAudioUrl(url);
        setIsCached(true);
      }

      if (!demoAudioRef.current) {
        demoAudioRef.current = new Audio(url);
        demoAudioRef.current.onended = () => setIsPlayingDemo(false);
      } else {
        demoAudioRef.current.src = url;
      }

      await demoAudioRef.current.play();
      setIsPlayingDemo(true);
    } catch (err) {
      console.error('Demo playback error', err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleAddIpa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;

    onAddIpaRule({
      word: newWord.trim(),
      ipa: newIpa.trim(),
      phonetic: newPhonetic.trim() || newIpa.trim(),
    });

    setNewWord('');
    setNewIpa('');
    setNewPhonetic('');
  };

  const handleTestWordPronunciation = (word: string, phonetic: string) => {
    const textToSpeak = phonetic || word;
    speakLiveText(textToSpeak, voiceConfig);
  };

  const handleSymbolsBlur = () => {
    const symbols = ignoredSymbolsInput
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onUpdateFilterRules({
      ...filterRules,
      ignoredSymbols: symbols,
    });
  };

  const handleAddOmitPattern = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOmitPattern.trim()) return;
    onUpdateFilterRules({
      ...filterRules,
      customOmitPatterns: [...filterRules.customOmitPatterns, newOmitPattern.trim()],
    });
    setNewOmitPattern('');
  };

  const handleRemoveOmitPattern = (pattern: string) => {
    onUpdateFilterRules({
      ...filterRules,
      customOmitPatterns: filterRules.customOmitPatterns.filter((p) => p !== pattern),
    });
  };

  const currentAccents = ACCENTS[voiceConfig.lang] || ACCENTS['en'];

  return (
    <div className="space-y-6">
      {/* SECTION 1: VOICE CONFIGURATION */}
      <div className="bg-white rounded-2xl p-4 border border-[#E7E0D3] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E7E0D3]">
          <Sliders className="w-4 h-4 text-[#78350F]" />
          <h2 className="text-sm font-bold text-[#1C1917] uppercase tracking-wider">
            Voice Synthesis Profile
          </h2>
        </div>

        {/* Language Selection */}
        <div>
          <label className="block text-xs font-bold text-[#44403C] mb-1.5">
            Language
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  const defaultAccent = ACCENTS[lang.code]?.[0]?.code || 'en-US';
                  onUpdateVoiceConfig({
                    ...voiceConfig,
                    lang: lang.code,
                    accent: defaultAccent,
                  });
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold text-left border transition-none cursor-pointer ${
                  voiceConfig.lang === lang.code
                    ? 'bg-[#78350F] border-[#692E0B] text-white shadow-sm'
                    : 'bg-[#FAF7F2] border-[#E7E0D3] text-[#44403C] hover:bg-[#F5F2EB]'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Gender */}
        <div>
          <label className="block text-xs font-bold text-[#44403C] mb-1.5">
            Voice Gender
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['female', 'male'] as VoiceGender[]).map((gender) => (
              <button
                key={gender}
                onClick={() => onUpdateVoiceConfig({ ...voiceConfig, gender })}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold capitalize border transition-none cursor-pointer ${
                  voiceConfig.gender === gender
                    ? 'bg-[#78350F] border-[#692E0B] text-white shadow-sm'
                    : 'bg-[#FAF7F2] border-[#E7E0D3] text-[#44403C] hover:bg-[#F5F2EB]'
                }`}
              >
                {gender === 'female' ? 'Female Voice' : 'Male Voice'}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Tone */}
        <div>
          <label className="block text-xs font-bold text-[#44403C] mb-1.5">
            Voice Tone
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TONES.map((tone) => (
              <button
                key={tone.key}
                onClick={() => onUpdateVoiceConfig({ ...voiceConfig, tone: tone.key })}
                className={`p-3 rounded-xl text-left border transition-none cursor-pointer ${
                  voiceConfig.tone === tone.key
                    ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#78350F] shadow-sm'
                    : 'bg-[#FAF7F2] border-[#E7E0D3] text-[#44403C] hover:bg-[#F5F2EB]'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>{tone.label}</span>
                  {voiceConfig.tone === tone.key && <Check className="w-3.5 h-3.5 text-[#B45309]" />}
                </div>
                <div className="text-[10px] text-[#78716C] mt-0.5 line-clamp-1">{tone.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Speaking Accent */}
        <div>
          <label className="block text-xs font-bold text-[#44403C] mb-1.5">
            Speaking Accent
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {currentAccents.map((acc) => (
              <button
                key={acc.code}
                onClick={() => onUpdateVoiceConfig({ ...voiceConfig, accent: acc.code })}
                className={`py-2 px-3 rounded-xl text-xs font-medium border text-left transition-none cursor-pointer ${
                  voiceConfig.accent === acc.code
                    ? 'bg-[#78350F] border-[#692E0B] text-white font-bold shadow-sm'
                    : 'bg-[#FAF7F2] border-[#E7E0D3] text-[#44403C] hover:bg-[#F5F2EB]'
                }`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Speaking Speed Slider */}
        <div className="pt-2 border-t border-[#E7E0D3]">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-[#44403C]">
              Speaking Speed
            </label>
            <span className="text-xs font-mono font-bold text-[#78350F]">
              {voiceConfig.speed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={voiceConfig.speed}
            onChange={(e) =>
              onUpdateVoiceConfig({ ...voiceConfig, speed: parseFloat(e.target.value) })
            }
            className="w-full accent-[#78350F] h-2 bg-[#F5F2EB] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#78716C] mt-1">
            <span>0.5x (Deliberate)</span>
            <span>1.0x (Standard)</span>
            <span>2.5x (Fast)</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: PAN-VOWEL CACHED VOICE DEMO */}
      <div className="bg-white rounded-2xl p-4 border border-[#E7E0D3] space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D3]">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#047857]" />
            <h3 className="text-sm font-bold text-[#1C1917] uppercase tracking-wider">
              Pan-Vowel Voice Demo
            </h3>
          </div>
          {isCached && (
            <span className="text-[10px] font-mono text-[#047857] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0] font-semibold">
              Cached (Zero Wait Time)
            </span>
          )}
        </div>

        <p className="text-xs text-[#78716C]">
          Phonetically balanced pangram covering every vowel and diphthong:
        </p>

        <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E7E0D3] text-xs italic text-[#292524] leading-relaxed font-serif">
          "{PAN_VOWEL_DEMO_SENTENCE}"
        </div>

        <button
          onClick={handlePlayDemo}
          disabled={isDemoLoading}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-none cursor-pointer ${
            isPlayingDemo
              ? 'bg-[#047857] hover:bg-[#065F46] text-white shadow-sm'
              : 'bg-[#78350F] hover:bg-[#692E0B] text-white shadow-sm'
          }`}
        >
          {isPlayingDemo ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Voice Demo</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>{isDemoLoading ? 'Preparing Demo...' : 'Listen to Voice Demo'}</span>
            </>
          )}
        </button>
      </div>

      {/* SECTION 3: IPA & PHONETIC PRONUNCIATION DICTIONARY */}
      <div className="bg-white rounded-2xl p-4 border border-[#E7E0D3] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between pb-2 border-b border-[#E7E0D3]">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#B45309]" />
            <h3 className="text-sm font-bold text-[#1C1917] uppercase tracking-wider">
              IPA & Phonetic Dictionary
            </h3>
          </div>
          <span className="text-xs text-[#78716C] font-mono font-semibold">
            {ipaRules.length} Custom Rules
          </span>
        </div>

        <p className="text-xs text-[#78716C]">
          Define custom pronunciations for unusual names or terms using IPA or phonetic spelling:
        </p>

        {/* Add Rule Form */}
        <form onSubmit={handleAddIpa} className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E0D3] space-y-2">
          <div className="text-xs font-bold text-[#44403C]">Add New Pronunciation Rule</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <input
                type="text"
                placeholder="Word (e.g. Hermione)"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E7E0D3] rounded-lg text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#78350F]"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="IPA (e.g. /hɜːrˈmaɪəni/)"
                value={newIpa}
                onChange={(e) => setNewIpa(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E7E0D3] rounded-lg text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#78350F] font-mono"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Respelling (her-MY-oh-nee)"
                value={newPhonetic}
                onChange={(e) => setNewPhonetic(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E7E0D3] rounded-lg text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#78350F]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleTestWordPronunciation(newWord, newPhonetic || newIpa)}
              disabled={!newWord.trim()}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-none ${
                !newWord.trim()
                  ? 'text-[#A8A29E] bg-[#F5F2EB] cursor-not-allowed'
                  : 'text-[#78350F] bg-white hover:bg-[#FAF7F2] cursor-pointer border border-[#E7E0D3]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              Test Pronunciation
            </button>
            <button
              type="submit"
              disabled={!newWord.trim()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-none ${
                !newWord.trim()
                  ? 'text-[#A8A29E] bg-[#F5F2EB] cursor-not-allowed'
                  : 'text-white bg-[#78350F] hover:bg-[#692E0B] cursor-pointer'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </button>
          </div>
        </form>

        {/* Existing Rules */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {ipaRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-xl border border-[#E7E0D3] text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#1C1917]">{rule.word}</span>
                <span className="text-[#A8A29E]">→</span>
                <span className="font-mono text-[#B45309] font-semibold">{rule.ipa || rule.phonetic}</span>
                {rule.phonetic && rule.ipa && (
                  <span className="text-[#78716C]">({rule.phonetic})</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleTestWordPronunciation(rule.word, rule.phonetic || rule.ipa)}
                  className="p-1.5 rounded-lg hover:bg-white text-[#78716C] hover:text-[#1C1917] transition-none cursor-pointer border border-transparent hover:border-[#E7E0D3]"
                  title="Test pronunciation"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteIpaRule(rule.id)}
                  className="p-1.5 rounded-lg hover:bg-[#FEF2F2] text-[#A8A29E] hover:text-[#DC2626] transition-none cursor-pointer border border-transparent hover:border-[#FECACA]"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: SYMBOL & SENTENCE EXCLUSIONS */}
      <div className="bg-white rounded-2xl p-4 border border-[#E7E0D3] space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E7E0D3]">
          <Filter className="w-4 h-4 text-[#78350F]" />
          <h3 className="text-sm font-bold text-[#1C1917] uppercase tracking-wider">
            Symbol & Sentence Exclusion Filters
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E0D3] text-xs text-[#292524] cursor-pointer">
            <input
              type="checkbox"
              checked={filterRules.removeMarkdown}
              onChange={(e) =>
                onUpdateFilterRules({ ...filterRules, removeMarkdown: e.target.checked })
              }
              className="accent-[#78350F] rounded w-4 h-4"
            />
            <span className="font-medium">Ignore Markdown (*, _, #)</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E0D3] text-xs text-[#292524] cursor-pointer">
            <input
              type="checkbox"
              checked={filterRules.removeCitations}
              onChange={(e) =>
                onUpdateFilterRules({ ...filterRules, removeCitations: e.target.checked })
              }
              className="accent-[#78350F] rounded w-4 h-4"
            />
            <span className="font-medium">Ignore Citations ([1], [2])</span>
          </label>

          <label className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E0D3] text-xs text-[#292524] cursor-pointer">
            <input
              type="checkbox"
              checked={filterRules.removeFootnotes}
              onChange={(e) =>
                onUpdateFilterRules({ ...filterRules, removeFootnotes: e.target.checked })
              }
              className="accent-[#78350F] rounded w-4 h-4"
            />
            <span className="font-medium">Ignore Footnotes</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#44403C] mb-1">
            Custom Ignored Symbols (space separated)
          </label>
          <input
            type="text"
            value={ignoredSymbolsInput}
            onChange={(e) => setIgnoredSymbolsInput(e.target.value)}
            onBlur={handleSymbolsBlur}
            placeholder="e.g. @ $ % ^ & ~ ="
            className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E7E0D3] rounded-xl text-[#1C1917] font-mono placeholder-[#A8A29E] focus:outline-none focus:border-[#78350F]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#44403C] mb-1">
            Omit Sentences Containing Patterns
          </label>
          <form onSubmit={handleAddOmitPattern} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="e.g. 'Translator Note:' or 'Table 1.'"
              value={newOmitPattern}
              onChange={(e) => setNewOmitPattern(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E7E0D3] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#78350F]"
            />
            <button
              type="submit"
              disabled={!newOmitPattern.trim()}
              className="px-3.5 py-2 rounded-xl bg-[#78350F] hover:bg-[#692E0B] text-white text-xs font-bold cursor-pointer transition-none disabled:opacity-50"
            >
              Add Pattern
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {filterRules.customOmitPatterns.map((pat) => (
              <span
                key={pat}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF7F2] border border-[#E7E0D3] text-xs text-[#44403C]"
              >
                <span>"{pat}"</span>
                <button
                  type="button"
                  onClick={() => handleRemoveOmitPattern(pat)}
                  className="hover:text-[#DC2626] font-bold cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
