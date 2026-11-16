export async function compressImageFile(
  file: File,
  maxDimension = 1080,
  quality = 0.76
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
    image.src = dataUrl;
  });

  const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo de compresión.');
  }

  ctx.drawImage(img, 0, 0, width, height);

  let compressed = canvas.toDataURL('image/webp', quality);
  if (!compressed.startsWith('data:image/webp')) {
    compressed = canvas.toDataURL('image/jpeg', quality);
  }

  // Step down quality if still large for Firestore document safety
  if (compressed.length > 180000) {
    compressed = canvas.toDataURL('image/jpeg', 0.6);
  }
  if (compressed.length > 220000) {
    throw new Error(
      'La imagen sigue siendo demasiado pesada tras la compresión. Usa una imagen más ligera o una URL.'
    );
  }

  return compressed;
}
