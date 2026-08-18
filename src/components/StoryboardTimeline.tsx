'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import { SceneCard } from './SceneCard';
import { Plus, ArrowRight } from 'lucide-react';

export const StoryboardTimeline: React.FC = () => {
  const { scenes, addScene } = useStudioStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-x-auto overflow-y-auto p-6 md:p-8 custom-scrollbar w-full h-full"
    >
      <div className="flex items-start gap-8 min-w-max pb-16 pt-2">
        {scenes.map((scene, index) => (
          <React.Fragment key={scene.id}>
            {/* Scene Card */}
            <SceneCard
              scene={scene}
              sceneIndex={index}
              isFirst={index === 0}
              isLast={index === scenes.length - 1}
            />

            {/* Inter-Scene Dynamic SVG Connector */}
            {index < scenes.length - 1 && (
              <div className="flex flex-col items-center justify-center self-center gap-1.5 px-1 py-4 shrink-0">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-studio-850 border border-studio-700 text-[11px] font-mono text-studio-cyan shadow-md">
                  <ArrowRight className="w-3.5 h-3.5 text-studio-accent animate-pulse" />
                  <span>Кадр #{index + 1} ➔ #{index + 2}</span>
                </div>
                <div className="w-10 h-[2px] bg-gradient-to-r from-studio-accent to-studio-cyan" />
              </div>
            )}
          </React.Fragment>
        ))}

        {/* Add Scene Card */}
        <button
          type="button"
          onClick={() => addScene()}
          className="w-80 min-h-[560px] rounded-2xl border-2 border-dashed border-studio-700 hover:border-studio-accent bg-studio-900/40 hover:bg-studio-850/70 transition-all flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-white group cursor-pointer shrink-0 shadow-lg"
        >
          <div className="w-14 h-14 rounded-2xl bg-studio-800 border border-studio-700 group-hover:border-studio-accent group-hover:bg-studio-accent/20 flex items-center justify-center transition-colors">
            <Plus className="w-7 h-7 text-gray-400 group-hover:text-studio-cyan" />
          </div>
          <div className="text-center px-4">
            <p className="text-sm font-bold text-gray-200 group-hover:text-white">
              + Добавить Сцену #{scenes.length + 1}
            </p>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Наследует соотношение, модель и разрешение сцены #{scenes.length}. Требуется заполнить промпт.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
