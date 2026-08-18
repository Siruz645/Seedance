'use client';

import React from 'react';
import { CameraMotion } from '@/types/studio';
import {
  Maximize2,
  Minimize2,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  ArrowUp,
  ArrowDown,
  Video,
  Eye,
  Slash,
} from 'lucide-react';

interface Props {
  value: CameraMotion;
  onChange: (motion: CameraMotion) => void;
}

const MOTIONS: { id: CameraMotion; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'none', label: 'Авто (Без принуждения)', icon: Slash },
  { id: 'static', label: 'Статичный штатив', icon: Eye },
  { id: 'push_in', label: 'Наезд (Push-in)', icon: Maximize2 },
  { id: 'pull_out', label: 'Отъезд (Pull-out)', icon: Minimize2 },
  { id: 'tracking_left', label: 'Панорама Влево', icon: ArrowLeft },
  { id: 'tracking_right', label: 'Панорама Вправо', icon: ArrowRight },
  { id: 'orbital_360', label: 'Облет 360°', icon: RotateCw },
  { id: 'steadicam_follow', label: 'Стедикам слежение', icon: Video },
  { id: 'tilt_up', label: 'Панорама Вверх', icon: ArrowUp },
  { id: 'tilt_down', label: 'Панорама Вниз', icon: ArrowDown },
];

export const CameraMotionPicker: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          Вектор камеры (Опционально)
        </label>
        <span className="text-[10px] text-gray-500 font-mono">
          {value === 'none' ? 'Режим: Естественная динамика' : 'Режим: Траектория'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {MOTIONS.map((item) => {
          const Icon = item.icon;
          const isSelected = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left truncate ${
                isSelected
                  ? 'bg-studio-accent/20 border-studio-accent text-white shadow-sm shadow-studio-accent/20'
                  : 'bg-studio-850 border-studio-700/80 text-gray-400 hover:text-gray-200 hover:bg-studio-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-studio-cyan' : 'text-gray-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
