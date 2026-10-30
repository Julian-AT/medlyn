import { z } from "zod";

export const Box = z.object({
  x0: z.number().min(0).max(1),
  y0: z.number().min(0).max(1),
  x1: z.number().min(0).max(1),
  y1: z.number().min(0).max(1),
});
export type Box = z.infer<typeof Box>;

export const PageLine = z.object({
  text: z.string(),
  bbox: Box,
  words: z.array(z.object({ text: z.string(), bbox: Box })),
});
export type PageLine = z.infer<typeof PageLine>;

export const Page = z.object({
  page: z.number().int().positive(),
  imagePath: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dpi: z.number().int().positive(),
  source: z.enum(["embedded", "scan", "ocr"]),
  lines: z.array(PageLine),
});
export type Page = z.infer<typeof Page>;
export const RasterManifest = z.object({ version: z.literal(1), pages: z.array(Page).min(1) });

export type PassageBox = { start: number; end: number; page: number; bbox: Box };
export type OcrTiming = {
  page: number;
  role: "fast" | "reasoning";
  model: string;
  latencyMs: number;
};

export function validBox(box: Box): boolean {
  return (
    Object.values(box).every(Number.isFinite) &&
    box.x0 >= 0 &&
    box.y0 >= 0 &&
    box.x1 <= 1 &&
    box.y1 <= 1 &&
    box.x1 > box.x0 &&
    box.y1 > box.y0
  );
}
