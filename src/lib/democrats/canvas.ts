import { Gender, fixedLineParts } from "./content";

export const FORMAT_SIZES = {
  post: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
} as const;

export type Format = keyof typeof FORMAT_SIZES;

const BG_COLOR = "#173463";
const TEXT_COLOR = "#ffffff";
const MUTED_TEXT_COLOR = "#c9d6ec";

export interface RenderOptions {
  format: Format;
  gender: Gender;
  image: HTMLImageElement | null;
  title: string;
  subtitle: string;
  footnote: string;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
  const imgRatio = img.width / img.height;
  const targetRatio = dWidth / dHeight;
  let sx = 0;
  let sy = 0;
  let sWidth = img.width;
  let sHeight = img.height;

  if (imgRatio > targetRatio) {
    sWidth = img.height * targetRatio;
    sx = (img.width - sWidth) / 2;
  } else {
    sHeight = img.width / targetRatio;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
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

export function renderGraphic(canvas: HTMLCanvasElement, opts: RenderOptions) {
  const { width: W, height: H } = FORMAT_SIZES[opts.format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";

  const centerX = W / 2;
  const topMargin = opts.format === "story" ? H * 0.1 : H * 0.08;
  let y = topMargin;

  const photoDiameter = W * 0.42;
  const photoRadius = photoDiameter / 2;

  if (opts.image) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, y + photoRadius, photoRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    drawCoverImage(ctx, opts.image, centerX - photoRadius, y, photoDiameter, photoDiameter);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, y + photoRadius, photoRadius, 0, Math.PI * 2);
    ctx.lineWidth = W * 0.012;
    ctx.strokeStyle = TEXT_COLOR;
    ctx.stroke();

    y += photoDiameter + W * 0.07;
  } else {
    y += W * 0.04;
  }

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${Math.round(W * 0.078)}px Arial, sans-serif`;
  y = drawWrappedText(ctx, opts.title, centerX, y, W * 0.86, W * 0.092);

  y += W * 0.035;
  ctx.font = `${Math.round(W * 0.046)}px Arial, sans-serif`;
  y = drawWrappedText(ctx, opts.subtitle, centerX, y, W * 0.8, W * 0.062);

  y += W * 0.08;

  const { pre, verb, ballot, suffix } = fixedLineParts(opts.gender);
  ctx.font = `bold ${Math.round(W * 0.05)}px Arial, sans-serif`;
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
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${Math.round(W * 0.05)}px Arial, sans-serif`;
  ctx.fillText(preText, cursorX, y + boxHeight * 0.68);
  cursorX -= preWidth + gap;

  const boxX = cursorX - boxWidth;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  const r = W * 0.012;
  ctx.moveTo(boxX + r, y);
  ctx.arcTo(boxX + boxWidth, y, boxX + boxWidth, y + boxHeight, r);
  ctx.arcTo(boxX + boxWidth, y + boxHeight, boxX, y + boxHeight, r);
  ctx.arcTo(boxX, y + boxHeight, boxX, y, r);
  ctx.arcTo(boxX, y, boxX + boxWidth, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = BG_COLOR;
  ctx.lineWidth = W * 0.006;
  ctx.stroke();

  ctx.fillStyle = BG_COLOR;
  ctx.textAlign = "center";
  ctx.font = ballotFont;
  ctx.fillText(ballot, boxX + boxWidth / 2, y + boxHeight * 0.68);
  cursorX = boxX - gap;

  ctx.fillStyle = MUTED_TEXT_COLOR;
  ctx.textAlign = "right";
  ctx.font = suffixFont;
  ctx.fillText(suffix, cursorX, y + boxHeight * 0.68);

  ctx.textAlign = "center";
  y += boxHeight + W * 0.05;

  if (opts.footnote) {
    const footnoteY = H - (opts.format === "story" ? H * 0.1 : H * 0.11);
    ctx.fillStyle = MUTED_TEXT_COLOR;
    ctx.font = `italic ${Math.round(W * 0.033)}px Arial, sans-serif`;
    drawWrappedText(ctx, `* ${opts.footnote}`, centerX, footnoteY, W * 0.85, W * 0.045);
  }

  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `bold ${Math.round(W * 0.036)}px Arial, sans-serif`;
  ctx.fillText("הדמוקרטים", centerX, H - H * 0.035);
}
