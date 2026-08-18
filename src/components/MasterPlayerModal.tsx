'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import {
  X,
  Play,
  Pause,
  Download,
  Film,
  Layers,
  CheckCircle2,
  SkipForward,
  SkipBack,
  Sparkles,
} from 'lucide-react';

export const MasterPlayerModal: React.FC = () => {
  const { isMasterPlayerOpen, setMasterPlayerOpen, sceneGroups, projectName } = useStudioStore();
  
  const completedShots = sceneGroups.flatMap((g) =>
    g.shots
      .filter((s) => s.status === 'completed' && s.outputVideoUrl)
      .map((s) => ({ ...s, sceneName: g.name }))
  );

  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && completedShots[currentShotIndex]) {
      videoRef.current.src = completedShots[currentShotIndex].outputVideoUrl || '';
      if (isPlaying) {
        videoRef.current.play().catch(console.warn);
      }
    }
  }, [currentShotIndex, isMasterPlayerOpen]);

  if (!isMasterPlayerOpen) return null;

  const currentShot = completedShots[currentShotIndex];

  const handleVideoEnded = () => {
    if (currentShotIndex < completedShots.length - 1) {
      setCurrentShotIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentShotIndex(0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const downloadShotVideo = (url: string, shotNumber: number, sceneName: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sceneName}_shot_${shotNumber}_seedance.mp4`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-3xl bg-studio-950 border border-studio-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-studio-800 flex items-center justify-between bg-studio-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-studio-accent/20 text-studio-cyan border border-studio-accent/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Мастер-Плеер Проекта</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-studio-800 text-studio-cyan border border-studio-700">
                  {completedShots.length} готовых шотов
                </span>
              </h3>
              <p className="text-xs text-gray-400">{projectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMasterPlayerOpen(false)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black flex items-center justify-center min-h-[380px] max-h-[550px] overflow-hidden">
          {completedShots.length > 0 && currentShot ? (
            <>
              <video
                ref={videoRef}
                controls
                playsInline
                onEnded={handleVideoEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="max-h-[550px] w-auto max-w-full object-contain"
              />
              <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-studio-700/80 text-xs font-medium text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-studio-emerald animate-pulse" />
                <span>
                  {currentShot.sceneName} • Шот #{currentShot.shotNumber} ({currentShot.duration}s • {currentShot.resolution})
                </span>
              </div>
            </>
          ) : (
            <div className="text-center p-8 space-y-3">
              <Layers className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-400">
                В проекте пока нет сгенерированных шотов
              </p>
              <p className="text-xs text-gray-500 max-w-md">
                Нажмите «Сгенерировать шот» или «Сквозной рендер сцены», чтобы видео появилось здесь
              </p>
            </div>
          )}
        </div>

        {/* Timeline Strip of Completed Shots */}
        {completedShots.length > 0 && (
          <div className="p-4 bg-studio-900 border-t border-studio-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold uppercase tracking-wider">Последовательность шотов</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentShotIndex === 0}
                  onClick={() => setCurrentShotIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1 rounded-lg bg-studio-800 hover:bg-studio-700 disabled:opacity-40"
                >
                  <SkipBack className="w-4 h-4 text-white" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="px-3 py-1 rounded-lg bg-studio-cyan text-studio-950 font-bold hover:bg-cyan-300"
                >
                  {isPlaying ? 'Пауза' : 'Воспроизвести все'}
                </button>
                <button
                  type="button"
                  disabled={currentShotIndex === completedShots.length - 1}
                  onClick={() => setCurrentShotIndex((prev) => Math.min(completedShots.length - 1, prev + 1))}
                  className="p-1 rounded-lg bg-studio-800 hover:bg-studio-700 disabled:opacity-40"
                >
                  <SkipForward className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {completedShots.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => setCurrentShotIndex(idx)}
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer shrink-0 transition-all ${
                    idx === currentShotIndex
                      ? 'bg-studio-accent/25 border-studio-accent ring-1 ring-studio-accent'
                      : 'bg-studio-850 hover:bg-studio-800 border-studio-750'
                  }`}
                >
                  <div className="w-10 h-7 rounded bg-black overflow-hidden border border-studio-700 shrink-0">
                    {s.outputVideoUrl && (
                      <video src={s.outputVideoUrl} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-bold text-white truncate max-w-[110px]">
                      {s.sceneName} #{s.shotNumber}
                    </p>
                    <p className="text-[9px] text-gray-400 font-mono">{s.duration}s • {s.resolution}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadShotVideo(s.outputVideoUrl!, s.shotNumber, s.sceneName);
                    }}
                    className="p-1 text-gray-400 hover:text-studio-cyan"
                    title="Скачать этот шот"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
