type Point = { x: number; y: number };

/** A selection drag ending on a citation must never open the source panel. */
export function canOpenCitation({
  keyboard,
  hasSelection,
  start,
  end,
}: {
  keyboard: boolean;
  hasSelection: boolean;
  start: Point | null;
  end: Point;
}): boolean {
  if (keyboard) return true;
  if (hasSelection || !start) return false;
  return Math.hypot(end.x - start.x, end.y - start.y) <= 4;
}
