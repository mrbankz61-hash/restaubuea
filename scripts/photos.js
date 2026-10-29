// npm run photos
// Turns every image in photos/ into two small square WebP files for the menu:
//   public/images/dishes/<name>-240.webp  (thumbnails, phone cards)
//   public/images/dishes/<name>-640.webp  (large cards)
// Name the source file after the dish (photos/ndole.jpg) and set `photo: 'ndole'` in src/data/menu.js.
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import sharp from 'sharp';

const SRC = 'photos';
const OUT = 'public/images/dishes';
const SIZES = [
  { size: 240, quality: 70 },
  { size: 640, quality: 60 },
];

mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp|avif|tiff?)$/i.test(f));
if (!files.length) {
  console.log(`No photos found in ${SRC}/`);
  process.exit(0);
}

for (const file of files) {
  const name = basename(file, extname(file)).toLowerCase();
  const input = join(SRC, file);
  const report = [];
  for (const { size, quality } of SIZES) {
    const out = join(OUT, `${name}-${size}.webp`);
    await sharp(input, { failOn: 'none' })
      .rotate() // respect phone orientation
      .resize(size, size, { fit: 'cover', position: sharp.strategy.attention })
      .modulate({ saturation: 1.06 })
      .webp({ quality, effort: 6 })
      .toFile(out);
    report.push(`${size}px ${(statSync(out).size / 1024).toFixed(1)} KB`);
  }
  console.log(`${name.padEnd(18)} ${report.join('   ')}`);
}
