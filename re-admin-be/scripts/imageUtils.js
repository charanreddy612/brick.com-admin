import sharp from 'sharp';
import fs from 'fs';
import axios from 'axios';
import path from 'path';

/**
 * Convert an image (URL or local path) to WebP
 * @param {string} inputPath - URL or local file path
 * @param {string} outputPath - local output path for WebP
 */
export async function convertToWebP(inputPath, outputPath) {
  let buffer;

  // If URL, download
  if (inputPath.startsWith('http')) {
    const response = await axios.get(inputPath, { responseType: 'arraybuffer' });
    buffer = Buffer.from(response.data);
  } else {
    buffer = fs.readFileSync(inputPath);
  }

  await sharp(buffer)
    .webp({ quality: 80 })
    .toFile(outputPath);

  return outputPath;
}
