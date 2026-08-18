'use client';

import React from 'react';
import { useStudioStore } from '@/lib/projectStore';
import { FrameRate } from '@/types/studio';
import { X, Sliders, Volume2, VolumeX, Shuffle, Check } from 'lucide-react';

export const ShotAdvancedSettingsModal: React.FC = () => {
  const {
    sceneGroups,
    advancedSettingsModalShot,
    setAdvancedSettingsModalShot,
    updateShot,
  } = useStudioStore();

  if (!advancedSettingsModalShot) return null;

  const { sceneId, shotId } = advancedSettingsModalShot;
  const targetGroup = sceneGroups.find((g) => g.id === sceneId);
  const shot = targetGroup?.shots.find((s) => s.id === shotId);

  if (!shot || !targetGroup) return null;

  const handleClose = () => setAdvancedSettingsModalShot(null);

  const handleSeedRandom = () => {
    updateShot(sceneId, shotId, { seed: Math.floor(Math.random() * 1000000) });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-studio-950 border border-studio-700 rounded-2xl p-5 space-y-4 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-studio-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-studio-cyan" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Расширенные параметры: Шот #{shot.shotNumber}
              </h3>
              <p className="text-[11px] text-gray-400">{targetGroup.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 text-xs">
          {/* FPS Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block">
              Частота кадров (FPS)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([24, 30, 60] as FrameRate[]).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => updateShot(sceneId, shotId, { fps: rate })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    shot.fps === rate
                      ? 'bg-studio-accent/20 border-studio-accent text-white shadow-sm ring-1 ring-studio-accent/30'
                      : 'bg-studio-900 border-studio-750 text-gray-400 hover:text-white hover:bg-studio-850'
                  }`}
                >
                  {rate} FPS {rate === 24 ? '🎬 Кино' : ''}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500">
              24 FPS — золотой кинематографический стандарт движения Seedance без замедления.
            </p>
          </div>

          {/* Seed Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
                Сид генератора (Seed)
              </label>
              <button
                type="button"
                onClick={handleSeedRandom}
                className="text-[11px] text-studio-cyan hover:underline flex items-center gap-1 font-semibold"
              >
                <Shuffle className="w-3 h-3" />
                <span>Случайный</span>
              </button>
            </div>
            <input
              type="number"
              value={shot.seed || 0}
              onChange={(e) => updateShot(sceneId, shotId, { seed: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-studio-900 border border-studio-750 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-studio-cyan font-mono"
            />
          </div>

          {/* Motion Strength Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
                Сила динамики движения (Motion Strength)
              </label>
              <span className="text-[11px] font-mono font-bold text-studio-cyan">
                {shot.motionStrength || 5.0}
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.5"
              value={shot.motionStrength || 5.0}
              onChange={(e) => updateShot(sceneId, shotId, { motionStrength: parseFloat(e.target.value) })}
              className="w-full accent-studio-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>1.0 (Минимальное)</span>
              <span>5.0 (Естественное)</span>
              <span>10.0 (Максимальная экспрессия)</span>
            </div>
          </div>

          {/* Generate Audio Toggle */}
          <div className="p-3 rounded-xl bg-studio-900 border border-studio-750 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {shot.generateAudio ? (
                <Volume2 className="w-5 h-5 text-studio-emerald shrink-0" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-500 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-white">Автономный SFX звук</p>
                <p className="text-[10px] text-gray-400">
                  Генерирует звуки окружения, шагов и интершум в такт видео
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateShot(sceneId, shotId, { generateAudio: !shot.generateAudio })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                shot.generateAudio
                  ? 'bg-studio-emerald/20 border-studio-emerald text-emerald-300'
                  : 'bg-studio-800 border-studio-700 text-gray-400'
              }`}
            >
              {shot.generateAudio ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </div>

          {/* Negative Prompt */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block">
              Отрицательный промпт (Negative Prompt)
            </label>
            <textarea
              rows={2}
              value={shot.negativePrompt}
              onChange={(e) => updateShot(sceneId, shotId, { negativePrompt: e.target.value })}
              placeholder="blur, low quality, distortion, morphing, static..."
              className="w-full bg-studio-900 border border-studio-750 rounded-xl p-2.5 text-xs text-gray-200 focus:outline-none focus:border-studio-cyan resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-studio-800 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-studio-accent hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Применить настройки</span>
          </button>
        </div>
      </div>
    </div>
  );
};
