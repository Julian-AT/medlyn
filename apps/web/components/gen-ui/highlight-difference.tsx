import { Fragment } from "react";

export function HighlightDifference({ text, other }: { text: string; other: string }) {
  const comparison = new Set(other.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  const parts = text.split(/([\p{L}\p{N}]+)/gu);
  let offset = 0;
  return parts.map((part) => {
    const key = `${offset}:${part}`;
    offset += part.length;
    const differs = /^[\p{L}\p{N}]+$/u.test(part) && !comparison.has(part.toLocaleLowerCase());
    return differs ? <mark key={key}>{part}</mark> : <Fragment key={key}>{part}</Fragment>;
  });
}
