// One-shot script: convert public/app-icon.svg into the PNG sizes
// iOS / Android / PWA installers expect. Re-run with `npm run generate-icons`
// any time the source SVG changes.
//
// The generated files are committed to /public so deployment doesn't need
// to run sharp at build time.

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = join(process.cwd(), "public/app-icon.svg");
const OUTPUT_DIR = join(process.cwd(), "public");

const sizes = [
  // iOS apple-touch-icon — 180 is the modern iPhone primary.
  { size: 180, name: "apple-touch-icon.png" },
  { size: 180, name: "apple-touch-icon-180.png" },
  { size: 167, name: "apple-touch-icon-167.png" },
  { size: 152, name: "apple-touch-icon-152.png" },
  { size: 120, name: "apple-touch-icon-120.png" },
  // Android / PWA manifest — 192 is the minimum installable; 512 covers
  // splash and high-DPI displays.
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
  // Browser-tab favicon PNGs (alongside the SVG).
  { size: 32, name: "favicon-32.png" },
  { size: 16, name: "favicon-16.png" },
];

const svgBuffer = readFileSync(SOURCE);

for (const { size, name } of sizes) {
  await sharp(svgBuffer, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(OUTPUT_DIR, name));
  console.log(`Generated ${name} (${size}×${size})`);
}

console.log("Done.");
