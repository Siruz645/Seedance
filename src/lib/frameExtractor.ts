/**
 * Utility to accurately extract the final frame of a video using HTML5 Video + Canvas
 */
export async function extractLastFrameFromVideo(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    // Timeout guard: 30 seconds
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Таймаут при захвате финального кадра видео'));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
      video.load();
    };

    const onError = () => {
      cleanup();
      reject(new Error('Не удалось загрузить видео для извлечения кадра'));
    };

    const onMetadata = () => {
      // Seek slightly before the end to avoid black frames at the very last timestamp
      const targetTime = Math.max(0, video.duration - 0.05);
      video.currentTime = targetTime;
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context 2D not available');
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.load();
  });
}
