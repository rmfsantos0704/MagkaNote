/**
 * Direct, unsigned upload to Cloudinary for recipe photos. This bypasses our
 * backend entirely — the photo goes straight from the phone to Cloudinary,
 * which is the standard pattern for client-side image uploads and avoids
 * routing large file bytes through our small free-tier server.
 *
 * ONE-TIME SETUP (free):
 *   1. Create a free account at https://cloudinary.com
 *   2. Dashboard -> copy your "Cloud name"
 *   3. Settings -> Upload -> Upload presets -> Add upload preset
 *        - Signing Mode: UNSIGNED  (required — there is no secret in this file)
 *        - Folder: magkanote (optional, keeps uploads tidy)
 *      Copy the preset's name.
 *   4. Create frontend/.env (if you don't have one) with:
 *        EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *        EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 *   5. Restart Expo with `npx expo start -c` so the new env vars are picked up.
 *
 * Until this is configured, uploadRecipePhoto() throws a clear error instead
 * of silently failing, and the UI shows that error rather than crashing.
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/**
 * Uploads a local image (from expo-image-picker, a file:// or content:// URI)
 * to Cloudinary and returns its public https URL.
 */
export async function uploadRecipePhoto(localUri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Photo upload isn\u2019t set up yet. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to frontend/.env (see src/cloudinary.ts for the free setup steps).'
    );
  }

  const filename = localUri.split('/').pop() || 'photo.jpg';
  const extMatch = /\.(\w+)$/.exec(filename);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';

  const form = new FormData();
  // React Native's fetch/FormData wants this exact shape for a file field.
  form.append('file', { uri: localUri, name: filename, type: mime } as unknown as Blob);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'magkanote');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Photo upload failed (${res.status}). ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Cloudinary did not return an image URL.');
  return data.secure_url;
}