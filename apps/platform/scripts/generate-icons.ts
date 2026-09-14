/**
 * Генерация иконок приложения.
 *
 * Иконки нужны PWA: без них домашний экран телефона показывает обрезанный
 * скриншот вместо значка. Рисуются кодом, без графических библиотек —
 * PNG собирается вручную через zlib из состава Node.
 *
 * ВНИМАНИЕ: это временный геометрический знак в цветах макета, а не логотип
 * фирмы. Когда появится настоящий логотип, положите готовые PNG в public/icons
 * с теми же именами — скрипт больше не понадобится.
 *
 * Запуск: npx tsx scripts/generate-icons.ts
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Цвета из mockup_mobelstock24.html.
const STAHL: RGB = [0x1e, 0x23, 0x26];
const GELB: RGB = [0xf0, 0xb4, 0x29];
const BETON: RGB = [0xea, 0xea, 0xe4];

type RGB = [number, number, number];

/** Полотно RGBA с примитивом «залить прямоугольник». */
class Canvas {
  readonly pixels: Uint8Array;

  constructor(readonly size: number) {
    this.pixels = new Uint8Array(size * size * 4);
  }

  fill(color: RGB) {
    this.rect(0, 0, this.size, this.size, color);
  }

  rect(x: number, y: number, w: number, h: number, color: RGB) {
    const x1 = Math.max(0, Math.round(x));
    const y1 = Math.max(0, Math.round(y));
    const x2 = Math.min(this.size, Math.round(x + w));
    const y2 = Math.min(this.size, Math.round(y + h));

    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        const i = (py * this.size + px) * 4;
        this.pixels[i] = color[0];
        this.pixels[i + 1] = color[1];
        this.pixels[i + 2] = color[2];
        this.pixels[i + 3] = 255;
      }
    }
  }
}

/** Контрольная сумма CRC-32 — требуется форматом PNG для каждого блока. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(canvas: Canvas): Buffer {
  const { size, pixels } = canvas;

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // бит на канал
  header[9] = 6; // цветовой тип: RGBA
  header[10] = 0; // сжатие deflate
  header[11] = 0; // стандартная фильтрация
  header[12] = 0; // без чересстрочности

  // Каждая строка предваряется байтом фильтра (0 — без фильтра).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // сигнатура
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Знак: три полки шкафа на тёмном фоне, верхняя — жёлтая.
 * Геометрия, читаемая и в 48 пикселей на домашнем экране.
 *
 * `safeArea` — доля отступа от края. Для maskable-иконок Android обрезает
 * значок по кругу, и содержимое обязано умещаться в центральные 80 %.
 */
function drawMark(size: number, safeArea: number): Canvas {
  const canvas = new Canvas(size);
  canvas.fill(STAHL);

  const inner = size * (1 - safeArea * 2);
  const left = size * safeArea;
  const top = size * safeArea;

  const shelfHeight = inner * 0.16;
  const gap = inner * 0.1;
  const sideWidth = inner * 0.11;

  // Боковины шкафа.
  canvas.rect(left, top, sideWidth, inner, BETON);
  canvas.rect(left + inner - sideWidth, top, sideWidth, inner, BETON);

  // Полки: верхняя выделена жёлтым, остальные светлые.
  for (let i = 0; i < 3; i++) {
    const y = top + i * (shelfHeight + gap) + inner * 0.12;
    canvas.rect(
      left + sideWidth,
      y,
      inner - sideWidth * 2,
      shelfHeight,
      i === 0 ? GELB : BETON,
    );
  }

  return canvas;
}

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, safeArea: 0.14 },
  { file: "icon-512.png", size: 512, safeArea: 0.14 },
  // Maskable: Android обрезает под форму значка, содержимое уводим внутрь.
  { file: "icon-maskable-512.png", size: 512, safeArea: 0.22 },
  // iOS не умеет прозрачность и скругляет сам.
  { file: "apple-touch-icon.png", size: 180, safeArea: 0.14 },
];

for (const { file, size, safeArea } of targets) {
  const png = encodePng(drawMark(size, safeArea));
  writeFileSync(join(outDir, file), png);
  console.log(`  ${file} — ${size}×${size}, ${(png.length / 1024).toFixed(1)} КБ`);
}

console.log("\nИконки записаны в public/icons.");
console.log("Это временный знак: замените файлы на логотип фирмы, имена те же.");
