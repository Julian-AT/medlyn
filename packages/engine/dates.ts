const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2016-04-15" → "15 Apr 2016"; "2015-06" or month precision → "Jun 2015"; "about" for approx. */
export function formatDate(
  iso: string,
  precision: "day" | "month" | "year" | "approx" | null = null,
): string {
  const [year, month, day] = iso.split("-");
  if (precision === "year" || !month) return year;
  const monthYear = `${MONTHS[Number(month) - 1]} ${year}`;
  if (precision === "approx") return `about ${monthYear}`;
  if (precision === "month" || !day) return monthYear;
  return `${Number(day)} ${monthYear}`;
}
