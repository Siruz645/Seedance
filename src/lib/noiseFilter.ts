/**
 * Client-side Film Grain / Anti-Detect Noise Filter
 * Specifically calibrated to bypass strict AI moderation & privacy filters (ByteDance Real Person Guard)
 * while preserving overall character features, clothing, and scene structure.
 */
export async function applyNoiseToImage(
  imageSource: string,
  intensity: number = 0.5
): Promise<string> {
  return new Promise((resolve) => {
    if (!imageSource) {
      resolve(imageSource);
      return;
    }

    const img = new Image();
    // Only set crossOrigin for external http(s) URLs, never for data: URLs
    if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageSource);
          return;
        }

        // 1. Draw base image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. Extract pixel data
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Amplitude of noise: 0.5 intensity ~ factor 90-100 (clearly visible grain)
        const factor = Math.max(25, Math.min(220, intensity * 200));

        for (let i = 0; i < data.length; i += 4) {
          // Monochromatic base grain + subtle chroma variance to break facial biometric meshes
          const monoNoise = (Math.random() - 0.5) * factor;
          const chromaNoise = (Math.random() - 0.5) * (factor * 0.3);

          data[i] = Math.min(255, Math.max(0, data[i] + monoNoise + chromaNoise));         // R
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + monoNoise));              // G
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + monoNoise - chromaNoise)); // B
        }

        ctx.putImageData(imgData, 0, 0);

        // 3. Export as JPEG Data URL
        const noisyDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve(noisyDataUrl);
      } catch (err) {
        console.error('Error applying noise filter:', err);
        resolve(imageSource);
      }
    };

    img.onerror = (e) => {
      console.error('Image loading failed in noise filter:', e);
      resolve(imageSource);
    };

    img.src = imageSource;
  });
}
