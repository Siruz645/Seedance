'use client';

import React, { useState } from 'react';
import { Clock, Plus, Minus } from 'lucide-react';

interface Props {
  value: number;
  onChange: (duration: number) => void;
  maxDuration?: number;
}

const PRESETS = [3, 5, 8, 10, 12, 15];

export const DurationPicker: React.FC<Props> = ({ value, onChange, maxDuration = 15 }) => {
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handleIncrement = () => {
    if (value < maxDuration) onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value > 1) onChange(value - 1);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-studio-cyan" />
          <span>Длительность шота</span>
        </label>
        <span className="text-xs font-mono font-bold text-studio-cyan bg-studio-850 px-2 py-0.5 rounded border border-studio-750">
          {value} сек
        </span>
      </div>

      {/* Preset pills + Stepper */}
      <div className="flex items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
              value === p
                ? 'bg-studio-accent border-studio-accent text-white shadow-sm shadow-studio-accent/20'
                : 'bg-studio-850 border-studio-700/80 text-gray-400 hover:text-white hover:bg-studio-800'
            }`}
          >
            {p}s
          </button>
        ))}

        {/* Stepper buttons for custom precise control */}
        <div className="flex items-center gap-0.5 bg-studio-850 border border-studio-700/80 rounded-lg p-0.5">
          <button
            type="button"
            onClick={handleDecrement}
            className="p-1 rounded hover:bg-studio-800 text-gray-400 hover:text-white"
            title="Уменьшить на 1 секунду"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min={1}
            max={maxDuration}
            value={value}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= maxDuration) {
                onChange(val);
              }
            }}
            className="w-7 text-center bg-transparent font-mono text-xs font-bold text-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handleIncrement}
            className="p-1 rounded hover:bg-studio-800 text-gray-400 hover:text-white"
            title="Увеличить на 1 секунду"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
