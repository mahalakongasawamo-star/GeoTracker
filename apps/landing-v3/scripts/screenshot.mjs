// Capture the M3 landing at the four target breakpoints. Run with:
//   pnpm dlx playwright@1.60.0 install chromium  (one-time)
//   node apps/landing-v3/scripts/screenshot.mjs
// Outputs to apps/landing-v3/screenshots/.

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "screenshots");
mkdirSync(outDir, { recursive: true });

const URL_BASE = process.env.URL ?? "http://127.0.0.1:4322";
const VIEWPORTS = [
  { name: "375-mobile", width: 375, height: 812 },
  { name: "768-tablet", width: 768, height: 1024 },
  { name: "1366-laptop", width: 1366, height: 768 },
  { name: "1440-desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch();
try {
  for (const v of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(URL_BASE, { waitUntil: "networkidle" });
    // Let ambient animations / font loading settle.
    await page.waitForTimeout(900);
    const path = resolve(outDir, `landing-${v.name}.png`);
    await page.screenshot({ path, fullPage: true });
    console.log(`${v.name.padEnd(14)} ${v.width}x${v.height} -> ${path}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
