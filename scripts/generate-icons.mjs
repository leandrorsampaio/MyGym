// Rasterize public/icon.svg into the PNG sizes the PWA manifest + iOS need.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = await readFile(join(pub, 'icon.svg'));

const outputs = [
  { name: 'pwa-192.png', size: 192 },
  { name: 'pwa-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of outputs) {
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  await writeFile(join(pub, name), png);
  console.log(`wrote public/${name} (${size}×${size})`);
}

// Maskable icon: same art on a full-bleed background with safe-zone padding.
const padded = await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#0b1220' },
})
  .composite([{ input: await sharp(svg).resize(360, 360).png().toBuffer(), gravity: 'center' }])
  .png()
  .toBuffer();
await writeFile(join(pub, 'maskable-512.png'), padded);
console.log('wrote public/maskable-512.png (512×512, maskable)');
