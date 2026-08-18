'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import { callOpenRouterDirector } from '@/lib/openrouter';
import {
  Sparkles,
  X,
  RotateCw,
  Check,
  Film,
  Camera,
  HeartPulse,
  Ban,
  ArrowRight,
} from 'lucide-react';

export const PromptDirectorModal: React.FC = () => {
  const {
    isDirectorModalOpen,
    activeDirectorSceneId,
    setDirectorModalOpen,
    scenes,
    updateScene,
    settings,
  } = useStudioStore();

  const activeScene = scenes.find((s) => s.id === activeDirectorSceneId);

  const [ideaInput, setIdeaInput] = useState(activeScene?.prompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    refinedPrompt: string;
    negativePrompt: string;
    suggestedCameraMotion: string;
    actingDirectives: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isDirectorModalOpen || !activeScene) return null;

  const handleGenerate = async () => {
    if (!ideaInput.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const hasStart = activeScene.references.some((r) => r.role === 'start_frame');
      const hasEnd = activeScene.references.some((r) => r.role === 'end_frame');

      const result = await callOpenRouterDirector({
        userIdea: ideaInput,
        cameraMotion: activeScene.cameraMotion,
        duration: activeScene.duration,
        hasStartFrame: hasStart,
        hasEndFrame: hasEnd,
        model: settings.selectedLlmModel,
        apiKey: settings.openRouterApiKey,
      });

      setGeneratedResult(result);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error ||
          err.message ||
          'Не удалось вызвать AI-режиссера. Проверьте API ключ OpenRouter в настройках.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedResult) return;
    updateScene(activeScene.id, {
      prompt: generatedResult.refinedPrompt,
      negativePrompt: generatedResult.negativePrompt || activeScene.negativePrompt,
      cameraMotion: (generatedResult.suggestedCameraMotion as any) || activeScene.cameraMotion,
    });
    setDirectorModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-studio-900 border border-studio-700 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-studio-700 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-studio-cyan/20 text-studio-cyan border border-studio-cyan/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                ✨ AI-Режиссер Сцены #{activeScene.sceneNumber}
              </h2>
              <p className="text-xs text-gray-400">
                Автоматическое обогащение промпта законами кинематографии, соматикой и 24fps
              </p>
            </div>
          </div>
          <button
            onClick={() => setDirectorModalOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Idea */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300">
            Опишите общую задумку сцены простыми словами:
          </label>
          <textarea
            value={ideaInput}
            onChange={(e) => setIdeaInput(e.target.value)}
            rows={3}
            placeholder="Например: Девушка детектив в темном переулке под дождем напряженно читает секретный документ, замечает слежку и резко оборачивается..."
            className="w-full bg-studio-850 border border-studio-700 rounded-xl p-3.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-studio-cyan transition-colors resize-none"
          />
        </div>

        {/* Generation Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || !ideaInput.trim()}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-studio-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-studio-cyan/20 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Режиссер формулирует кадр через {settings.selectedLlmModel}...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Сформировать Кинематографический Промпт</span>
            </>
          )}
        </button>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-studio-rose/10 border border-studio-rose/30 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Results Preview */}
        {generatedResult && (
          <div className="space-y-4 border-t border-studio-700 pt-4">
            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-studio-cyan flex items-center gap-1.5">
                  <Film className="w-4 h-4" />
                  Готовый Промпт Seedance (English):
                </span>
                <span className="text-[10px] font-mono text-gray-400">24fps Anti-Slowmo</span>
              </div>
              <p className="text-xs text-gray-200 font-sans leading-relaxed bg-studio-900 p-3 rounded-lg border border-studio-750 select-all">
                {generatedResult.refinedPrompt}
              </p>
            </div>

            {/* Directives */}
            {generatedResult.actingDirectives?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                  Соматические директивы (Anti-Stiffness):
                </span>
                <ul className="list-disc list-inside text-xs text-gray-300 space-y-1 pl-1">
                  {generatedResult.actingDirectives.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDirectorModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-studio-emerald hover:bg-emerald-600 text-xs font-bold text-white shadow-lg shadow-studio-emerald/20 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Применить к Сцене #{activeScene.sceneNumber}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
