import React, { useRef, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Play,
  Download,
  AlertCircle,
  FileText,
  Upload,
  BookOpen,
  Clock,
  HardDrive,
  CheckCircle2,
  ListFilter,
} from 'lucide-react';
import { Book, Chapter } from '../types';
import { formatDuration, formatFileSize } from '../utils/textCleaner';

interface ChapterMatrixProps {
  book: Book;
  selectedChapterIds: Set<string>;
  isGenerating: boolean;
  activeChapterId: string | null;
  speakingSpeed: number;
  onToggleChapter: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onStartGeneration: () => void;
  onStopGeneration: () => void;
  onPlayChapter: (chapter: Chapter) => void;
  onDownloadChapter: (chapter: Chapter) => void;
  onUploadEpub: (file: File) => void;
  onLoadSample: () => void;
}

export const ChapterMatrix: React.FC<ChapterMatrixProps> = ({
  book,
  selectedChapterIds,
  isGenerating,
  activeChapterId,
  speakingSpeed,
  onToggleChapter,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onStartGeneration,
  onStopGeneration,
  onPlayChapter,
  onDownloadChapter,
  onUploadEpub,
  onLoadSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoized calculations to eliminate stutters
  const {
    selectedCount,
    totalCount,
    totalSelectedWords,
    totalSelectedDurationSec,
    totalSelectedFileSizeBytes,
  } = useMemo(() => {
    const selected = book.chapters.filter((c) => selectedChapterIds.has(c.id));
    const words = selected.reduce((sum, c) => sum + c.wordCount, 0);
    const duration = Math.round(
      selected.reduce((sum, c) => {
        const dur = Math.ceil((c.wordCount / (150 * speakingSpeed)) * 60);
        return sum + dur;
      }, 0)
    );
    const size = Math.round(duration * 16000 + selected.length * 4096);

    return {
      selectedCount: selected.length,
      totalCount: book.chapters.length,
      totalSelectedWords: words,
      totalSelectedDurationSec: duration,
      totalSelectedFileSizeBytes: size,
    };
  }, [book.chapters, selectedChapterIds, speakingSpeed]);

  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const noneSelected = selectedCount === 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadEpub(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Book Header & Import Controls */}
      <div className="bg-white rounded-2xl p-4 border border-[#E7E0D3] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-[#A16207] uppercase tracking-wider">
              Active eBook
            </span>
            <h2 className="text-lg font-bold text-[#1C1917] truncate">{book.title}</h2>
            <p className="text-xs text-[#78716C]">
              by <span className="text-[#44403C] font-medium">{book.author}</span> · {totalCount} chapters
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept=".epub,application/epub+zip"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-[#F5F2EB] hover:bg-[#EFE9DF] text-[#44403C] text-xs font-semibold flex items-center gap-1.5 transition-none cursor-pointer border border-[#E7E0D3]"
            >
              <Upload className="w-4 h-4 text-[#78350F]" />
              Import .epub
            </button>
            <button
              onClick={onLoadSample}
              className="px-3.5 py-2 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] text-xs font-semibold flex items-center gap-1.5 transition-none cursor-pointer border border-[#FCD34D]"
              title="Reload sample classic 'The Time Machine'"
            >
              <BookOpen className="w-4 h-4 text-[#B45309]" />
              Demo Classic
            </button>
          </div>
        </div>
      </div>

      {/* PRE-GENERATION CALCULATED TOTALS BANNER */}
      <div className="bg-white rounded-2xl p-4 border border-[#E7E0D3] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-[#B45309]" />
            <h3 className="text-xs font-bold text-[#78350F] uppercase tracking-wider">
              Calculations for Selected Chapters
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-[#78716C]">
            {selectedCount} of {totalCount} Selected
          </span>
        </div>

        {/* Real-time calculated figures */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E0D3]">
            <div className="flex items-center gap-1.5 text-[#78716C] text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-[#B45309]" />
              <span className="font-medium">Est. Audio Length</span>
            </div>
            <div className="text-lg font-bold font-mono text-[#1C1917]">
              {noneSelected ? '0s' : formatDuration(totalSelectedDurationSec)}
            </div>
            <div className="text-[10px] text-[#A8A29E] mt-0.5">
              @ {speakingSpeed.toFixed(1)}x speed
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E0D3]">
            <div className="flex items-center gap-1.5 text-[#78716C] text-xs mb-1">
              <HardDrive className="w-3.5 h-3.5 text-[#78350F]" />
              <span className="font-medium">Est. Output Size</span>
            </div>
            <div className="text-lg font-bold font-mono text-[#1C1917]">
              {noneSelected ? '0 B' : formatFileSize(totalSelectedFileSizeBytes)}
            </div>
            <div className="text-[10px] text-[#A8A29E] mt-0.5">
              128 kbps MP3
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E0D3]">
            <div className="flex items-center gap-1.5 text-[#78716C] text-xs mb-1">
              <FileText className="w-3.5 h-3.5 text-[#047857]" />
              <span className="font-medium">Total Words</span>
            </div>
            <div className="text-lg font-bold font-mono text-[#1C1917]">
              {totalSelectedWords.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#A8A29E] mt-0.5">
              Clean text
            </div>
          </div>
        </div>

        {/* Primary Generation CTA */}
        {isGenerating ? (
          <button
            onClick={onStopGeneration}
            className="w-full py-3.5 px-4 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm flex items-center justify-center gap-2 transition-none cursor-pointer shadow-sm"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
            Stop Voice Generation
          </button>
        ) : (
          <button
            onClick={onStartGeneration}
            disabled={noneSelected}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-none ${
              noneSelected
                ? 'bg-[#F5F2EB] text-[#A8A29E] cursor-not-allowed border border-[#E7E0D3]'
                : 'bg-[#78350F] hover:bg-[#692E0B] text-white cursor-pointer shadow-md'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {noneSelected
                ? 'Select At Least One Chapter'
                : `Generate ${selectedCount} Selected Chapter${selectedCount > 1 ? 's' : ''} (${formatFileSize(totalSelectedFileSizeBytes)})`}
            </span>
          </button>
        )}
      </div>

      {/* CHAPTER SELECTION TOOLBAR */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs font-bold text-[#44403C]">
          Chapter Inventory ({totalCount})
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSelectAll}
            disabled={allSelected}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-none ${
              allSelected
                ? 'text-[#A8A29E] bg-[#F5F2EB] cursor-not-allowed'
                : 'text-[#78350F] bg-white hover:bg-[#FAF7F2] cursor-pointer border border-[#E7E0D3]'
            }`}
          >
            Select All
          </button>
          <button
            onClick={onDeselectAll}
            disabled={noneSelected}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-none ${
              noneSelected
                ? 'text-[#A8A29E] bg-[#F5F2EB] cursor-not-allowed'
                : 'text-[#78716C] bg-white hover:bg-[#FAF7F2] cursor-pointer border border-[#E7E0D3]'
            }`}
          >
            Deselect All
          </button>
          <button
            onClick={onInvertSelection}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#78716C] bg-white hover:bg-[#FAF7F2] cursor-pointer border border-[#E7E0D3] transition-none"
          >
            Invert
          </button>
        </div>
      </div>

      {/* CHAPTER LIST WITH CLEAR SELECTION & INDIVIDUAL PROGRESS */}
      <div className="space-y-2.5">
        {book.chapters.map((chapter) => {
          const isSelected = selectedChapterIds.has(chapter.id);
          const isCurrentActive = activeChapterId === chapter.id;

          const estDurationSec = Math.ceil((chapter.wordCount / (150 * speakingSpeed)) * 60);
          const estSize = Math.round(estDurationSec * 16000 + 4096);

          return (
            <div
              key={chapter.id}
              className={`rounded-2xl p-4 border transition-none ${
                isSelected
                  ? 'bg-white border-[#B45309] shadow-sm'
                  : 'bg-[#FBF9F5] border-[#E7E0D3] opacity-80'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Touch Hitbox Checkbox (48x48) */}
                <button
                  type="button"
                  onClick={() => onToggleChapter(chapter.id)}
                  className="min-h-[48px] min-w-[48px] -ml-2 -mt-1 flex items-center justify-center shrink-0 cursor-pointer text-[#78716C] hover:text-[#1C1917]"
                  title={isSelected ? 'Click to Deselect' : 'Click to Select'}
                >
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-[#78350F] fill-[#FEF3C7]" />
                  ) : (
                    <Square className="w-6 h-6 text-[#A8A29E]" />
                  )}
                </button>

                {/* Chapter Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onToggleChapter(chapter.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-[#B45309]">
                      #{String(chapter.index).padStart(2, '0')}
                    </span>
                    <h4
                      className={`text-sm font-bold truncate ${
                        isSelected ? 'text-[#1C1917]' : 'text-[#78716C]'
                      }`}
                    >
                      {chapter.title}
                    </h4>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#78716C] font-mono flex-wrap">
                    <span>{chapter.wordCount.toLocaleString()} words</span>
                    <span>·</span>
                    <span>{formatDuration(estDurationSec)}</span>
                    <span>·</span>
                    <span>{formatFileSize(estSize)}</span>
                    <span>·</span>
                    <span
                      className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded uppercase ${
                        isSelected
                          ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                          : 'bg-[#F5F2EB] text-[#A8A29E]'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Skipped'}
                    </span>
                  </div>

                  {/* Auto-generated Filename preview */}
                  <div className="text-[11px] font-mono text-[#A8A29E] mt-1 truncate">
                    Output: {chapter.fileName || `chapter_${chapter.index}.mp3`}
                  </div>
                </div>

                {/* Action / Status Icons */}
                <div className="shrink-0 flex items-center gap-1.5">
                  {chapter.status === 'completed' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayChapter(chapter);
                        }}
                        className="p-2.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] hover:bg-[#D1FAE5] transition-none cursor-pointer"
                        title="Play Generated Chapter"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadChapter(chapter);
                        }}
                        className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7E0D3] text-[#44403C] hover:bg-[#F5F2EB] transition-none cursor-pointer"
                        title="Download Chapter MP3"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {chapter.status === 'error' && (
                    <div className="flex items-center gap-1 text-[#DC2626] text-xs">
                      <AlertCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Failed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Individual Chapter Progress Bar */}
              {(chapter.status === 'synthesizing' || isCurrentActive) && (
                <div className="mt-3 pt-3 border-t border-[#E7E0D3]">
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#B45309] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#B45309]"></span>
                      Generating Audio...
                    </span>
                    <span className="text-[#44403C]">
                      {chapter.currentSentenceIndex || 0} / {chapter.totalSentences || '—'} sentences ({chapter.progress}%)
                    </span>
                  </div>

                  <div className="w-full bg-[#F5F2EB] rounded-full h-2 overflow-hidden border border-[#E7E0D3]">
                    <div
                      className="bg-[#78350F] h-2 transition-none"
                      style={{ width: `${chapter.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Completed Status Bar */}
              {chapter.status === 'completed' && !isCurrentActive && (
                <div className="mt-2.5 pt-2 border-t border-[#E7E0D3] flex items-center justify-between text-xs text-[#047857] font-mono">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved to Device Storage</span>
                  </div>
                  <span>{formatFileSize(chapter.audioSizeBytes || estSize)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
