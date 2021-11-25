import { ei } from 'lib';
import Rarity = ei.ArtifactSpec.Rarity;

import { InventoryGrid } from './inventory';
import { afxIconURL, loadStoredIcon } from './icons';

const BACKGROUND_COLOR = '#333333';
const GRID_SQUARE_SIZE = 134;
const GRID_SQUARE_ROUNDED_CORNER = 42;
const GRID_SQUARE_GAP = 18;
const GRID_SQUARE_COLOR = '#404040';
const ICON_NATIVE_SIZE = 256;
const ICON_DISPLAY_SIZE = 128;
const COUNT_BOX_COLOR = '#5e5e5e';
const FONT_FAMILY = 'Always Together';
const FONT_SIZE = 27;

export async function drawInventory(
  el: HTMLCanvasElement,
  grid: InventoryGrid
): Promise<{ url: string; width: number; height: number }> {
  // This scaling factor can be adjusted in case the canvas exceeds browser
  // limits (e.g. on Safari, a canvas cannot take up more than 16777216=16M
  // pixels).
  const scale = 1;

  const ctx = el.getContext('2d')!;

  const numItems = grid.length;
  const numItemsPerRow = Math.ceil(Math.sqrt(numItems));
  const numItemsPerCol = Math.ceil(numItems / numItemsPerRow);
  const targetWidth = GRID_SQUARE_SIZE * numItemsPerRow + GRID_SQUARE_GAP * (numItemsPerRow + 1);
  const width = targetWidth * scale;
  const targetHeight = GRID_SQUARE_SIZE * numItemsPerCol + GRID_SQUARE_GAP * (numItemsPerCol + 1);
  const height = targetHeight * scale;
  el.width = width;
  el.height = height;

  // Background
  drawRoundedRect(ctx, {
    left: 0,
    top: 0,
    width,
    height,
    rx: 17 * scale,
    ry: 17 * scale,
    fill: BACKGROUND_COLOR,
  });

  for (let i = 0; i < numItems; i++) {
    const gridItem = grid[i];

    const row = Math.floor(i / numItemsPerCol);
    const col = i % numItemsPerCol;
    const left = (row * GRID_SQUARE_SIZE + (row + 1) * GRID_SQUARE_GAP) * scale;
    const top = (col * GRID_SQUARE_SIZE + (col + 1) * GRID_SQUARE_GAP) * scale;
    const right = left + GRID_SQUARE_SIZE * scale;
    const bottom = top + GRID_SQUARE_SIZE * scale;

    // Grid square
    let fill: string | CanvasGradient;
    if (gridItem.afxRarity === Rarity.COMMON) {
      fill = GRID_SQUARE_COLOR;
    } else {
      fill = ctx.createRadialGradient(
        left + (GRID_SQUARE_SIZE / 2) * scale,
        top + (GRID_SQUARE_SIZE / 2) * scale,
        0,
        left + (GRID_SQUARE_SIZE / 2) * scale,
        top + (GRID_SQUARE_SIZE / 2) * scale,
        (GRID_SQUARE_SIZE / 2) * 1.2 * scale
      );
      let color0, color50, color100;
      switch (gridItem.afxRarity) {
        case Rarity.RARE:
          [color0, color50, color100] = ['#b3ffff', '#b3ffff', '#6ab6ff'];
          break;
        case Rarity.EPIC:
          [color0, color50, color100] = ['#ff40ff', '#ff40ff', '#c03fe2'];
          break;
        case Rarity.LEGENDARY:
          [color0, color50, color100] = ['#fffe41', '#fffe41', '#eeab42'];
          break;
      }
      fill.addColorStop(0, color0);
      fill.addColorStop(0.5, color50);
      fill.addColorStop(1, color100);
    }
    drawRoundedRect(ctx, {
      left,
      top,
      width: GRID_SQUARE_SIZE * scale,
      height: GRID_SQUARE_SIZE * scale,
      rx: GRID_SQUARE_ROUNDED_CORNER * scale,
      ry: GRID_SQUARE_ROUNDED_CORNER * scale,
      fill,
    });

    const primaryIconURL = await loadStoredIcon(afxIconURL(gridItem.iconPath));
    await drawImage(ctx, primaryIconURL, {
      left: left + ((GRID_SQUARE_SIZE - ICON_DISPLAY_SIZE) / 2) * scale,
      top: top + ((GRID_SQUARE_SIZE - ICON_DISPLAY_SIZE) / 2) * scale,
      scaleX: (ICON_DISPLAY_SIZE / ICON_NATIVE_SIZE) * scale,
      scaleY: (ICON_DISPLAY_SIZE / ICON_NATIVE_SIZE) * scale,
    });
    for (let i = 0; i < gridItem.stones.length; i++) {
      const stone = gridItem.stones[i];
      const stoneIconURL = await loadStoredIcon(afxIconURL(stone.iconPath));
      await drawImage(ctx, stoneIconURL, {
        left: right - (16 + 26 + 22 * i) * scale,
        top: bottom - (16 + 26) * scale,
        scaleX: (26 / ICON_NATIVE_SIZE) * scale,
        scaleY: (26 / ICON_NATIVE_SIZE) * scale,
      });
    }

    if (gridItem.count > 1) {
      // Count box
      const countStr = `${gridItem.count.toLocaleString('en-US')}`;
      ctx.font = `${FONT_SIZE * scale}px ${FONT_FAMILY}`;
      const countStrWidth = ctx.measureText(countStr).width;
      drawRoundedRect(ctx, {
        left: right + (GRID_SQUARE_GAP / 2 - 24) * scale - countStrWidth,
        top: bottom + (GRID_SQUARE_GAP / 2 - 34) * scale,
        width: 24 * scale + countStrWidth,
        height: 34 * scale,
        rx: 17 * scale,
        ry: 17 * scale,
        fill: COUNT_BOX_COLOR,
      });
      // Count text
      ctx.fillStyle = 'white';
      ctx.fillText(
        countStr,
        right + (GRID_SQUARE_GAP / 2 - 11) * scale - countStrWidth,
        bottom + (GRID_SQUARE_GAP / 2 - 7) * scale
      );
    }
  }

  return {
    url: await getObjectURLForCanvas(el),
    width: targetWidth,
    height: targetHeight,
  };
}

// Adapted from
// https://github.com/fabricjs/fabric.js/blob/dfd01d4414b5367e24afdc55b6a6cf5401ff1b28/src/shapes/rect.class.js#L75-L112.
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  {
    left: x,
    top: y,
    width: w,
    height: h,
    rx,
    ry,
    fill,
  }: {
    left: number;
    top: number;
    width: number;
    height: number;
    rx: number;
    ry: number;
    fill: string | CanvasGradient | CanvasPattern;
  }
) {
  // "magic number" for bezier approximations of arcs (http://itc.ktu.lt/itc354/Riskus354.pdf).
  const k = 1 - 0.5522847498;
  ctx.beginPath();
  ctx.moveTo(x + rx, y);
  ctx.lineTo(x + w - rx, y);
  ctx.bezierCurveTo(x + w - k * rx, y, x + w, y + k * ry, x + w, y + ry);
  ctx.lineTo(x + w, y + h - ry);
  ctx.bezierCurveTo(x + w, y + h - k * ry, x + w - k * rx, y + h, x + w - rx, y + h);
  ctx.lineTo(x + rx, y + h);
  ctx.bezierCurveTo(x + k * rx, y + h, x, y + h - k * ry, x, y + h - ry);
  ctx.lineTo(x, y + ry);
  ctx.bezierCurveTo(x, y + k * ry, x + k * rx, y, x + rx, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

async function drawImage(
  ctx: CanvasRenderingContext2D,
  url: string,
  {
    left,
    top,
    scaleX,
    scaleY,
  }: {
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
  }
) {
  const image = new Image();
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
  } catch (err) {
    console.log(`failed to load image into HTMLImageElement: ${err}`);
  }
  ctx.drawImage(image, left, top, image.naturalWidth * scaleX, image.naturalHeight * scaleY);
}

async function getObjectURLForCanvas(el: HTMLCanvasElement): Promise<string> {
  let blob: Blob | null;
  try {
    blob = await new Promise<Blob | null>(resolve => el.toBlob(blob => resolve(blob), 'image/png'));
  } catch (err) {
    throw new Error(`failed to generated blob from canvas: ${err}`);
  }
  if (!blob) {
    throw new Error(`failed to generated blob from canvas: blob is null`);
  }
  return URL.createObjectURL(blob);
}
