/**
 * Utility to compress image files or base64 strings client-side before sending to Firestore.
 * Resizes the image to a maximum dimension while maintaining aspect ratio and reducing quality.
 */
export async function compressImage(base64Str: string, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's not a standard data URL, return as is
    if (!base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      console.warn("Image loading failed for compression, returning original", err);
      resolve(base64Str);
    };
  });
}

/**
 * Reads a File and returns a compressed JPEG data URL
 */
export function fileToCompressedBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        try {
          // Use compact dimensions and quality to make it lightweight for Firestore storage limits
          const compressed = await compressImage(base64, 550, 550, 0.5);
          resolve(compressed);
        } catch (error) {
          resolve(base64);
        }
      } else {
        reject(new Error("File reading resulted in empty value"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
