'use client';

import React, { useState, useRef } from 'react';
import { MediaReference, MediaRole } from '@/types/studio';
import { useStudioStore } from '@/lib/projectStore';
import { compressImageForUpload } from '@/lib/imageCompressor';
import { applyNoiseToImage } from '@/lib/noiseFilter';
import { ImagePreviewModal } from './ImagePreviewModal';
import {
  UploadCloud,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  X,
  Sparkles,
  Copy,
  Check,
  ZoomIn,
  Undo2,
  Plus,
  Layers,
} from 'lucide-react';

interface Props {
  sceneId?: string;
  shotId?: string;
  references: MediaReference[];
  onAddReference: (ref: Omit<MediaReference, 'id'>) => void;
  onRemoveReference: (refId: string) => void;
  onUpdateRole: (refId: string, role: MediaRole) => void;
  onUpdateUrl?: (refId: string, url: string) => void;
  onUpdateData?: (refId: string, data: Partial<MediaReference>) => void;
  inheritedStartFrameUrl?: string;
  hasExistingStartFrame?: boolean;
  onInsertTagToPrompt?: (tag: string) => void;
  isLargeLayout?: boolean;
  showCrossShotPool?: boolean;
}

const ALL_ROLES: { id: MediaRole; label: string; badgeColor: string; mediaType: 'image' | 'video' | 'audio' }[] = [
  { id: 'image_ref', label: '📌 Референс (Персонаж / Стиль / Объект)', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', mediaType: 'image' },
  { id: 'start_frame', label: '🎬 Начальный кадр (Start Frame)', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', mediaType: 'image' },
  { id: 'end_frame', label: '🏁 Конечный кадр (End Frame)', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', mediaType: 'image' },
  { id: 'video_motion', label: '🎞️ Видео движения (V2V Motion Ref)', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', mediaType: 'video' },
  { id: 'audio_input', label: '🎵 Аудио-дорожка (Речь / SFX / Lip-Sync)', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', mediaType: 'audio' },
];

export const MediaDropzone: React.FC<Props> = ({
  sceneId,
  shotId,
  references,
  onAddReference,
  onRemoveReference,
  onUpdateRole,
  onUpdateUrl,
  onUpdateData,
  inheritedStartFrameUrl,
  hasExistingStartFrame,
  onInsertTagToPrompt,
  isLargeLayout,
  showCrossShotPool = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [applyingNoiseId, setApplyingNoiseId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ url: string; title: string; refId?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { getProjectReferencesPool } = useStudioStore();
  const pool = sceneId && shotId && showCrossShotPool ? getProjectReferencesPool(sceneId, shotId) : { otherRefs: [] };
  const otherRefs = pool.otherRefs;

  const processFile = async (file: File) => {
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    const isAud = file.type.startsWith('audio/');

    let mediaType: 'image' | 'video' | 'audio' = 'image';
    let defaultRole: MediaRole = 'image_ref';

    if (isImg) {
      mediaType = 'image';
      const hasStart =
        references.some((r) => r.role === 'start_frame') ||
        !!hasExistingStartFrame ||
        !!inheritedStartFrameUrl;
      defaultRole = hasStart ? 'image_ref' : 'start_frame';
    } else if (isVid) {
      mediaType = 'video';
      defaultRole = 'video_motion';
    } else if (isAud) {
      mediaType = 'audio';
      defaultRole = 'audio_input';
    }

    try {
      let dataUrl: string;
      if (isImg) {
        dataUrl = await compressImageForUpload(file, 2048, 0.9);
      } else {
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      onAddReference({
        name: file.name,
        type: mediaType,
        role: defaultRole,
        url: dataUrl,
        fileSizeBytes: file.size,
      });
    } catch (err) {
      console.error('Error processing media file:', err);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(processFile);
  };

  const handleCopyTag = (tag: string, refId: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedId(refId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleToggleNoise = async (ref: MediaReference) => {
    if (ref.type !== 'image' || !onUpdateData) return;
    try {
      setApplyingNoiseId(ref.id);
      if (ref.hasNoise) {
        const cleanUrl = ref.originalUrl || ref.url;
        onUpdateData(ref.id, {
          url: cleanUrl,
          hasNoise: false,
        });
      } else {
        const original = ref.originalUrl || ref.url;
        const noisyUrl = await applyNoiseToImage(original, 0.5);
        onUpdateData(ref.id, {
          url: noisyUrl,
          originalUrl: original,
          hasNoise: true,
        });
      }
    } catch (e) {
      console.warn('Noise toggle failed:', e);
    } finally {
      setApplyingNoiseId(null);
    }
  };

  let imageIndexCounter = 0;

  return (
    <div className="space-y-3 w-full">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Drop Zone Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-2xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group ${
          isDragging
            ? 'border-studio-cyan bg-studio-cyan/10 scale-[0.99]'
            : 'border-studio-750 hover:border-studio-accent bg-studio-900/50 hover:bg-studio-850/60'
        }`}
      >
        <div className="w-8 h-8 rounded-xl bg-studio-800 border border-studio-700 flex items-center justify-center group-hover:scale-105 group-hover:border-studio-cyan transition-all">
          <UploadCloud className="w-4 h-4 text-studio-cyan" />
        </div>
        <p className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
          Перетащите сюда или <span className="text-studio-cyan underline font-bold">выберите файлы</span>
        </p>
        <p className="text-[10px] text-gray-400">
          Изображения (PNG, JPG), Видео (MP4), Аудио (MP3, WAV) — мультимодальный Seedance
        </p>
      </div>

      {/* Active References List (Full-Width Clean Cards) */}
      {references.length > 0 && (
        <div className="flex flex-col gap-2.5 w-full">
          {references.map((ref) => {
            const availableRolesForType = ALL_ROLES.filter((r) => r.mediaType === ref.type);

            let promptTag = '';
            if (ref.type === 'image') {
              imageIndexCounter += 1;
              promptTag = `[Image ${imageIndexCounter}]`;
            } else if (ref.type === 'video') {
              promptTag = '[Motion_Ref]';
            } else if (ref.type === 'audio') {
              promptTag = '[Audio_Track]';
            }

            const isThisCopied = copiedId === ref.id;
            const isApplyingNoise = applyingNoiseId === ref.id;

            return (
              <div
                key={ref.id}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-studio-900 border border-studio-750 hover:border-studio-650 transition-all shadow-sm"
              >
                {/* Media Thumbnail with Click-to-Preview */}
                <div
                  onClick={() => {
                    if (ref.type === 'image') {
                      setPreviewData({
                        url: ref.url,
                        title: `${ref.name} ${promptTag ? `(${promptTag})` : ''}`,
                        refId: ref.id,
                      });
                    }
                  }}
                  className="w-16 h-16 rounded-xl bg-studio-950 overflow-hidden border border-studio-700 shrink-0 relative flex items-center justify-center cursor-pointer hover:border-studio-cyan hover:scale-[1.02] transition-all"
                  title={ref.type === 'image' ? 'Кликните для предпросмотра' : ref.name}
                >
                  {ref.type === 'image' && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ref.url} alt={ref.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/35 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                    </>
                  )}
                  {ref.type === 'audio' && <Music className="w-6 h-6 text-rose-400" />}
                  {ref.type === 'video' && <VideoIcon className="w-6 h-6 text-indigo-400" />}

                  {/* Tag badge overlay */}
                  {promptTag && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[9px] font-mono text-center text-studio-cyan font-bold py-0.5">
                      {promptTag}
                    </span>
                  )}
                </div>

                {/* Info & Actions */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <p className="text-xs font-bold text-gray-200 truncate" title={ref.name}>
                      {ref.name}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Insert to Prompt Button */}
                      {promptTag && onInsertTagToPrompt && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertTagToPrompt(promptTag);
                          }}
                          className="px-2 py-1.5 rounded-lg bg-studio-cyan/15 hover:bg-studio-cyan/25 text-studio-cyan border border-studio-cyan/40 hover:border-studio-cyan transition-colors flex items-center gap-1 text-[10px] font-mono font-bold shadow-sm"
                          title={`Вставить ${promptTag} прямо в текст промпта`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Вставить в промпт</span>
                        </button>
                      )}

                      {/* Copy Tag Button */}
                      {promptTag && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyTag(promptTag, ref.id);
                          }}
                          className="p-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-gray-300 hover:text-white border border-studio-700 hover:border-studio-500 transition-colors flex items-center gap-1 text-[11px] font-mono font-bold"
                          title={`Скопировать тег ${promptTag}`}
                        >
                          {isThisCopied ? (
                            <Check className="w-3.5 h-3.5 text-studio-emerald" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-studio-cyan" />
                          )}
                          <span className="text-[10px]">{isThisCopied ? 'Скопировано' : promptTag}</span>
                        </button>
                      )}

                      {/* Noise Toggle Button */}
                      {ref.type === 'image' && (
                        <button
                          type="button"
                          disabled={isApplyingNoise}
                          onClick={() => handleToggleNoise(ref)}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all ${
                            ref.hasNoise
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                              : 'bg-studio-800 text-gray-300 hover:text-white border-studio-700 hover:border-studio-600'
                          }`}
                          title={
                            ref.hasNoise
                              ? 'Шум наложен. Нажмите, чтобы ОТМЕНИТЬ и вернуть чистый оригинал'
                              : 'Наложить 50% шум для обхода фильтра цензуры'
                          }
                        >
                          {ref.hasNoise ? (
                            <>
                              <Undo2 className="w-3 h-3 text-amber-400" />
                              <span>Шум: ВКЛ</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-studio-cyan" />
                              <span>+ Шум 50%</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onRemoveReference(ref.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-studio-800 transition-colors"
                        title="Удалить референс"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <select
                    value={ref.role}
                    onChange={(e) => onUpdateRole(ref.id, e.target.value as MediaRole)}
                    className="w-full bg-studio-950 text-gray-200 text-xs font-medium rounded-lg px-2.5 py-1.5 border border-studio-750 focus:outline-none focus:border-studio-cyan cursor-pointer"
                  >
                    {availableRolesForType.map((r) => (
                      <option key={r.id} value={r.id} className="bg-studio-950 text-white">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pool of References from Other Shots & Scenes (Only when showCrossShotPool is true) */}
      {showCrossShotPool && otherRefs.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-studio-800 w-full">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Доступно из других шотов и сцен ({otherRefs.length})</span>
            </span>
            <span className="text-[10px] text-gray-400 font-mono">1 клик для добавления</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 w-full">
            {otherRefs.map(({ ref, sourceSceneName, sourceShotNumber }) => {
              return (
                <div
                  key={ref.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-studio-900 border border-studio-750 hover:border-studio-650 transition-all group shadow-sm"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => {
                      if (ref.type === 'image') {
                        setPreviewData({
                          url: ref.url,
                          title: `${ref.name} (Из «${sourceSceneName}», Шота #${sourceShotNumber})`,
                          refId: ref.id,
                        });
                      }
                    }}
                    className="w-12 h-12 rounded-lg bg-studio-950 overflow-hidden border border-studio-700 shrink-0 relative flex items-center justify-center cursor-pointer hover:border-studio-cyan transition-colors"
                    title="Кликните для предпросмотра"
                  >
                    {ref.type === 'image' && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ref.url} alt={ref.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </div>
                      </>
                    )}
                    {ref.type === 'audio' && <Music className="w-5 h-5 text-rose-400" />}
                    {ref.type === 'video' && <VideoIcon className="w-5 h-5 text-indigo-400" />}
                  </div>

                  {/* Info + Quick Add */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-semibold text-gray-200 truncate" title={ref.name}>
                        {ref.name}
                      </p>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-studio-800 text-gray-300 border border-studio-700 shrink-0">
                        Шот #{sourceShotNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAddReference(ref)}
                        className="px-2 py-1 rounded-md bg-studio-800 hover:bg-studio-750 text-studio-cyan hover:text-white border border-studio-700 hover:border-studio-cyan text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Добавить этот референс в активный шот"
                      >
                        <Plus className="w-3 h-3" />
                        <span>В шот</span>
                      </button>

                      {onInsertTagToPrompt && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddReference(ref);
                            const currentImageCount = references.filter((r) => r.type === 'image').length;
                            onInsertTagToPrompt(`[Image ${currentImageCount + 1}]`);
                          }}
                          className="px-2 py-1 rounded-md bg-studio-cyan/15 hover:bg-studio-cyan/25 text-studio-cyan border border-studio-cyan/40 hover:border-studio-cyan text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                          title="Добавить в шот и сразу вставить тег в промпт"
                        >
                          <span>+ В промпт</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewData && (
        <ImagePreviewModal
          isOpen={!!previewData}
          imageUrl={previewData.url}
          title={previewData.title}
          onClose={() => setPreviewData(null)}
        />
      )}
    </div>
  );
};
