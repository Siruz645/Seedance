import { create } from 'zustand';
import { Scene, StudioSettings, ProjectData, MediaReference, SeedanceModelId, StartFrameSourceMode, LogEntry } from '@/types/studio';
import { extractLastFrameFromVideo } from './frameExtractor';
import { applyNoiseToImage } from './noiseFilter';
import { submitSceneGeneration, pollSceneStatus } from './seedance';

interface StudioState {
  projectName: string;
  settings: StudioSettings;
  scenes: Scene[];
  selectedSceneId: string | null;
  isMasterPlayerOpen: boolean;
  isSettingsOpen: boolean;
  isDirectorModalOpen: boolean;
  isLogsModalOpen: boolean;
  activeDirectorSceneId: string | null;
  isCascadeRendering: boolean;
  currentRenderingSceneIndex: number;
  openRouterBalanceInfo: {
    isValid: boolean;
    usage?: number;
    limit?: number;
    label?: string;
  } | null;
  logs: LogEntry[];

  // Actions
  setProjectName: (name: string) => void;
  updateSettings: (settings: Partial<StudioSettings>) => void;
  setBalanceInfo: (info: any) => void;
  setSelectedSceneId: (id: string | null) => void;
  setMasterPlayerOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setDirectorModalOpen: (open: boolean, sceneId?: string) => void;
  setLogsModalOpen: (open: boolean) => void;
  addLog: (level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any) => void;
  clearLogs: () => void;

  // Scene Operations
  addScene: (afterSceneId?: string) => void;
  removeScene: (sceneId: string) => void;
  duplicateScene: (sceneId: string) => void;
  updateScene: (sceneId: string, data: Partial<Scene>) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;

  // Reference Operations
  addReferenceToScene: (sceneId: string, ref: Omit<MediaReference, 'id'>) => void;
  removeReferenceFromScene: (sceneId: string, refId: string) => void;
  updateReferenceRole: (sceneId: string, refId: string, role: MediaReference['role']) => void;
  updateReferenceUrl: (sceneId: string, refId: string, url: string) => void;
  copyReferencesFromScene: (targetSceneId: string, sourceSceneNumber: number) => void;

  // Keyframe Source Selection
  setStartFrameSource: (sceneId: string, mode: StartFrameSourceMode, targetSceneNumber?: number) => void;

  // Execution & Keyframe Chaining
  getResolvedStartFrameForScene: (sceneIndex: number) => { url?: string; sourceLabel: string };
  renderSceneById: (sceneId: string) => Promise<void>;
  startBatchCascadeRender: () => Promise<void>;
  stopCascadeRender: () => void;

  // Project persistence & LocalStorage
  loadPersistedSettings: () => void;
  exportProjectJson: () => string;
  importProjectJson: (jsonString: string) => boolean;
}

const FULL_PROJECT_STORAGE_KEY = 'seedance_studio_full_project_v2';
const SETTINGS_STORAGE_KEY = 'seedance_studio_settings_v1';

const DEFAULT_SETTINGS: StudioSettings = {
  openRouterApiKey: '',
  selectedLlmModel: 'anthropic/claude-3.7-sonnet',
  defaultSeedanceModel: 'bytedance/seedance-2.5',
  zeroDataRetention: true,
  autoCascadeRender: true,
  enableAiDirector: true,
  defaultAspectRatio: '16:9',
  defaultResolution: '1080p',
  defaultDuration: 5,
  appTitle: 'Seedance Studio Pro',
};

function saveFullProjectToStorage(projectName: string, settings: StudioSettings, scenes: Scene[]) {
  if (typeof window === 'undefined') return;
  try {
    const data = {
      projectName,
      settings,
      scenes,
    };
    localStorage.setItem(FULL_PROJECT_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save full project to localStorage', e);
  }
}

function loadFullProjectFromStorage(): { projectName?: string; settings?: StudioSettings; scenes?: Scene[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(FULL_PROJECT_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Could not load full project from localStorage', e);
  }
  return null;
}

function createInitialScene(sceneNumber: number, id?: string, inheritedPrevScene?: Scene): Scene {
  if (inheritedPrevScene) {
    return {
      id: id || `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sceneNumber,
      title: `Сцена ${sceneNumber}`,
      model: inheritedPrevScene.model,
      prompt: '',
      negativePrompt: inheritedPrevScene.negativePrompt,
      duration: inheritedPrevScene.duration,
      resolution: inheritedPrevScene.resolution,
      aspectRatio: inheritedPrevScene.aspectRatio,
      cameraMotion: inheritedPrevScene.cameraMotion,
      motionStrength: inheritedPrevScene.motionStrength,
      fps: inheritedPrevScene.fps,
      seed: Math.floor(Math.random() * 1000000),
      generateAudio: inheritedPrevScene.generateAudio,
      references: [],
      startFrameSourceMode: 'previous_scene',
      startFrameSourceSceneNumber: inheritedPrevScene.sceneNumber,
      status: 'draft',
      progress: 0,
      createdAt: Date.now(),
    };
  }

  return {
    id: id || `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sceneNumber,
    title: `Сцена ${sceneNumber}`,
    model: 'bytedance/seedance-2.5',
    prompt: '',
    negativePrompt: 'blur, low quality, distortion, morphing, static, deformed hands, zero slow-motion',
    duration: 5,
    resolution: '1080p',
    aspectRatio: '16:9',
    cameraMotion: 'none',
    motionStrength: 5.0,
    fps: 24,
    seed: Math.floor(Math.random() * 1000000),
    generateAudio: true,
    references: [],
    startFrameSourceMode: sceneNumber === 1 ? 'manual_upload' : 'previous_scene',
    startFrameSourceSceneNumber: sceneNumber > 1 ? sceneNumber - 1 : undefined,
    status: 'draft',
    progress: 0,
    createdAt: Date.now(),
  };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  projectName: 'Новый Кино-Проект',
  settings: DEFAULT_SETTINGS,
  scenes: [createInitialScene(1)],
  selectedSceneId: null,
  isMasterPlayerOpen: false,
  isSettingsOpen: false,
  isDirectorModalOpen: false,
  isLogsModalOpen: false,
  activeDirectorSceneId: null,
  isCascadeRendering: false,
  currentRenderingSceneIndex: 0,
  openRouterBalanceInfo: null,
  logs: [
    {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: 'info',
      category: 'SETTINGS',
      message: 'Инициализация Seedance Studio Pro (Zero-Guesswork Standard v2.7)',
    },
  ],

  addLog: (level, category, message, details) => {
    const newEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      category,
      message,
      details,
    };
    set((state) => ({
      logs: [newEntry, ...state.logs.slice(0, 199)],
    }));
  },

  clearLogs: () => set({ logs: [] }),

  loadPersistedSettings: () => {
    const project = loadFullProjectFromStorage();
    if (project) {
      set({
        projectName: project.projectName || get().projectName,
        settings: { ...DEFAULT_SETTINGS, ...project.settings },
        scenes: project.scenes && project.scenes.length > 0 ? project.scenes : get().scenes,
        selectedSceneId: project.scenes?.[0]?.id || null,
      });
      get().addLog('info', 'SETTINGS', `Восстановлен проект "${project.projectName || 'Без названия'}" (${project.scenes?.length || 1} сцен) из LocalStorage`);
      return;
    }

    get().addLog('info', 'SETTINGS', 'Новый проект инициализирован');
  },

  setProjectName: (name) => {
    set({ projectName: name });
    saveFullProjectToStorage(name, get().settings, get().scenes);
  },

  updateSettings: (newSettings) => {
    set((state) => {
      const merged = { ...state.settings, ...newSettings };
      saveFullProjectToStorage(state.projectName, merged, state.scenes);
      return { settings: merged };
    });
    get().addLog('info', 'SETTINGS', 'Обновлены настройки студии');
  },

  setBalanceInfo: (info) => set({ openRouterBalanceInfo: info }),
  setSelectedSceneId: (id) => set({ selectedSceneId: id }),
  setMasterPlayerOpen: (open) => set({ isMasterPlayerOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setLogsModalOpen: (open) => set({ isLogsModalOpen: open }),
  setDirectorModalOpen: (open, sceneId) =>
    set({ isDirectorModalOpen: open, activeDirectorSceneId: sceneId || null }),

  addScene: (afterSceneId) => {
    const { scenes, addLog, projectName, settings } = get();
    const newSceneNumber = scenes.length + 1;
    const prevScene = scenes[scenes.length - 1];
    
    const newScene = createInitialScene(newSceneNumber, undefined, prevScene);

    let updatedScenes = [...scenes];
    if (afterSceneId) {
      const idx = scenes.findIndex((s) => s.id === afterSceneId);
      if (idx !== -1) {
        updatedScenes.splice(idx + 1, 0, newScene);
        updatedScenes = updatedScenes.map((s, i) => ({ ...s, sceneNumber: i + 1, title: `Сцена ${i + 1}` }));
      }
    } else {
      updatedScenes.push(newScene);
    }

    set({ scenes: updatedScenes, selectedSceneId: newScene.id });
    saveFullProjectToStorage(projectName, settings, updatedScenes);
    addLog('info', 'SETTINGS', `Добавлена новая Сцена #${newSceneNumber} на таймлайн`);
  },

  removeScene: (sceneId) => {
    const { scenes, addLog, projectName, settings } = get();
    if (scenes.length <= 1) return;
    const filtered = scenes.filter((s) => s.id !== sceneId);
    const renumbered = filtered.map((s, i) => ({ ...s, sceneNumber: i + 1, title: `Сцена ${i + 1}` }));
    set({ scenes: renumbered, selectedSceneId: renumbered[0].id });
    saveFullProjectToStorage(projectName, settings, renumbered);
    addLog('warn', 'SETTINGS', `Удалена сцена из проекта. Перенумеровано сцен: ${renumbered.length}`);
  },

  duplicateScene: (sceneId) => {
    const { scenes, addLog, projectName, settings } = get();
    const targetIdx = scenes.findIndex((s) => s.id === sceneId);
    if (targetIdx === -1) return;
    const target = scenes[targetIdx];
    const duplicated: Scene = {
      ...JSON.parse(JSON.stringify(target)),
      id: `scene_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'draft',
      progress: 0,
      outputVideoUrl: undefined,
      extractedLastFrameUrl: undefined,
      createdAt: Date.now(),
    };
    const updated = [...scenes];
    updated.splice(targetIdx + 1, 0, duplicated);
    const renumbered = updated.map((s, i) => ({ ...s, sceneNumber: i + 1, title: `Сцена ${i + 1}` }));
    set({ scenes: renumbered, selectedSceneId: duplicated.id });
    saveFullProjectToStorage(projectName, settings, renumbered);
    addLog('info', 'SETTINGS', `Дублирована Сцена #${target.sceneNumber}`);
  },

  updateScene: (sceneId, data) => {
    const { scenes, settings, updateSettings, projectName } = get();
    const currentScene = scenes.find((s) => s.id === sceneId);

    const isSceneOne = currentScene?.sceneNumber === 1;
    const hasGlobalFormatChange = data.model !== undefined || data.aspectRatio !== undefined || data.resolution !== undefined;

    let updatedScenes: Scene[];
    if (isSceneOne && hasGlobalFormatChange) {
      const propagationPatch: Partial<Scene> = {};
      if (data.model !== undefined) propagationPatch.model = data.model;
      if (data.aspectRatio !== undefined) propagationPatch.aspectRatio = data.aspectRatio;
      if (data.resolution !== undefined) propagationPatch.resolution = data.resolution;

      updateSettings({
        defaultSeedanceModel: data.model || settings.defaultSeedanceModel,
        defaultAspectRatio: data.aspectRatio || settings.defaultAspectRatio,
        defaultResolution: data.resolution || settings.defaultResolution,
      });

      updatedScenes = scenes.map((s) => {
        if (s.id === sceneId) {
          return { ...s, ...data };
        }
        return { ...s, ...propagationPatch };
      });
    } else {
      updatedScenes = scenes.map((s) => (s.id === sceneId ? { ...s, ...data } : s));
    }

    set({ scenes: updatedScenes });
    saveFullProjectToStorage(projectName, settings, updatedScenes);
  },

  reorderScenes: (startIndex, endIndex) => {
    const { scenes, projectName, settings } = get();
    const result = Array.from(scenes);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    const renumbered = result.map((s, i) => ({ ...s, sceneNumber: i + 1, title: `Сцена ${i + 1}` }));
    set({ scenes: renumbered });
    saveFullProjectToStorage(projectName, settings, renumbered);
  },

  addReferenceToScene: (sceneId, refData) => {
    const { scenes, projectName, settings } = get();
    const newRef: MediaReference = {
      ...refData,
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    const updatedScenes = scenes.map((s) => {
      if (s.id !== sceneId) return s;
      let updatedRefs = s.references;
      if (newRef.role === 'start_frame' || newRef.role === 'end_frame') {
        updatedRefs = updatedRefs.filter((r) => r.role !== newRef.role);
      }
      return {
        ...s,
        references: [...updatedRefs, newRef],
      };
    });

    set({ scenes: updatedScenes });
    saveFullProjectToStorage(projectName, settings, updatedScenes);
    get().addLog('info', 'API', `Добавлен медиа-референс [${newRef.role}] в сцену`);
  },

  removeReferenceFromScene: (sceneId, refId) => {
    const { scenes, projectName, settings } = get();
    const updatedScenes = scenes.map((s) => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        references: s.references.filter((r) => r.id !== refId),
      };
    });
    set({ scenes: updatedScenes });
    saveFullProjectToStorage(projectName, settings, updatedScenes);
  },

  updateReferenceRole: (sceneId, refId, role) => {
    const { scenes, projectName, settings } = get();
    const updatedScenes = scenes.map((s) => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        references: s.references.map((r) => (r.id === refId ? { ...r, role } : r)),
      };
    });
    set({ scenes: updatedScenes });
    saveFullProjectToStorage(projectName, settings, updatedScenes);
  },

  updateReferenceUrl: (sceneId, refId, url) => {
    const { scenes, projectName, settings } = get();
    const updatedScenes = scenes.map((s) => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        references: s.references.map((r) => (r.id === refId ? { ...r, url } : r)),
      };
    });
    set({ scenes: updatedScenes });
    saveFullProjectToStorage(projectName, settings, updatedScenes);
  },

  copyReferencesFromScene: (targetSceneId: string, sourceSceneNumber: number) => {
    const { scenes, addLog, projectName, settings } = get();
    const sourceScene = scenes.find((s) => s.sceneNumber === sourceSceneNumber);
    if (!sourceScene || sourceScene.references.length === 0) return;

    const updatedScenes = scenes.map((s) => {
      if (s.id !== targetSceneId) return s;
      const copied = sourceScene.references
        .filter((r) => r.role !== 'start_frame' && r.role !== 'end_frame')
        .map((r) => ({
          ...r,
          id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          isInheritedFromPrevious: true,
        }));
      return {
        ...s,
        references: [...s.references, ...copied],
      };
    });

    set({ scenes: updatedScenes });
    saveFullProjectToStorage(projectName, settings, updatedScenes);
    addLog('info', 'SETTINGS', `Скопировано ${sourceScene.references.length} референсов из Сцены #${sourceSceneNumber}`);
  },

  setStartFrameSource: (sceneId, mode, targetSceneNumber) => {
    const { scenes, projectName, settings } = get();
    const updatedScenes = scenes.map((s) => {
      if (s.id !== sceneId) return s;
      return {
        ...s,
        startFrameSourceMode: mode,
        startFrameSourceSceneNumber: targetSceneNumber,
      };
    });
    set({ scenes: updatedScenes });
    saveFullProjectToStorage(projectName, settings, updatedScenes);
  },

  getResolvedStartFrameForScene: (sceneIndex: number): { url?: string; sourceLabel: string } => {
    const { scenes } = get();
    if (sceneIndex < 0 || sceneIndex >= scenes.length) return { sourceLabel: 'Не задан' };
    const currentScene = scenes[sceneIndex];

    if (currentScene.startFrameSourceMode === 'none') {
      return { sourceLabel: 'Наследование отключено (независимый старт)' };
    }

    const explicitStart = currentScene.references.find((r) => r.role === 'start_frame');
    if (currentScene.startFrameSourceMode === 'manual_upload' || (explicitStart && !explicitStart.isInheritedFromPrevious)) {
      if (explicitStart?.url) {
        return { url: explicitStart.url, sourceLabel: 'Загружен вручную' };
      }
    }

    if (sceneIndex === 0) {
      return explicitStart?.url
        ? { url: explicitStart.url, sourceLabel: 'Загружен вручную' }
        : { sourceLabel: 'Свободный старт (T2V)' };
    }

    let targetIndex = sceneIndex - 1;
    if (currentScene.startFrameSourceMode === 'custom_scene' && currentScene.startFrameSourceSceneNumber) {
      targetIndex = currentScene.startFrameSourceSceneNumber - 1;
    }

    if (targetIndex >= 0 && targetIndex < scenes.length) {
      const sourceScene = scenes[targetIndex];
      const sourceEndFrame = sourceScene.references.find((r) => r.role === 'end_frame');
      if (sourceEndFrame?.url) {
        return {
          url: sourceEndFrame.url,
          sourceLabel: `Конечный кадр Сцены #${sourceScene.sceneNumber}`,
        };
      }
      if (sourceScene.extractedLastFrameUrl) {
        return {
          url: sourceScene.extractedLastFrameUrl,
          sourceLabel: `Авто-финал видео Сцены #${sourceScene.sceneNumber}`,
        };
      }
      return {
        sourceLabel: `Ожидает завершения Сцены #${sourceScene.sceneNumber}`,
      };
    }

    return { sourceLabel: 'Свободный старт' };
  },

  renderSceneById: async (sceneId: string) => {
    const { scenes, settings, updateScene, getResolvedStartFrameForScene, addLog } = get();
    const sceneIndex = scenes.findIndex((s) => s.id === sceneId);
    if (sceneIndex === -1) return;

    const scene = scenes[sceneIndex];

    if (!settings.openRouterApiKey || settings.openRouterApiKey.trim().length === 0) {
      const errMsg = 'Отсутствует OpenRouter API Key! Введите ваш ключ в меню настроек (кнопка ⚙️ в правом верхнем углу).';
      addLog('error', 'API', errMsg);
      updateScene(sceneId, { status: 'error', errorMessage: errMsg });
      throw new Error(errMsg);
    }

    if (!scene.prompt || scene.prompt.trim().length === 0) {
      const errMsg = `Сцена #${scene.sceneNumber}: введите промпт перед запуском генерации!`;
      addLog('error', 'RENDER', errMsg);
      updateScene(sceneId, {
        status: 'error',
        errorMessage: errMsg,
      });
      throw new Error(errMsg);
    }

    addLog('info', 'RENDER', `🚀 Запуск генерации Сцены #${scene.sceneNumber}: ${scene.model}, ${scene.duration}s, ${scene.resolution}, ${scene.aspectRatio}`);
    updateScene(sceneId, { status: 'rendering', progress: 5, errorMessage: undefined });

    try {
      const resolved = getResolvedStartFrameForScene(sceneIndex);
      let finalStartFrame = resolved.url;

      if (finalStartFrame && scene.applyAntiFilterNoise) {
        const intensity = scene.noiseStrength !== undefined ? scene.noiseStrength : 0.45;
        addLog(
          'info',
          'CANVAS',
          `🛡️ Наложение анти-детект шума (${Math.round(intensity * 100)}% зернистости) на начальный кадр для обхода цензора...`
        );
        finalStartFrame = await applyNoiseToImage(finalStartFrame, intensity);
      }

      addLog('info', 'API', `📡 Отправка POST запроса к OpenRouter Video API (/api/seedance/generate)...`, {
        model: scene.model,
        hasStartFrame: !!finalStartFrame,
        noiseBypassActive: !!scene.applyAntiFilterNoise,
        referencesCount: scene.references.length,
      });

      const submission = await submitSceneGeneration(scene, finalStartFrame, settings.openRouterApiKey);

      addLog('success', 'API', `✅ Задача успешно принята сервером! Job ID: ${submission.jobId || 'N/A'}`, {
        pollingUrl: submission.pollingUrl,
        initialStatus: submission.status,
      });

      if (submission.status === 'completed' && submission.videoUrl) {
        addLog('success', 'RENDER', `🎉 Генерация моментально завершена! Видео URL получен.`);
        updateScene(sceneId, {
          status: 'completed',
          progress: 100,
          outputVideoUrl: submission.videoUrl,
          completedAt: Date.now(),
        });

        try {
          const lastFrame = await extractLastFrameFromVideo(submission.videoUrl);
          updateScene(sceneId, { extractedLastFrameUrl: lastFrame });
          addLog('info', 'CANVAS', `🖼️ Финальный кадр успешно извлечен и подготовлен для Сцены #${scene.sceneNumber + 1}`);
        } catch (e) {
          console.warn('Could not extract last frame:', e);
        }
        return;
      }

      updateScene(sceneId, {
        jobId: submission.jobId,
        pollingUrl: submission.pollingUrl,
        progress: 15,
      });

      const pollingUrl = submission.pollingUrl;
      const startTime = Date.now();
      const maxAttempts = 120; // 10 minutes max

      addLog('info', 'POLLING', `⏳ Запущен цикл поллинга статуса (интервал: 5 сек)...`);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise((res) => setTimeout(res, 5000));

        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        addLog('info', 'POLLING', `🔄 Опрос #${attempt} (${elapsedSeconds} сек): проверка статуса задачи ${submission.jobId || ''}...`);

        const statusData = await pollSceneStatus(
          pollingUrl,
          settings.openRouterApiKey,
          scene.sceneNumber,
          submission.jobId
        );

        if (statusData.status === 'completed' && statusData.videoUrl) {
          addLog(
            'success',
            'RENDER',
            `🎉 Видео Сцены #${scene.sceneNumber} готово за ${elapsedSeconds} сек! URL: ${statusData.videoUrl}${
              statusData.savedPath ? ` (Сохранено в: ${statusData.savedPath})` : ''
            }`
          );
          updateScene(sceneId, {
            status: 'completed',
            progress: 100,
            outputVideoUrl: statusData.videoUrl,
            completedAt: Date.now(),
          });

          try {
            const lastFrame = await extractLastFrameFromVideo(statusData.videoUrl);
            updateScene(sceneId, { extractedLastFrameUrl: lastFrame });
            addLog('success', 'CANVAS', `🖼️ Захвачен финальный кадр видео ➔ авто-передан в Сцену #${scene.sceneNumber + 1}`);
          } catch (e) {
            console.warn('Could not extract last frame:', e);
          }
          return;
        }

        if (statusData.status === 'failed') {
          const errText = statusData.error || 'Ошибка генерации видео Seedance';
          addLog('error', 'POLLING', `❌ Сервер отклонил задачу: ${errText}`);
          throw new Error(errText);
        }

        const calculatedProgress = Math.min(95, 15 + Math.floor((attempt / 25) * 80));
        updateScene(sceneId, { progress: calculatedProgress });
      }

      throw new Error('Превышено время ожидания ответа от видео-сервера (10 минут)');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Ошибка запуска рендеринга';
      addLog('error', 'RENDER', `💥 Сбой генерации Сцены #${scene.sceneNumber}: ${errMsg}`);
      updateScene(sceneId, {
        status: 'error',
        progress: 0,
        errorMessage: errMsg,
      });
      throw err;
    }
  },

  startBatchCascadeRender: async () => {
    const { scenes, renderSceneById, addLog } = get();

    const emptyPromptIndex = scenes.findIndex((s) => !s.prompt || s.prompt.trim().length === 0);
    if (emptyPromptIndex !== -1) {
      alert(`Сцена #${emptyPromptIndex + 1} не имеет промпта! Заполните промпт перед каскадным запуском.`);
      return;
    }

    addLog('info', 'RENDER', `🎬 Запущен пакетный каскадный рендеринг проекта (${scenes.length} сцен)`);
    set({ isCascadeRendering: true, currentRenderingSceneIndex: 0 });

    try {
      for (let i = 0; i < scenes.length; i++) {
        const scene = get().scenes[i];
        set({ currentRenderingSceneIndex: i });

        if (!get().isCascadeRendering) {
          addLog('warn', 'RENDER', 'Каскадный рендеринг остановлен пользователем');
          break;
        }

        await renderSceneById(scene.id);
      }
      addLog('success', 'RENDER', '✨ Все сцены проекта успешно сгенерированы!');
    } catch (err: any) {
      addLog('error', 'RENDER', `Каскадный рендеринг прерван из-за ошибки: ${err.message}`);
    } finally {
      set({ isCascadeRendering: false });
    }
  },

  stopCascadeRender: () => {
    set({ isCascadeRendering: false });
  },

  exportProjectJson: () => {
    const { projectName, settings, scenes } = get();
    const data: ProjectData = {
      version: '1.4.0',
      projectName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings,
      scenes,
    };
    return JSON.stringify(data, null, 2);
  },

  importProjectJson: (jsonString: string) => {
    try {
      const data: ProjectData = JSON.parse(jsonString);
      if (!data.scenes || !Array.isArray(data.scenes)) {
        throw new Error('Invalid project structure');
      }
      set({
        projectName: data.projectName || 'Импортированный проект',
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
        scenes: data.scenes,
        selectedSceneId: data.scenes[0]?.id || null,
      });
      saveFullProjectToStorage(data.projectName || 'Импортированный проект', { ...DEFAULT_SETTINGS, ...data.settings }, data.scenes);
      return true;
    } catch (err) {
      console.error('Failed to parse project JSON:', err);
      return false;
    }
  },
}));
