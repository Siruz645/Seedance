'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import { ShotCard } from './ShotCard';
import { Plus, ArrowRight, Layers } from 'lucide-react';

export const StoryboardTimeline: React.FC = () => {
  const { sceneGroups, activeSceneId, addShotToScene } = useStudioStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeGroup = sceneGroups.find((g) => g.id === activeSceneId) || sceneGroups[0];
  const shots = activeGroup?.shots || [];

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6 custom-scrollbar w-full h-full"
    >
      <div className="flex items-start gap-6 min-w-max pb-16 pt-2">
        {shots.map((shot, index) => (
          <React.Fragment key={shot.id}>
            {/* Shot Card */}
            <ShotCard
              sceneId={activeGroup.id}
              shot={shot}
              shotIndex={index}
              totalShots={shots.length}
            />

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
          className="w-64 min-h-[480px] rounded-2xl border-2 border-dashed border-studio-700 hover:border-studio-accent bg-studio-900/40 hover:bg-studio-850/70 transition-all flex flex-col items-center justify-center gap-3.5 text-gray-400 hover:text-white group cursor-pointer shrink-0 shadow-lg"
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
  );
};
