/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sliders, History, AlertTriangle } from 'lucide-react';
import {
  AutomationConfig,
  BatteryInfo,
  Book,
  Chapter,
  ChapterEndIndicator,
  FilterRules,
  HistoryItem,
  IpaRule,
  ResourceConfig,
  VoiceConfig,
} from './types';
import { getSampleBook, parseEpubFile } from './utils/epubParser';
import { cleanChapterText, createChapterFileName } from './utils/textCleaner';
import {
  RESOURCE_LEVELS,
  startBackgroundAudioKeepAlive,
  stopBackgroundAudioKeepAlive,
  synthesizeChapterToMp3,
} from './utils/speechEngine';
import {
  clearAllHistory,
  deleteHistoryItem,
  getHistoryItems,
  saveHistoryItem,
} from './utils/storage';
import { getBatteryStatus, isOvernightWindow } from './utils/battery';
import { TopBar } from './components/TopBar';
import { ChapterMatrix } from './components/ChapterMatrix';
import { VoiceStudio } from './components/VoiceStudio';
import { HistorySection } from './components/HistorySection';
import { PowerSettingsModal } from './components/PowerSettingsModal';
import { AudioPlayerDrawer } from './components/AudioPlayerDrawer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chapters' | 'voice' | 'history'>('chapters');

  // Book & Chapters
  const [book, setBook] = useState<Book>(() => getSampleBook());
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(() => {
    const sample = getSampleBook();
    return new Set(sample.chapters.map((c) => c.id));
  });

  // Voice Configuration
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    lang: 'en',
    gender: 'female',
    tone: 'warm',
    accent: 'en-US',
    speed: 1.0,
    pitch: 1.0,
  });

  // IPA Pronunciation Rules
  const [ipaRules, setIpaRules] = useState<IpaRule[]>([
    {
      id: 'ipa-1',
      word: 'Eloi',
      ipa: '/ˈɛl.ɔɪ/',
      phonetic: 'EL-oy',
    },
    {
      id: 'ipa-2',
      word: 'Morlocks',
      ipa: '/ˈmɔːr.lɒks/',
      phonetic: 'MOR-lox',
    },
    {
      id: 'ipa-3',
      word: 'Sphinx',
      ipa: '/sfɪŋks/',
      phonetic: 'sfinks',
    },
  ]);

  // Exclusion Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRules>({
    ignoredSymbols: ['*', '_', '#', '~', '^', '`', '>'],
    removeCitations: true,
    removeFootnotes: true,
    removeMarkdown: true,
    customOmitPatterns: [],
  });

  // Resource Usage Config
  const [resourceConfig, setResourceConfig] = useState<ResourceConfig>(RESOURCE_LEVELS[2]);

  // Battery & Overnight Automation
  const [automation, setAutomation] = useState<AutomationConfig>({
    onlyWhenCharging: false,
    overnightEnabled: false,
    startHour: 23,
    endHour: 7,
  });

  const [battery, setBattery] = useState<BatteryInfo>({
    supported: false,
    charging: true,
    level: 0.95,
    chargingTime: 0,
    dischargingTime: 0,
  });

  const [chapterEndIndicator, setChapterEndIndicator] = useState<ChapterEndIndicator>('chime');

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const [generationAlert, setGenerationAlert] = useState<string | null>(null);

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const [activeAudioTrack, setActiveAudioTrack] = useState<{
    title: string;
    subtitle: string;
    url: string;
    fileName?: string;
  } | null>(null);

  const abortControllerRef = useRef<boolean>(false);
  const lastProgressUpdateRef = useRef<number>(0);

  useEffect(() => {
    getBatteryStatus().then((bat) => setBattery(bat));

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        const update = () => {
          setBattery({
            supported: true,
            charging: Boolean(bat.charging),
            level: bat.level || 1.0,
            chargingTime: bat.chargingTime || 0,
            dischargingTime: bat.dischargingTime || 0,
          });
        };
        bat.addEventListener('chargingchange', update);
        bat.addEventListener('levelchange', update);
      });
    }

    getHistoryItems().then((items) => setHistoryItems(items));
  }, []);

  const handleToggleChapter = (id: string) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedChapterIds(new Set(book.chapters.map((c) => c.id)));
  };

  const handleDeselectAll = () => {
    setSelectedChapterIds(new Set());
  };

  const handleInvertSelection = () => {
    setSelectedChapterIds((prev) => {
      const next = new Set<string>();
      book.chapters.forEach((c) => {
        if (!prev.has(c.id)) {
          next.add(c.id);
        }
      });
      return next;
    });
  };

  const handleUploadEpub = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsedBook = await parseEpubFile(arrayBuffer);
      setBook(parsedBook);
      setSelectedChapterIds(new Set(parsedBook.chapters.map((c) => c.id)));
      setGenerationAlert(null);
    } catch (err: any) {
      alert(`Could not parse EPUB: ${err.message || err}`);
    }
  };

  const handleLoadSample = () => {
    const sample = getSampleBook();
    setBook(sample);
    setSelectedChapterIds(new Set(sample.chapters.map((c) => c.id)));
    setGenerationAlert(null);
  };

  const handleAddIpaRule = (rule: Omit<IpaRule, 'id'>) => {
    const newRule: IpaRule = {
      ...rule,
      id: `ipa-${Date.now()}`,
    };
    setIpaRules((prev) => [newRule, ...prev]);
  };

  const handleDeleteIpaRule = (id: string) => {
    setIpaRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleStartGeneration = async () => {
    const targetChapters = book.chapters.filter((c) => selectedChapterIds.has(c.id));
    if (targetChapters.length === 0) return;

    if (automation.onlyWhenCharging && !battery.charging) {
      setGenerationAlert(
        'Automation Active: Waiting for charger connection to preserve phone battery.'
      );
      return;
    }

    if (automation.overnightEnabled) {
      const isNight = isOvernightWindow(automation.startHour, automation.endHour);
      if (!isNight) {
        setGenerationAlert(
          `Overnight Automation Active: Generation scheduled for ${automation.startHour}:00–${automation.endHour}:00.`
        );
        return;
      }
    }

    setGenerationAlert(null);
    setIsGenerating(true);
    abortControllerRef.current = false;

    // Start background audio anchor for Android
    startBackgroundAudioKeepAlive();

    for (const chapter of targetChapters) {
      if (abortControllerRef.current) break;

      setActiveChapterId(chapter.id);

      const { sentences } = cleanChapterText(
        chapter.cleanText,
        ipaRules,
        filterRules
      );

      setBook((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === chapter.id
            ? { ...c, status: 'synthesizing', progress: 0, currentSentenceIndex: 0, totalSentences: sentences.length }
            : c
        ),
      }));

      try {
        const result = await synthesizeChapterToMp3(
          sentences,
          chapter.title,
          voiceConfig,
          resourceConfig,
          chapterEndIndicator,
          (progress, current, total) => {
            // Throttle UI progress updates to eliminate stutters
            const now = Date.now();
            if (now - lastProgressUpdateRef.current > 75 || progress === 100) {
              lastProgressUpdateRef.current = now;
              setBook((prev) => ({
                ...prev,
                chapters: prev.chapters.map((c) =>
                  c.id === chapter.id
                    ? { ...c, progress, currentSentenceIndex: current, totalSentences: total }
                    : c
                ),
              }));
            }
          }
        );

        const fileName = createChapterFileName(chapter.index, chapter.title);

        const historyItemData = {
          id: `hist-${Date.now()}-${chapter.id}`,
          bookId: book.id,
          bookTitle: book.title,
          author: book.author,
          chapterTitle: chapter.title,
          chapterIndex: chapter.index,
          audioBlob: result.blob,
          durationSec: Math.round(result.durationSec),
          fileSizeBytes: result.blob.size,
          timestamp: Date.now(),
          fileName,
        };

        await saveHistoryItem(historyItemData);

        setBook((prev) => ({
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === chapter.id
              ? {
                  ...c,
                  status: 'completed',
                  progress: 100,
                  audioBlobUrl: result.blobUrl,
                  audioDurationSec: Math.round(result.durationSec),
                  audioSizeBytes: result.blob.size,
                  fileName,
                }
              : c
          ),
        }));

        const updatedHistory = await getHistoryItems();
        setHistoryItems(updatedHistory);
      } catch (err: any) {
        console.error('Synthesis error for chapter', chapter.id, err);
        setBook((prev) => ({
          ...prev,
          chapters: prev.chapters.map((c) =>
            c.id === chapter.id
              ? { ...c, status: 'error', errorMsg: err.message || 'Synthesis failed' }
              : c
          ),
        }));
      }
    }

    stopBackgroundAudioKeepAlive();
    setIsGenerating(false);
    setActiveChapterId(null);
  };

  const handleStopGeneration = () => {
    abortControllerRef.current = true;
    stopBackgroundAudioKeepAlive();
    setIsGenerating(false);
    setActiveChapterId(null);
  };

  const handlePlayChapter = (chapter: Chapter) => {
    if (chapter.audioBlobUrl) {
      setActiveAudioTrack({
        title: chapter.title,
        subtitle: `${book.title} · ${chapter.fileName || ''}`,
        url: chapter.audioBlobUrl,
        fileName: chapter.fileName,
      });
    }
  };

  const handleDownloadChapter = (chapter: Chapter) => {
    if (chapter.audioBlobUrl) {
      const a = document.createElement('a');
      a.href = chapter.audioBlobUrl;
      a.download = chapter.fileName || `chapter_${chapter.index}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handlePlayHistoryItem = (item: HistoryItem) => {
    setActiveAudioTrack({
      title: item.chapterTitle,
      subtitle: `${item.bookTitle} · ${item.fileName}`,
      url: item.audioBlobUrl,
      fileName: item.fileName,
    });
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await deleteHistoryItem(id);
    const updated = await getHistoryItems();
    setHistoryItems(updated);
  };

  const handleClearHistory = async () => {
    await clearAllHistory();
    setHistoryItems([]);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#292524] flex flex-col font-sans select-none pb-28">
      {/* Top Header */}
      <TopBar
        bookTitle={book.title}
        battery={battery}
        resourceConfig={resourceConfig}
        automation={automation}
        onOpenPowerSettings={() => setIsPowerModalOpen(true)}
      />

      {/* Battery / Overnight Alert Banner */}
      {generationAlert && (
        <div className="bg-[#FEF3C7] border-b border-[#FDE68A] px-4 py-2 text-xs text-[#92400E] flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-3xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
            <span className="font-medium">{generationAlert}</span>
          </div>
          <button
            onClick={() => setGenerationAlert(null)}
            className="text-[#92400E] hover:text-[#78350F] font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'chapters' && (
          <ChapterMatrix
            book={book}
            selectedChapterIds={selectedChapterIds}
            isGenerating={isGenerating}
            activeChapterId={activeChapterId}
            speakingSpeed={voiceConfig.speed}
            onToggleChapter={handleToggleChapter}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onInvertSelection={handleInvertSelection}
            onStartGeneration={handleStartGeneration}
            onStopGeneration={handleStopGeneration}
            onPlayChapter={handlePlayChapter}
            onDownloadChapter={handleDownloadChapter}
            onUploadEpub={handleUploadEpub}
            onLoadSample={handleLoadSample}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceStudio
            voiceConfig={voiceConfig}
            onUpdateVoiceConfig={setVoiceConfig}
            ipaRules={ipaRules}
            onAddIpaRule={handleAddIpaRule}
            onDeleteIpaRule={handleDeleteIpaRule}
            filterRules={filterRules}
            onUpdateFilterRules={setFilterRules}
          />
        )}

        {activeTab === 'history' && (
          <HistorySection
            historyItems={historyItems}
            onPlayItem={handlePlayHistoryItem}
            onDeleteItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* Bottom Sticky Audio Player */}
      {activeAudioTrack && (
        <AudioPlayerDrawer
          title={activeAudioTrack.title}
          subtitle={activeAudioTrack.subtitle}
          audioUrl={activeAudioTrack.url}
          fileName={activeAudioTrack.fileName}
          onClose={() => setActiveAudioTrack(null)}
        />
      )}

      {/* Android Bottom Navigation Bar (White & Wood Theme, Android 16 Inset Safe) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E7E0D3] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto grid grid-cols-3 h-16">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex flex-col items-center justify-center min-h-[48px] cursor-pointer transition-none ${
              activeTab === 'chapters'
                ? 'text-[#78350F] font-bold'
                : 'text-[#78716C] hover:text-[#292524]'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-[11px] tracking-tight">Chapters</span>
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`flex flex-col items-center justify-center min-h-[48px] cursor-pointer transition-none ${
              activeTab === 'voice'
                ? 'text-[#78350F] font-bold'
                : 'text-[#78716C] hover:text-[#292524]'
            }`}
          >
            <Sliders className="w-5 h-5 mb-1" />
            <span className="text-[11px] tracking-tight">Voice & IPA</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center min-h-[48px] cursor-pointer transition-none relative ${
              activeTab === 'history'
                ? 'text-[#78350F] font-bold'
                : 'text-[#78716C] hover:text-[#292524]'
            }`}
          >
            <History className="w-5 h-5 mb-1" />
            <span className="text-[11px] tracking-tight">History</span>
            {historyItems.length > 0 && (
              <span className="absolute top-2 right-8 w-2 h-2 rounded-full bg-[#B45309]"></span>
            )}
          </button>
        </div>
      </nav>

      {/* Power & Resource Settings Modal */}
      <PowerSettingsModal
        isOpen={isPowerModalOpen}
        onClose={() => setIsPowerModalOpen(false)}
        resourceConfig={resourceConfig}
        onSelectResourceLevel={(lvl) => {
          const matched = RESOURCE_LEVELS.find((r) => r.level === lvl) || RESOURCE_LEVELS[2];
          setResourceConfig(matched);
        }}
        automation={automation}
        onUpdateAutomation={setAutomation}
        battery={battery}
        onToggleSimulatedCharging={() =>
          setBattery((prev) => ({ ...prev, charging: !prev.charging }))
        }
        chapterEndIndicator={chapterEndIndicator}
        onSelectChapterEndIndicator={setChapterEndIndicator}
      />
    </div>
  );
}
