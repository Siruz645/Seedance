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
} from 'lucide-react';

interface Props {
  references: MediaReference[];
  onAddReference: (ref: Omit<MediaReference, 'id'>) => void;
  onRemoveReference: (refId: string) => void;
  onUpdateRole: (refId: string, role: MediaRole) => void;
  onUpdateUrl?: (refId: string, url: string) => void;
  inheritedStartFrameUrl?: string;
}

const ALL_ROLES: { id: MediaRole; label: string; badgeColor: string; mediaType: 'image' | 'video' | 'audio' }[] = [
  { id: 'image_ref', label: '📌 Референс (Персонаж / Стиль / Объект)', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', mediaType: 'image' },
  { id: 'start_frame', label: '🎬 Начальный кадр (Start Frame)', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', mediaType: 'image' },
  { id: 'end_frame', label: '🏁 Конечный кадр (End Frame ➔ След. сцена)', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', mediaType: 'image' },
  { id: 'video_motion', label: '🎞️ Видео движения (V2V Motion Ref)', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', mediaType: 'video' },
  { id: 'audio_input', label: '🎵 Аудио-дорожка (Речь / SFX / Lip-Sync)', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', mediaType: 'audio' },
];

export const MediaDropzone: React.FC<Props> = ({
  references,
  onAddReference,
  onRemoveReference,
  onUpdateRole,
  onUpdateUrl,
  inheritedStartFrameUrl,
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
      const hasStart = references.some((r) => r.role === 'start_frame');
      defaultRole = hasStart ? 'image_ref' : 'start_frame';

      try {
        const optimizedUrl = await compressImageForUpload(file);
        onAddReference({
          name: file.name,
          type: 'image',
          role: defaultRole,
          url: optimizedUrl,
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

  const handleApplyNoise = async (ref: MediaReference) => {
    if (ref.type !== 'image' || !onUpdateUrl) return;
    setApplyingNoiseId(ref.id);
    try {
      const noisyUrl = await applyNoiseToImage(ref.url, 0.5);
      onUpdateUrl(ref.id, noisyUrl);
      if (previewData && previewData.refId === ref.id) {
        setPreviewData({ ...previewData, url: noisyUrl });
      }
    } catch (e) {
      console.warn('Could not apply noise:', e);
    } finally {
      setApplyingNoiseId(null);
    }
  };

  let imageIndexCounter = 0;

  return (
    <div className="space-y-2">
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

      {/* References Grid / List */}
      {references.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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

            return (
              <div
                key={ref.id}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-studio-850 border border-studio-750 hover:border-studio-650 transition-all group"
              >
                {/* Media Thumbnail with Click-to-Preview Lightbox */}
                <div
                  onClick={() => {
                    if (ref.type === 'image') {
                      setPreviewData({ url: ref.url, title: `${ref.name} ${promptTag ? `(${promptTag})` : ''}`, refId: ref.id });
                    }
                  }}
                  className={`w-12 h-12 rounded-lg bg-studio-900 overflow-hidden border border-studio-700 shrink-0 relative flex items-center justify-center ${
                    ref.type === 'image' ? 'cursor-pointer hover:border-studio-cyan hover:scale-[1.02] transition-transform' : ''
                  }`}
                  title={ref.type === 'image' ? 'Нажмите для предпросмотра изображения' : ref.name}
                >
                  {ref.type === 'image' && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ref.url} alt={ref.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                      </div>
                    </>
                  )}
                  {ref.type === 'audio' && <Music className="w-5 h-5 text-rose-400" />}
                  {ref.type === 'video' && <VideoIcon className="w-5 h-5 text-indigo-400" />}

                  {/* Tag badge overlay */}
                  {promptTag && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[8px] font-mono text-center text-studio-cyan font-bold py-0.2">
                      {promptTag}
                    </span>
                  )}
                </div>

                {/* Info & Role Select */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] font-semibold text-gray-200 truncate" title={ref.name}>
                      {ref.name}
                    </p>

                    <div className="flex items-center gap-1">
                      {/* Icon-only Copy Tag Button */}
                      {promptTag && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyTag(promptTag, ref.id);
                          }}
                          className="p-1 rounded-md bg-studio-800 hover:bg-studio-750 text-gray-300 hover:text-white border border-studio-700 hover:border-studio-500 transition-colors flex items-center justify-center shrink-0"
                          title={`Скопировать тег ${promptTag} для промпта`}
                        >
                          {isThisCopied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-studio-cyan" />
                          )}
                        </button>
                      )}

                      {/* Anti-detect noise button */}
                      {ref.type === 'image' && onUpdateUrl && (
                        <button
                          type="button"
                          disabled={applyingNoiseId === ref.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyNoise(ref);
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-[10px] text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1 shrink-0 font-medium"
                          title="Наложить анти-детект шум (50%) для обхода цензора ByteDance Real Person"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{applyingNoiseId === ref.id ? '...' : 'Шум'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveReference(ref.id);
                        }}
                        className="p-0.5 rounded text-gray-400 hover:text-rose-400 transition-colors"
                        title="Удалить референс"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Role dropdown strictly filtered by media type */}
                  <select
                    value={ref.role}
                    onChange={(e) => onUpdateRole(ref.id, e.target.value as MediaRole)}
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full text-[10px] font-medium py-1 px-1.5 rounded-md border focus:outline-none cursor-pointer ${roleMeta.badgeColor}`}
                  >
                    {availableRolesForType.map((r) => (
                      <option key={r.id} value={r.id} className="bg-studio-900 text-gray-200">
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

      {/* Lightbox Image Preview Modal */}
      {previewData && (
        <ImagePreviewModal
          isOpen={!!previewData}
          imageUrl={previewData.url}
          title={previewData.title}
          onClose={() => setPreviewData(null)}
          onApplyNoise={
            previewData.refId && onUpdateUrl
              ? (noisyUrl) => {
                  if (previewData.refId) {
                    onUpdateUrl(previewData.refId, noisyUrl);
                    setPreviewData({ ...previewData, url: noisyUrl });
                  }
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
