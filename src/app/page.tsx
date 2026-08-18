'use client';

import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { SceneTabsNavigation } from '@/components/SceneTabsNavigation';
import { StoryboardTimeline } from '@/components/StoryboardTimeline';
import { SettingsModal } from '@/components/SettingsModal';
import { PromptDirectorModal } from '@/components/PromptDirectorModal';
import { MasterPlayerModal } from '@/components/MasterPlayerModal';
import { ExecutionConsoleModal } from '@/components/ExecutionConsoleModal';
import { ShotAdvancedSettingsModal } from '@/components/ShotAdvancedSettingsModal';
import { PromptWorkspaceModal } from '@/components/PromptWorkspaceModal';
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

      {/* Scene Groups / Package Tabs Navigation */}
      <SceneTabsNavigation />

      {/* Main Workspace: Storyboard Timeline */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* Storyboard Horizontal Flow */}
        <StoryboardTimeline />
      </main>

      {/* Modals */}
      <SettingsModal />
      <PromptDirectorModal />
      <MasterPlayerModal />
      <ExecutionConsoleModal />
      <ShotAdvancedSettingsModal />
      <PromptWorkspaceModal />
    </div>
  );
}
