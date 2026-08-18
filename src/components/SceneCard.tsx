'use client';

import React, { useState, useEffect } from 'react';
import { Scene, Resolution, FrameRate, SeedanceModelId, StartFrameSourceMode } from '@/types/studio';
import { useStudioStore } from '@/lib/projectStore';
import { applyNoiseToImage } from '@/lib/noiseFilter';
import { MediaDropzone } from './MediaDropzone';
import { ImagePreviewModal } from './ImagePreviewModal';
import { CameraMotionPicker } from './CameraMotionPicker';
import { AspectRatioPicker } from './AspectRatioPicker';
import { DurationPicker } from './DurationPicker';
import {
  Sparkles,
  Play,
  RotateCw,
  Copy,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Maximize,
  ArrowRightCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Volume2,
  VolumeX,
  Link,
  Ban,
  FileDown,
  ZoomIn,
} from 'lucide-react';

interface Props {
  scene: Scene;
  sceneIndex: number;
  isFirst: boolean;
  isLast: boolean;
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
    name: 'Seedance 2.5 (Новейшая)',
    tag: '4-30 сек • 480p/720p • SFX Audio',
    maxDuration: 30,
    resolutions: ['480p', '720p'],
  },
  {
    id: 'bytedance/seedance-2.0',
    name: 'Seedance 2.0 (Флагман)',
    tag: '4-15 сек • 480p-4K • Режиссерский',
    maxDuration: 15,
    resolutions: ['480p', '720p', '1080p', '4K'],
  },
  {
    id: 'bytedance/seedance-2.0-fast',
    name: 'Seedance 2.0 Fast',
    tag: '4-15 сек • Быстрый рендеринг',
    maxDuration: 15,
    resolutions: ['480p', '720p'],
  },
  {
    id: 'bytedance/seedance-2.0-mini',
    name: 'Seedance 2.0 Mini',
    tag: '4-15 сек • Легкая модель',
    maxDuration: 15,
    resolutions: ['480p', '720p'],
  },
  {
    id: 'bytedance/seedance-1-5-pro',
    name: 'Seedance 1.5 Pro',
    tag: '4-12 сек • 480p-1080p',
    maxDuration: 12,
    resolutions: ['480p', '720p', '1080p'],
  },
];

export const SceneCard: React.FC<Props> = ({ scene, sceneIndex, isFirst, isLast }) => {
  const {
    scenes,
    settings,
    updateScene,
    removeScene,
    duplicateScene,
    addReferenceToScene,
    removeReferenceFromScene,
    updateReferenceRole,
    updateReferenceUrl,
    setStartFrameSource,
    copyReferencesFromScene,
    getResolvedStartFrameForScene,
    renderSceneById,
    setDirectorModalOpen,
  } = useStudioStore();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const resolvedStartFrameInfo = getResolvedStartFrameForScene(sceneIndex);

  // Live visual noisy start frame preview (real-time Canvas rendering)
  const [liveStartFrameUrl, setLiveStartFrameUrl] = useState<string | undefined>(resolvedStartFrameInfo.url);

  useEffect(() => {
    let isCurrent = true;
    const rawUrl = resolvedStartFrameInfo.url;
    if (!rawUrl) {
      setLiveStartFrameUrl(undefined);
      return;
    }

    if (scene.applyAntiFilterNoise) {
      const intensity = scene.noiseStrength !== undefined ? scene.noiseStrength : 0.5;
      applyNoiseToImage(rawUrl, intensity).then((noisy) => {
        if (isCurrent) setLiveStartFrameUrl(noisy);
      });
    } else {
      setLiveStartFrameUrl(rawUrl);
    }

    return () => {
      isCurrent = false;
    };
  }, [resolvedStartFrameInfo.url, scene.applyAntiFilterNoise, scene.noiseStrength]);

  const handleRender = async () => {
    try {
      await renderSceneById(scene.id);
    } catch (e) {
      console.error(e);
    }
  };

  const isPromptEmpty = !scene.prompt || scene.prompt.trim().length === 0;
  const currentModel = SEEDANCE_MODELS.find((m) => m.id === scene.model) || SEEDANCE_MODELS[0];
  const endFrameRef = scene.references.find((r) => r.role === 'end_frame');

  // Available candidate scenes for custom start frame inheritance (scenes before this one)
  const priorScenes = scenes.filter((_, i) => i < sceneIndex);
  const prevSceneNumber = scene.sceneNumber > 1 ? scene.sceneNumber - 1 : 1;
  const prevScene = scenes.find((s) => s.sceneNumber === prevSceneNumber);
  const prevSceneHasRefs = prevScene && prevScene.references.some((r) => r.role !== 'start_frame' && r.role !== 'end_frame');

  return (
    <div
      className={`w-[530px] shrink-0 rounded-2xl bg-studio-900 border flex flex-col shadow-xl ${
        scene.status === 'rendering'
          ? 'border-studio-accent ring-2 ring-studio-accent/30 shadow-2xl shadow-studio-accent/20'
          : scene.status === 'completed'
          ? 'border-studio-emerald/50 hover:border-studio-emerald/80'
          : isPromptEmpty && scene.sceneNumber > 1
          ? 'border-rose-500/50 hover:border-rose-500/80'
          : 'border-studio-750 hover:border-studio-600'
      }`}
    >
      {/* Top Card Header */}
      <div className="p-4 border-b border-studio-750 bg-studio-850/70 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-studio-800 border border-studio-700 flex items-center justify-center font-bold text-xs text-studio-cyan font-mono shadow-inner">
            #{scene.sceneNumber}
          </div>
          <div>
            <input
              type="text"
              value={scene.title}
              onChange={(e) => updateScene(scene.id, { title: e.target.value })}
              className="text-sm font-bold text-white bg-transparent hover:bg-studio-800 focus:bg-studio-800 focus:outline-none px-2 py-0.5 rounded-lg transition-colors w-40 truncate"
            />
          </div>
        </div>

        {/* Action icons & Status */}
        <div className="flex items-center gap-1.5">
          {scene.status === 'rendering' && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-studio-accent/20 text-studio-accent border border-studio-accent/40 animate-pulse">
              <RotateCw className="w-2.5 h-2.5 animate-spin" />
              Рендер {scene.progress}%
            </span>
          )}
          {scene.status === 'completed' && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-studio-emerald/20 text-studio-emerald border border-studio-emerald/40">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Готово
            </span>
          )}
          {scene.status === 'error' && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-studio-rose/20 text-studio-rose border border-studio-rose/40">
              <AlertCircle className="w-2.5 h-2.5" />
              Ошибка
            </span>
          )}

          <button
            onClick={() => duplicateScene(scene.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
            title="Дублировать сцену"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => removeScene(scene.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-studio-800 transition-colors"
            title="Удалить сцену"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Card Body */}
      <div className="p-4 space-y-4 flex-1 flex flex-col">
        {/* Model Selector Bar */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-studio-accent" />
              <span>Модель ByteDance Seedance</span>
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {scene.sceneNumber === 1 ? 'Сцена #1 (Задает формат проекта)' : 'Локально для сцены'}
            </span>
          </label>
          <select
            value={scene.model}
            onChange={(e) => {
              const newModelId = e.target.value as SeedanceModelId;
              const modelMeta = SEEDANCE_MODELS.find((m) => m.id === newModelId);
              updateScene(scene.id, {
                model: newModelId,
                duration: Math.min(scene.duration, modelMeta?.maxDuration || 15),
              });
            }}
            className="w-full bg-studio-850 border border-studio-700 hover:border-studio-600 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-studio-accent cursor-pointer shadow-sm"
          >
            {SEEDANCE_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="bg-studio-900 text-gray-200">
                {m.name} — {m.tag}
              </option>
            ))}
          </select>
        </div>

        {/* Free Duration Selector */}
        <div className="bg-studio-850/80 p-3 rounded-xl border border-studio-750 space-y-3 shadow-sm">
          <DurationPicker
            value={scene.duration}
            onChange={(d) => updateScene(scene.id, { duration: d })}
            maxDuration={currentModel.maxDuration}
          />

          {/* Aspect Ratio & Resolution Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-studio-750/70">
            {/* Aspect Ratio Picker */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Соотношение сторон
              </label>
              <AspectRatioPicker
                value={scene.aspectRatio}
                onChange={(ratio) => updateScene(scene.id, { aspectRatio: ratio })}
              />
            </div>

            {/* Resolution Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Maximize className="w-3 h-3 text-studio-cyan" />
                <span>Качество</span>
              </label>
              <select
                value={scene.resolution}
                onChange={(e) => updateScene(scene.id, { resolution: e.target.value as Resolution })}
                className="w-full bg-studio-850 hover:bg-studio-800 border border-studio-700 hover:border-studio-600 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {currentModel.resolutions.map((res) => (
                  <option key={res} value={res} className="bg-studio-900">
                    {res === '480p' && '480p SD (Быстрый черновик)'}
                    {res === '720p' && '720p HD (Стандарт)'}
                    {res === '1080p' && '1080p Full HD (Режиссерский)'}
                    {res === '4K' && '4K Ultra HD (Кино)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Start Frame Visual Badge & Inheritance Selector for Scene 2+ */}
        {scene.sceneNumber > 1 && (
          <div className="p-3 rounded-xl bg-studio-850 border border-studio-750 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-studio-cyan uppercase tracking-wider flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                <span>Начальный кадр (Start Frame)</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {resolvedStartFrameInfo.sourceLabel}
              </span>
            </div>

            {/* Visual thumbnail and anti-detect noise toggle if start frame is resolved */}
            {resolvedStartFrameInfo.url && scene.startFrameSourceMode !== 'none' && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-studio-900 border border-studio-700/80">
                  <div
                    onClick={() =>
                      setPreviewImage({
                        url: liveStartFrameUrl || resolvedStartFrameInfo.url!,
                        title: `Начальный кадр Сцены #${scene.sceneNumber}${
                          scene.applyAntiFilterNoise
                            ? ` (Анти-детект шум ${Math.round((scene.noiseStrength || 0.5) * 100)}%)`
                            : ''
                        }`,
                      })
                    }
                    className="w-14 h-10 rounded overflow-hidden border border-studio-600 shrink-0 bg-black cursor-pointer hover:border-studio-cyan relative group transition-all"
                    title="Нажмите для предпросмотра кадра"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={liveStartFrameUrl || resolvedStartFrameInfo.url}
                      alt="Start Frame"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {scene.applyAntiFilterNoise ? 'Кадр активен (с анти-детект шумом)' : 'Кадр активен'}
                    </p>
                    <p className="text-[10px] text-studio-emerald truncate">
                      {resolvedStartFrameInfo.sourceLabel}
                    </p>
                  </div>
                </div>

                {/* Anti-Detect Noise Checkbox (ByteDance Real Person Filter Bypass) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-studio-900/90 border border-studio-700/80">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!scene.applyAntiFilterNoise}
                      onChange={(e) => updateScene(scene.id, { applyAntiFilterNoise: e.target.checked })}
                      className="w-4 h-4 accent-studio-cyan rounded cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-gray-200 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-studio-cyan" />
                        <span>Добавить анти-детект шум (Обход цензора)</span>
                      </span>
                      <span className="text-[9px] text-gray-400">
                        Накладывает пленочное зерно (~50%), маскируя реальные лица для нейросети
                      </span>
                    </div>
                  </label>

                  {scene.applyAntiFilterNoise && (
                    <div className="flex items-center gap-1.5 bg-studio-850 px-2 py-1 rounded border border-studio-700 shrink-0">
                      <span className="text-[10px] text-studio-cyan font-mono font-bold">
                        {Math.round((scene.noiseStrength || 0.45) * 100)}%
                      </span>
                      <input
                        type="range"
                        min="0.2"
                        max="0.8"
                        step="0.05"
                        value={scene.noiseStrength || 0.45}
                        onChange={(e) => updateScene(scene.id, { noiseStrength: parseFloat(e.target.value) })}
                        className="w-16 accent-studio-cyan cursor-pointer"
                        title="Сила наложения шума"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Source Mode Buttons with Option to Refuse Start Frame */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setStartFrameSource(scene.id, 'previous_scene', scene.sceneNumber - 1)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  scene.startFrameSourceMode === 'previous_scene'
                    ? 'bg-studio-accent/20 border-studio-accent text-white font-bold'
                    : 'bg-studio-900 border-studio-700 text-gray-400 hover:text-white'
                }`}
              >
                ⚡ Из Сцены #{scene.sceneNumber - 1}
              </button>

              {priorScenes.length > 1 && (
                <div className="flex items-center gap-1 bg-studio-900 border border-studio-700 rounded-lg px-2 py-0.5">
                  <span className="text-[10px] text-gray-400">Из Сцены:</span>
                  <select
                    value={scene.startFrameSourceSceneNumber || 1}
                    onChange={(e) =>
                      setStartFrameSource(scene.id, 'custom_scene', parseInt(e.target.value, 10))
                    }
                    className="bg-transparent text-[11px] text-studio-cyan font-bold focus:outline-none cursor-pointer"
                  >
                    {priorScenes.map((ps) => (
                      <option key={ps.id} value={ps.sceneNumber} className="bg-studio-900 text-white">
                        #{ps.sceneNumber}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStartFrameSource(scene.id, 'manual_upload')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  scene.startFrameSourceMode === 'manual_upload'
                    ? 'bg-studio-accent/20 border-studio-accent text-white font-bold'
                    : 'bg-studio-900 border-studio-700 text-gray-400 hover:text-white'
                }`}
              >
                📁 Свой файл
              </button>

              <button
                type="button"
                onClick={() => setStartFrameSource(scene.id, 'none')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                  scene.startFrameSourceMode === 'none'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                    : 'bg-studio-900 border-studio-700 text-gray-400 hover:text-rose-300'
                }`}
                title="Отключить наследование ключевого кадра из предыдущей сцены"
              >
                <Ban className="w-3 h-3" />
                <span>Отказ от наследования</span>
              </button>
            </div>
          </div>
        )}

        {/* Media References Dropzone & Reference Copier */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Мультимодальные Референсы
            </label>
            {scene.sceneNumber > 1 && prevSceneHasRefs && (
              <button
                type="button"
                onClick={() => copyReferencesFromScene(scene.id, prevSceneNumber)}
                className="text-[10px] text-studio-cyan hover:underline flex items-center gap-1 font-medium"
              >
                <FileDown className="w-3 h-3" />
                <span>Скопировать референсы из #{prevSceneNumber}</span>
              </button>
            )}
          </div>
          <MediaDropzone
            references={scene.references}
            onAddReference={(ref) => addReferenceToScene(scene.id, ref)}
            onRemoveReference={(refId) => removeReferenceFromScene(scene.id, refId)}
            onUpdateRole={(refId, role) => updateReferenceRole(scene.id, refId, role)}
            onUpdateUrl={(refId, url) => updateReferenceUrl(scene.id, refId, url)}
            inheritedStartFrameUrl={scene.startFrameSourceMode !== 'none' ? resolvedStartFrameInfo.url : undefined}
          />
        </div>

        {/* Prompt Input with Smooth Non-Laggy Resize */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Промпт динамики и соматики
              </label>
              {isPromptEmpty && (
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                  ⚠ Обязательно заполните
                </span>
              )}
            </div>

            {/* AI Director button */}
            {settings.enableAiDirector && (
              <button
                type="button"
                onClick={() => setDirectorModalOpen(true, scene.id)}
                className="flex items-center gap-1.5 text-xs font-bold text-studio-cyan hover:text-cyan-300 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ AI Режиссер</span>
              </button>
            )}
          </div>

          <textarea
            value={scene.prompt}
            onChange={(e) => updateScene(scene.id, { prompt: e.target.value })}
            placeholder="Опишите действие, микро-мимику (саккады глаз, дыхание) и физику кадра... Или используйте AI Режиссера"
            rows={3}
            className={`w-full rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none transition-[border-color,box-shadow] duration-150 resize-y min-h-[85px] max-h-[280px] font-sans ${
              isPromptEmpty
                ? 'bg-rose-950/10 border-2 border-rose-500/70 focus:border-rose-400 ring-1 ring-rose-500/20'
                : 'bg-studio-850 border border-studio-700 focus:border-studio-accent'
            }`}
          />
        </div>

        {/* Camera Motion Trajectory Selector */}
        <CameraMotionPicker
          value={scene.cameraMotion}
          onChange={(motion) => updateScene(scene.id, { cameraMotion: motion })}
        />

        {/* Additional Parameters Accordion */}
        <div className="border-t border-studio-750 pt-2">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors py-1"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Дополнительные параметры Seedance</span>
            </span>
            {isAdvancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {isAdvancedOpen && (
            <div className="space-y-3 pt-2 text-xs bg-studio-850/50 p-3 rounded-xl border border-studio-750 mt-1">
              {/* Negative Prompt */}
              <div>
                <label className="text-[10px] text-gray-400 font-mono flex items-center justify-between mb-1">
                  <span>Negative Prompt (Запрещенные артефакты):</span>
                  <span className="text-[9px] text-gray-500">Убирает размытие и искажения</span>
                </label>
                <input
                  type="text"
                  value={scene.negativePrompt}
                  onChange={(e) => updateScene(scene.id, { negativePrompt: e.target.value })}
                  className="w-full bg-studio-900 border border-studio-700 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-studio-accent font-mono"
                />
              </div>

              {/* Motion strength & FPS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Сила динамики (Motion):</span>
                    <span className="font-mono text-studio-cyan font-bold">{scene.motionStrength}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={scene.motionStrength}
                    onChange={(e) => updateScene(scene.id, { motionStrength: parseFloat(e.target.value) })}
                    className="w-full accent-studio-accent cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">FPS (Кадры в секунду):</label>
                  <div className="flex gap-1.5">
                    {[24, 30, 60].map((fps) => (
                      <button
                        key={fps}
                        type="button"
                        onClick={() => updateScene(scene.id, { fps: fps as FrameRate })}
                        className={`flex-1 py-1 rounded text-[10px] font-mono font-bold border transition-colors ${
                          scene.fps === fps
                            ? 'bg-studio-accent border-studio-accent text-white'
                            : 'bg-studio-900 border-studio-700 text-gray-400 hover:text-white'
                        }`}
                      >
                        {fps}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Native Audio SFX Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-studio-750">
                <div className="flex items-center gap-2">
                  {scene.generateAudio ? (
                    <Volume2 className="w-4 h-4 text-studio-emerald" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-gray-500" />
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-200">Генерация звука (SFX / Интершум)</p>
                    <p className="text-[9px] text-gray-500">Синхронные звуки окружения без фоновой музыки</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={scene.generateAudio}
                  onChange={(e) => updateScene(scene.id, { generateAudio: e.target.checked })}
                  className="w-4 h-4 accent-studio-accent rounded cursor-pointer"
                />
              </div>

              {/* Seed */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-400 font-mono">Seed: {scene.seed}</span>
                <button
                  type="button"
                  onClick={() => updateScene(scene.id, { seed: Math.floor(Math.random() * 1000000) })}
                  className="text-[10px] text-studio-cyan hover:underline"
                >
                  Случайный Seed
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Video Player Output if completed */}
        {scene.outputVideoUrl && (
          <div className="space-y-2 border-t border-studio-750 pt-3">
            <div className="rounded-xl overflow-hidden bg-black border border-studio-700 relative aspect-video shadow-inner">
              <video
                src={scene.outputVideoUrl}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-studio-850 border border-studio-700">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-studio-emerald shrink-0" />
                <span className="text-[11px] text-gray-300 truncate">
                  Шот #{scene.sceneNumber} сгенерирован и сохранён в папку проекта: <code className="text-studio-cyan font-mono text-[10px]">video/</code>
                </span>
              </div>

              <a
                href={scene.outputVideoUrl}
                download={`scene_${scene.sceneNumber}_seedance.mp4`}
                className="px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-700 text-[11px] font-semibold text-white border border-studio-600 shrink-0 flex items-center gap-1 transition-colors"
                title="Скачать MP4"
              >
                <FileDown className="w-3.5 h-3.5 text-studio-cyan" />
                <span>Скачать MP4</span>
              </a>
            </div>

            {scene.extractedLastFrameUrl && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-studio-850/60 border border-studio-750">
                <div
                  onClick={() =>
                    setPreviewImage({
                      url: scene.extractedLastFrameUrl!,
                      title: `Финальный кадр Сцены #${scene.sceneNumber}`,
                    })
                  }
                  className="w-8 h-8 rounded overflow-hidden border border-studio-600 shrink-0 cursor-pointer hover:border-studio-cyan relative group transition-all"
                  title="Нажмите для предпросмотра финального кадра"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={scene.extractedLastFrameUrl} alt="Last frame" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ZoomIn className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div className="text-[10px] text-studio-emerald truncate flex-1">
                  ✓ Финальный кадр захвачен ➔ авто-передан в Сцену #{scene.sceneNumber + 1}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {scene.errorMessage && (
          <div className="p-2.5 rounded-xl bg-studio-rose/10 border border-studio-rose/30 text-xs text-rose-300">
            {scene.errorMessage}
          </div>
        )}

        {/* Footer Render Button (Disabled if prompt is empty) */}
        <div className="pt-2 mt-auto">
          <button
            type="button"
            onClick={handleRender}
            disabled={scene.status === 'rendering' || isPromptEmpty}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              isPromptEmpty
                ? 'bg-studio-800 text-rose-400/80 cursor-not-allowed border border-rose-500/30'
                : scene.status === 'rendering'
                ? 'bg-studio-800 text-gray-400 cursor-not-allowed border border-studio-700'
                : scene.status === 'completed'
                ? 'bg-studio-800 hover:bg-studio-750 text-studio-emerald border border-studio-emerald/40 hover:border-studio-emerald'
                : 'bg-gradient-to-r from-studio-accent to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white shadow-lg shadow-studio-accent/20'
            }`}
          >
            {isPromptEmpty ? (
              <>
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Введите промпт для запуска #{scene.sceneNumber}</span>
              </>
            ) : scene.status === 'rendering' ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Генерация {currentModel.name} ({scene.progress}%)...</span>
              </>
            ) : scene.status === 'completed' ? (
              <>
                <RotateCw className="w-4 h-4" />
                <span>Перегенерировать Шот #{scene.sceneNumber}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Рендерить Шот #{scene.sceneNumber} ({scene.duration}s • {scene.resolution})</span>
              </>
            )}
          </button>
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
