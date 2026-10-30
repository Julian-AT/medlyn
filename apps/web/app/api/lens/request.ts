import { LensRequest } from "@medlyn/engine/contracts";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";

export function parseLensRequest(body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    return { success: false } as const;
  const input = body as Record<string, unknown>;
  const chip = CHIPS.find((item) => item.id === input.chipId);
  if (input.chipId !== undefined && !chip) return { success: false } as const;
  const parsed = LensRequest.safeParse({
    ...input,
    text: chip?.text ?? (typeof input.text === "string" ? input.text.trim() : input.text),
  });
  if (!parsed.success) return { success: false } as const;
  return { success: true, data: { ...parsed.data, ...(chip ? { chipId: chip.id } : {}) } } as const;
}
