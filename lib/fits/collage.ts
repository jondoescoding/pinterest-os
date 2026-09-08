import { jitter } from "@/lib/fits/random";
import type { CandidateSetItem } from "@/lib/fits/types";
import sharp from "sharp";

export const COLLAGE_WIDTH = 1000;
export const COLLAGE_HEIGHT = 1500;

export interface LayoutBox {
  x: number;
  y: number;
  maxW: number;
  maxH: number;
}

const BASE_LAYOUTS: Record<number, LayoutBox[]> = {
  4: [
    { x: 95, y: 135, maxW: 430, maxH: 520 },
    { x: 545, y: 155, maxW: 330, maxH: 430 },
    { x: 105, y: 760, maxW: 360, maxH: 450 },
    { x: 535, y: 820, maxW: 350, maxH: 430 },
  ],
  5: [
    { x: 85, y: 120, maxW: 390, maxH: 500 },
    { x: 520, y: 115, maxW: 340, maxH: 410 },
    { x: 115, y: 700, maxW: 300, maxH: 390 },
    { x: 500, y: 650, maxW: 360, maxH: 430 },
    { x: 315, y: 1115, maxW: 300, maxH: 300 },
  ],
  6: [
    { x: 70, y: 105, maxW: 360, maxH: 470 },
    { x: 520, y: 105, maxW: 330, maxH: 395 },
    { x: 120, y: 600, maxW: 275, maxH: 350 },
    { x: 520, y: 565, maxW: 360, maxH: 390 },
    { x: 95, y: 1035, maxW: 300, maxH: 320 },
    { x: 540, y: 1050, maxW: 285, maxH: 310 },
  ],
  7: [
    { x: 65, y: 95, maxW: 340, maxH: 430 },
    { x: 520, y: 105, maxW: 315, maxH: 370 },
    { x: 95, y: 550, maxW: 275, maxH: 330 },
    { x: 520, y: 520, maxW: 345, maxH: 365 },
    { x: 85, y: 930, maxW: 270, maxH: 300 },
    { x: 390, y: 940, maxW: 255, maxH: 285 },
    { x: 660, y: 1010, maxW: 245, maxH: 275 },
  ],
};

function clampBox(box: LayoutBox): LayoutBox {
  const x = Math.max(0, Math.min(COLLAGE_WIDTH - box.maxW, Math.round(box.x)));
  const y = Math.max(0, Math.min(COLLAGE_HEIGHT - box.maxH, Math.round(box.y)));
  return {
    x,
    y,
    maxW: Math.round(Math.min(box.maxW, COLLAGE_WIDTH - x)),
    maxH: Math.round(Math.min(box.maxH, COLLAGE_HEIGHT - y)),
  };
}

export function getLayoutBoxes(count: number, seed: string): LayoutBox[] {
  const layout = BASE_LAYOUTS[count];
  if (!layout) throw new Error(`Unsupported collage item count: ${count}`);
  return layout.map((box, index) => {
    const scale = 1 + jitter(`${seed}:${index}:scale`, 0.05);
    return clampBox({
      x: box.x + jitter(`${seed}:${index}:x`, COLLAGE_WIDTH * 0.02),
      y: box.y + jitter(`${seed}:${index}:y`, COLLAGE_HEIGHT * 0.02),
      maxW: box.maxW * scale,
      maxH: box.maxH * scale,
    });
  });
}

async function fetchImage(url: string): Promise<Buffer> {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Image fetch failed (${res.status}) for ${url}`);
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      last = err;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export async function renderCollage(
  items: CandidateSetItem[],
  seed: string,
): Promise<Buffer> {
  if (items.length < 4 || items.length > 7) {
    throw new Error(`Collage requires 4 to 7 items, got ${items.length}`);
  }
  const boxes = getLayoutBoxes(items.length, seed);
  const layers = await Promise.all(
    items.map(async (item, index) => {
      const box = boxes[index] as LayoutBox;
      const input = await sharp(await fetchImage(item.imageUrl))
        .trim({ background: "#ffffff", threshold: 10 })
        .resize({
          width: box.maxW,
          height: box.maxH,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      const metadata = await sharp(input).metadata();
      return {
        input,
        left: Math.round(box.x + (box.maxW - (metadata.width ?? box.maxW)) / 2),
        top: Math.round(box.y + (box.maxH - (metadata.height ?? box.maxH)) / 2),
      };
    }),
  );
  return sharp({
    create: {
      width: COLLAGE_WIDTH,
      height: COLLAGE_HEIGHT,
      channels: 3,
      background: "#f7f7f5",
    },
  })
    .composite(layers)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
