'use client';

import React, { useState, useEffect } from 'react';
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
    activeDirectorShotId,
    setDirectorModalOpen,
    sceneGroups,
    updateShot,
    settings,
  } = useStudioStore();

  let targetSceneId = '';
  let activeShot: any = null;

  for (const group of sceneGroups) {
    const found = group.shots.find((s) => s.id === activeDirectorShotId);
    if (found) {
      targetSceneId = group.id;
      activeShot = found;
      break;
    }
  }

  const [ideaInput, setIdeaInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    refinedPrompt: string;
    negativePrompt: string;
    suggestedCameraMotion: string;
    actingDirectives: string[];
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeShot) {
      setIdeaInput(activeShot.prompt || '');
    }
  }, [activeDirectorShotId, activeShot]);

  if (!isDirectorModalOpen || !activeShot) return null;

  const handleGenerate = async () => {
    if (!ideaInput.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const hasStart = activeShot.references.some((r: any) => r.role === 'start_frame');
      const hasEnd = activeShot.references.some((r: any) => r.role === 'end_frame');

      const result = await callOpenRouterDirector({
        userIdea: ideaInput,
        cameraMotion: activeShot.cameraMotion,
        duration: activeShot.duration,
        hasStartFrame: hasStart,
        hasEndFrame: hasEnd,
        model: settings.directorModel || 'anthropic/claude-3.7-sonnet',
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
    if (!generatedResult || !targetSceneId) return;
    updateShot(targetSceneId, activeShot.id, {
      prompt: generatedResult.refinedPrompt,
      negativePrompt: generatedResult.negativePrompt || activeShot.negativePrompt,
      cameraMotion: (generatedResult.suggestedCameraMotion as any) || activeShot.cameraMotion,
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
              <h3 className="text-base font-bold text-white">AI-Режиссер и Промпт-Инженер</h3>
              <p className="text-xs text-gray-400">
                Автоматическое обогащение соматикой, динамикой и операторской оптикой
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDirectorModalOpen(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Idea */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
            Ваша задумка шота (на русском или английском)
          </label>
          <textarea
            value={ideaInput}
            onChange={(e) => setIdeaInput(e.target.value)}
            placeholder="Например: Монтажник в синей робе нервно смотрит на провода на складе..."
            rows={3}
            className="w-full rounded-xl bg-studio-850 border border-studio-700 p-3 text-xs text-gray-200 focus:outline-none focus:border-studio-cyan resize-y"
          />
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          disabled={isLoading || !ideaInput.trim()}
          onClick={handleGenerate}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-studio-accent to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-studio-accent/20"
        >
          {isLoading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin text-studio-cyan" />
              <span>Генерация кинематографического промпта...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Улучшить и сгенерировать промпт</span>
            </>
          )}
        </button>

        {/* Generated Result Preview */}
        {generatedResult && (
          <div className="space-y-4 pt-3 border-t border-studio-750 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700 space-y-3">
              <div>
                <span className="text-[11px] font-bold text-studio-cyan uppercase tracking-wider block">
                  ✨ Обогащенный промпт (English Seedance DiT Standard)
                </span>
                <p className="text-xs text-gray-200 mt-1 leading-relaxed font-mono bg-studio-900 p-2.5 rounded-lg border border-studio-750">
                  {generatedResult.refinedPrompt}
                </p>
              </div>

              {generatedResult.actingDirectives && generatedResult.actingDirectives.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    🎭 Соматические указания персонажу:
                  </span>
                  <ul className="text-xs text-gray-300 list-disc list-inside mt-1 space-y-0.5">
                    {generatedResult.actingDirectives.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDirectorModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-studio-800 text-gray-300 hover:text-white text-xs font-semibold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 rounded-xl bg-studio-emerald hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Применить к шоту</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
