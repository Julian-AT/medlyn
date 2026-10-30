"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "./cn";
import { ChevronUpIcon } from "./icons";

const QUESTIONS = [
  {
    question: "What does Medlyn do?",
    answer:
      "You enter your role and your task, for example “anaesthetist, pre-operative check before breast surgery”. Medlyn reads the patient’s documents and shows one screen with only the facts that task needs.",
  },
  {
    question: "Where do the facts come from?",
    answer:
      "Only from the patient’s documents. Every fact links to the sentence or table row it came from. Translations, generic drug names and derived values, such as a weight change, are the only things Medlyn adds.",
  },
  {
    question: "What if something isn’t in the documents?",
    answer:
      "Then the screen says “not documented”. Medlyn never guesses a value or fills a gap from general knowledge.",
  },
  {
    question: "What if two documents disagree?",
    answer:
      "Medlyn points out the contradiction and shows both sources side by side. It never silently picks one.",
  },
  {
    question: "Which roles and tasks does it support?",
    answer:
      "Any role and any task you can describe in a sentence. An anaesthetist before surgery sees age, blood thinners, allergies and heart function; a tumour board sees receptor status instead.",
  },
  {
    question: "Is patient data safe?",
    answer:
      "Medlyn is a hackathon prototype and runs on demo patient records only. It is not meant for real patient data yet.",
  },
  {
    question: "Who built Medlyn?",
    answer:
      "A team at the AIM Hackathon, for Track 1: Clinical Documentation. The code is open on GitHub.",
  },
];

function FaqItem({
  question,
  answer,
  expanded,
  onToggle,
}: {
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const id = useId();
  const [focusVisible, setFocusVisible] = useState(false);

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={`${id}-panel`}
      aria-labelledby={`${id}-trigger`}
      data-expanded={expanded || undefined}
      data-focus-visible-within={focusVisible || undefined}
      onClick={onToggle}
      onFocus={(event) => setFocusVisible(event.currentTarget.matches(":focus-visible"))}
      onBlur={() => setFocusVisible(false)}
      className={cn(
        "group relative z-0 flex w-full cursor-pointer items-start justify-between gap-[3.2rem] rounded-[16px] border-2 border-transparent bg-surface-primary p-[1.6rem] text-left outline-hidden tablet:p-[2.4rem]",
        "data-[focus-visible-within]:z-10 data-[focus-visible-within]:border-blue-500 data-[focus-visible-within]:shadow-[0_0_0_3px_rgba(66,181,220,0.30)]",
      )}
    >
      <span className="block">
        <span
          id={`${id}-trigger`}
          className="relative z-[10] flex min-h-[3rem] w-full cursor-pointer items-center justify-between gap-[1.6rem] border-none bg-none text-left text-body-md outline-hidden desktop:gap-[3.2rem]"
        >
          {question}
        </span>
        <span
          id={`${id}-panel`}
          aria-hidden={!expanded}
          className={cn(
            "grid overflow-clip transition-[grid-template-rows] duration-200 motion-reduce:transition-none",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <span className="block min-h-0">
            <span className="block pt-[0.4rem] desktop:pt-[0.8rem]">
              <span className="text-body-sm text-text-secondary">{answer}</span>
            </span>
          </span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 rounded-[1.8rem] transition-colors duration-200 ease-out group-hover:bg-surface-secondary group-data-[expanded]:bg-surface-secondary group-data-[focus-visible-within]:bg-background-tertiary"
      >
        <ChevronUpIcon className="h-[3.2rem] w-[4.2rem] rotate-180 transition-transform duration-200 ease-out group-data-[expanded]:rotate-0" />
      </span>
    </button>
  );
}

export function Faq() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reserve the collapsed height plus room for an open answer, measured once like the source.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.style.minHeight = "";
    list.style.minHeight = `${list.scrollHeight + 80}px`;
  }, []);

  return (
    <section
      id="faq"
      className="flex w-screen flex-col items-center justify-center bg-background-primary px-[1.6rem] pt-[16rem] pb-[10rem] tablet:px-0 desktop:pb-[16rem]"
    >
      <h2 className="mb-[3.2rem] text-heading-lg !leading-none">FAQ</h2>
      <div
        ref={listRef}
        className="isolate w-full max-w-[68rem] tablet:w-1/2 tablet:max-w-none desktop:w-[30%] desktop:min-w-[54rem]"
      >
        {QUESTIONS.map((item, index) => (
          <FaqItem
            key={item.question}
            question={item.question}
            answer={item.answer}
            expanded={expanded === index}
            onToggle={() => setExpanded((current) => (current === index ? null : index))}
          />
        ))}
      </div>
    </section>
  );
}
