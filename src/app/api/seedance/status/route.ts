import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { pollingUrl, jobId, apiKey, sceneNumber = 1 } = await req.json();
    const token = apiKey || process.env.OPENROUTER_API_KEY;

    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        { status: 'failed', error: 'Отсутствует API-ключ для проверки статуса.' },
        { status: 400 }
      );
    }

    const targetUrl =
      pollingUrl && pollingUrl.startsWith('http')
        ? pollingUrl
        : `https://openrouter.ai/api/v1/videos/${jobId}`;

    const res = await axios.get(targetUrl, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'HTTP-Referer': 'https://seedance-studio.local',
        'X-Title': 'Seedance Studio Pro',
      },
    });

    const data = res.data;

    // Check completion
    if (data.status === 'completed') {
      let rawVideoUrl =
        data.unsigned_urls?.[0] ||
        data.video_url ||
        data.output?.[0] ||
        data.output_url ||
        data.content_url ||
        data.urls?.[0];

      // If OpenRouter returned content path or standard endpoint
      if (!rawVideoUrl && data.id) {
        rawVideoUrl = `https://openrouter.ai/api/v1/videos/${data.id}/content?index=0`;
      }

      let localServedUrl = rawVideoUrl;
      let savedDiskPath = '';

      // Automatically download and save MP4 to project folder: video/YYYY-MM-DD/
      if (rawVideoUrl) {
        try {
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
          
          const cleanJobId = (data.id || jobId || 'seedance').substring(0, 10);
          const fileName = `scene_${sceneNumber}_${dateStr}_${timeStr}_${cleanJobId}.mp4`;

          // Paths for project storage and public serving
          const projectVideoDir = path.join(process.cwd(), 'video', dateStr);
          const publicVideoDir = path.join(process.cwd(), 'public', 'videos', dateStr);

          // Ensure directories exist
          if (!fs.existsSync(projectVideoDir)) {
            fs.mkdirSync(projectVideoDir, { recursive: true });
          }
          if (!fs.existsSync(publicVideoDir)) {
            fs.mkdirSync(publicVideoDir, { recursive: true });
          }

          const projectFilePath = path.join(projectVideoDir, fileName);
          const publicFilePath = path.join(publicVideoDir, fileName);

          // Fetch video binary stream from OpenRouter using Authorization
          const videoDownloadRes = await axios.get(rawVideoUrl, {
            responseType: 'arraybuffer',
            headers: {
              Authorization: `Bearer ${token.trim()}`,
            },
          });

          const buffer = Buffer.from(videoDownloadRes.data);

          // Write to project video folder and public served folder
          fs.writeFileSync(projectFilePath, buffer);
          fs.writeFileSync(publicFilePath, buffer);

          savedDiskPath = projectFilePath;
          localServedUrl = `/videos/${dateStr}/${fileName}`;
        } catch (downloadErr: any) {
          console.warn('Could not save video to disk automatically:', downloadErr.message);
        }
      }

      return NextResponse.json({
        status: 'completed',
        videoUrl: localServedUrl,
        rawUrl: rawVideoUrl,
        savedPath: savedDiskPath,
        rawResponse: data,
      });
    }

    if (data.status === 'failed' || data.status === 'error') {
      const errorReason =
        data.error?.message || data.error || data.message || 'Генерация отклонена upstream сервером';
      return NextResponse.json({
        status: 'failed',
        error: errorReason,
        rawResponse: data,
      });
    }

    // Processing or pending
    return NextResponse.json({
      status: data.status || 'processing',
      progress: data.progress,
      rawResponse: data,
    });
  } catch (err: any) {
    const errorDetails = err.response?.data?.error || err.response?.data || err.message;
    return NextResponse.json(
      {
        status: 'failed',
        error: `Ошибка запроса статуса: ${typeof errorDetails === 'string' ? errorDetails : errorDetails.message || JSON.stringify(errorDetails)}`,
      },
      { status: err.response?.status || 500 }
    );
  }
}
