'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AspectRatio } from '@/types/studio';
import { Check, ChevronDown, ChevronUp, Ratio, X } from 'lucide-react';

interface Props {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}

const RATIOS: { id: AspectRatio; label: string; ratioName: string; width: number; height: number }[] = [
  { id: 'auto', label: 'Auto (По референсу)', ratioName: 'Auto', width: 44, height: 28 },
  { id: '16:9', label: '16:9 Горизонтальный', ratioName: '16:9', width: 52, height: 28 },
  { id: '9:16', label: '9:16 Вертикальный', ratioName: '9:16', width: 28, height: 52 },
  { id: '1:1', label: '1:1 Квадрат', ratioName: '1:1', width: 38, height: 38 },
  { id: '4:3', label: '4:3 Классический ТВ', ratioName: '4:3', width: 46, height: 34 },
  { id: '3:4', label: '3:4 Портретный', ratioName: '3:4', width: 34, height: 46 },
  { id: '21:9', label: '21:9 Киноформат', ratioName: '21:9', width: 58, height: 24 },
  { id: '9:21', label: '9:21 Ультравертикал', ratioName: '9:21', width: 24, height: 58 },
  { id: '3:2', label: '3:2 Фотокадр', ratioName: '3:2', width: 46, height: 30 },
  { id: '2:3', label: '2:3 Высокий кадр', ratioName: '2:3', width: 30, height: 46 },
];

export const AspectRatioPicker: React.FC<Props> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<(typeof RATIOS)[0] | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const activeRatio = RATIOS.find((r) => r.id === value) || RATIOS[0];
  const displayedRatio = hoveredItem || activeRatio;

  // Compute fixed position on open
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 340;
    const dropdownHeight = 360;

    let top = rect.bottom + 6;
    // Check if overflowing viewport bottom
    if (top + dropdownHeight > window.innerHeight && rect.top - dropdownHeight > 0) {
      top = rect.top - dropdownHeight - 6;
    }

    let left = rect.left;
    // If overflowing viewport right, align right
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = window.innerWidth - dropdownWidth - 12;
    }
    if (left < 12) left = 12;

    setDropdownPosition({ top, left });
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setHoveredItem(null);
    }
  };

  // Close when clicking outside or scrolling window
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !target.closest('.aspect-ratio-popover-portal')
      ) {
        setIsOpen(false);
        setHoveredItem(null);
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) {
        setIsOpen(false);
        setHoveredItem(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full">
      {/* Compact Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
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

      {/* Floating Wide Popover Dropdown (Fixed positioning: ALWAYS ON TOP OF EVERYTHING & NEVER CLIPPED) */}
      {isOpen && dropdownPosition && (
        <div
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: '340px',
            zIndex: 9999,
          }}
          className="aspect-ratio-popover-portal rounded-2xl bg-studio-950/98 backdrop-blur-2xl border border-studio-600 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/15"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-studio-800 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-100">
              <Ratio className="w-4 h-4 text-studio-cyan" />
              <span>Пропорции кадра</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setHoveredItem(null);
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-studio-850 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Top Live Hover Visual Box */}
          <div className="h-20 rounded-xl bg-studio-900 border border-studio-750 p-2 flex items-center justify-center relative overflow-hidden shadow-inner">
            {/* 3x3 grid guide lines */}
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

            {/* Dynamic Animated Frame */}
            <div
              style={{
                width: `${displayedRatio.width}px`,
                height: `${displayedRatio.height}px`,
              }}
              className="border-2 border-studio-cyan rounded shadow-md transition-all duration-150 bg-studio-cyan/30 flex items-center justify-center relative z-10 ring-1 ring-white/20"
            >
              <span className="text-[10px] font-mono font-bold text-white drop-shadow">
                {displayedRatio.ratioName}
              </span>
            </div>
          </div>

          {/* 2-Column Grid with all 10 aspect ratios spacious and clearly readable */}
          <div
            className="grid grid-cols-2 gap-1.5"
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
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all text-left ${
                    isSelected
                      ? 'bg-studio-accent/30 text-white font-bold border border-studio-accent shadow-sm'
                      : isHovered
                      ? 'bg-studio-850 text-white border border-studio-700'
                      : 'text-gray-300 hover:bg-studio-850 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-studio-cyan font-bold text-xs shrink-0">
                      {item.ratioName}
                    </span>
                    <span className="text-gray-300 text-[11px] truncate">
                      {item.label.replace(item.ratioName, '').trim()}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-studio-emerald shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
