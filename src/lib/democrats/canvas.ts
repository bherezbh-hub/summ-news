import { Gender, fixedLineParts } from "./content";

export const FORMAT_SIZES = {
  post: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const;

export type Format = keyof typeof FORMAT_SIZES;

const BG_COLOR = "#173463";
const SCRIM_COLOR = "rgba(10, 20, 45, 0.45)";

export interface ImageTransform {
  /** Zoom multiplier on top of the cover-fit scale. 1 = just covers the canvas. */
  scale: number;
  /** Pan offset in canvas pixels. */
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_IMAGE_TRANSFORM: ImageTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export interface TextTransform {
  /** Pan offset in canvas pixels, applied to the headline + subtitle block. */
  offsetX: number;
  offsetY: number;
  /** Font-size multiplier for the headline + subtitle block. */
  scale: number;
}

export const DEFAULT_TEXT_TRANSFORM: TextTransform = { offsetX: 0, offsetY: 0, scale: 1 };

export const TEXT_SCALE_MIN = 0.6;
export const TEXT_SCALE_MAX = 1.8;

/** Clamp a pan offset so the zoomed image still fully covers the canvas. */
export function clampImageOffset(
  canvasW: number,
  canvasH: number,
  imgW: number,
  imgH: number,
  scale: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number } {
  const coverScale = Math.max(canvasW / imgW, canvasH / imgH);
  const s = coverScale * Math.max(1, scale);
  const dw = imgW * s;
  const dh = imgH * s;
  const maxX = Math.max(0, (dw - canvasW) / 2);
  const maxY = Math.max(0, (dh - canvasH) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offsetX)),
    y: Math.min(maxY, Math.max(-maxY, offsetY)),
  };
}

/** Keep the draggable headline/subtitle block from being dragged fully off canvas. */
export function clampTextOffset(format: Format, offsetX: number, offsetY: number): { x: number; y: number } {
  const { width: W, height: H } = FORMAT_SIZES[format];
  const maxX = W * 0.32;
  const minY = -H * 0.22;
  const maxY = H * 0.32;
  return {
    x: Math.min(maxX, Math.max(-maxX, offsetX)),
    y: Math.min(maxY, Math.max(minY, offsetY)),
  };
}

function drawFullBleedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  transform: ImageTransform
) {
  const coverScale = Math.max(W / img.width, H / img.height);
  const s = coverScale * Math.max(1, transform.scale);
  const dw = img.width * s;
  const dh = img.height * s;
  const clamped = clampImageOffset(W, H, img.width, img.height, transform.scale, transform.offsetX, transform.offsetY);
  const x = (W - dw) / 2 + clamped.x;
  const y = (H - dh) / 2 + clamped.y;
  ctx.drawImage(img, x, y, dw, dh);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  if (!text) return startY;
  const lines = wrapLines(ctx, text, maxWidth);
  let y = startY;
  for (const line of lines) {
    ctx.fillText(line, centerX, y);
    y += lineHeight;
  }
  return y;
}

export interface RenderOptions {
  format: Format;
  gender: Gender;
  image: HTMLImageElement | null;
  imageTransform: ImageTransform;
  title: string;
  subtitle: string;
  footnote: string;
  headlineColor: string;
  subColor: string;
  textTransform: TextTransform;
}

export function renderGraphic(canvas: HTMLCanvasElement, opts: RenderOptions) {
  const { width: W, height: H } = FORMAT_SIZES[opts.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);

  if (opts.image) {
    drawFullBleedImage(ctx, opts.image, W, H, opts.imageTransform);
    ctx.fillStyle = SCRIM_COLOR;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.textAlign = "center";
  const centerX = W / 2;
  const textScale = opts.textTransform.scale;
  const textCenterX = centerX + opts.textTransform.offsetX;
  let y = (opts.format === "story" ? H * 0.24 : H * 0.36) + opts.textTransform.offsetY;

  ctx.fillStyle = opts.headlineColor;
  ctx.font = `bold ${Math.round(W * 0.078 * textScale)}px Arial, sans-serif`;
  y = drawWrappedText(ctx, opts.title, textCenterX, y, W * 0.86, W * 0.092 * textScale);

  y += W * 0.035 * textScale;
  ctx.fillStyle = opts.subColor;
  ctx.font = `${Math.round(W * 0.046 * textScale)}px Arial, sans-serif`;
  drawWrappedText(ctx, opts.subtitle, textCenterX, y, W * 0.8, W * 0.062 * textScale);

  // The ballot line, footnote and wordmark stay anchored independently of the
  // draggable/resizable headline+subtitle block above.
  let fixedLineY = opts.format === "story" ? H * 0.46 : H * 0.72;

  const { pre, verb, ballot, suffix } = fixedLineParts(opts.gender);
  const preText = `${pre} ${verb}`;
  const ballotFont = `bold ${Math.round(W * 0.06)}px Arial, sans-serif`;
  const suffixFont = `${Math.round(W * 0.036)}px Arial, sans-serif`;

  ctx.font = ballotFont;
  const ballotWidth = ctx.measureText(ballot).width;
  ctx.font = `bold ${Math.round(W * 0.05)}px Arial, sans-serif`;
  const preWidth = ctx.measureText(preText).width;
  ctx.font = suffixFont;
  const suffixWidth = ctx.measureText(suffix).width;

  const gap = W * 0.02;
  const boxPaddingX = W * 0.025;
  const boxWidth = ballotWidth + boxPaddingX * 2;
  const boxHeight = W * 0.09;
  const totalWidth = preWidth + gap + boxWidth + gap + suffixWidth;
  let cursorX = centerX + totalWidth / 2;

  ctx.textAlign = "right";
  ctx.fillStyle = opts.headlineColor;
  ctx.font = `bold ${Math.round(W * 0.05)}px Arial, sans-serif`;
  ctx.fillText(preText, cursorX, fixedLineY + boxHeight * 0.68);
  cursorX -= preWidth + gap;

  const boxX = cursorX - boxWidth;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  const r = W * 0.012;
  ctx.moveTo(boxX + r, fixedLineY);
  ctx.arcTo(boxX + boxWidth, fixedLineY, boxX + boxWidth, fixedLineY + boxHeight, r);
  ctx.arcTo(boxX + boxWidth, fixedLineY + boxHeight, boxX, fixedLineY + boxHeight, r);
  ctx.arcTo(boxX, fixedLineY + boxHeight, boxX, fixedLineY, r);
  ctx.arcTo(boxX, fixedLineY, boxX + boxWidth, fixedLineY, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = BG_COLOR;
  ctx.lineWidth = W * 0.006;
  ctx.stroke();

  ctx.fillStyle = BG_COLOR;
  ctx.textAlign = "center";
  ctx.font = ballotFont;
  ctx.fillText(ballot, boxX + boxWidth / 2, fixedLineY + boxHeight * 0.68);
  cursorX = boxX - gap;

  ctx.fillStyle = opts.subColor;
  ctx.textAlign = "right";
  ctx.font = suffixFont;
  ctx.fillText(suffix, cursorX, fixedLineY + boxHeight * 0.68);

  ctx.textAlign = "center";
  fixedLineY += boxHeight + W * 0.05;

  if (opts.footnote) {
    const footnoteY = H - (opts.format === "story" ? H * 0.1 : H * 0.11);
    ctx.fillStyle = opts.subColor;
    ctx.font = `italic ${Math.round(W * 0.033)}px Arial, sans-serif`;
    drawWrappedText(ctx, `* ${opts.footnote}`, centerX, footnoteY, W * 0.85, W * 0.045);
  }

  ctx.fillStyle = opts.headlineColor;
  ctx.font = `bold ${Math.round(W * 0.036)}px Arial, sans-serif`;
  ctx.fillText("הדמוקרטים", centerX, H - H * 0.035);
}
