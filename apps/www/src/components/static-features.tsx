import type { ComponentType, SVGProps } from "react";
import { RelevantFactsTile, RoleTaskTile, SourceExcerptTile } from "./illustrations";

const FEATURES: {
  title: string;
  body: string;
  Illustration: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  {
    title: "Asks for your role and task",
    body: "One line is enough: “anaesthetist, pre-operative check before breast surgery”. Medlyn reads every document in the record for you.",
    Illustration: RoleTaskTile,
  },
  {
    title: "Shows only what matters",
    body: "Age, blood thinners, allergies and heart function for the anaesthetist. The tumour’s receptor status stays out, because it doesn’t matter here.",
    Illustration: RelevantFactsTile,
  },
  {
    title: "Links every fact to its source",
    body: "Each fact opens the sentence or table row it came from. Missing facts say “not documented”, and contradictions are flagged.",
    Illustration: SourceExcerptTile,
  },
];

export function StaticFeatures() {
  return (
    <section
      id="how-it-works"
      className="relative z-20 flex scroll-mt-[8rem] flex-col items-center justify-center bg-background-primary pt-[8rem] pb-[4rem] tablet:pt-[16rem] tablet:pb-[9.6rem] desktop:pt-[20rem]"
    >
      <h2 className="mb-[4.8rem] text-heading-lg tablet:mb-[5.6rem]">How Medlyn works</h2>
      <div className="relative flex w-full max-w-[2056px] snap-x snap-mandatory flex-row gap-[1.2rem] self-start overflow-x-auto px-[1.6rem] [-ms-overflow-style:none] [scrollbar-width:none] tablet:snap-none tablet:overflow-visible tablet:px-[2.4rem] desktop:gap-[2.4rem] desktop:self-center desktop:px-[3.2rem] [&::-webkit-scrollbar]:hidden">
        {FEATURES.map(({ title, body, Illustration }) => (
          <div
            key={title}
            className="relative w-[calc((100%_-_62px))] max-w-[36.2rem] shrink-0 snap-center tablet:w-[32%] tablet:max-w-none tablet:grow"
          >
            <Illustration className="mb-[1.6rem] block aspect-square h-auto w-full overflow-hidden rounded-[1.6rem] desktop:mb-[2.4rem] desktop:rounded-[3.2rem]" />
            <div className="pr-[1.6rem]">
              <p className="mb-[0.4rem] w-full text-body-lg text-text-primary">{title}</p>
              <p className="text-body-md text-text-secondary">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
