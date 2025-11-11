import fs from 'fs';
import { uploadImageBuffer } from '../services/storageService.js';

/**
 * Upload local WebP file to Supabase storage
 * @param {string} localPath - path to local WebP file
 * @param {string} bucket - Supabase bucket name
 * @param {string} folder - folder inside bucket
 * @returns {string} public URL of uploaded file
 */
export async function uploadToSupabase(localPath, bucket, folder) {
  const buffer = fs.readFileSync(localPath);
  const { url, error } = await uploadImageBuffer(bucket, folder, buffer, localPath, 'image/webp');
  if (error) throw error;
  return url;
}
