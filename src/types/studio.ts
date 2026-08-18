export type AspectRatio = '16:9' | '9:16' | '1:1' | '21:9' | '3:4' | '4:3' | '9:21' | '3:2' | '2:3' | 'auto';
export type Resolution = '480p' | '720p' | '1080p' | '4K';
export type FrameRate = 24 | 30 | 60;

export type SeedanceModelId =
  | 'bytedance/seedance-2.5'
  | 'bytedance/seedance-2.0'
  | 'bytedance/seedance-2.0-fast'
  | 'bytedance/seedance-2.0-mini'
  | 'bytedance/seedance-1-5-pro';

export interface SeedanceModelInfo {
  id: SeedanceModelId;
  name: string;
  version: string;
  tag: string;
  description: string;
  minDuration: number;
  maxDuration: number;
  supportedResolutions: Resolution[];
  supportedAspectRatios: AspectRatio[];
  supportsAudio: boolean;
  supportsKeyframes: boolean;
}

export type CameraMotion =
  | 'none'
  | 'static'
  | 'push_in'
  | 'pull_out'
  | 'tracking_left'
  | 'tracking_right'
  | 'orbital_360'
  | 'tilt_up'
  | 'tilt_down'
  | 'steadicam_follow';

// Full Multimodal Reference Roles supported by ByteDance Seedance DiT architecture
export type MediaRole =
  | 'start_frame'   // first_frame (I2V)
  | 'end_frame'     // last_frame (Interpolation)
  | 'image_ref'     // reference_images (Character / Style / Prop conditioning)
  | 'video_motion'  // input_videos (V2V Motion reference)
  | 'audio_input';  // input_audios (Speech / SFX / Lip-sync audio track)

export interface MediaReference {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  role: MediaRole;
  url: string; // Data URL or external URL
  originalUrl?: string; // Original URL before noise was applied
  hasNoise?: boolean;
  fileSizeBytes?: number;
  isInheritedFromPrevious?: boolean;
}

export type ShotStatus = 'draft' | 'ready' | 'rendering' | 'completed' | 'failed' | 'error';
export type SceneStatus = ShotStatus; // Backwards compatibility

export type StartFrameSourceMode = 'previous_scene' | 'custom_scene' | 'manual_upload' | 'none';

export interface Shot {
  id: string;
  shotNumber: number; // 1, 2, 3...
  title: string;
  model: SeedanceModelId;
  prompt: string;
  negativePrompt: string;
  duration: number; // 4s to 30s
  resolution: Resolution;
  aspectRatio: AspectRatio;
  cameraMotion: CameraMotion;
  motionStrength: number; // 1.0 - 10.0
  fps: FrameRate;
  seed: number;
  generateAudio: boolean;
  
  // Media references (Multimodal: Image, Video, Audio)
  references: MediaReference[];
  
  // Keyframe inheritance options
  startFrameSourceMode: StartFrameSourceMode;
  startFrameSourceSceneNumber?: number; // E.g. inherit from shot #1
  manualStartFrameOverride?: string; // Data URL
  applyAntiFilterNoise?: boolean; // Anti-censorship film grain bypass (for real-person moderation guard)
  noiseStrength?: number; // 0.1 to 1.0 (default 0.5)
  
  // Output & Execution
  status: ShotStatus;
  progress: number; // 0 - 100
  jobId?: string;
  pollingUrl?: string;
  outputVideoUrl?: string;
  outputThumbnailUrl?: string;
  extractedLastFrameUrl?: string;
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}

// Aliased for backward compatibility
export type Scene = Shot;

// SceneGroup: Container / Episode package representing a scene with multiple sequential shots
export interface SceneGroup {
  id: string;
  sceneNumber: number; // 1, 2, 3...
  name: string; // e.g. "Сцена 1: Склад"
  shots: Shot[];
  defaultSettings?: {
    model: SeedanceModelId;
    duration: number;
    resolution: Resolution;
    aspectRatio: AspectRatio;
    fps: FrameRate;
    generateAudio: boolean;
  };
}

export interface StudioSettings {
  openRouterApiKey: string;
  selectedLlmModel?: string;
  defaultModel?: SeedanceModelId;
  defaultAspectRatio?: AspectRatio;
  defaultResolution?: Resolution;
  defaultDuration?: number;
  defaultFps?: FrameRate;
  enableAiDirector?: boolean;
  autoExtractLastFrame?: boolean;
  zeroDataRetention?: boolean;
  directorModel?: string;
}

export interface DirectorSuggestion {
  enhancedPrompt: string;
  somaticDetails: string[];
  cameraTrajectorySuggestion: CameraMotion;
  recommendedDuration: number;
  lightingCue: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  category: 'API' | 'RENDER' | 'FRAME' | 'DIRECTOR' | 'SETTINGS' | 'CANVAS';
  message: string;
  details?: any;
}
