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
  fileSizeBytes?: number;
  isInheritedFromPrevious?: boolean;
}

export type SceneStatus = 'draft' | 'ready' | 'rendering' | 'completed' | 'error';

export type StartFrameSourceMode = 'previous_scene' | 'custom_scene' | 'manual_upload' | 'none';

export interface Scene {
  id: string;
  sceneNumber: number;
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
  startFrameSourceSceneNumber?: number; // E.g. inherit from scene #1
  manualStartFrameOverride?: string; // Data URL
  applyAntiFilterNoise?: boolean; // Anti-censorship film grain bypass (for real-person moderation guard)
  noiseStrength?: number; // 0.1 to 1.0 (default 0.45)
  
  // Output & Execution
  status: SceneStatus;
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

export interface StudioSettings {
  openRouterApiKey: string;
  selectedLlmModel: string;
  defaultSeedanceModel: SeedanceModelId;
  zeroDataRetention: boolean;
  autoCascadeRender: boolean;
  enableAiDirector: boolean;
  defaultAspectRatio: AspectRatio;
  defaultResolution: Resolution;
  defaultDuration: number;
  appTitle: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  category: 'API' | 'RENDER' | 'POLLING' | 'CANVAS' | 'SETTINGS';
  message: string;
  details?: any;
}

export interface ProjectData {
  version: string;
  projectName: string;
  createdAt: number;
  updatedAt: number;
  settings: StudioSettings;
  scenes: Scene[];
}
