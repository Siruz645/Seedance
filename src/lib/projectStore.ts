import { create } from 'zustand';
import {
  Shot,
  SceneGroup,
  StudioSettings,
  MediaReference,
  SeedanceModelId,
  StartFrameSourceMode,
  LogEntry,
  AspectRatio,
  Resolution,
  FrameRate,
} from '@/types/studio';
import { extractLastFrameFromVideo } from './frameExtractor';
import { applyNoiseToImage } from './noiseFilter';
import { submitSceneGeneration, pollSceneStatus } from './seedance';

interface StudioState {
  projectName: string;
  settings: StudioSettings;
  
  // Scene Groups (Packages/Episodes) & Active Scene
  sceneGroups: SceneGroup[];
  activeSceneId: string;
  
  // Modals & UI States
  selectedShotId: string | null;
  viewMode: 'timeline' | 'focus';
  focusShotIndex: number;
  isMasterPlayerOpen: boolean;
  isSettingsOpen: boolean;
  isDirectorModalOpen: boolean;
  isLogsModalOpen: boolean;
  activeDirectorShotId: string | null;
  advancedSettingsModalShot: { sceneId: string; shotId: string } | null;
  promptWorkspaceModalShot: { sceneId: string; shotId: string } | null;
  
  // Cascade Render States
  isCascadeRendering: boolean;
  currentRenderingShotIndex: number;
  
  openRouterBalanceInfo: {
    isValid: boolean;
    usage?: number;
    limit?: number;
    label?: string;
  } | null;
  logs: LogEntry[];

  // Global Actions
  setProjectName: (name: string) => void;
  updateSettings: (settings: Partial<StudioSettings>) => void;
  setBalanceInfo: (info: any) => void;
  setViewMode: (mode: 'timeline' | 'focus') => void;
  setFocusShotIndex: (index: number) => void;
  setSelectedShotId: (id: string | null) => void;
  setMasterPlayerOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setDirectorModalOpen: (open: boolean, shotId?: string) => void;
  setLogsModalOpen: (open: boolean) => void;
  setAdvancedSettingsModalShot: (data: { sceneId: string; shotId: string } | null) => void;
  setPromptWorkspaceModalShot: (data: { sceneId: string; shotId: string } | null) => void;
  addLog: (level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any) => void;
  clearLogs: () => void;

  // Scene Group Operations (Packages)
  setActiveSceneId: (sceneId: string) => void;
  addSceneGroup: (copyFromSceneId?: string) => void;
  removeSceneGroup: (sceneId: string) => void;
  renameSceneGroup: (sceneId: string, name: string) => void;
  duplicateSceneGroup: (sceneId: string) => void;

  // Shot Operations (inside active or specified scene group)
  addShotToScene: (sceneId: string, afterShotId?: string) => void;
  removeShot: (sceneId: string, shotId: string) => void;
  duplicateShot: (sceneId: string, shotId: string) => void;
  updateShot: (sceneId: string, shotId: string, data: Partial<Shot>) => void;
  reorderShots: (sceneId: string, startIndex: number, endIndex: number) => void;

  // Reference Operations
  addReferenceToShot: (sceneId: string, shotId: string, ref: Omit<MediaReference, 'id'>) => void;
  removeReferenceFromShot: (sceneId: string, shotId: string, refId: string) => void;
  updateReferenceRole: (sceneId: string, shotId: string, refId: string, role: MediaReference['role']) => void;
  updateReferenceUrl: (sceneId: string, shotId: string, refId: string, url: string) => void;
  updateReferenceData: (sceneId: string, shotId: string, refId: string, data: Partial<MediaReference>) => void;
  copyReferencesFromShot: (sceneId: string, targetShotId: string, sourceShotNumber: number) => void;

  // Keyframe Source Selection
  setStartFrameSource: (sceneId: string, shotId: string, mode: StartFrameSourceMode, targetShotNumber?: number) => void;

  // Execution & Keyframe Chaining
  getResolvedStartFrameForShot: (sceneId: string, shotIndex: number) => { url?: string; sourceLabel: string };
  renderShotById: (sceneId: string, shotId: string) => Promise<void>;
  startCascadeRenderForScene: (sceneId: string) => Promise<void>;
  stopCascadeRender: () => void;

  // Project persistence & LocalStorage
  loadPersistedSettings: () => void;
  exportProjectJson: () => string;
  importProjectJson: (jsonString: string) => boolean;
}

const STORAGE_KEY_V3 = 'seedance_studio_full_project_v3';
const STORAGE_KEY_V2 = 'seedance_studio_full_project_v2';
const SETTINGS_STORAGE_KEY = 'seedance_studio_settings_v1';

const DEFAULT_SETTINGS: StudioSettings = {
  openRouterApiKey: '',
  defaultModel: 'bytedance/seedance-2.5',
  defaultAspectRatio: 'auto',
  defaultResolution: '720p',
  defaultDuration: 5,
  defaultFps: 24,
  enableAiDirector: true,
  autoExtractLastFrame: true,
  directorModel: 'anthropic/claude-3.7-sonnet',
};

function createInitialShot(shotNumber: number, id?: string, inheritedPrevShot?: Shot): Shot {
  if (inheritedPrevShot) {
    return {
      id: id || `shot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      shotNumber,
      title: `Шот ${shotNumber}`,
      model: inheritedPrevShot.model,
      prompt: '',
      negativePrompt: inheritedPrevShot.negativePrompt,
      duration: inheritedPrevShot.duration,
      resolution: inheritedPrevShot.resolution,
      aspectRatio: inheritedPrevShot.aspectRatio || 'auto',
      cameraMotion: 'none',
      motionStrength: inheritedPrevShot.motionStrength,
      fps: inheritedPrevShot.fps,
      seed: Math.floor(Math.random() * 1000000),
      generateAudio: inheritedPrevShot.generateAudio,
      references: [],
      startFrameSourceMode: 'previous_scene',
      startFrameSourceSceneNumber: inheritedPrevShot.shotNumber,
      status: 'draft',
      progress: 0,
      createdAt: Date.now(),
    };
  }

  return {
    id: id || `shot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    shotNumber,
    title: `Шот ${shotNumber}`,
    model: 'bytedance/seedance-2.5',
    prompt: '',
    negativePrompt: 'blur, low quality, distortion, morphing, static, deformed hands, zero slow-motion',
    duration: 5,
    resolution: '720p',
    aspectRatio: 'auto',
    cameraMotion: 'none',
    motionStrength: 5.0,
    fps: 24,
    seed: Math.floor(Math.random() * 1000000),
    generateAudio: true,
    references: [],
    startFrameSourceMode: shotNumber === 1 ? 'none' : 'previous_scene',
    status: 'draft',
    progress: 0,
    createdAt: Date.now(),
  };
}

function createInitialSceneGroup(sceneNumber: number, inheritedPrevGroup?: SceneGroup): SceneGroup {
  const groupId = `scene_group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  if (inheritedPrevGroup) {
    const latestShot = inheritedPrevGroup.shots[inheritedPrevGroup.shots.length - 1];
    const initialShot = createInitialShot(1, undefined, latestShot);
    // Scene #1 has startFrameSourceMode none by default unless inherited
    initialShot.startFrameSourceMode = 'none';

    return {
      id: groupId,
      sceneNumber,
      name: `Сцена ${sceneNumber}`,
      shots: [initialShot],
      defaultSettings: {
        model: latestShot?.model || 'bytedance/seedance-2.5',
        duration: latestShot?.duration || 5,
        resolution: latestShot?.resolution || '720p',
        aspectRatio: latestShot?.aspectRatio || 'auto',
        fps: latestShot?.fps || 24,
        generateAudio: latestShot?.generateAudio !== undefined ? latestShot.generateAudio : true,
      },
    };
  }

  return {
    id: groupId,
    sceneNumber,
    name: `Сцена ${sceneNumber}`,
    shots: [createInitialShot(1)],
    defaultSettings: {
      model: 'bytedance/seedance-2.5',
      duration: 5,
      resolution: '720p',
      aspectRatio: 'auto',
      fps: 24,
      generateAudio: true,
    },
  };
}

function saveFullProjectToStorage(projectName: string, settings: StudioSettings, sceneGroups: SceneGroup[], activeSceneId: string) {
  if (typeof window === 'undefined') return;
  try {
    const data = {
      projectName,
      settings,
      sceneGroups,
      activeSceneId,
    };
    localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save full project to localStorage', e);
  }
}

function loadFullProjectFromStorage(): { projectName?: string; settings?: StudioSettings; sceneGroups?: SceneGroup[]; activeSceneId?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Try Loading V3 structure
    const savedV3 = localStorage.getItem(STORAGE_KEY_V3);
    if (savedV3) {
      return JSON.parse(savedV3);
    }

    // 2. Migration from Legacy V2 flat scenes
    const savedV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (savedV2) {
      const v2Data = JSON.parse(savedV2);
      if (v2Data.scenes && Array.isArray(v2Data.scenes) && v2Data.scenes.length > 0) {
        const migratedGroup: SceneGroup = {
          id: 'scene_group_migrated_1',
          sceneNumber: 1,
          name: 'Сцена 1',
          shots: v2Data.scenes.map((s: any, idx: number) => ({
            ...s,
            shotNumber: idx + 1,
            title: `Шот ${idx + 1}`,
          })),
        };
        return {
          projectName: v2Data.projectName || 'Новый Кино-Проект',
          settings: v2Data.settings || DEFAULT_SETTINGS,
          sceneGroups: [migratedGroup],
          activeSceneId: migratedGroup.id,
        };
      }
    }
  } catch (e) {
    console.warn('Could not load full project from localStorage', e);
  }
  return null;
}

export const useStudioStore = create<StudioState>((set, get) => {
  const initialGroup = createInitialSceneGroup(1);

  return {
    projectName: 'Новый Кино-Проект',
    settings: DEFAULT_SETTINGS,
    sceneGroups: [initialGroup],
    activeSceneId: initialGroup.id,
    selectedShotId: null,
    viewMode: 'timeline',
    focusShotIndex: 0,
    isMasterPlayerOpen: false,
    isSettingsOpen: false,
    isDirectorModalOpen: false,
    isLogsModalOpen: false,
    activeDirectorShotId: null,
    advancedSettingsModalShot: null,
    promptWorkspaceModalShot: null,
    isCascadeRendering: false,
    currentRenderingShotIndex: 0,
    openRouterBalanceInfo: null,
    logs: [
      {
        id: 'init_log',
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        category: 'SETTINGS',
        message: 'Инициализация Seedance Studio Pro (Director Split Architecture v3.0)',
      },
    ],

    // Global Actions
    setProjectName: (name) => {
      set({ projectName: name });
      const { settings, sceneGroups, activeSceneId } = get();
      saveFullProjectToStorage(name, settings, sceneGroups, activeSceneId);
    },

    updateSettings: (newSettings) => {
      set((state) => {
        const updated = { ...state.settings, ...newSettings };
        if (typeof window !== 'undefined') {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        }
        saveFullProjectToStorage(state.projectName, updated, state.sceneGroups, state.activeSceneId);
        return { settings: updated };
      });
      get().addLog('info', 'SETTINGS', 'Настройки обновлены', newSettings);
    },

    setBalanceInfo: (info) => set({ openRouterBalanceInfo: info }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setFocusShotIndex: (index) => set({ focusShotIndex: index }),
    setSelectedShotId: (id) => set({ selectedShotId: id }),
    setMasterPlayerOpen: (open) => set({ isMasterPlayerOpen: open }),
    setSettingsOpen: (open) => set({ isSettingsOpen: open }),
    setDirectorModalOpen: (open, shotId) =>
      set({ isDirectorModalOpen: open, activeDirectorShotId: shotId || null }),
    setLogsModalOpen: (open) => set({ isLogsModalOpen: open }),
    setAdvancedSettingsModalShot: (data) => set({ advancedSettingsModalShot: data }),
    setPromptWorkspaceModalShot: (data) => set({ promptWorkspaceModalShot: data }),

    addLog: (level, category, message, details) => {
      const entry: LogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        category,
        message,
        details,
      };
      set((state) => ({ logs: [entry, ...state.logs].slice(0, 150) }));
    },

    clearLogs: () => set({ logs: [] }),

    // Scene Groups (Packages) Operations
    setActiveSceneId: (sceneId) => {
      set({ activeSceneId: sceneId });
      const { projectName, settings, sceneGroups } = get();
      saveFullProjectToStorage(projectName, settings, sceneGroups, sceneId);
    },

    addSceneGroup: (copyFromSceneId) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const sourceGroup = copyFromSceneId
        ? sceneGroups.find((g) => g.id === copyFromSceneId)
        : sceneGroups.find((g) => g.id === activeSceneId) || sceneGroups[sceneGroups.length - 1];

      const newSceneNumber = sceneGroups.length + 1;
      const newGroup = createInitialSceneGroup(newSceneNumber, sourceGroup);
      const updatedGroups = [...sceneGroups, newGroup];

      set({ sceneGroups: updatedGroups, activeSceneId: newGroup.id });
      saveFullProjectToStorage(projectName, settings, updatedGroups, newGroup.id);
      get().addLog(
        'success',
        'SETTINGS',
        `Создана Сцена #${newSceneNumber} («${newGroup.name}») со скопированными настройками модели и формата`
      );
    },

    removeSceneGroup: (sceneId) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      if (sceneGroups.length <= 1) {
        get().addLog('warn', 'SETTINGS', 'Нельзя удалить единственную сцену в проекте');
        return;
      }

      const updatedGroups = sceneGroups.filter((g) => g.id !== sceneId);
      // Re-index remaining scene numbers
      const reindexed = updatedGroups.map((g, i) => ({
        ...g,
        sceneNumber: i + 1,
      }));

      const newActiveId = activeSceneId === sceneId ? reindexed[0].id : activeSceneId;
      set({ sceneGroups: reindexed, activeSceneId: newActiveId });
      saveFullProjectToStorage(projectName, settings, reindexed, newActiveId);
      get().addLog('info', 'SETTINGS', `Сцена удалена`);
    },

    renameSceneGroup: (sceneId, name) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const updatedGroups = sceneGroups.map((g) => (g.id === sceneId ? { ...g, name } : g));
      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
    },

    duplicateSceneGroup: (sceneId) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const sourceGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!sourceGroup) return;

      const newGroup: SceneGroup = {
        id: `scene_group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sceneNumber: sceneGroups.length + 1,
        name: `${sourceGroup.name} (Копия)`,
        shots: sourceGroup.shots.map((s, idx) => ({
          ...s,
          id: `shot_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          status: 'draft',
          progress: 0,
          outputVideoUrl: undefined,
          extractedLastFrameUrl: undefined,
        })),
        defaultSettings: sourceGroup.defaultSettings ? { ...sourceGroup.defaultSettings } : undefined,
      };

      const updatedGroups = [...sceneGroups, newGroup];
      set({ sceneGroups: updatedGroups, activeSceneId: newGroup.id });
      saveFullProjectToStorage(projectName, settings, updatedGroups, newGroup.id);
      get().addLog('success', 'SETTINGS', `Сцена продублирована`);
    },

    // Shot Operations (inside Scene Group)
    addShotToScene: (sceneId, afterShotId) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const targetGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!targetGroup) return;

      const shots = targetGroup.shots;
      let insertIndex = shots.length;
      let previousShot: Shot | undefined = shots[shots.length - 1];

      if (afterShotId) {
        const foundIndex = shots.findIndex((s) => s.id === afterShotId);
        if (foundIndex !== -1) {
          insertIndex = foundIndex + 1;
          previousShot = shots[foundIndex];
        }
      }

      const newShot = createInitialShot(insertIndex + 1, undefined, previousShot);
      const newShots = [...shots];
      newShots.splice(insertIndex, 0, newShot);

      // Re-index shot numbers
      const reindexedShots = newShots.map((s, idx) => ({
        ...s,
        shotNumber: idx + 1,
        title: `Шот ${idx + 1}`,
      }));

      const updatedGroups = sceneGroups.map((g) =>
        g.id === sceneId ? { ...g, shots: reindexedShots } : g
      );

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
      get().addLog('info', 'SETTINGS', `Добавлен Шот #${insertIndex + 1} в ${targetGroup.name}`);
    },

    removeShot: (sceneId, shotId) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const targetGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!targetGroup) return;

      let remainingShots = targetGroup.shots.filter((s) => s.id !== shotId);
      if (remainingShots.length === 0) {
        remainingShots = [createInitialShot(1)];
      }

      const reindexedShots = remainingShots.map((s, idx) => ({
        ...s,
        shotNumber: idx + 1,
        title: `Шот ${idx + 1}`,
      }));

      const updatedGroups = sceneGroups.map((g) =>
        g.id === sceneId ? { ...g, shots: reindexedShots } : g
      );

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
      get().addLog('info', 'SETTINGS', `Шот удален из ${targetGroup.name}`);
    },

    duplicateShot: (sceneId, shotId) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const targetGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!targetGroup) return;

      const sourceShot = targetGroup.shots.find((s) => s.id === shotId);
      if (!sourceShot) return;

      const sourceIndex = targetGroup.shots.findIndex((s) => s.id === shotId);
      const clonedShot: Shot = {
        ...sourceShot,
        id: `shot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        status: 'draft',
        progress: 0,
        outputVideoUrl: undefined,
        extractedLastFrameUrl: undefined,
        createdAt: Date.now(),
      };

      const newShots = [...targetGroup.shots];
      newShots.splice(sourceIndex + 1, 0, clonedShot);

      const reindexedShots = newShots.map((s, idx) => ({
        ...s,
        shotNumber: idx + 1,
        title: `Шот ${idx + 1}`,
      }));

      const updatedGroups = sceneGroups.map((g) =>
        g.id === sceneId ? { ...g, shots: reindexedShots } : g
      );

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
      get().addLog('info', 'SETTINGS', `Шот продублирован`);
    },

    updateShot: (sceneId, shotId, data) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const updatedGroups = sceneGroups.map((g) => {
        if (g.id !== sceneId) return g;
        return {
          ...g,
          shots: g.shots.map((s) => (s.id === shotId ? { ...s, ...data } : s)),
        };
      });

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
    },

    reorderShots: (sceneId, startIndex, endIndex) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const targetGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!targetGroup) return;

      const result = Array.from(targetGroup.shots);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      const reindexedShots = result.map((s, idx) => ({
        ...s,
        shotNumber: idx + 1,
        title: `Шот ${idx + 1}`,
      }));

      const updatedGroups = sceneGroups.map((g) =>
        g.id === sceneId ? { ...g, shots: reindexedShots } : g
      );

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
    },

    // Reference Operations
    addReferenceToShot: (sceneId, shotId, ref) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const newRef: MediaReference = {
        ...ref,
        id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };

      const updatedGroups = sceneGroups.map((g) => {
        if (g.id !== sceneId) return g;
        return {
          ...g,
          shots: g.shots.map((s) => {
            if (s.id !== shotId) return s;
            let updatedRefs = s.references;
            let startMode = s.startFrameSourceMode;

            if (newRef.role === 'start_frame' || newRef.role === 'end_frame') {
              updatedRefs = updatedRefs.filter((r) => r.role !== newRef.role);
              if (newRef.role === 'start_frame') {
                startMode = 'manual_upload';
              }
            }
            return {
              ...s,
              references: [...updatedRefs, newRef],
              startFrameSourceMode: startMode,
            };
          }),
        };
      });

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
      get().addLog('info', 'API', `Добавлен референс [${newRef.role}] в шот`);
    },

    removeReferenceFromShot: (sceneId, shotId, refId) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const updatedGroups = sceneGroups.map((g) => {
        if (g.id !== sceneId) return g;
        return {
          ...g,
          shots: g.shots.map((s) => {
            if (s.id !== shotId) return s;
            const removedRef = s.references.find((r) => r.id === refId);
            let startMode = s.startFrameSourceMode;
            if (removedRef?.role === 'start_frame' && startMode === 'manual_upload') {
              startMode = s.shotNumber > 1 ? 'previous_scene' : 'none';
            }
            return {
              ...s,
              references: s.references.filter((r) => r.id !== refId),
              startFrameSourceMode: startMode,
            };
          }),
        };
      });

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
    },

    updateReferenceRole: (sceneId, shotId, refId, role) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const updatedGroups = sceneGroups.map((g) => {
        if (g.id !== sceneId) return g;
        return {
          ...g,
          shots: g.shots.map((s) => {
            if (s.id !== shotId) return s;
            let startMode = s.startFrameSourceMode;
            if (role === 'start_frame') {
              startMode = 'manual_upload';
            }
            return {
              ...s,
              startFrameSourceMode: startMode,
              references: s.references.map((r) => (r.id === refId ? { ...r, role } : r)),
            };
          }),
        };
      });

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
    },

    updateReferenceUrl: (sceneId, shotId, refId, url) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const updatedGroups = sceneGroups.map((g) => {
        if (g.id !== sceneId) return g;
        return {
          ...g,
          shots: g.shots.map((s) => {
            if (s.id !== shotId) return s;
            return {
              ...s,
              references: s.references.map((r) => (r.id === refId ? { ...r, url } : r)),
            };
          }),
        };
      });

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
    },

    updateReferenceData: (sceneId, shotId, refId, data) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const updatedGroups = sceneGroups.map((g) => {
        if (g.id !== sceneId) return g;
        return {
          ...g,
          shots: g.shots.map((s) => {
            if (s.id !== shotId) return s;
            return {
              ...s,
              references: s.references.map((r) => (r.id === refId ? { ...r, ...data } : r)),
            };
          }),
        };
      });

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
    },

    copyReferencesFromShot: (sceneId, targetShotId, sourceShotNumber) => {
      const { sceneGroups, activeSceneId, projectName, settings, addLog } = get();
      const targetGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!targetGroup) return;

      const sourceShot = targetGroup.shots.find((s) => s.shotNumber === sourceShotNumber);
      if (!sourceShot) return;

      const refsToCopy = sourceShot.references.filter(
        (r) => r.role !== 'start_frame' && r.role !== 'end_frame'
      );

      const updatedGroups = sceneGroups.map((g) => {
        if (g.id !== sceneId) return g;
        return {
          ...g,
          shots: g.shots.map((s) => {
            if (s.id !== targetShotId) return s;
            const newCopiedRefs = refsToCopy.map((r) => ({
              ...r,
              id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            }));
            return {
              ...s,
              references: [...s.references, ...newCopiedRefs],
            };
          }),
        };
      });

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
      addLog('success', 'SETTINGS', `Скопировано ${refsToCopy.length} референсов из Шота #${sourceShotNumber}`);
    },

    setStartFrameSource: (sceneId, shotId, mode, targetShotNumber) => {
      const { sceneGroups, activeSceneId, projectName, settings } = get();
      const updatedGroups = sceneGroups.map((g) => {
        if (g.id !== sceneId) return g;
        return {
          ...g,
          shots: g.shots.map((s) => {
            if (s.id !== shotId) return s;
            return {
              ...s,
              startFrameSourceMode: mode,
              startFrameSourceSceneNumber: targetShotNumber,
            };
          }),
        };
      });

      set({ sceneGroups: updatedGroups });
      saveFullProjectToStorage(projectName, settings, updatedGroups, activeSceneId);
    },

    // Resolving Start Frame for cascading execution
    getResolvedStartFrameForShot: (sceneId, shotIndex) => {
      const { sceneGroups } = get();
      const targetGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!targetGroup || shotIndex < 0 || shotIndex >= targetGroup.shots.length) {
        return { sourceLabel: 'Не задан' };
      }

      const shot = targetGroup.shots[shotIndex];

      // 1. Explicit refusal of inheritance
      if (shot.startFrameSourceMode === 'none') {
        return { sourceLabel: '🚫 Без начального кадра (T2V)' };
      }

      // 2. Explicit manual upload OR start_frame reference present in shot
      const manualRef = shot.references.find((r) => r.role === 'start_frame');
      if (manualRef?.url) {
        return { url: manualRef.url, sourceLabel: '📁 Загруженный начальный кадр' };
      }

      if (shot.startFrameSourceMode === 'manual_upload') {
        return { sourceLabel: '📁 Ожидает загрузки файла' };
      }

      // 3. Custom previous shot in the scene
      if (shot.startFrameSourceMode === 'custom_scene' && shot.startFrameSourceSceneNumber) {
        const sourceShot = targetGroup.shots.find((s) => s.shotNumber === shot.startFrameSourceSceneNumber);
        if (sourceShot?.extractedLastFrameUrl) {
          return {
            url: sourceShot.extractedLastFrameUrl,
            sourceLabel: `Финальный кадр Шота #${sourceShot.shotNumber}`,
          };
        }
        const sourceRef = sourceShot?.references.find((r) => r.role === 'end_frame' || r.role === 'start_frame');
        if (sourceRef?.url) {
          return { url: sourceRef.url, sourceLabel: `Кадр из Шота #${sourceShot?.shotNumber}` };
        }
        return { sourceLabel: `Шот #${shot.startFrameSourceSceneNumber} (рендерится...)` };
      }

      // 4. Default cascade from immediately preceding shot
      if (shotIndex > 0) {
        const prevShot = targetGroup.shots[shotIndex - 1];
        if (prevShot.extractedLastFrameUrl) {
          return {
            url: prevShot.extractedLastFrameUrl,
            sourceLabel: `Авто-финал видео Шота #${prevShot.shotNumber}`,
          };
        }
        const endFrameRef = prevShot.references.find((r) => r.role === 'end_frame');
        if (endFrameRef?.url) {
          return {
            url: endFrameRef.url,
            sourceLabel: `End Frame Шота #${prevShot.shotNumber}`,
          };
        }
        return { sourceLabel: `Ожидает завершения Шота #${prevShot.shotNumber}` };
      }

      return { sourceLabel: 'Стартовый шот сцены (T2V)' };
    },

    // Rendering Single Shot
    renderShotById: async (sceneId, shotId) => {
      const { sceneGroups, settings, updateShot, addLog, getResolvedStartFrameForShot } = get();
      const targetGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!targetGroup) return;

      const shotIndex = targetGroup.shots.findIndex((s) => s.id === shotId);
      if (shotIndex === -1) return;

      const shot = targetGroup.shots[shotIndex];
      const startFrameInfo = getResolvedStartFrameForShot(sceneId, shotIndex);

      updateShot(sceneId, shotId, { status: 'rendering', progress: 5, errorMessage: undefined });
      addLog('info', 'RENDER', `🚀 Запуск генерации Шота #${shot.shotNumber} (${targetGroup.name}): ${shot.model}, ${shot.duration}s, ${shot.resolution}`);

      try {
        let finalStartFrame = startFrameInfo.url;

        // Apply real-time client-side noise filter if enabled
        if (finalStartFrame && shot.applyAntiFilterNoise) {
          const noiseIntensity = shot.noiseStrength !== undefined ? shot.noiseStrength : 0.5;
          addLog('info', 'CANVAS', `🛡️ Наложение анти-детект шума (${Math.round(noiseIntensity * 100)}% зернистости) на начальный кадр для обхода цензора...`);
          try {
            finalStartFrame = await applyNoiseToImage(finalStartFrame, noiseIntensity);
          } catch (e) {
            console.warn('Noise filter fallback:', e);
          }
        }

        const submission = await submitSceneGeneration(
          shot,
          finalStartFrame,
          settings.openRouterApiKey
        );

        updateShot(sceneId, shotId, {
          jobId: submission.jobId,
          pollingUrl: submission.pollingUrl,
          progress: 20,
        });

        addLog('success', 'API', `✅ Задача принята сервером! Job ID: ${submission.jobId}`);

        // Polling loop
        let attempts = 0;
        const maxAttempts = 160;
        let isCompleted = false;

        while (attempts < maxAttempts && !isCompleted) {
          await new Promise((res) => setTimeout(res, 4000));
          attempts++;

          try {
            const statusRes = await pollSceneStatus(
              submission.pollingUrl,
              settings.openRouterApiKey,
              shot.shotNumber,
              submission.jobId
            );

            const simulatedProgress = Math.min(95, 20 + Math.floor(attempts * 2.5));
            updateShot(sceneId, shotId, { progress: simulatedProgress });

            if (statusRes.status === 'completed' && statusRes.videoUrl) {
              isCompleted = true;
              let finalVideoUrl = statusRes.videoUrl;

              updateShot(sceneId, shotId, {
                status: 'completed',
                progress: 100,
                outputVideoUrl: finalVideoUrl,
                completedAt: Date.now(),
              });

              addLog('success', 'RENDER', `🎉 Шот #${shot.shotNumber} готов! Видео сохранено`);

              // Auto-extract last frame for seamless cascading
              if (settings.autoExtractLastFrame) {
                try {
                  addLog('info', 'FRAME', `Захват последнего кадра для каскадной сшивки...`);
                  const lastFrameBase64 = await extractLastFrameFromVideo(finalVideoUrl);
                  updateShot(sceneId, shotId, { extractedLastFrameUrl: lastFrameBase64 });
                  addLog('success', 'FRAME', `✓ Финальный кадр захвачен ➔ авто-передан в Шот #${shot.shotNumber + 1}`);
                } catch (frameErr) {
                  console.warn('Frame extraction failed:', frameErr);
                }
              }
              break;
            } else if (statusRes.status === 'failed') {
              throw new Error(statusRes.error || 'Генерация отклонена upstream-сервером ByteDance');
            }
          } catch (pollErr: any) {
            console.warn(`Polling attempt ${attempts} warning:`, pollErr.message);
          }
        }

        if (!isCompleted) {
          throw new Error('Превышено максимальное время ожидания генерации (таймаут)');
        }
      } catch (err: any) {
        const errMsg = err.response?.data?.error || err.message || 'Ошибка генерации';
        updateShot(sceneId, shotId, { status: 'failed', errorMessage: errMsg });
        addLog('error', 'RENDER', `💥 Сбой генерации Шота #${shot.shotNumber}: ${errMsg}`);
        throw err;
      }
    },

    startCascadeRenderForScene: async (sceneId) => {
      const { sceneGroups, renderShotById, addLog } = get();
      const targetGroup = sceneGroups.find((g) => g.id === sceneId);
      if (!targetGroup) return;

      set({ isCascadeRendering: true });
      addLog('info', 'RENDER', `🎬 Запуск сквозного каскадного рендера сцены «${targetGroup.name}» (${targetGroup.shots.length} шотов)`);

      for (let i = 0; i < targetGroup.shots.length; i++) {
        if (!get().isCascadeRendering) break;
        const shot = targetGroup.shots[i];
        set({ currentRenderingShotIndex: i });

        try {
          await renderShotById(sceneId, shot.id);
        } catch (e) {
          addLog('error', 'RENDER', `Каскадный рендер прерван из-за ошибки в Шоте #${shot.shotNumber}`);
          break;
        }
      }

      set({ isCascadeRendering: false });
      addLog('success', 'RENDER', `🏁 Каскадный рендер сцены «${targetGroup.name}» завершен!`);
    },

    stopCascadeRender: () => {
      set({ isCascadeRendering: false });
      get().addLog('warn', 'RENDER', 'Каскадный рендер остановлен пользователем');
    },

    // Load persisted settings & projects on app startup
    loadPersistedSettings: () => {
      if (typeof window === 'undefined') return;

      const loadedProject = loadFullProjectFromStorage();
      if (loadedProject && loadedProject.sceneGroups && loadedProject.sceneGroups.length > 0) {
        set({
          projectName: loadedProject.projectName || 'Новый Кино-Проект',
          settings: loadedProject.settings || DEFAULT_SETTINGS,
          sceneGroups: loadedProject.sceneGroups,
          activeSceneId: loadedProject.activeSceneId || loadedProject.sceneGroups[0].id,
        });
        get().addLog(
          'info',
          'SETTINGS',
          `Восстановлен проект "${loadedProject.projectName}" (${loadedProject.sceneGroups.length} сцен) из LocalStorage`
        );
        return;
      }

      // Settings fallback
      try {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
          set({ settings: JSON.parse(savedSettings) });
        }
      } catch (e) {
        console.warn('Could not parse saved settings', e);
      }
    },

    exportProjectJson: () => {
      const { projectName, settings, sceneGroups, activeSceneId } = get();
      return JSON.stringify({ projectName, settings, sceneGroups, activeSceneId }, null, 2);
    },

    importProjectJson: (jsonString) => {
      try {
        const data = JSON.parse(jsonString);
        if (data.sceneGroups && Array.isArray(data.sceneGroups)) {
          set({
            projectName: data.projectName || 'Импортированный проект',
            settings: data.settings || DEFAULT_SETTINGS,
            sceneGroups: data.sceneGroups,
            activeSceneId: data.activeSceneId || data.sceneGroups[0]?.id,
          });
          saveFullProjectToStorage(data.projectName, data.settings, data.sceneGroups, data.activeSceneId);
          get().addLog('success', 'SETTINGS', `Проект успешно импортирован!`);
          return true;
        }
      } catch (e) {
        get().addLog('error', 'SETTINGS', 'Неверный формат JSON файла проекта');
      }
      return false;
    },
  };
});
