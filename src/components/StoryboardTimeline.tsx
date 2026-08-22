'use client';

import React, { useRef, useEffect } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import { ShotCard } from './ShotCard';
import {
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';

export const StoryboardTimeline: React.FC = () => {
  const {
    sceneGroups,
    activeSceneId,
    addShotToScene,
    viewMode,
    focusShotIndex,
    setFocusShotIndex,
    lastCreatedShotId,
    setLastCreatedShotId,
  } = useStudioStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeGroup = sceneGroups.find((g) => g.id === activeSceneId) || sceneGroups[0];
  const shots = activeGroup?.shots || [];

  const currentFocusIndex = Math.max(0, Math.min(shots.length - 1, focusShotIndex));
  const currentFocusShot = shots[currentFocusIndex] || shots[0];

  // Auto-scroll to newly created or duplicated shot
  useEffect(() => {
    if (lastCreatedShotId) {
      const el = document.getElementById(`shot-card-${lastCreatedShotId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setLastCreatedShotId(null);
      } else if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: 'smooth',
        });
        setLastCreatedShotId(null);
      }
    }
  }, [lastCreatedShotId, shots.length, setLastCreatedShotId]);

  return (
    <div className="flex-1 overflow-hidden w-full h-full flex flex-col">
      {/* 1. FOCUS MODE (90% Width) */}
      {viewMode === 'focus' && currentFocusShot ? (
        <div className="flex-1 flex flex-col items-center justify-between p-3 md:p-4 overflow-hidden w-full">
          {/* Top Focus Navigation Bar */}
          <div className="w-[92vw] max-w-[1600px] flex items-center justify-between py-1 px-2 bg-studio-900/60 rounded-xl border border-studio-800 shrink-0 mb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentFocusIndex === 0}
                onClick={() => setFocusShotIndex(currentFocusIndex - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-studio-850 hover:bg-studio-800 text-xs font-semibold text-gray-200 hover:text-white disabled:opacity-30 border border-studio-750 transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-studio-cyan" />
                <span>Пред. Шот</span>
              </button>

              <div className="flex items-center gap-1 overflow-x-auto max-w-[50vw] px-1 custom-scrollbar">
                {shots.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFocusShotIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 border ${
                      idx === currentFocusIndex
                        ? 'bg-studio-accent/25 border-studio-accent text-white shadow-sm'
                        : 'bg-studio-900 border-studio-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    #{s.shotNumber}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={currentFocusIndex >= shots.length - 1}
                onClick={() => setFocusShotIndex(currentFocusIndex + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-studio-850 hover:bg-studio-800 text-xs font-semibold text-gray-200 hover:text-white disabled:opacity-30 border border-studio-750 transition-all"
              >
                <span>След. Шот</span>
                <ChevronRight className="w-4 h-4 text-studio-cyan" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
              <span>
                Шот <strong className="text-white font-mono">{currentFocusIndex + 1}</strong> из{' '}
                <strong className="text-white font-mono">{shots.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => addShotToScene(activeGroup.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-studio-800 hover:bg-studio-750 text-xs font-semibold text-studio-cyan border border-studio-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Новый Шот</span>
              </button>
            </div>
          </div>

          {/* Large 90% Focus Shot Card */}
          <div className="flex-1 w-[92vw] max-w-[1600px] flex items-stretch justify-center min-h-0 overflow-hidden">
            <ShotCard
              sceneId={activeGroup.id}
              shot={currentFocusShot}
              shotIndex={currentFocusIndex}
              totalShots={shots.length}
              isFullScreenFocus={true}
            />
          </div>
        </div>
      ) : (
        /* 2. TIMELINE MODE (Horizontal Scroll Strip) */
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6 custom-scrollbar w-full h-full"
        >
          <div className="flex items-start gap-6 min-w-max pb-6 pt-1 h-full">
            {shots.map((shot, index) => (
              <React.Fragment key={shot.id}>
                {/* Shot Card Wrapper with DOM ID for smooth autoscrolling */}
                <div id={`shot-card-${shot.id}`} className="h-full flex shrink-0">
                  <ShotCard
                    sceneId={activeGroup.id}
                    shot={shot}
                    shotIndex={index}
                    totalShots={shots.length}
                  />
                </div>

                {/* Inter-Shot Dynamic SVG Cascade Connector */}
                {index < shots.length - 1 && (
                  <div className="flex flex-col items-center justify-center self-center gap-1.5 px-1 py-4 shrink-0">
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-studio-850 border border-studio-700 text-[10px] font-mono text-studio-cyan shadow-md">
                      <ArrowRight className="w-3.5 h-3.5 text-studio-accent animate-pulse" />
                      <span>Кадр #{shot.shotNumber} ➔ #{shot.shotNumber + 1}</span>
                    </div>
                    <div className="w-8 h-[2px] bg-gradient-to-r from-studio-accent to-studio-cyan" />
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Add Shot Card in Active Scene */}
            <button
              type="button"
              onClick={() => addShotToScene(activeGroup.id)}
              className="w-64 h-[calc(100vh-210px)] rounded-2xl border-2 border-dashed border-studio-700 hover:border-studio-accent bg-studio-900/40 hover:bg-studio-850/70 transition-all flex flex-col items-center justify-center gap-3.5 text-gray-400 hover:text-white group cursor-pointer shrink-0 shadow-lg"
            >
              <div className="w-12 h-12 rounded-2xl bg-studio-800 border border-studio-700 group-hover:border-studio-accent group-hover:bg-studio-accent/20 flex items-center justify-center transition-colors">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-studio-cyan" />
              </div>
              <div className="text-center px-4">
                <p className="text-xs font-bold text-gray-200 group-hover:text-white">
                  + Добавить Шот #{shots.length + 1}
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  в сцену «{activeGroup?.name}» с авто-сшивкой финального кадра
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
