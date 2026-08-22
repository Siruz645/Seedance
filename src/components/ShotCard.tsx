'use client';

import React, { useState, useEffect } from 'react';
import {
  Shot,
  Resolution,
  SeedanceModelId,
  AspectRatio,
  MediaReference,
} from '@/types/studio';
import { useStudioStore } from '@/lib/projectStore';
import { applyNoiseToImage } from '@/lib/noiseFilter';
import { MediaDropzone } from './MediaDropzone';
import { ImagePreviewModal } from './ImagePreviewModal';
import { AspectRatioPicker } from './AspectRatioPicker';
import { CameraMotionDropdown } from './CameraMotionDropdown';
import { PromptEditorWithMentions } from './PromptEditorWithMentions';
import {
  Sparkles,
  Play,
  RotateCw,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Clock,
  Ratio,
  Maximize2,
  ZoomIn,
  Link,
  ShieldCheck,
  Settings,
  Plus,
  Minus,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';

interface Props {
  sceneId: string;
  shot: Shot;
  shotIndex: number;
  totalShots: number;
  isFullScreenFocus?: boolean;
}

const SEEDANCE_MODELS: { id: SeedanceModelId; name: string; maxDuration: number }[] = [
  { id: 'bytedance/seedance-2.0-fast', name: '⚡ Seedance 2.0 Fast (быстрый превью)', maxDuration: 15 },
  { id: 'bytedance/seedance-2.0-mini', name: '🎬 Seedance 2.0 Mini (режиссерский баланс)', maxDuration: 15 },
  { id: 'bytedance/seedance-2.0', name: '💎 Seedance 2.0 (флагманское кино)', maxDuration: 15 },
  { id: 'bytedance/seedance-2.5', name: '🚀 Seedance 2.5 (до 30 сек)', maxDuration: 30 },
];

const RESOLUTIONS: { id: Resolution; label: string }[] = [
  { id: '480p', label: '480p (Быстро)' },
  { id: '720p', label: '720p (HD Рекомендуемое)' },
  { id: '1080p', label: '1080p (Full HD)' },
];

const SOMATIC_PRESETS = [
  'микро-саккады глаз и моргание',
  'естественное дыхание и мимика',
  'соматическая реакция на окружение',
  'динамическое изменение глубины резкости',
];

export const ShotCard: React.FC<Props> = ({
  sceneId,
  shot,
  shotIndex,
  totalShots,
  isFullScreenFocus = false,
}) => {
  const {
    sceneGroups,
    updateShot,
    removeShot,
    duplicateShot,
    renderShotById,
    isCascadeRendering,
    currentRenderingShotIndex,
    setAdvancedSettingsModalShot,
    setPromptWorkspaceModalShot,
    setDirectorModalOpen,
    getResolvedStartFrameForShot,
    addReferenceToShot,
    removeReferenceFromShot,
    updateReferenceRole,
    updateReferenceUrl,
    updateReferenceData,
    copyReferencesFromShot,
    settings,
  } = useStudioStore();

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [noisyStartFrameUrl, setNoisyStartFrameUrl] = useState<string | null>(null);

  const targetGroup = sceneGroups.find((g) => g.id === sceneId);
  const resolvedStartFrameInfo = getResolvedStartFrameForShot(sceneId, shotIndex);
  const startFrameUrl = resolvedStartFrameInfo.url;
  const hasStartFrame = !!startFrameUrl;

  // Real-time client-side noise rendering for Start Frame preview
  useEffect(() => {
    let isMounted = true;
    if (shot.applyAntiFilterNoise && startFrameUrl) {
      applyNoiseToImage(startFrameUrl, shot.noiseStrength || 0.5).then((noisy) => {
        if (isMounted) setNoisyStartFrameUrl(noisy);
      });
    } else {
      setNoisyStartFrameUrl(null);
    }
    return () => {
      isMounted = false;
    };
  }, [shot.applyAntiFilterNoise, shot.noiseStrength, startFrameUrl]);

  const displayStartFrameUrl = (shot.applyAntiFilterNoise && noisyStartFrameUrl) ? noisyStartFrameUrl : startFrameUrl;

  const endFrameRef = shot.references.find((r) => r.role === 'end_frame');
  const hasEndFrame = !!endFrameRef;

  const prevShotNumber = shot.shotNumber - 1;
  const prevShot = targetGroup?.shots.find((s) => s.shotNumber === prevShotNumber);
  const prevShotHasRefs = prevShot && prevShot.references.some((r) => r.role !== 'start_frame' && r.role !== 'end_frame');

  const selectedModelMeta = SEEDANCE_MODELS.find((m) => m.id === shot.model) || SEEDANCE_MODELS[0];
  const maxDurationForModel = selectedModelMeta.maxDuration;

  const isCurrentRendering = isCascadeRendering && currentRenderingShotIndex === shotIndex;
  const isPromptEmpty = !shot.prompt || shot.prompt.trim().length === 0;

  const handleDurationChange = (delta: number) => {
    const current = shot.duration || 5;
    const nextVal = Math.max(3, Math.min(maxDurationForModel, current + delta));
    updateShot(sceneId, shot.id, { duration: nextVal });
  };

  const handleToggleEndFrameNoise = async () => {
    if (!endFrameRef) return;
    try {
      if (endFrameRef.hasNoise) {
        const restored = endFrameRef.originalUrl || endFrameRef.url;
        updateReferenceData(sceneId, shot.id, endFrameRef.id, { url: restored, hasNoise: false });
      } else {
        const originalBase = endFrameRef.originalUrl || endFrameRef.url;
        const noisy = await applyNoiseToImage(originalBase, 0.5);
        updateReferenceData(sceneId, shot.id, endFrameRef.id, {
          url: noisy,
          originalUrl: originalBase,
          hasNoise: true,
        });
      }
    } catch (e) {
      console.warn('End frame noise toggle error:', e);
    }
  };

  const insertTextAtCursor = (preset: string) => {
    updateShot(sceneId, shot.id, {
      prompt: (shot.prompt ? shot.prompt + ' ' : '') + preset,
    });
  };

  // Video / Keyframes Viewer Component
  const renderVideoAndKeyframes = () => {
    if (shot.outputVideoUrl) {
      return (
        <div className="space-y-2">
          <div className="rounded-2xl overflow-hidden bg-black border border-studio-700 aspect-video relative group shadow-inner">
            <video
              src={shot.outputVideoUrl}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-studio-850 border border-studio-750">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-studio-emerald shrink-0" />
              <span className="text-[10px] text-gray-300 truncate">
                Шот сохранен в <code className="text-studio-cyan font-mono">video/</code>
              </span>
            </div>
            <a
              href={shot.outputVideoUrl}
              download={`shot_${shot.shotNumber}_seedance.mp4`}
              className="px-2 py-0.5 rounded bg-studio-800 hover:bg-studio-750 text-[10px] font-semibold text-white border border-studio-600 flex items-center gap-1 transition-colors shrink-0"
            >
              <FileDown className="w-3 h-3 text-studio-cyan" />
              <span>MP4</span>
            </a>
          </div>
        </div>
      );
    }

    if (hasStartFrame || hasEndFrame) {
      return (
        <div className="space-y-2">
          <div className={`grid gap-2 ${hasStartFrame && hasEndFrame ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Start Frame */}
            {hasStartFrame && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-studio-cyan">
                    <Link className="w-3 h-3" />
                    <span>Начальный кадр (Start)</span>
                  </span>
                </div>
                <div
                  onClick={() =>
                    setPreviewImage({
                      url: displayStartFrameUrl || startFrameUrl!,
                      title: `Начальный кадр Шота #${shot.shotNumber}${
                        shot.applyAntiFilterNoise
                          ? ` (Анти-детект шум ${Math.round((shot.noiseStrength || 0.5) * 100)}%)`
                          : ''
                      }`,
                    })
                  }
                  className="relative aspect-video rounded-xl bg-black border border-studio-700 overflow-hidden cursor-pointer hover:border-studio-cyan transition-all group"
                  title="Кликните для полноэкранного предпросмотра"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayStartFrameUrl || startFrameUrl}
                    alt="Start Frame"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-studio-emerald font-semibold truncate max-w-[90%] flex items-center gap-1">
                    {shot.applyAntiFilterNoise && (
                      <span className="text-amber-400 font-bold">🛡️ Шум {Math.round((shot.noiseStrength || 0.5) * 100)}% •</span>
                    )}
                    <span>{resolvedStartFrameInfo.sourceLabel}</span>
                  </div>
                </div>

                {/* Anti-Detect Noise Checkbox */}
                <div className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-studio-950/80 border border-studio-750">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!shot.applyAntiFilterNoise}
                      onChange={(e) => updateShot(sceneId, shot.id, { applyAntiFilterNoise: e.target.checked })}
                      className="w-3 h-3 accent-studio-cyan rounded cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-gray-300">
                      Шум (Обход цензора)
                    </span>
                  </label>

                  {shot.applyAntiFilterNoise && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-studio-cyan font-mono font-bold">
                        {Math.round((shot.noiseStrength || 0.5) * 100)}%
                      </span>
                      <input
                        type="range"
                        min="0.2"
                        max="0.8"
                        step="0.05"
                        value={shot.noiseStrength || 0.5}
                        onChange={(e) => updateShot(sceneId, shot.id, { noiseStrength: parseFloat(e.target.value) })}
                        className="w-12 accent-studio-cyan cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* End Frame */}
            {hasEndFrame && endFrameRef && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-purple-400">
                    <Link className="w-3 h-3" />
                    <span>Конечный кадр (End)</span>
                  </span>
                </div>
                <div
                  onClick={() =>
                    setPreviewImage({
                      url: endFrameRef.url,
                      title: `Конечный кадр Шота #${shot.shotNumber}`,
                    })
                  }
                  className="relative aspect-video rounded-xl bg-black border border-studio-700 overflow-hidden cursor-pointer hover:border-purple-400 transition-all group"
                  title="Кликните для полноэкранного предпросмотра"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={endFrameRef.url} alt="End Frame" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ZoomIn className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* End Frame Noise Toggle */}
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-studio-950/80 border border-studio-750">
                  <span className="text-[10px] text-gray-400 font-semibold">Шум для End Frame:</span>
                  <button
                    type="button"
                    onClick={handleToggleEndFrameNoise}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                      endFrameRef.hasNoise
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-studio-800 text-gray-300 border-studio-700 hover:text-white'
                    }`}
                  >
                    {endFrameRef.hasNoise ? 'Шум: ВКЛ' : '+ Шум 50%'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  // Technical HUD Parameters Column
  const renderParametersHud = () => (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-studio-800/80 pb-2">
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-studio-cyan" />
          <span>Параметры</span>
        </span>
        <button
          type="button"
          onClick={() => setAdvancedSettingsModalShot({ sceneId, shotId: shot.id })}
          className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
          title="Расширенные параметры (FPS, Seed, SFX звук)"
        >
          <Settings className="w-3.5 h-3.5 text-studio-cyan" />
        </button>
      </div>

      {/* 1. Model Selector */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
          Модель
        </label>
        <select
          value={shot.model}
          onChange={(e) => updateShot(sceneId, shot.id, { model: e.target.value as SeedanceModelId })}
          className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-studio-cyan cursor-pointer font-medium"
        >
          {SEEDANCE_MODELS.map((m) => (
            <option key={m.id} value={m.id} className="bg-studio-950 text-white">
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Duration Stepper */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-studio-cyan" />
            <span>Длительность</span>
          </label>
          <span className="text-xs font-mono font-bold text-studio-cyan">
            {shot.duration || 5} сек
          </span>
        </div>

        <div className="flex items-center justify-between bg-studio-900 border border-studio-750 rounded-xl p-1 shadow-sm">
          <button
            type="button"
            onClick={() => handleDurationChange(-1)}
            disabled={shot.duration <= 3}
            className="w-7 h-7 rounded-lg bg-studio-800 hover:bg-studio-750 text-gray-300 hover:text-white disabled:opacity-30 transition-colors flex items-center justify-center font-bold"
            title="Уменьшить на 1 секунду"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 font-mono">
            <input
              type="number"
              min={3}
              max={maxDurationForModel}
              value={shot.duration || 5}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  updateShot(sceneId, shot.id, { duration: Math.max(3, Math.min(maxDurationForModel, val)) });
                }
              }}
              className="w-8 text-center bg-transparent text-xs font-mono font-bold text-studio-cyan focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[11px] text-gray-400 font-medium">секунд</span>
          </div>

          <button
            type="button"
            onClick={() => handleDurationChange(1)}
            disabled={shot.duration >= maxDurationForModel}
            className="w-7 h-7 rounded-lg bg-studio-800 hover:bg-studio-750 text-gray-300 hover:text-white disabled:opacity-30 transition-colors flex items-center justify-center font-bold"
            title="Увеличить на 1 секунду"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preset Chips */}
        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {[4, 6, 10, 15].map((d) => (
            <button
              key={d}
              type="button"
              disabled={d > maxDurationForModel}
              onClick={() => updateShot(sceneId, shot.id, { duration: d })}
              className={`py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all disabled:opacity-30 ${
                shot.duration === d
                  ? 'bg-studio-accent/20 border-studio-accent text-white font-bold shadow-sm'
                  : 'bg-studio-900 border-studio-750 text-gray-400 hover:text-white'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* 3. Aspect Ratio Picker */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <Ratio className="w-3 h-3 text-studio-cyan" />
          <span>Формат кадра</span>
        </label>
        <AspectRatioPicker
          value={shot.aspectRatio}
          onChange={(ratio) => updateShot(sceneId, shot.id, { aspectRatio: ratio })}
        />
      </div>

      {/* 4. Resolution */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
          Разрешение
        </label>
        <select
          value={shot.resolution}
          onChange={(e) => updateShot(sceneId, shot.id, { resolution: e.target.value as Resolution })}
          className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-studio-cyan cursor-pointer font-medium"
        >
          {RESOLUTIONS.map((r) => (
            <option key={r.id} value={r.id} className="bg-studio-950 text-white">
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Camera Vector Dropdown */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
          Вектор камеры
        </label>
        <CameraMotionDropdown
          value={shot.cameraMotion || 'Auto'}
          onChange={(motion) => updateShot(sceneId, shot.id, { cameraMotion: motion })}
        />
      </div>

      {/* 6. Start Frame Chaining Mode */}
      <div className="space-y-1 border-t border-studio-800/80 pt-2">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
          Источник Start кадра
        </label>
        <div className="grid grid-cols-2 gap-1">
          {shot.shotNumber > 1 && (
            <button
              type="button"
              onClick={() => updateShot(sceneId, shot.id, { startFrameSourceMode: 'previous_scene' })}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all text-center ${
                shot.startFrameSourceMode === 'previous_scene'
                  ? 'bg-studio-emerald/20 border-studio-emerald text-studio-emerald'
                  : 'bg-studio-900 border-studio-750 text-gray-400 hover:text-white'
              }`}
            >
              Шот #{shot.shotNumber - 1}
            </button>
          )}

          <button
            type="button"
            onClick={() => updateShot(sceneId, shot.id, { startFrameSourceMode: 'none' })}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all text-center ${
              shot.startFrameSourceMode === 'none'
                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                : 'bg-studio-900 border-studio-750 text-gray-400 hover:text-white'
            }`}
          >
            Без кадра (T2V)
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`${
        isFullScreenFocus
          ? 'w-full h-full rounded-3xl bg-studio-900 border flex flex-col shadow-2xl overflow-hidden'
          : 'w-[660px] h-[calc(100vh-210px)] shrink-0 rounded-2xl bg-studio-900 border flex flex-col shadow-xl overflow-hidden'
      } transition-all ${
        shot.status === 'rendering'
          ? 'border-studio-accent ring-2 ring-studio-accent/30 shadow-2xl shadow-studio-accent/20'
          : shot.status === 'completed'
          ? 'border-studio-emerald/50 hover:border-studio-emerald/80'
          : 'border-studio-750 hover:border-studio-650'
      }`}
    >
      {/* Top Header */}
      <div className="p-3 border-b border-studio-800 flex items-center justify-between bg-studio-950/60 rounded-t-2xl shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-studio-accent/20 border border-studio-accent/40 flex items-center justify-center font-bold text-xs text-studio-cyan font-mono shadow-inner">
            #{shot.shotNumber}
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Шот {shot.shotNumber}</span>
              <span className="text-[10px] font-normal text-gray-400">({targetGroup?.name})</span>
            </h4>
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              shot.status === 'completed'
                ? 'bg-studio-emerald/20 text-studio-emerald border-studio-emerald/40'
                : shot.status === 'rendering'
                ? 'bg-studio-accent/20 text-studio-cyan border-studio-accent/40 animate-pulse'
                : shot.status === 'failed'
                ? 'bg-studio-rose/20 text-rose-300 border-studio-rose/40'
                : 'bg-studio-800 text-gray-400 border-studio-700'
            }`}
          >
            {shot.status === 'completed'
              ? '✓ Готов'
              : shot.status === 'rendering'
              ? `⏳ Рендеринг ${shot.progress}%`
              : shot.status === 'failed'
              ? '⚠ Ошибка'
              : 'Черновик'}
          </span>

          <button
            type="button"
            onClick={() => duplicateShot(sceneId, shot.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
            title="Дублировать шот"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {totalShots > 1 && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Удалить шот #${shot.shotNumber}?`)) {
                  removeShot(sceneId, shot.id);
                }
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-studio-800 transition-colors"
              title="Удалить шот"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Director Body */}
      {isFullScreenFocus ? (
        /* ================= 90% FOCUS MODE LAYOUT ================= */
        <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left Column (7 cols): 1. TOP: Prominent Prompt -> 2. BOTTOM: References Gallery */}
          <div className="md:col-span-7 flex flex-col space-y-4 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 h-full">
            {/* 1. Prompt Area (TOP in 90% Mode) */}
            <div className="space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Промпт динамики, физики и соматики</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPromptWorkspaceModalShot({ sceneId, shotId: shot.id })}
                    className="flex items-center gap-1 text-[11px] font-semibold text-gray-300 hover:text-white bg-studio-800 hover:bg-studio-750 px-2.5 py-1 rounded-lg border border-studio-700 hover:border-studio-cyan transition-all"
                    title="Открыть полноэкранный редактор на 90% экрана"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-studio-cyan" />
                    <span>На весь экран</span>
                  </button>
                  {settings.enableAiDirector && (
                    <button
                      type="button"
                      onClick={() => setDirectorModalOpen(true, shot.id)}
                      className="flex items-center gap-1 text-xs font-bold text-studio-cyan hover:text-cyan-300 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>✨ AI Режиссер</span>
                    </button>
                  )}
                </div>
              </div>

              <PromptEditorWithMentions
                value={shot.prompt}
                onChange={(val) => updateShot(sceneId, shot.id, { prompt: val })}
                sceneId={sceneId}
                shotId={shot.id}
                references={shot.references}
                placeholder="Опишите непрерывное действие персонажа, соматику или наберите @ для выбора нужного референса..."
                rows={6}
                className={`w-full rounded-2xl p-3.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none transition-colors leading-relaxed ${
                  isPromptEmpty
                    ? 'bg-rose-950/10 border border-rose-500/50 focus:border-rose-400'
                    : 'bg-studio-850 border border-studio-750 focus:border-studio-accent'
                }`}
              />

              {/* Somatic Quick Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {SOMATIC_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => insertTextAtCursor(preset)}
                    className="px-2.5 py-0.5 rounded-lg bg-studio-850 hover:bg-studio-800 text-[11px] text-gray-300 hover:text-white border border-studio-750 hover:border-studio-600 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Multimodal References Gallery (BOTTOM in 90% Mode) */}
            <div className="space-y-2 border-t border-studio-800 pt-3">
              <div className="flex items-center justify-between text-xs text-gray-300 font-bold uppercase tracking-wider">
                <span>Мультимодальные референсы ({shot.references.length})</span>
                {shot.shotNumber > 1 && prevShotHasRefs && (
                  <button
                    type="button"
                    onClick={() => copyReferencesFromShot(sceneId, shot.id, prevShotNumber)}
                    className="text-studio-cyan hover:underline font-bold text-xs normal-case"
                  >
                    + Скопировать из Шота #{prevShotNumber}
                  </button>
                )}
              </div>

              <MediaDropzone
                sceneId={sceneId}
                shotId={shot.id}
                references={shot.references}
                isLargeLayout={true}
                showCrossShotPool={true}
                hasExistingStartFrame={hasStartFrame || (shot.shotNumber > 1 && shot.startFrameSourceMode === 'previous_scene')}
                onInsertTagToPrompt={(tag) => {
                  updateShot(sceneId, shot.id, {
                    prompt: (shot.prompt ? shot.prompt + ' ' : '') + tag,
                  });
                }}
                onAddReference={(ref) => addReferenceToShot(sceneId, shot.id, ref)}
                onRemoveReference={(refId) => removeReferenceFromShot(sceneId, shot.id, refId)}
                onUpdateRole={(refId, role) => updateReferenceRole(sceneId, shot.id, refId, role)}
                onUpdateUrl={(refId, url) => updateReferenceUrl(sceneId, shot.id, refId, url)}
                onUpdateData={(refId, data) => updateReferenceData(sceneId, shot.id, refId, data)}
              />
            </div>
          </div>

          {/* Right Column (5 cols): Video Player / Keyframes on Top + Parameters HUD below */}
          <div className="md:col-span-5 bg-studio-950/70 border border-studio-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 overflow-y-auto overflow-x-hidden custom-scrollbar h-full">
            {/* Top: Video Player or Keyframe Showcase */}
            {renderVideoAndKeyframes()}

            {/* Bottom: Technical Parameters */}
            {renderParametersHud()}

            {/* Render Button in Focus Mode */}
            <div className="border-t border-studio-800/80 pt-3">
              <button
                type="button"
                disabled={isCurrentRendering || isPromptEmpty}
                onClick={() => renderShotById(sceneId, shot.id)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                  isCurrentRendering
                    ? 'bg-studio-accent text-white animate-pulse'
                    : isPromptEmpty
                    ? 'bg-studio-800 text-gray-500 cursor-not-allowed border border-studio-750'
                    : 'bg-gradient-to-r from-studio-accent to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-studio-accent/25 cursor-pointer'
                }`}
              >
                {isCurrentRendering ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Генерация {shot.progress}%</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-white fill-white" />
                    <span>Сгенерировать Шот #{shot.shotNumber}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= TIMELINE STANDARD CARD LAYOUT ================= */
        <div className="p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 min-h-0 overflow-hidden">
          {/* Left Column (8 cols) */}
          <div className="md:col-span-8 space-y-3.5 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1.5 h-full">
            {/* 1. Large Keyframe Showcase / Video Player */}
            {renderVideoAndKeyframes()}

            {/* 2. Prompt Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Промпт динамики и соматики</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPromptWorkspaceModalShot({ sceneId, shotId: shot.id })}
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-300 hover:text-white bg-studio-800 hover:bg-studio-750 px-2 py-0.5 rounded-md border border-studio-700 hover:border-studio-cyan transition-all"
                    title="Открыть полноэкранный редактор на 90% экрана"
                  >
                    <Maximize2 className="w-3 h-3 text-studio-cyan" />
                    <span>На весь экран</span>
                  </button>
                  {settings.enableAiDirector && (
                    <button
                      type="button"
                      onClick={() => setDirectorModalOpen(true, shot.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-studio-cyan hover:text-cyan-300 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>✨ AI Режиссер</span>
                    </button>
                  )}
                </div>
              </div>

              <PromptEditorWithMentions
                value={shot.prompt}
                onChange={(val) => updateShot(sceneId, shot.id, { prompt: val })}
                sceneId={sceneId}
                shotId={shot.id}
                references={shot.references}
                placeholder="Опишите непрерывное действие персонажа, соматику или наберите @ для выбора нужного референса..."
                rows={3}
                className={`w-full rounded-xl p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-colors leading-relaxed ${
                  isPromptEmpty
                    ? 'bg-rose-950/10 border border-rose-500/50 focus:border-rose-400'
                    : 'bg-studio-850 border border-studio-750 focus:border-studio-accent'
                }`}
              />
            </div>

            {/* 3. References Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                <span>Мультимодальные референсы ({shot.references.length})</span>
                {shot.shotNumber > 1 && prevShotHasRefs && (
                  <button
                    type="button"
                    onClick={() => copyReferencesFromShot(sceneId, shot.id, prevShotNumber)}
                    className="text-studio-cyan hover:underline font-bold text-[11px] normal-case"
                  >
                    + Скопировать из Шота #{prevShotNumber}
                  </button>
                )}
              </div>

              <MediaDropzone
                sceneId={sceneId}
                shotId={shot.id}
                references={shot.references}
                isLargeLayout={false}
                showCrossShotPool={false}
                hasExistingStartFrame={hasStartFrame || (shot.shotNumber > 1 && shot.startFrameSourceMode === 'previous_scene')}
                onInsertTagToPrompt={(tag) => {
                  updateShot(sceneId, shot.id, {
                    prompt: (shot.prompt ? shot.prompt + ' ' : '') + tag,
                  });
                }}
                onAddReference={(ref) => addReferenceToShot(sceneId, shot.id, ref)}
                onRemoveReference={(refId) => removeReferenceFromShot(sceneId, shot.id, refId)}
                onUpdateRole={(refId, role) => updateReferenceRole(sceneId, shot.id, refId, role)}
                onUpdateUrl={(refId, url) => updateReferenceUrl(sceneId, shot.id, refId, url)}
                onUpdateData={(refId, data) => updateReferenceData(sceneId, shot.id, refId, data)}
              />
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="md:col-span-4 bg-studio-950/70 border border-studio-800 rounded-xl p-3 flex flex-col justify-between space-y-3 overflow-y-auto overflow-x-hidden custom-scrollbar h-full">
            {renderParametersHud()}

            {/* Render Button in Timeline Mode */}
            <div className="border-t border-studio-800/80 pt-2">
              <button
                type="button"
                disabled={isCurrentRendering || isPromptEmpty}
                onClick={() => renderShotById(sceneId, shot.id)}
                className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                  isCurrentRendering
                    ? 'bg-studio-accent text-white animate-pulse'
                    : isPromptEmpty
                    ? 'bg-studio-800 text-gray-500 cursor-not-allowed border border-studio-750'
                    : 'bg-gradient-to-r from-studio-accent to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-studio-accent/25 cursor-pointer'
                }`}
              >
                {isCurrentRendering ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Генерация {shot.progress}%</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-white fill-white" />
                    <span>Сгенерировать Шот</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
};
