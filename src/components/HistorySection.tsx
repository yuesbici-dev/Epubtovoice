import React, { useState } from 'react';
import {
  History,
  Play,
  Download,
  Trash2,
  HardDrive,
  FileArchive,
  Search,
} from 'lucide-react';
import JSZip from 'jszip';
import { HistoryItem } from '../types';
import { formatDuration, formatFileSize } from '../utils/textCleaner';

interface HistorySectionProps {
  historyItems: HistoryItem[];
  onPlayItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  historyItems,
  onPlayItem,
  onDeleteItem,
  onClearHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportingZip, setIsExportingZip] = useState(false);

  const totalSizeBytes = historyItems.reduce((sum, item) => sum + item.fileSizeBytes, 0);

  const filteredItems = historyItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.bookTitle.toLowerCase().includes(q) ||
      item.chapterTitle.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q)
    );
  });

  const handleExportZip = async () => {
    if (historyItems.length === 0) return;

    try {
      setIsExportingZip(true);
      const zip = new JSZip();

      for (const item of historyItems) {
        const arrayBuffer = await item.audioBlob.arrayBuffer();
        const safeName = item.fileName || `Chapter_${item.chapterIndex}.mp3`;
        zip.file(safeName, arrayBuffer);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `EpubToVoice_Audio_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('ZIP export error', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleDownloadSingle = (item: HistoryItem) => {
    const a = document.createElement('a');
    a.href = item.audioBlobUrl;
    a.download = item.fileName || `Chapter_${item.chapterIndex}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">
      {/* Top Storage Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E7E0D3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#B45309] shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#78716C] font-semibold">On-Device Storage Used</div>
            <div className="text-base font-bold text-[#1C1917] font-mono">
              {formatFileSize(totalSizeBytes)}
              <span className="text-xs font-normal text-[#78716C] font-sans ml-2">
                ({historyItems.length} audio files saved)
              </span>
            </div>
          </div>
        </div>

        {/* Global Storage Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportZip}
            disabled={historyItems.length === 0 || isExportingZip}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-none cursor-pointer ${
              historyItems.length === 0
                ? 'bg-[#F5F2EB] text-[#A8A29E] cursor-not-allowed border border-[#E7E0D3]'
                : 'bg-[#78350F] hover:bg-[#692E0B] text-white shadow-sm'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            <span>{isExportingZip ? 'Packaging ZIP...' : 'Export All (ZIP)'}</span>
          </button>

          {historyItems.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Delete all saved audio files from local storage?')) {
                  onClearHistory();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#FEF2F2] border border-[#E7E0D3] hover:border-[#FECACA] text-[#78716C] hover:text-[#DC2626] text-xs font-semibold flex items-center gap-1.5 transition-none cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      {historyItems.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved chapters or books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E7E0D3] rounded-xl text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#78350F]"
          />
        </div>
      )}

      {/* Empty State */}
      {historyItems.length === 0 && (
        <div className="bg-white rounded-2xl p-8 border border-[#E7E0D3] text-center space-y-2 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <History className="w-8 h-8 text-[#A8A29E] mx-auto" />
          <h4 className="text-sm font-bold text-[#1C1917]">No Generated Audio Yet</h4>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            Select chapters from the Chapters tab and tap Generate. Completed audio files are stored in IndexedDB on your phone for full offline playback.
          </p>
        </div>
      )}

      {/* History Items List */}
      <div className="space-y-2.5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 border border-[#E7E0D3] flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
          >
            {/* Play Button */}
            <button
              onClick={() => onPlayItem(item)}
              className="w-11 h-11 rounded-xl bg-[#78350F] hover:bg-[#692E0B] text-white flex items-center justify-center shrink-0 transition-none cursor-pointer shadow-sm"
              title="Play Chapter"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#B45309]">
                  #{String(item.chapterIndex).padStart(2, '0')}
                </span>
                <h4 className="text-sm font-bold text-[#1C1917] truncate">
                  {item.chapterTitle}
                </h4>
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-xs text-[#78716C] font-mono flex-wrap">
                <span className="text-[#44403C] font-sans font-medium">{item.bookTitle}</span>
                <span>·</span>
                <span>{formatDuration(item.durationSec)}</span>
                <span>·</span>
                <span>{formatFileSize(item.fileSizeBytes)}</span>
              </div>

              <div className="text-[10px] font-mono text-[#A8A29E] mt-0.5 truncate">
                Saved: {item.fileName}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleDownloadSingle(item)}
                className="p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F5F2EB] text-[#44403C] border border-[#E7E0D3] transition-none cursor-pointer"
                title="Download MP3"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#FEF2F2] text-[#78716C] hover:text-[#DC2626] border border-[#E7E0D3] hover:border-[#FECACA] transition-none cursor-pointer"
                title="Delete from device"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
