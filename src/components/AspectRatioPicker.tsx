'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AspectRatio } from '@/types/studio';
import { Check, ChevronDown, ChevronUp, Ratio, X } from 'lucide-react';

interface Props {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}

const RATIOS: { id: AspectRatio; label: string; ratioName: string; width: number; height: number }[] = [
  { id: 'auto', label: 'Auto (По референсу)', ratioName: 'Auto', width: 48, height: 32 },
  { id: '16:9', label: '16:9 Горизонт', ratioName: '16:9', width: 56, height: 32 },
  { id: '9:16', label: '9:16 Вертикал', ratioName: '9:16', width: 32, height: 56 },
  { id: '1:1', label: '1:1 Квадрат', ratioName: '1:1', width: 42, height: 42 },
  { id: '4:3', label: '4:3 ТВ', ratioName: '4:3', width: 48, height: 36 },
  { id: '3:4', label: '3:4 Портрет', ratioName: '3:4', width: 36, height: 48 },
  { id: '21:9', label: '21:9 Кино', ratioName: '21:9', width: 64, height: 28 },
  { id: '9:21', label: '9:21 Ультра', ratioName: '9:21', width: 28, height: 64 },
  { id: '3:2', label: '3:2 Фото', ratioName: '3:2', width: 50, height: 34 },
  { id: '2:3', label: '2:3 Высокий', ratioName: '2:3', width: 34, height: 50 },
];

export const AspectRatioPicker: React.FC<Props> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<(typeof RATIOS)[0] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRatio = RATIOS.find((r) => r.id === value) || RATIOS[0];
  const displayedRatio = hoveredItem || activeRatio;

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHoveredItem(null);
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
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-studio-900 hover:bg-studio-850 border border-studio-750 hover:border-studio-600 text-xs text-gray-200 transition-colors w-full justify-between shadow-sm cursor-pointer"
      >
        <span className="flex items-center gap-2 font-medium truncate">
          <Ratio className="w-3.5 h-3.5 text-studio-cyan shrink-0" />
          <span className="font-mono font-bold text-studio-cyan">{activeRatio.ratioName}</span>
          <span className="text-gray-400 text-[11px] truncate">
            {activeRatio.label.replace(activeRatio.ratioName, '').trim()}
          </span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Floating Dropdown opening DOWNWARDS underneath button */}
      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 z-50 w-72 rounded-xl bg-studio-950/98 backdrop-blur-xl border border-studio-650 shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/10">
          {/* Header with Live Preview */}
          <div className="flex items-center justify-between border-b border-studio-800 pb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
              <Ratio className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Пропорции кадра</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setHoveredItem(null);
              }}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-studio-850 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Top Live Hover Visual Box */}
          <div className="h-20 rounded-lg bg-studio-900 border border-studio-750 p-2 flex items-center justify-center relative overflow-hidden shadow-inner">
            {/* 3x3 grid guide lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-15">
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

            {/* Dynamic Animated Frame */}
            <div
              style={{
                width: `${displayedRatio.width}px`,
                height: `${displayedRatio.height}px`,
              }}
              className="border-2 border-studio-cyan rounded shadow-md transition-all duration-150 bg-studio-cyan/25 flex items-center justify-center relative z-10"
            >
              <span className="text-[9px] font-mono font-bold text-white drop-shadow">
                {displayedRatio.ratioName}
              </span>
            </div>
          </div>

          {/* 2-Column Grid with all 10 aspect ratios directly visible */}
          <div
            className="grid grid-cols-2 gap-1"
            onMouseLeave={() => setHoveredItem(null)}
          >
            {RATIOS.map((item) => {
              const isSelected = item.id === value;
              const isHovered = hoveredItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setHoveredItem(item)}
                  onClick={() => {
                    onChange(item.id);
                    setIsOpen(false);
                    setHoveredItem(null);
                  }}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all text-left ${
                    isSelected
                      ? 'bg-studio-accent/25 text-white font-bold border border-studio-accent shadow-sm'
                      : isHovered
                      ? 'bg-studio-850 text-white border border-studio-700'
                      : 'text-gray-300 hover:bg-studio-850 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-studio-cyan font-bold text-[11px] shrink-0">
                      {item.ratioName}
                    </span>
                    <span className="text-gray-300 text-[10px] truncate">
                      {item.label.replace(item.ratioName, '').trim()}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-studio-emerald shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
