'use client';

import React, { useRef } from 'react';
import { useStudioStore } from '@/lib/projectStore';
import { MediaDropzone } from './MediaDropzone';
import { PromptEditorWithMentions } from './PromptEditorWithMentions';
import {
  X,
  Sparkles,
  Maximize2,
  Check,
  Film,
  Zap,
} from 'lucide-react';

const SOMATIC_PRESETS = [
  'микро-саккады глаз и моргание',
  'естественное дыхание и мимика',
  'соматическая реакция на окружение',
  'динамическое изменение глубины резкости',
  'кинематографичный свет с объемными тенями',
  'реалистичная физика ткани и волос',
];

export const PromptWorkspaceModal: React.FC = () => {
  const {
    sceneGroups,
    promptWorkspaceModalShot,
    setPromptWorkspaceModalShot,
    updateShot,
    addReferenceToShot,
    removeReferenceFromShot,
    updateReferenceRole,
    updateReferenceUrl,
    updateReferenceData,
    setDirectorModalOpen,
    settings,
  } = useStudioStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!promptWorkspaceModalShot) return null;

  const { sceneId, shotId } = promptWorkspaceModalShot;
  const targetGroup = sceneGroups.find((g) => g.id === sceneId);
  const shot = targetGroup?.shots.find((s) => s.id === shotId);

  if (!shot || !targetGroup) return null;

  const handleClose = () => setPromptWorkspaceModalShot(null);

  const insertTextAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) {
      updateShot(sceneId, shot.id, {
        prompt: (shot.prompt ? shot.prompt + ' ' : '') + textToInsert,
      });
      return;
    }
    const textarea = textareaRef.current;
    const currentScrollTop = textarea.scrollTop;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = shot.prompt || '';

    const prefix = currentText.substring(0, start);
    const suffix = currentText.substring(end);

    const spaceBefore = prefix.length > 0 && !prefix.endsWith(' ') && !prefix.endsWith('\n') ? ' ' : '';
    const spaceAfter = !suffix.startsWith(' ') && !suffix.startsWith('\n') ? ' ' : '';

    const newText = prefix + spaceBefore + textToInsert + spaceAfter + suffix;
    updateShot(sceneId, shot.id, { prompt: newText });

    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus({ preventScroll: true });
        const newPos = prefix.length + spaceBefore.length + textToInsert.length + spaceAfter.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.scrollTop = currentScrollTop;
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-[92vw] h-[88vh] max-w-[1700px] bg-studio-950 border border-studio-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-studio-800 bg-studio-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-studio-accent/20 text-studio-cyan border border-studio-accent/30">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Полноэкранный Workspace: Шот #{shot.shotNumber}</span>
                <span className="text-xs font-normal text-gray-400 font-mono px-2 py-0.5 rounded-full bg-studio-850 border border-studio-750">
                  {targetGroup.name}
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Расширенная рабочая среда для промпт-инжиниринга и мультимодальных референсов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {settings.enableAiDirector && (
              <button
                type="button"
                onClick={() => setDirectorModalOpen(true, shot.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-studio-accent to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-xs font-bold text-white shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>✨ AI-Режиссер</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-studio-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Split 50/50 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-studio-800 overflow-hidden">
          {/* Left Column (50%): Prompt Textarea & Somatics (Fixed height, NO double scrollbar) */}
          <div className="md:col-span-6 p-6 flex flex-col justify-between space-y-3 h-full min-h-0 overflow-hidden">
            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <label className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-studio-cyan" />
                  <span>Промпт динамики, физики и соматики</span>
                </label>
                <span className="text-xs font-mono text-gray-400">
                  Символов: <strong className="text-studio-cyan">{shot.prompt.length}</strong>
                </span>
              </div>

              {/* Big Textarea with @-mention autocomplete (Fills 100% remaining vertical space) */}
              <div className="flex-1 min-h-0 flex flex-col my-1">
                <PromptEditorWithMentions
                  value={shot.prompt}
                  onChange={(val) => updateShot(sceneId, shot.id, { prompt: val })}
                  sceneId={sceneId}
                  shotId={shot.id}
                  references={shot.references}
                  placeholder="Опишите детально непрерывное действие персонажа, соматику или наберите @ для выбора нужного референса..."
                  className="w-full h-full flex-1 rounded-2xl bg-studio-900/90 border border-studio-750 p-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-studio-cyan focus:ring-1 focus:ring-studio-cyan transition-all resize-none leading-relaxed font-sans"
                  textareaRef={textareaRef}
                />
              </div>

              {/* Somatic Quick Presets (Pinned at bottom) */}
              <div className="space-y-1.5 pt-1 shrink-0">
                <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Быстрые соматические формулировки (кликните для добавления):</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SOMATIC_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertTextAtCursor(preset)}
                      className="px-2.5 py-1 rounded-lg bg-studio-900 hover:bg-studio-850 text-[11px] text-gray-300 hover:text-white border border-studio-800 hover:border-studio-600 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (50%): Full Multimodal References Panel */}
          <div className="md:col-span-6 p-6 flex flex-col justify-between space-y-4 overflow-y-auto custom-scrollbar bg-studio-950/40 h-full">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-studio-800 pb-2 shrink-0">
                <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                  Мультимодальные референсы ({shot.references.length})
                </span>
                <span className="text-[11px] text-gray-400">
                  PNG, JPG, MP4 (движение), MP3/WAV (звук)
                </span>
              </div>

              <MediaDropzone
                sceneId={sceneId}
                shotId={shot.id}
                references={shot.references}
                isLargeLayout={true}
                showCrossShotPool={true}
                hasExistingStartFrame={shot.startFrameSourceMode !== 'none'}
                onInsertTagToPrompt={insertTextAtCursor}
                onAddReference={(ref) => addReferenceToShot(sceneId, shot.id, ref)}
                onRemoveReference={(refId) => removeReferenceFromShot(sceneId, shot.id, refId)}
                onUpdateRole={(refId, role) => updateReferenceRole(sceneId, shot.id, refId, role)}
                onUpdateUrl={(refId, url) => updateReferenceUrl(sceneId, shot.id, refId, url)}
                onUpdateData={(refId, data) => updateReferenceData(sceneId, shot.id, refId, data)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-studio-800 bg-studio-900/90 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-400">
            Все изменения автоматически сохраняются в шот #{shot.shotNumber}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-studio-accent hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-studio-accent/20"
          >
            <Check className="w-4 h-4" />
            <span>Готово</span>
          </button>
        </div>
      </div>
    </div>
  );
};
