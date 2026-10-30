/** Assert a value exists without treating zero, false or an empty string as missing. */
export function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Required value is missing");
  return value;
}
