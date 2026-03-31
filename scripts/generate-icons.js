import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
  try {
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.resolve('public/icon-192.png'));
    console.log('Generated icon-192.png');

    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.resolve('public/icon-512.png'));
    console.log('Generated icon-512.png');

    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.resolve('public/apple-touch-icon.png'));
    console.log('Generated apple-touch-icon.png');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
