'use client';

import React, { useState, useRef } from 'react';
import { MediaReference, MediaRole } from '@/types/studio';
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
} from 'lucide-react';

interface Props {
  references: MediaReference[];
  onAddReference: (ref: Omit<MediaReference, 'id'>) => void;
  onRemoveReference: (refId: string) => void;
  onUpdateRole: (refId: string, role: MediaRole) => void;
  onUpdateUrl?: (refId: string, url: string) => void;
  onUpdateData?: (refId: string, data: Partial<MediaReference>) => void;
  inheritedStartFrameUrl?: string;
  hasExistingStartFrame?: boolean;
}

const ALL_ROLES: { id: MediaRole; label: string; badgeColor: string; mediaType: 'image' | 'video' | 'audio' }[] = [
  { id: 'image_ref', label: '📌 Референс (Персонаж / Стиль / Объект)', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', mediaType: 'image' },
  { id: 'start_frame', label: '🎬 Начальный кадр (Start Frame)', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', mediaType: 'image' },
  { id: 'end_frame', label: '🏁 Конечный кадр (End Frame)', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', mediaType: 'image' },
  { id: 'video_motion', label: '🎞️ Видео движения (V2V Motion Ref)', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', mediaType: 'video' },
  { id: 'audio_input', label: '🎵 Аудио-дорожка (Речь / SFX / Lip-Sync)', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', mediaType: 'audio' },
];

export const MediaDropzone: React.FC<Props> = ({
  references,
  onAddReference,
  onRemoveReference,
  onUpdateRole,
  onUpdateUrl,
  onUpdateData,
  inheritedStartFrameUrl,
  hasExistingStartFrame,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [applyingNoiseId, setApplyingNoiseId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ url: string; title: string; refId?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      try {
        const optimizedUrl = await compressImageForUpload(file);
        onAddReference({
          name: file.name,
          type: 'image',
          role: defaultRole,
          url: optimizedUrl,
          originalUrl: optimizedUrl,
          hasNoise: false,
          fileSizeBytes: file.size,
        });
        return;
      } catch (err) {
        console.warn('Image optimization fallback:', err);
      }
    } else if (isVid) {
      mediaType = 'video';
      defaultRole = 'video_motion';
    } else if (isAud) {
      mediaType = 'audio';
      defaultRole = 'audio_input';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (url) {
        onAddReference({
          name: file.name,
          type: mediaType,
          role: defaultRole,
          url,
          originalUrl: url,
          hasNoise: false,
          fileSizeBytes: file.size,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => processFile(file));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => processFile(file));
    }
  };

  const handleCopyTag = (tag: string, id: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Toggle noise with undo/restore capability
  const handleToggleNoise = async (ref: MediaReference) => {
    if (ref.type !== 'image') return;
    setApplyingNoiseId(ref.id);

    try {
      if (ref.hasNoise) {
        // Undo / Restore original clean image
        const restoredUrl = ref.originalUrl || ref.url;
        if (onUpdateData) {
          onUpdateData(ref.id, { url: restoredUrl, hasNoise: false });
        } else if (onUpdateUrl) {
          onUpdateUrl(ref.id, restoredUrl);
        }
        if (previewData && previewData.refId === ref.id) {
          setPreviewData({ ...previewData, url: restoredUrl });
        }
      } else {
        // Apply noise filter
        const originalBase = ref.originalUrl || ref.url;
        const noisyUrl = await applyNoiseToImage(originalBase, 0.5);
        if (onUpdateData) {
          onUpdateData(ref.id, { url: noisyUrl, originalUrl: originalBase, hasNoise: true });
        } else if (onUpdateUrl) {
          onUpdateUrl(ref.id, noisyUrl);
        }
        if (previewData && previewData.refId === ref.id) {
          setPreviewData({ ...previewData, url: noisyUrl });
        }
      }
    } catch (e) {
      console.warn('Could not toggle noise:', e);
    } finally {
      setApplyingNoiseId(null);
    }
  };

  let imageIndexCounter = 0;

  return (
    <div className="space-y-2.5">
      {/* Drop Zone Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
          isDragging
            ? 'border-studio-accent bg-studio-accent/15 scale-[0.99]'
            : 'border-studio-700 hover:border-studio-500 bg-studio-850/60 hover:bg-studio-850'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileInput}
          className="hidden"
        />

        <UploadCloud className="w-5 h-5 text-studio-cyan" />
        <div className="text-xs text-gray-300">
          <span className="font-semibold text-white">Перетащите сюда</span> или{' '}
          <span className="text-studio-cyan underline font-semibold">выберите файлы</span>
        </div>
        <p className="text-[10px] text-gray-500">
          Изображения (PNG, JPG), Видео (MP4), Аудио (MP3, WAV) — мультимодальный Seedance
        </p>
      </div>

      {/* References List — 1 reference per full-width row */}
      {references.length > 0 && (
        <div className="flex flex-col gap-2">
          {references.map((ref) => {
            const roleMeta = ALL_ROLES.find((r) => r.id === ref.role) || ALL_ROLES[0];
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
                className="flex items-center gap-3 p-2.5 rounded-xl bg-studio-850 border border-studio-750 hover:border-studio-650 transition-all shadow-sm"
              >
                {/* Large Media Thumbnail (w-16 h-16) with Click-to-Preview */}
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
                  className={`w-16 h-16 rounded-xl bg-studio-900 overflow-hidden border border-studio-700 shrink-0 relative flex items-center justify-center ${
                    ref.type === 'image'
                      ? 'cursor-pointer hover:border-studio-cyan hover:scale-[1.02] transition-transform'
                      : ''
                  }`}
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
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-gray-200 truncate" title={ref.name}>
                      {ref.name}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Copy Tag Button */}
                      {promptTag && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyTag(promptTag, ref.id);
                          }}
                          className="p-1.5 rounded-lg bg-studio-800 hover:bg-studio-750 text-gray-300 hover:text-white border border-studio-700 hover:border-studio-500 transition-colors flex items-center gap-1 text-[11px] font-mono font-bold"
                          title={`Скопировать тег ${promptTag} для вставки в промпт`}
                        >
                          {isThisCopied ? (
                            <Check className="w-3.5 h-3.5 text-studio-emerald" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-studio-cyan" />
                          )}
                          <span className="text-[10px]">{isThisCopied ? 'Скопировано' : promptTag}</span>
                        </button>
                      )}

                      {/* Noise Toggle Button with Undo/Restore */}
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
                              <span>Шум: ВКЛ (Отменить)</span>
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
                    className="w-full bg-studio-900 text-gray-200 text-[11px] font-medium rounded-lg px-2.5 py-1 border border-studio-750 focus:outline-none focus:border-studio-cyan cursor-pointer"
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
