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
  const { isMasterPlayerOpen, setMasterPlayerOpen, scenes, projectName } = useStudioStore();
  const completedScenes = scenes.filter((s) => s.status === 'completed' && s.outputVideoUrl);

  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && completedScenes[currentSceneIndex]) {
      videoRef.current.src = completedScenes[currentSceneIndex].outputVideoUrl || '';
      if (isPlaying) {
        videoRef.current.play().catch(console.warn);
      }
    }
  }, [currentSceneIndex, isMasterPlayerOpen]);

  if (!isMasterPlayerOpen) return null;

  const currentScene = completedScenes[currentSceneIndex];

  const handleVideoEnded = () => {
    if (currentSceneIndex < completedScenes.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      setCurrentSceneIndex(0);
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

  const downloadSceneVideo = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_scene_${index + 1}.mp4`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="w-full max-w-4xl rounded-2xl bg-studio-900 border border-studio-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-studio-700 bg-studio-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-studio-accent/20 text-studio-accent border border-studio-accent/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Мастер-Плеер Фильма: {projectName}</h2>
              <p className="text-xs text-gray-400">
                Бесшовный просмотр и экспорт готовых шотов ({completedScenes.length} из {scenes.length} готово)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsPlaying(false);
              setMasterPlayerOpen(false);
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Canvas & Controls */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center bg-black/60">
          {completedScenes.length > 0 && currentScene ? (
            <div className="w-full max-w-2xl space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-studio-700 aspect-video shadow-2xl">
                <video
                  ref={videoRef}
                  src={currentScene.outputVideoUrl}
                  onEnded={handleVideoEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  playsInline
                  className="w-full h-full object-contain"
                />

                {/* Scene Indicator Overlay */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 text-xs font-mono font-bold text-studio-cyan">
                  Шот #{currentScene.sceneNumber} / {scenes.length}
                </div>
              </div>

              {/* Playback bar */}
              <div className="flex items-center justify-between bg-studio-850 p-3 rounded-xl border border-studio-700">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentSceneIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentSceneIndex === 0}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 disabled:opacity-30"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="p-2.5 rounded-xl bg-studio-accent hover:bg-purple-600 text-white shadow-md shadow-studio-accent/20"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() =>
                      setCurrentSceneIndex((prev) =>
                        Math.min(completedScenes.length - 1, prev + 1)
                      )
                    }
                    disabled={currentSceneIndex === completedScenes.length - 1}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 disabled:opacity-30"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono text-gray-300 ml-2">
                    {currentScene.title} ({currentScene.duration}s)
                  </span>
                </div>

                <button
                  onClick={() =>
                    currentScene.outputVideoUrl &&
                    downloadSceneVideo(currentScene.outputVideoUrl, currentSceneIndex)
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-xs font-semibold text-gray-200 border border-studio-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать MP4 шота #{currentScene.sceneNumber}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 space-y-2">
              <Film className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-400">Нет готовых сцен для воспроизведения</p>
              <p className="text-xs text-gray-600">Сгенерируйте хотя бы одну сцену в таймлайне</p>
            </div>
          )}
        </div>

        {/* Scene Playlist Strip */}
        <div className="p-4 border-t border-studio-700 bg-studio-850 overflow-x-auto">
          <div className="flex items-center gap-3">
            {completedScenes.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentSceneIndex(idx);
                  setIsPlaying(true);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium shrink-0 transition-all ${
                  currentSceneIndex === idx
                    ? 'bg-studio-accent/20 border-studio-accent text-white'
                    : 'bg-studio-900 border-studio-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-studio-emerald" />
                <span>Шот #{s.sceneNumber}</span>
                <span className="font-mono text-[10px] text-gray-500">({s.duration}s)</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
