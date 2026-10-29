import React from 'react';
import {
  X,
  Cpu,
  BatteryCharging,
  Moon,
  Volume2,
  Check,
  Zap,
  Play,
  ShieldCheck,
} from 'lucide-react';
import {
  AutomationConfig,
  BatteryInfo,
  ChapterEndIndicator,
  ResourceConfig,
} from '../types';
import { RESOURCE_LEVELS } from '../utils/speechEngine';
import { createEndIndicatorAudioBuffer } from '../utils/audioEncoder';

interface PowerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceConfig: ResourceConfig;
  onSelectResourceLevel: (level: number) => void;
  automation: AutomationConfig;
  onUpdateAutomation: (auto: AutomationConfig) => void;
  battery: BatteryInfo;
  onToggleSimulatedCharging: () => void;
  chapterEndIndicator: ChapterEndIndicator;
  onSelectChapterEndIndicator: (indicator: ChapterEndIndicator) => void;
}

export const PowerSettingsModal: React.FC<PowerSettingsModalProps> = ({
  isOpen,
  onClose,
  resourceConfig,
  onSelectResourceLevel,
  automation,
  onUpdateAutomation,
  battery,
  onToggleSimulatedCharging,
  chapterEndIndicator,
  onSelectChapterEndIndicator,
}) => {
  if (!isOpen) return null;

  const handlePreviewIndicator = async (indicator: ChapterEndIndicator) => {
    if (indicator === 'none') return;
    if (indicator === 'speech') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance('End of Chapter.');
        window.speechSynthesis.speak(utt);
      }
      return;
    }

    const audioCtx = new AudioContext();
    const buffer = await createEndIndicatorAudioBuffer(indicator, audioCtx.sampleRate);
    if (buffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E7E0D3] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E0D3]">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#78350F]" />
            <h3 className="text-base font-bold text-[#1C1917]">
              Power, Resources & Android 16
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] transition-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BACKGROUND & ANDROID 16 NOTICE */}
        <div className="p-3.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
          <div className="text-xs text-[#92400E]">
            <span className="font-bold">Android 16 Background Synthesis Active:</span>{' '}
            Audio synthesis and playback continue seamlessly when switching apps or locking your phone screen via MediaSession and background audio keep-alive.
          </div>
        </div>

        {/* 1. HARDWARE RESOURCE USAGE SLIDER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#44403C] uppercase tracking-wider">
              CPU & Memory Allocation Slider
            </label>
            <span className="text-xs font-mono font-bold text-[#78350F] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
              Level {resourceConfig.level}: {resourceConfig.label}
            </span>
          </div>

          <p className="text-xs text-[#78716C]">
            Throttles background CPU duty cycle and memory footprint to prevent overheating and conserve battery.
          </p>

          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={resourceConfig.level}
            onChange={(e) => onSelectResourceLevel(parseInt(e.target.value, 10))}
            className="w-full accent-[#78350F] h-2 bg-[#F5F2EB] rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[10px] font-mono text-[#78716C]">
            <span>L1 (Eco Saver)</span>
            <span>L3 (Standard)</span>
            <span>L5 (Max Speed)</span>
          </div>

          <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E0D3] text-xs space-y-1">
            <div className="font-bold text-[#1C1917] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#B45309]" />
              <span>{resourceConfig.description}</span>
            </div>
            <div className="text-[11px] text-[#78716C] font-mono">
              Working Memory: {resourceConfig.memoryWindowMb} MB · Inter-sentence cooling delay: {resourceConfig.dutyCycleMs} ms
            </div>
          </div>
        </div>

        {/* 2. SMART CHARGING & OVERNIGHT AUTOMATION */}
        <div className="space-y-3 pt-3 border-t border-[#E7E0D3]">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-[#B45309]" />
            <label className="text-xs font-bold text-[#44403C] uppercase tracking-wider">
              Battery & Night Automation
            </label>
          </div>

          {/* Only when charging toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E0D3]">
            <div>
              <div className="text-xs font-bold text-[#1C1917]">
                Only Generate When Plugged In
              </div>
              <div className="text-[11px] text-[#78716C]">
                Pauses generation automatically if device runs on battery.
              </div>
            </div>
            <input
              type="checkbox"
              checked={automation.onlyWhenCharging}
              onChange={(e) =>
                onUpdateAutomation({ ...automation, onlyWhenCharging: e.target.checked })
              }
              className="accent-[#78350F] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Battery readout */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7E0D3] text-xs">
            <span className="text-[#78716C] font-mono">
              Phone State: {Math.round(battery.level * 100)}% · {battery.charging ? 'Connected to Charger' : 'Running on Battery'}
            </span>
            <button
              type="button"
              onClick={onToggleSimulatedCharging}
              className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white border border-[#E7E0D3] text-[#44403C] hover:bg-[#F5F2EB] transition-none cursor-pointer"
            >
              Toggle Charger Test
            </button>
          </div>

          {/* Overnight schedule toggle */}
          <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7E0D3] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-[#B45309]" />
                  <span>Scheduled Overnight Hours</span>
                </div>
                <div className="text-[11px] text-[#78716C]">
                  Runs generation during overnight sleep hours to preserve active battery.
                </div>
              </div>
              <input
                type="checkbox"
                checked={automation.overnightEnabled}
                onChange={(e) =>
                  onUpdateAutomation({ ...automation, overnightEnabled: e.target.checked })
                }
                className="accent-[#78350F] w-4 h-4 cursor-pointer"
              />
            </div>

            {automation.overnightEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E7E0D3]">
                <div>
                  <label className="block text-[10px] font-bold text-[#78716C] mb-1">
                    Start Window
                  </label>
                  <select
                    value={automation.startHour}
                    onChange={(e) =>
                      onUpdateAutomation({ ...automation, startHour: parseInt(e.target.value, 10) })
                    }
                    className="w-full p-2 text-xs bg-white border border-[#E7E0D3] rounded-lg text-[#1C1917]"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00 {i >= 12 ? 'PM' : 'AM'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#78716C] mb-1">
                    End Window
                  </label>
                  <select
                    value={automation.endHour}
                    onChange={(e) =>
                      onUpdateAutomation({ ...automation, endHour: parseInt(e.target.value, 10) })
                    }
                    className="w-full p-2 text-xs bg-white border border-[#E7E0D3] rounded-lg text-[#1C1917]"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00 {i >= 12 ? 'PM' : 'AM'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. CHAPTER END INDICATOR */}
        <div className="space-y-3 pt-3 border-t border-[#E7E0D3]">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#047857]" />
            <label className="text-xs font-bold text-[#44403C] uppercase tracking-wider">
              Chapter End Audio Indicator
            </label>
          </div>

          <p className="text-xs text-[#78716C]">
            Audio cue appended to each chapter file to notify when a chapter concludes:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'none', label: 'None (Silence)' },
                { id: 'chime', label: 'Harmonic Chime' },
                { id: 'bell', label: 'Zen Bell Tone' },
                { id: 'speech', label: 'Spoken Outro Tag' },
              ] as Array<{ id: ChapterEndIndicator; label: string }>
            ).map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-none cursor-pointer ${
                  chapterEndIndicator === item.id
                    ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#78350F] shadow-xs'
                    : 'bg-[#FAF7F2] border-[#E7E0D3] text-[#44403C] hover:bg-[#F5F2EB]'
                }`}
                onClick={() => onSelectChapterEndIndicator(item.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      chapterEndIndicator === item.id
                        ? 'border-[#78350F] bg-[#78350F] text-white'
                        : 'border-[#A8A29E]'
                    }`}
                  >
                    {chapterEndIndicator === item.id && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span className="text-xs font-semibold">{item.label}</span>
                </div>

                {item.id !== 'none' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewIndicator(item.id);
                    }}
                    className="p-1 rounded bg-white hover:bg-[#FAF7F2] text-[#78350F] border border-[#E7E0D3] transition-none"
                    title="Preview Sound"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Action */}
        <div className="pt-3 border-t border-[#E7E0D3]">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#78350F] hover:bg-[#692E0B] text-white font-bold text-xs rounded-xl transition-none cursor-pointer shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
