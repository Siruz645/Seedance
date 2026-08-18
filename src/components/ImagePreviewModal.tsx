'use client';

import React from 'react';
import { X, Sparkles, Download, ZoomIn } from 'lucide-react';
import { applyNoiseToImage } from '@/lib/noiseFilter';

interface Props {
  isOpen: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
  onApplyNoise?: (newUrl: string) => void;
}

export const ImagePreviewModal: React.FC<Props> = ({
  isOpen,
  imageUrl,
  title,
  onClose,
  onApplyNoise,
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  if (!isOpen || !imageUrl) return null;

  const handleNoiseClick = async () => {
    if (!onApplyNoise) return;
    setIsProcessing(true);
    try {
      const noisy = await applyNoiseToImage(imageUrl, 0.5);
      onApplyNoise(noisy);
    } catch (e) {
      console.warn('Could not apply noise in preview modal:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${title || 'seedance_frame'}.jpg`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-studio-950 border border-studio-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-studio-800 flex items-center justify-between bg-studio-900/90">
          <div className="flex items-center gap-2 min-w-0">
            <ZoomIn className="w-4 h-4 text-studio-cyan shrink-0" />
            <h3 className="text-xs font-bold text-white truncate max-w-md">
              {title || 'Предпросмотр изображения'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {onApplyNoise && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleNoiseClick}
                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Наложить анти-детект шум для обхода цензора ByteDance"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Обработка...' : 'Наложить шум (50%)'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
              title="Скачать изображение"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="p-4 flex items-center justify-center bg-black/80 overflow-auto max-h-[calc(90vh-100px)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title || 'Preview'}
            className="max-h-[75vh] w-auto object-contain rounded-lg border border-studio-800 shadow-lg"
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-studio-900 border-t border-studio-800 flex items-center justify-between text-[11px] text-gray-400 font-mono">
          <span>Кликните вне окна или на крестик, чтобы закрыть</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-studio-800 hover:bg-studio-750 text-white font-semibold text-xs transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
