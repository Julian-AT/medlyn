const BRANDS = [
  ["Thrombo ASS", "Acetylsalicylic acid", "B01AC06"],
  ["Glucophage", "Metformin", "A10BA02"],
  ["Zocor", "Simvastatin", "C10AA01"],
  ["Blopress", "Candesartan", "C09CA06"],
  ["Oleovit D3", "Colecalciferol", "A11CC05"],
  ["Alendronat", "Alendronic acid", "M05BA04"],
  ["Actos", "Pioglitazone", "A10BG03"],
  ["Byetta", "Exenatide", "A10BJ01"],
  ["Nitro-Spray", "Glyceryl trinitrate", "C01DA02"],
] as const;

function words(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function brandToGeneric(brandOrLine: string): { generic: string; brand: string; atc: string } | null {
  const line = ` ${words(brandOrLine)} `;
  const match = BRANDS.find(([brand]) => line.includes(` ${words(brand)} `));
  return match ? { brand: match[0], generic: match[1], atc: match[2] } : null;
}
