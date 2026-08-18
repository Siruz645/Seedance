'use client';

import React, { useState, useEffect } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import { checkOpenRouterBalance } from '@/lib/openrouter';
import { Key, ShieldCheck, Cpu, X, Check, ExternalLink, Sparkles, Database } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen, settings, updateSettings, setBalanceInfo } = useStudioStore();
  const [apiKey, setApiKey] = useState(settings.openRouterApiKey);
  const [selectedLlm, setSelectedLlm] = useState(settings.selectedLlmModel);
  const [zdr, setZdr] = useState(settings.zeroDataRetention);
  const [enableDirector, setEnableDirector] = useState(settings.enableAiDirector);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setApiKey(settings.openRouterApiKey);
    setSelectedLlm(settings.selectedLlmModel);
    setZdr(settings.zeroDataRetention);
    setEnableDirector(settings.enableAiDirector);
  }, [settings, isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSaveAndVerify = async () => {
    setIsVerifying(true);
    setFeedback(null);

    // Save to Zustand store & localStorage
    updateSettings({
      openRouterApiKey: apiKey.trim(),
      selectedLlmModel: selectedLlm,
      zeroDataRetention: zdr,
      enableAiDirector: enableDirector,
    });

    if (!apiKey.trim()) {
      setFeedback({
        type: 'success',
        text: 'Настройки успешно сохранены (режим локальной симуляции без ключа).',
      });
      setIsVerifying(false);
      return;
    }

    try {
      const res = await checkOpenRouterBalance(apiKey.trim());
      if (res.isValid) {
        setBalanceInfo(res);
        setFeedback({
          type: 'success',
          text: `Ключ подтвержден! Баланс: $${res.usage?.toFixed(2) || '0.00'} / $${res.limit?.toFixed(2) || '∞'}`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'Неверный API ключ OpenRouter',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Ошибка соединения с OpenRouter',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-studio-900 border border-studio-700 shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-studio-750 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-studio-accent/20 border border-studio-accent/40 flex items-center justify-center text-studio-accent">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Настройки Студии и API</h2>
              <p className="text-xs text-gray-400">Автоматически сохраняются в локальной памяти</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300">OpenRouter API Key:</label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-studio-cyan hover:underline flex items-center gap-1"
              >
                <span>Получить ключ</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-studio-850 border border-studio-700 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-studio-accent font-mono"
            />
          </div>

          {/* LLM Model for Director */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-studio-cyan" />
              <span>Модель для AI-Режиссера (LLM Director):</span>
            </label>
            <select
              value={selectedLlm}
              onChange={(e) => setSelectedLlm(e.target.value)}
              className="w-full bg-studio-850 border border-studio-700 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-studio-accent cursor-pointer"
            >
              <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet (Рекомендуется для режиссуры)</option>
              <option value="deepseek/deepseek-r1">DeepSeek R1 (Глубокий кинематографический анализ)</option>
              <option value="openai/gpt-4o">OpenAI GPT-4o</option>
              <option value="google/gemini-2.5-pro">Google Gemini 2.5 Pro</option>
              <option value="bytedance-seed/seed-2-1-turbo">ByteDance Seed 2.1 Turbo</option>
            </select>
          </div>

          {/* Toggle AI Director on/off */}
          <div className="p-3.5 rounded-xl bg-studio-850 border border-studio-750 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className={`w-5 h-5 ${enableDirector ? 'text-studio-cyan' : 'text-gray-500'}`} />
              <div>
                <p className="text-xs font-bold text-white">Кнопка «✨ AI Режиссер» в сценах</p>
                <p className="text-[11px] text-gray-400">
                  {enableDirector ? 'Включена (отображается в карточках)' : 'Отключена (скрыта для предотвращения случайных нажатий)'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enableDirector}
              onChange={(e) => setEnableDirector(e.target.checked)}
              className="w-4 h-4 accent-studio-accent rounded cursor-pointer"
            />
          </div>

          {/* ZDR Checkbox */}
          <div className="p-3.5 rounded-xl bg-studio-850 border border-studio-750 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-studio-emerald" />
              <div>
                <p className="text-xs font-bold text-white">Zero Data Retention (ZDR)</p>
                <p className="text-[11px] text-gray-400">Запрет на сохранение и обучение на ваших промптах</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={zdr}
              onChange={(e) => setZdr(e.target.checked)}
              className="w-4 h-4 accent-studio-accent rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-studio-emerald/20 text-emerald-300 border border-studio-emerald/40'
                : 'bg-studio-rose/20 text-rose-300 border border-studio-rose/40'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-studio-750 pt-4">
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={handleSaveAndVerify}
            disabled={isVerifying}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-studio-accent hover:bg-purple-600 text-white transition-colors flex items-center gap-2 shadow-lg shadow-studio-accent/25"
          >
            {isVerifying ? (
              <span>Проверка...</span>
            ) : (
              <>
                <Database className="w-3.5 h-3.5" />
                <span>Сохранить в базу</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
