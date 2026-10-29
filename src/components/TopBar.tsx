import React from 'react';
import { BatteryCharging, Battery, Moon, Cpu } from 'lucide-react';
import { AutomationConfig, BatteryInfo, ResourceConfig } from '../types';
import { isOvernightWindow } from '../utils/battery';

interface TopBarProps {
  bookTitle: string;
  battery: BatteryInfo;
  resourceConfig: ResourceConfig;
  automation: AutomationConfig;
  onOpenPowerSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  bookTitle,
  battery,
  resourceConfig,
  automation,
  onOpenPowerSettings,
}) => {
  const isNight = isOvernightWindow(automation.startHour, automation.endHour);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E7E0D3] px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Active Book */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#78350F] flex items-center justify-center font-bold text-white text-sm shrink-0 select-none shadow-sm">
            Ev
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#1C1917] leading-tight tracking-tight truncate">
              EpubToVoice
            </h1>
            <p className="text-xs text-[#78716C] truncate">
              {bookTitle || 'No EPUB Loaded'}
            </p>
          </div>
        </div>

        {/* Status Indicators & Settings Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Overnight Active Indicator */}
          {automation.overnightEnabled && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                isNight
                  ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                  : 'bg-[#F5F2EB] text-[#78716C] border-[#E7E0D3]'
              }`}
              title={
                isNight
                  ? `Overnight window active (${automation.startHour}:00 - ${automation.endHour}:00)`
                  : `Overnight window scheduled for ${automation.startHour}:00`
              }
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono">
                {automation.startHour}:00–{automation.endHour}:00
              </span>
            </div>
          )}

          {/* Battery Status Badge */}
          <button
            onClick={onOpenPowerSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-none cursor-pointer ${
              battery.charging
                ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]'
                : 'bg-[#F5F2EB] border-[#E7E0D3] text-[#44403C]'
            }`}
            title="Configure power & battery settings"
          >
            {battery.charging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-[#B45309]" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-[#78716C]" />
            )}
            <span className="font-semibold">{Math.round(battery.level * 100)}%</span>
            {battery.charging && (
              <span className="text-[10px] uppercase font-bold text-[#B45309]">Plugged</span>
            )}
          </button>

          {/* Resource Slider Button */}
          <button
            onClick={onOpenPowerSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F5F2EB] hover:bg-[#EFE9DF] border border-[#E7E0D3] text-xs text-[#44403C] transition-none cursor-pointer"
            title="Adjust CPU & Memory Resource Slider"
          >
            <Cpu className="w-3.5 h-3.5 text-[#B45309]" />
            <span className="hidden sm:inline font-semibold">{resourceConfig.label}</span>
            <span className="sm:hidden font-mono font-bold">L{resourceConfig.level}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
