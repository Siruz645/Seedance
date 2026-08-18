'use client';

import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { StoryboardTimeline } from '@/components/StoryboardTimeline';
import { SettingsModal } from '@/components/SettingsModal';
import { PromptDirectorModal } from '@/components/PromptDirectorModal';
import { MasterPlayerModal } from '@/components/MasterPlayerModal';
import { ExecutionConsoleModal } from '@/components/ExecutionConsoleModal';
import { useStudioStore } from '@/lib/projectStore';
import { checkOpenRouterBalance } from '@/lib/openrouter';
import { Sparkles, Film, ArrowRight, Layers, Clapperboard, Link2 } from 'lucide-react';

export default function StudioPage() {
  const { settings, setBalanceInfo, loadPersistedSettings } = useStudioStore();

  // Load saved settings from localStorage on initial mount
  useEffect(() => {
    loadPersistedSettings();
  }, [loadPersistedSettings]);

  // Initial balance verification if key is present
  useEffect(() => {
    if (settings.openRouterApiKey) {
      checkOpenRouterBalance(settings.openRouterApiKey).then((res) => {
        if (res.isValid) setBalanceInfo(res);
      });
    }
  }, [settings.openRouterApiKey, setBalanceInfo]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Studio Header */}
      <Header />

      {/* Main Workspace: Storyboard Timeline */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {/* Info Ribbon */}
        <div className="bg-studio-850/80 border-b border-studio-700/60 px-8 py-2 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-gray-300 font-semibold">
              <Clapperboard className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Раскадровка Сцен</span>
            </span>
            <span className="text-studio-600">•</span>
            <span className="flex items-center gap-1 text-gray-400 font-mono">
              <Link2 className="w-3.5 h-3.5 text-studio-accent" />
              <span>Каскадное наследование: Конечный кадр ➔ Начальный кадр</span>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-gray-500">
            <span>Движок: ByteDance DiT</span>
            <span>•</span>
            <span>Режим: 24fps Anti-Slowmo</span>
          </div>
        </div>

        {/* Storyboard Horizontal Flow */}
        <StoryboardTimeline />
      </main>

      {/* Modals */}
      <SettingsModal />
      <PromptDirectorModal />
      <MasterPlayerModal />
      <ExecutionConsoleModal />
    </div>
  );
}
