import { BatteryInfo } from '../types';

export function isOvernightWindow(startHour: number, endHour: number, currentHour?: number): boolean {
  const hour = currentHour !== undefined ? currentHour : new Date().getHours();
  if (startHour <= endHour) {
    return hour >= startHour && hour < endHour;
  }
  // Overnight wrapping past midnight (e.g., 23:00 to 07:00)
  return hour >= startHour || hour < endHour;
}

export async function getBatteryStatus(): Promise<BatteryInfo> {
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      return {
        supported: true,
        charging: Boolean(battery.charging),
        level: typeof battery.level === 'number' ? battery.level : 1.0,
        chargingTime: battery.chargingTime || 0,
        dischargingTime: battery.dischargingTime || 0,
      };
    } catch {
      // Fallback
    }
  }

  return {
    supported: false,
    charging: true, // Default to plugged-in so generation is not artificially blocked if API unsupported
    level: 0.95,
    chargingTime: 0,
    dischargingTime: 0,
  };
}
