import * as FileSystem from 'expo-file-system/legacy';

/**
 * Direct, unsigned upload to Cloudinary for recipe photos. This bypasses our
 * backend entirely — the photo goes straight from the phone to Cloudinary,
 * which is the standard pattern for client-side image uploads and avoids
 * routing large file bytes through our small free-tier server.
 *
 * Uses expo-file-system's uploadAsync rather than a hand-built FormData/fetch
 * call: newer React Native versions are strict about what object shapes
 * FormData.append() will accept for a file part, and a plain
 * `{uri, name, type}` object throws "Unsupported FormData part
 * implementation" on those versions. uploadAsync builds the multipart
 * request natively and sidesteps that entirely.
 *
 * Imported from 'expo-file-system/legacy': Expo SDK 52+ moved uploadAsync
 * and FileSystemUploadType there when it introduced the new File/Directory
 * API on the top-level 'expo-file-system' import.
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
 *
 * Requires: npx expo install expo-file-system
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

  let result;
  try {
    result = await FileSystem.uploadAsync(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      localUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        parameters: {
          upload_preset: UPLOAD_PRESET,
          folder: 'magkanote',
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Couldn't reach Cloudinary. Check your internet connection. (${msg})`);
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Photo upload failed (${result.status}). ${result.body.slice(0, 200)}`);
  }

  let data: { secure_url?: string; error?: { message?: string } };
  try {
    data = JSON.parse(result.body);
  } catch {
    throw new Error("Cloudinary sent back a response we couldn't read.");
  }

  if (data.error?.message) {
    throw new Error(`Cloudinary rejected the upload: ${data.error.message}`);
  }
  if (!data.secure_url) {
    throw new Error('Cloudinary did not return an image URL.');
  }
  return data.secure_url;
}