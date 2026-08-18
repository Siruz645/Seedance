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
  ZoomIn,
  Clock,
  Plus,
  Minus,
  Cpu,
  Settings,
  Link,
  Undo2,
  Maximize2,
} from 'lucide-react';

interface Props {
  sceneId: string;
  shot: Shot;
  shotIndex: number;
  totalShots: number;
  isFullScreenFocus?: boolean;
}

const SEEDANCE_MODELS: {
  id: SeedanceModelId;
  name: string;
  tag: string;
  maxDuration: number;
  resolutions: Resolution[];
}[] = [
  {
    id: 'bytedance/seedance-2.5',
    name: 'Seedance 2.5',
    tag: '4-30 сек • SFX',
    maxDuration: 30,
    resolutions: ['480p', '720p'],
  },
  {
    id: 'bytedance/seedance-2.0',
    name: 'Seedance 2.0 (Флагман)',
    tag: '4-15 сек • 4K',
    maxDuration: 15,
    resolutions: ['480p', '720p', '1080p', '4K'],
  },
  {
    id: 'bytedance/seedance-2.0-fast',
    name: 'Seedance 2.0 Fast',
    tag: '4-15 сек • Быстрый',
    maxDuration: 15,
    resolutions: ['480p', '720p'],
  },
  {
    id: 'bytedance/seedance-2.0-mini',
    name: 'Seedance 2.0 Mini',
    tag: '4-15 сек • Легкий',
    maxDuration: 15,
    resolutions: ['480p', '720p'],
  },
  {
    id: 'bytedance/seedance-1-5-pro',
    name: 'Seedance 1.5 Pro',
    tag: '4-12 сек',
    maxDuration: 12,
    resolutions: ['480p', '720p', '1080p'],
  },
];

export const ShotCard: React.FC<Props> = ({ sceneId, shot, shotIndex, totalShots, isFullScreenFocus }) => {
  const {
    sceneGroups,
    settings,
    updateShot,
    removeShot,
    duplicateShot,
    addReferenceToShot,
    removeReferenceFromShot,
    updateReferenceRole,
    updateReferenceUrl,
    updateReferenceData,
    setStartFrameSource,
    copyReferencesFromShot,
    getResolvedStartFrameForShot,
    renderShotById,
    setDirectorModalOpen,
    setAdvancedSettingsModalShot,
    setPromptWorkspaceModalShot,
  } = useStudioStore();

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const resolvedStartFrameInfo = getResolvedStartFrameForShot(sceneId, shotIndex);

  // Live visual noisy start frame preview (real-time Canvas rendering)
  const [liveStartFrameUrl, setLiveStartFrameUrl] = useState<string | undefined>(resolvedStartFrameInfo.url);

  useEffect(() => {
    let isCurrent = true;
    const rawUrl = resolvedStartFrameInfo.url;
    if (!rawUrl) {
      setLiveStartFrameUrl(undefined);
      return;
    }

    if (shot.applyAntiFilterNoise) {
      const intensity = shot.noiseStrength !== undefined ? shot.noiseStrength : 0.5;
      applyNoiseToImage(rawUrl, intensity).then((noisy) => {
        if (isCurrent) setLiveStartFrameUrl(noisy);
      });
    } else {
      setLiveStartFrameUrl(rawUrl);
    }

    return () => {
      isCurrent = false;
    };
  }, [resolvedStartFrameInfo.url, shot.applyAntiFilterNoise, shot.noiseStrength]);

  const handleRender = async () => {
    try {
      await renderShotById(sceneId, shot.id);
    } catch (e) {
      console.error(e);
    }
  };

  const currentModel = SEEDANCE_MODELS.find((m) => m.id === shot.model) || SEEDANCE_MODELS[0];
  const maxDurationForModel = currentModel.maxDuration;
  const isPromptEmpty = !shot.prompt || shot.prompt.trim().length === 0;

  const targetGroup = sceneGroups.find((g) => g.id === sceneId);
  const prevShotNumber = shot.shotNumber > 1 ? shot.shotNumber - 1 : 1;
  const prevShot = targetGroup?.shots.find((s) => s.shotNumber === prevShotNumber);
  const prevShotHasRefs = prevShot && prevShot.references.some((r) => r.role !== 'start_frame' && r.role !== 'end_frame');

  const startFrameUrl = liveStartFrameUrl || resolvedStartFrameInfo.url;
  const endFrameRef = shot.references.find((r) => r.role === 'end_frame');
  const hasStartFrame = !!startFrameUrl && shot.startFrameSourceMode !== 'none';
  const hasEndFrame = !!endFrameRef?.url;

  // Step duration increment/decrement
  const handleDurationChange = (delta: number) => {
    const nextVal = Math.max(3, Math.min(maxDurationForModel, (shot.duration || 5) + delta));
    updateShot(sceneId, shot.id, { duration: nextVal });
  };

  // Toggle End Frame Noise
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

  return (
    <div
      className={`${
        isFullScreenFocus
          ? 'w-full h-full rounded-2xl bg-studio-900 border flex flex-col shadow-2xl overflow-hidden'
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

      {/* Main Director Split Body */}
      <div className="p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 min-h-0 overflow-hidden">
        {/* LEFT COLUMN (8 cols): 1. Showcase Video/Keyframe -> 2. PROMPT -> 3. REFERENCES */}
        <div className="md:col-span-8 space-y-3.5 overflow-y-auto custom-scrollbar pr-1.5 h-full">
          {/* 1. Large Keyframe Showcase / Video Player */}
          {shot.outputVideoUrl ? (
            <div className="space-y-2">
              <div className="rounded-xl overflow-hidden bg-black border border-studio-700 aspect-video relative group shadow-inner">
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
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-studio-850 border border-studio-750">
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
          ) : hasStartFrame || hasEndFrame ? (
            <div className="space-y-2">
              {/* Side-by-side or Single Large Frame */}
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
                          url: startFrameUrl!,
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
                      <img src={startFrameUrl} alt="Start Frame" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-studio-emerald font-semibold truncate max-w-[90%]">
                        {resolvedStartFrameInfo.sourceLabel}
                      </div>
                    </div>

                    {/* Anti-Detect Noise Checkbox under start frame */}
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
          ) : null}

          {/* 2. PROMPT AREA (Moved ABOVE References per requirement #6) */}
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

          {/* 3. MULTIMODAL REFERENCES AREA (1 per row, large thumbnails) */}
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
              references={shot.references}
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

        {/* RIGHT COLUMN (HUD / Technical Panel - 4 cols) */}
        <div className="md:col-span-4 bg-studio-950/70 border border-studio-800 rounded-xl p-3 flex flex-col justify-between space-y-3 overflow-y-auto custom-scrollbar h-full">
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

            {/* 2. Duration Stepper + Direct Input + Preset Chips */}
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

              {/* Full-width Stepper underneath the label */}
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

            {/* 3. Visual Aspect Ratio Picker (Visual preview boxes restored) */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                Формат кадра
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
                className="w-full bg-studio-900 border border-studio-750 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-studio-cyan cursor-pointer"
              >
                {currentModel.resolutions.map((r) => (
                  <option key={r} value={r} className="bg-studio-950 text-white">
                    {r} {r === '720p' ? '(Рекомендуемое)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Camera Motion Vector (Moved here per Annotation #4) */}
            <CameraMotionDropdown
              value={shot.cameraMotion}
              onChange={(motion) => updateShot(sceneId, shot.id, { cameraMotion: motion })}
            />

            {/* 6. Keyframe Source Mode */}
            {shot.shotNumber > 1 && (
              <div className="space-y-1 pt-1 border-t border-studio-800/60">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Источник Start кадра
                </label>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setStartFrameSource(sceneId, shot.id, 'previous_scene')}
                    className={`p-1 rounded border text-center font-medium truncate ${
                      shot.startFrameSourceMode === 'previous_scene'
                        ? 'bg-studio-accent/20 border-studio-accent text-white font-bold'
                        : 'bg-studio-900 border-studio-750 text-gray-400'
                    }`}
                  >
                    Из #{prevShotNumber}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartFrameSource(sceneId, shot.id, 'none')}
                    className={`p-1 rounded border text-center font-medium truncate ${
                      shot.startFrameSourceMode === 'none'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-studio-900 border-studio-750 text-gray-400'
                    }`}
                  >
                    Без кадра (T2V)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Render Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRender}
              disabled={shot.status === 'rendering' || isPromptEmpty}
              className={`w-full py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                isPromptEmpty
                  ? 'bg-studio-800 text-rose-400/80 cursor-not-allowed border border-rose-500/30'
                  : shot.status === 'rendering'
                  ? 'bg-studio-800 text-gray-400 cursor-not-allowed border border-studio-700'
                  : shot.status === 'completed'
                  ? 'bg-studio-800 hover:bg-studio-750 text-studio-emerald border border-studio-emerald/40 hover:border-studio-emerald'
                  : 'bg-gradient-to-r from-studio-accent to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-studio-accent/20'
              }`}
            >
              {isPromptEmpty ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Введите промпт</span>
                </>
              ) : shot.status === 'rendering' ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-studio-cyan" />
                  <span>{shot.progress}%</span>
                </>
              ) : shot.status === 'completed' ? (
                <>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Перегенерировать</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Рендер {shot.duration}s</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Lightbox Modal */}
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
