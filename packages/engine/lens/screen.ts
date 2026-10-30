import { Screen as ScreenSchema, type LensEvent, type OpenQuestion, type Patient, type Screen, type Section, type Segment, type Finding } from "../contracts.ts";
import { PATIENT_ID } from "../store.ts";

export function patientView(segments: Segment[]): Patient {
  const birth = segments.find((segment) => /geb\.?\s*15\.03\.1959/i.test(segment.text));
  return {
    id: PATIENT_ID,
    displayName: "Anna Musterfrau",
    sex: "F",
    birthDate: "1959-03-15",
    birthDateQuote: birth?.text.match(/geb\.?\s*15\.03\.1959/i)?.[0] ?? "geb. 15.03.1959",
    birthDateSegmentId: birth?.id ?? null,
  };
}

export function openQuestions(sections: Section[], findings: Finding[]): OpenQuestion[] {
  return [
    ...findings.map((finding): OpenQuestion => ({ id: `question-${finding.id}`, kind: finding.type, title: finding.title, findingId: finding.id })),
    ...sections.flatMap((section) => section.cards.filter((card) => card.availability !== "documented").map((card): OpenQuestion => ({
      id: `question-${card.id}`,
      kind: "missing",
      title: card.availability === "unavailable" ? `${card.title}: couldn't check` : card.lines.find((line) => line.kind === "absence")?.text ?? card.title,
      cardId: card.id,
      needId: card.needId,
    }))),
  ];
}

export function screenEvents(screen: Screen): LensEvent[] {
  const headlines: LensEvent[] = [];
  const sections = screen.sections.map((section) => ({
    ...section,
    cards: section.cards.map(({ headline, ...card }) => {
      if (headline) headlines.push({ type: "headline", cardId: card.id, headline });
      return card;
    }),
  }));
  return [
    { type: "situation", lensKey: screen.lensKey, patient: screen.patient, situation: screen.situation, window: screen.window, sectionTitles: sections.map(({ id, title }) => ({ id, title })) },
    ...sections.map((section): LensEvent => ({ type: "section", section })),
    ...headlines,
    { type: "findings", critical: screen.critical, findings: screen.findings, openQuestions: screen.openQuestions },
    { type: "done", timings: screen.timings },
  ];
}

export function screenFromEvents(events: LensEvent[]): Screen {
  const situation = events.find((event) => event.type === "situation");
  const findings = events.find((event) => event.type === "findings");
  const done = events.find((event) => event.type === "done");
  if (!situation || !findings || !done || events.some((event) => event.type === "error")) throw new Error("Incomplete lens event stream");
  const sections = events.filter((event) => event.type === "section").map((event) => ({ ...event.section, cards: event.section.cards.map((card) => ({ ...card })) }));
  for (const event of events) {
    if (event.type !== "headline") continue;
    const card = sections.flatMap((section) => section.cards).find((entry) => entry.id === event.cardId);
    if (card) card.headline = event.headline;
  }
  const order = new Map(situation.sectionTitles.map((section, index) => [section.id, index]));
  sections.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return ScreenSchema.parse({
    lensKey: situation.lensKey,
    patient: situation.patient,
    situation: situation.situation,
    window: situation.window,
    sections,
    ...findings,
    timings: done.timings,
  });
}
