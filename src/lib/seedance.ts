import axios from 'axios';
import { Scene } from '@/types/studio';

export interface VideoSubmissionResult {
  jobId: string;
  pollingUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export async function submitSceneGeneration(
  scene: Scene,
  resolvedStartFrameUrl?: string,
  apiKey?: string
): Promise<VideoSubmissionResult> {
  const payload = {
    model: scene.model || 'bytedance/seedance-2.5',
    prompt: scene.prompt,
    negative_prompt: scene.negativePrompt,
    duration: scene.duration,
    resolution: scene.resolution,
    aspect_ratio: scene.aspectRatio === 'auto' ? undefined : scene.aspectRatio,
    camera_motion: scene.cameraMotion === 'none' ? undefined : scene.cameraMotion,
    motion_strength: scene.motionStrength,
    fps: scene.fps,
    seed: scene.seed || Math.floor(Math.random() * 1000000),
    generate_audio: scene.generateAudio,
    start_frame: resolvedStartFrameUrl || scene.references.find((r) => r.role === 'start_frame')?.url,
    end_frame: scene.references.find((r) => r.role === 'end_frame')?.url,
    reference_images: scene.references
      .filter((r) => r.role !== 'start_frame' && r.role !== 'end_frame' && r.type === 'image')
      .map((r) => r.url),
    input_videos: scene.references
      .filter((r) => r.type === 'video')
      .map((r) => r.url),
    input_audios: scene.references
      .filter((r) => r.type === 'audio')
      .map((r) => r.url),
    apiKey,
  };

  const response = await axios.post('/api/seedance/generate', payload, { timeout: 180000 });
  return response.data;
}

export async function pollSceneStatus(
  pollingUrl: string,
  apiKey?: string,
  sceneNumber?: number,
  jobId?: string
): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  savedPath?: string;
  error?: string;
}> {
  const response = await axios.post(
    '/api/seedance/status',
    {
      pollingUrl,
      apiKey,
      sceneNumber,
      jobId,
    },
    { timeout: 60000 }
  );
  return response.data;
}
