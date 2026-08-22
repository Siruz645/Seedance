'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  ChevronUp,
  ChevronDown,
  Check,
} from 'lucide-react';

interface Props {
  value: CameraMotion;
  onChange: (motion: CameraMotion) => void;
}

const MOTIONS: { id: CameraMotion; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'none', label: 'Авто (Естественная динамика)', icon: Slash },
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

export const CameraMotionDropdown: React.FC<Props> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeMotion = MOTIONS.find((m) => m.id === value) || MOTIONS[0];
  const ActiveIcon = activeMotion.icon;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-studio-900 border border-studio-750 hover:border-studio-600 text-xs text-white transition-all shadow-sm cursor-pointer"
      >
        <span className="flex items-center gap-1.5 truncate">
          <ActiveIcon className="w-3.5 h-3.5 text-studio-cyan shrink-0" />
          <span className="truncate text-xs font-medium">{activeMotion.label}</span>
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Floating Popover Menu (All 10 options immediately visible) */}
      {isOpen && (
        <div className="absolute bottom-full mb-1.5 inset-x-0 bg-studio-950 border border-studio-700 rounded-xl p-1.5 shadow-2xl z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-studio-800 mb-1">
            Выберите траекторию камеры
          </div>
          {MOTIONS.map((item) => {
            const Icon = item.icon;
            const isSelected = item.id === value;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  isSelected
                    ? 'bg-studio-accent/20 text-white font-bold border border-studio-accent/40'
                    : 'text-gray-300 hover:text-white hover:bg-studio-850'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-studio-cyan' : 'text-gray-400'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-studio-cyan shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
