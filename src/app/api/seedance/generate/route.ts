import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      model = 'bytedance/seedance-2.5',
      prompt,
      duration = 5,
      aspect_ratio = '16:9',
      resolution = '1080p',
      camera_motion = 'none',
      start_frame,
      end_frame,
      reference_images,
      input_videos,
      input_audios,
      apiKey,
    } = body;

    const token = apiKey || process.env.OPENROUTER_API_KEY;

    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Отсутствует OpenRouter API Key. Введите ваш реальный API-ключ в настройках (кнопка ⚙️ в правом верхнем углу).',
        },
        { status: 400 }
      );
    }

    // Auto-validate and clamp resolution according to model capability
    let sanitizedResolution = resolution;
    if (model === 'bytedance/seedance-2.5' || model.includes('mini') || model.includes('fast')) {
      if (sanitizedResolution === '1080p' || sanitizedResolution === '4K') {
        sanitizedResolution = '720p';
      }
    }

    const payload: any = {
      model,
      prompt: `${camera_motion && camera_motion !== 'none' ? `Camera trajectory: ${camera_motion}. ` : ''}${prompt}`,
      duration: Math.max(4, Math.min(30, parseInt(duration, 10) || 5)),
      resolution: sanitizedResolution,
      generate_audio: true,
    };

    // Aspect ratio must ONLY be specified in T2V mode.
    // For first_frame / I2V generation, ByteDance requires aspect_ratio to be omitted (it auto-adapts from the image).
    if (!start_frame && aspect_ratio && aspect_ratio !== 'auto') {
      payload.aspect_ratio = aspect_ratio;
    }

    if (reference_images && Array.isArray(reference_images) && reference_images.length > 0) {
      payload.reference_images = reference_images;
    }

    if (input_videos && Array.isArray(input_videos) && input_videos.length > 0) {
      payload.input_videos = input_videos;
    }

    if (input_audios && Array.isArray(input_audios) && input_audios.length > 0) {
      payload.input_audios = input_audios;
    }

    // Strict OpenRouter Video API Zod Schema for frame_images
    if (start_frame) {
      payload.frame_images = [
        {
          type: 'image_url',
          image_url: {
            url: start_frame,
          },
          frame_type: 'first_frame',
        },
      ];
    }

    if (end_frame) {
      if (!payload.frame_images) payload.frame_images = [];
      payload.frame_images.push({
        type: 'image_url',
        image_url: {
          url: end_frame,
        },
        frame_type: 'last_frame',
      });
    }

    // Send real generation request to OpenRouter Video API
    const openrouterRes = await axios.post(
      'https://openrouter.ai/api/v1/videos',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'HTTP-Referer': 'https://seedance-studio.local',
          'X-Title': 'Seedance Studio Pro',
          'Content-Type': 'application/json',
        },
        timeout: 180000,
      }
    );

    const data = openrouterRes.data;

    return NextResponse.json({
      jobId: data.id || data.job_id,
      pollingUrl: data.polling_url || `https://openrouter.ai/api/v1/videos/${data.id}`,
      status: data.status || 'pending',
      rawResponse: data,
    });
  } catch (err: any) {
    const errorDetails = err.response?.data?.error || err.response?.data || err.message;
    console.error('OpenRouter Video API Error:', errorDetails);
    
    let errorMessage =
      typeof errorDetails === 'string'
        ? errorDetails
        : errorDetails.message || JSON.stringify(errorDetails);

    // Human-readable translations for specific upstream ByteDance moderation codes
    if (errorMessage.includes('PrivacyInformation') || errorMessage.includes('real person')) {
      errorMessage =
        'Защитный фильтр ByteDance (Privacy Guard): Загруженное изображение содержит фотографию реального человека/лица. Нейросеть отклоняет реальные фото в целях защиты от дипфейков. Используйте сгенерированные AI-портреты (Midjourney/Flux), 3D-арт или стилизованные изображения.';
    } else if (errorMessage.includes('SensitiveContent') || errorMessage.includes('NSFW')) {
      errorMessage =
        'Защитный фильтр ByteDance: Изображение или промпт содержит чувствительный/запрещенный контент (NSFW/Violence).';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: err.response?.status || 500 }
    );
  }
}
