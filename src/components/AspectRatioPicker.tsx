'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AspectRatio } from '@/types/studio';
import { Check, ChevronDown, ChevronUp, Ratio, X } from 'lucide-react';

interface Props {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}

const RATIOS: { id: AspectRatio; label: string; ratioName: string; width: number; height: number }[] = [
  { id: '16:9', label: '16:9 Широкоэкранный', ratioName: '16:9', width: 68, height: 38 },
  { id: '9:16', label: '9:16 Вертикальный', ratioName: '9:16', width: 38, height: 68 },
  { id: '1:1', label: '1:1 Квадрат', ratioName: '1:1', width: 50, height: 50 },
  { id: '4:3', label: '4:3 Классический ТВ', ratioName: '4:3', width: 58, height: 44 },
  { id: '3:4', label: '3:4 Вертикальный портрет', ratioName: '3:4', width: 44, height: 58 },
  { id: '21:9', label: '21:9 Кинематографический', ratioName: '21:9', width: 78, height: 33 },
  { id: '9:21', label: '9:21 Ультравертикальный', ratioName: '9:21', width: 33, height: 78 },
  { id: '3:2', label: '3:2 Фотоформат', ratioName: '3:2', width: 60, height: 40 },
  { id: '2:3', label: '2:3 Высокий кадр', ratioName: '2:3', width: 40, height: 60 },
  { id: 'auto', label: 'Auto (По референсу)', ratioName: 'Auto', width: 60, height: 40 },
];

export const AspectRatioPicker: React.FC<Props> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRatio = RATIOS.find((r) => r.id === value) || RATIOS[0];

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-studio-850 hover:bg-studio-800 border border-studio-700 hover:border-studio-600 text-xs text-gray-200 transition-colors w-full justify-between shadow-sm"
      >
        <span className="flex items-center gap-2 font-medium truncate">
          <Ratio className="w-3.5 h-3.5 text-studio-cyan shrink-0" />
          <span className="font-mono font-bold text-studio-cyan">{activeRatio.ratioName}</span>
          <span className="text-gray-400 text-[11px] truncate">
            {activeRatio.label.replace(activeRatio.ratioName, '').trim()}
          </span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Floating Wide Popover Dropdown on Top */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[420px] rounded-2xl bg-studio-950/98 backdrop-blur-xl border border-studio-650 shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10">
          <div className="flex items-center justify-between border-b border-studio-750 pb-2">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
              <Ratio className="w-4 h-4 text-studio-cyan" />
              <span>Выбор пропорции кадра</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-4">
            {/* Left: Visual Frame Box Preview */}
            <div className="w-36 h-40 rounded-xl bg-studio-900 border border-studio-750 p-2.5 flex flex-col items-center justify-between shrink-0 relative overflow-hidden shadow-inner">
              {/* 3x3 grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>

              {/* Dynamic Frame Box */}
              <div className="flex-1 w-full flex items-center justify-center relative z-10">
                <div
                  style={{
                    width: `${activeRatio.width}px`,
                    height: `${activeRatio.height}px`,
                  }}
                  className="border-2 border-white rounded shadow-lg transition-all duration-300 bg-white/10"
                />
              </div>

              <span className="text-[10px] font-bold text-studio-cyan relative z-10 truncate text-center w-full">
                {activeRatio.label}
              </span>
            </div>

            {/* Right: Wide List without clipping */}
            <div className="flex-1 space-y-1 overflow-y-auto max-h-40 pr-1.5 custom-scrollbar">
              {RATIOS.map((item) => {
                const isSelected = item.id === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                      isSelected
                        ? 'bg-studio-accent/25 text-white font-bold border border-studio-accent shadow-sm'
                        : 'text-gray-300 hover:bg-studio-850 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-studio-cyan font-bold w-10 shrink-0">
                        {item.ratioName}
                      </span>
                      <span className="text-gray-200 text-xs truncate">
                        {item.label.replace(item.ratioName, '').trim()}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-studio-emerald shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
