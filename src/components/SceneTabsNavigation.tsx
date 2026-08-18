'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import {
  Clapperboard,
  Plus,
  Play,
  Copy,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SceneTabsNavigation: React.FC = () => {
  const {
    sceneGroups,
    activeSceneId,
    setActiveSceneId,
    addSceneGroup,
    removeSceneGroup,
    renameSceneGroup,
    duplicateSceneGroup,
    addShotToScene,
    startCascadeRenderForScene,
    isCascadeRendering,
    viewMode,
    setViewMode,
  } = useStudioStore();

  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activeGroup = sceneGroups.find((g) => g.id === activeSceneId) || sceneGroups[0];

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSceneId(id);
    setEditingName(currentName);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      renameSceneGroup(id, editingName.trim());
    }
    setEditingSceneId(null);
  };

  return (
    <div className="bg-studio-900/90 border-b border-studio-800 px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 backdrop-blur-md">
      {/* Left: Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin scrollbar-thumb-studio-700">
        <div className="flex items-center gap-1 text-xs font-bold text-gray-400 mr-1 shrink-0 uppercase tracking-wider">
          <Clapperboard className="w-4 h-4 text-studio-cyan" />
          <span>Сцены:</span>
        </div>

        {sceneGroups.map((group) => {
          const isActive = group.id === activeSceneId;
          const totalShots = group.shots.length;
          const completedShots = group.shots.filter((s) => s.status === 'completed').length;
          const isAllCompleted = totalShots > 0 && completedShots === totalShots;

          return (
            <div
              key={group.id}
              onClick={() => setActiveSceneId(group.id)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                isActive
                  ? 'bg-studio-accent/20 border-studio-accent text-white shadow-md shadow-studio-accent/15 ring-1 ring-studio-accent/40'
                  : 'bg-studio-850/80 hover:bg-studio-800 border-studio-750 text-gray-300 hover:text-white'
              }`}
            >
              {/* Status indicator dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isAllCompleted
                    ? 'bg-studio-emerald shadow-sm shadow-emerald-500/50'
                    : completedShots > 0
                    ? 'bg-amber-400'
                    : 'bg-gray-500'
                }`}
                title={`${completedShots}/${totalShots} шотов готово`}
              />

              {/* Title / Editable Input */}
              {editingSceneId === group.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(group.id);
                      if (e.key === 'Escape') setEditingSceneId(null);
                    }}
                    className="bg-studio-950 text-white text-xs px-1.5 py-0.5 rounded border border-studio-cyan focus:outline-none w-28"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRename(group.id)}
                    className="p-0.5 text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="truncate max-w-[140px]">{group.name}</span>
              )}

              {/* Counter badge */}
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-studio-950/60 text-gray-400 border border-studio-700/50 shrink-0">
                {completedShots}/{totalShots}
              </span>

              {/* Action buttons on hover / active */}
              <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => handleStartRename(group.id, group.name, e)}
                  className="p-0.5 rounded hover:bg-studio-750 text-gray-400 hover:text-white"
                  title="Переименовать сцену"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateSceneGroup(group.id);
                  }}
                  className="p-0.5 rounded hover:bg-studio-750 text-gray-400 hover:text-studio-cyan"
                  title="Дублировать сцену"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>

                {sceneGroups.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Удалить «${group.name}» со всеми её шотами?`)) {
                        removeSceneGroup(group.id);
                      }
                    }}
                    className="p-0.5 rounded hover:bg-studio-750 text-gray-400 hover:text-rose-400"
                    title="Удалить сцену"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Scene Button (Copies settings from previous scene) */}
        <button
          type="button"
          onClick={() => addSceneGroup()}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-studio-850 hover:bg-studio-800 border border-dashed border-studio-650 hover:border-studio-cyan text-xs font-semibold text-studio-cyan hover:text-cyan-300 transition-all shrink-0 shadow-sm"
          title="Добавить новую сцену (автоматически скопирует настройки модели и формата)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Новая Сцена</span>
        </button>
      </div>

      {/* Right: View Mode Toggle, Add Shot & Cascade Render */}
      <div className="flex items-center gap-2 shrink-0 justify-end">
        {/* View Mode Toggle: [ 🎞️ Лента | 🔍 Фокус (90%) ] */}
        <div className="flex items-center bg-studio-950/80 p-0.5 rounded-xl border border-studio-750">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'timeline'
                ? 'bg-studio-accent text-white shadow-sm font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Горизонтальная каскадная лента карточек"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Лента</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('focus')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'focus'
                ? 'bg-studio-accent text-white shadow-sm font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Полноэкранный фокус-режим (90% ширины)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Фокус 90%</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => addShotToScene(activeSceneId)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-studio-800 hover:bg-studio-750 text-xs font-semibold text-white border border-studio-700 hover:border-studio-600 transition-all shadow-sm"
          title="Добавить следующий шот в эту сцену"
        >
          <Plus className="w-3.5 h-3.5 text-studio-cyan" />
          <span>Добавить Шот #{activeGroup?.shots.length + 1}</span>
        </button>

        <button
          type="button"
          onClick={() => startCascadeRenderForScene(activeSceneId)}
          disabled={isCascadeRendering || !activeGroup?.shots.length}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-studio-accent to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-studio-accent/20 transition-all disabled:opacity-50"
          title="Последовательно отрендерить все шоты активной сцены с автоматической сшивкой кадров"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>{isCascadeRendering ? 'Каскадный рендер...' : 'Сквозной рендер сцены'}</span>
        </button>
      </div>
    </div>
  );
};
