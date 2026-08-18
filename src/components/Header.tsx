'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import {
  Film,
  Play,
  Settings,
  Sparkles,
  Download,
  Upload,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Terminal,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    projectName,
    setProjectName,
    settings,
    scenes,
    addScene,
    setSettingsOpen,
    setMasterPlayerOpen,
    setLogsModalOpen,
    isCascadeRendering,
    startBatchCascadeRender,
    stopCascadeRender,
    exportProjectJson,
    importProjectJson,
    openRouterBalanceInfo,
  } = useStudioStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportProjectJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_seedance.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importProjectJson(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const completedScenesCount = scenes.filter((s) => s.status === 'completed').length;

  return (
    <header className="h-16 border-b border-studio-700 bg-studio-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Logo & Project Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-studio-accent via-indigo-500 to-studio-cyan flex items-center justify-center shadow-lg shadow-studio-accent/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">SEEDANCE</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-studio-accent/20 text-studio-accent border border-studio-accent/30">
                Studio
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">ByteDance DiT & OpenRouter</p>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-studio-700 mx-1" />

        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent text-sm font-semibold text-gray-200 hover:text-white focus:text-white px-2 py-1 rounded hover:bg-studio-800 focus:bg-studio-800 focus:outline-none border border-transparent focus:border-studio-600 transition-colors w-52 truncate"
          title="Кликните, чтобы изменить название проекта"
        />
      </div>

      {/* Center: Quick Stats / Scene Counter */}
      <div className="flex items-center gap-3 bg-studio-850 px-3.5 py-1.5 rounded-full border border-studio-700">
        <div className="flex items-center gap-1.5 text-xs text-gray-300">
          <Layers className="w-3.5 h-3.5 text-studio-cyan" />
          <span>
            Сцен: <strong className="text-white font-mono">{scenes.length}</strong>
          </span>
        </div>
        <span className="text-studio-600">•</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-studio-emerald" />
          <span>
            Готово:{' '}
            <strong className="text-white font-mono">
              {completedScenesCount}/{scenes.length}
            </strong>
          </span>
        </div>
        <span className="text-studio-600">•</span>
        <div className="text-xs text-gray-400 font-mono">
          Хронометраж: <span className="text-studio-cyan">{scenes.reduce((acc, s) => acc + s.duration, 0)}с</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Balance / Key status pill */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-xs text-gray-300 border border-studio-700 transition-colors"
          title="Настройки API и проверка баланса"
        >
          {settings.openRouterApiKey ? (
            <>
              <span className="w-2 h-2 rounded-full bg-studio-emerald animate-pulse" />
              <span className="font-mono text-gray-200">OpenRouter Active</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-studio-amber" />
              <span className="text-studio-amber">Укажите API Key</span>
            </>
          )}
        </button>

        {/* Import/Export */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".json"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg bg-studio-800 hover:bg-studio-700 text-gray-300 border border-studio-700 transition-colors"
          title="Импорт проекта (.json)"
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          onClick={handleExport}
          className="p-2 rounded-lg bg-studio-800 hover:bg-studio-700 text-gray-300 border border-studio-700 transition-colors"
          title="Экспорт проекта (.json)"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Live Execution Logs Console Button */}
        <button
          onClick={() => setLogsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-850 hover:bg-studio-800 text-xs font-semibold text-studio-cyan border border-studio-700 hover:border-studio-500 transition-colors shadow-sm"
          title="Открыть живой журнал логов и API-запросов"
        >
          <Terminal className="w-3.5 h-3.5 text-studio-cyan" />
          <span>Логи API</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-lg bg-studio-800 hover:bg-studio-700 text-gray-300 border border-studio-700 transition-colors"
          title="Настройки студии"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Master Film Player */}
        <button
          onClick={() => setMasterPlayerOpen(true)}
          disabled={completedScenesCount === 0}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-studio-700 hover:bg-studio-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white border border-studio-600 shadow-sm transition-all"
        >
          <Play className="w-3.5 h-3.5 text-studio-cyan" />
          <span>Плеер Фильма</span>
        </button>

        {/* Add Scene */}
        <button
          onClick={() => addScene()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-xs font-medium text-gray-200 border border-studio-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Сцена</span>
        </button>

        {/* Batch Cascade Render Button */}
        {isCascadeRendering ? (
          <button
            onClick={stopCascadeRender}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-studio-rose hover:bg-rose-600 text-xs font-bold text-white shadow-lg shadow-studio-rose/20 transition-all animate-pulse"
          >
            <span>Остановить Рендер</span>
          </button>
        ) : (
          <button
            onClick={startBatchCascadeRender}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-studio-accent to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-studio-accent/25 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-studio-cyan" />
            <span>Каскадный Рендер</span>
          </button>
        )}
      </div>
    </header>
  );
};
