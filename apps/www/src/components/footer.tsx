import { ChevronRightIcon, LogoMark, Wordmark } from "./icons";
import { APP_URL, GITHUB_URL, HACKATHON_URL } from "./site-config";

const LINK_GROUPS = [
  {
    title: "Project",
    className: "min-w-[49%] tablet:min-w-0",
    links: [
      { label: "Get started", href: APP_URL, external: true },
      { label: "GitHub", href: GITHUB_URL, external: true },
    ],
  },
  {
    title: "Event",
    className: "min-w-[49%] tablet:min-w-0",
    links: [
      { label: "AIM Hackathon", href: HACKATHON_URL, external: true },
      { label: "Track 1: Clinical Documentation", href: HACKATHON_URL, external: true },
    ],
  },
];

const linkClassName =
  "relative underline decoration-transparent underline-offset-2 outline-hidden transition-[text-decoration-color] hover:decoration-inherit after:absolute after:-top-[2px] after:-left-[4px] after:h-[calc(100%+4px)] after:w-[calc(100%+8px)] after:rounded-[0.4rem] focus-visible:after:border-2 focus-visible:after:border-blue-500 focus-visible:after:shadow-[0_0_0_3px_rgba(66,181,220,0.30)]";

export function Footer() {
  return (
    <>
      <footer className="footer relative z-[1] mb-[30vw] w-full rounded-b-[3.2rem] bg-background-secondary tablet:mb-[29vw] tablet:h-[517px] tablet:min-h-[517px] tablet:rounded-b-[5.6rem] desktop:rounded-b-[6.4rem]">
        <div className="relative z-[1] mx-auto flex min-h-[56svh] w-full max-w-[2120px] flex-col px-[1.6rem] pt-[3.2rem] pb-[2.4rem] tablet:h-[517px] tablet:min-h-[517px] tablet:flex-row tablet:justify-between tablet:px-[3.2rem] desktop:pt-[8rem]">
          <div className="mb-[3.2rem]">
            <p className="mb-[1.6rem] text-heading-lg tablet:mb-[2.4rem] desktop:mb-[3.2rem]">
              AI that prepares the
              <br />
              <span className="italic">doctor’s brief</span>
            </p>
            <a
              className="group/button relative isolate inline-flex h-10 cursor-pointer text-body-sm outline-hidden tablet:h-10.5"
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="z-10 flex w-full items-center rounded-ctas-button border-2 border-transparent bg-surface-tertiary px-[1.4rem] text-text-tertiary transition-colors group-focus-visible/button:border-blue-500 group-focus-visible/button:shadow-[0_0_0_3px_rgba(66,181,220,0.30)] group-active:bg-black-500">
                Get started
              </span>
              <span
                aria-hidden="true"
                className="z-0 flex h-[4rem] w-[3.6rem] shrink-0 items-center justify-center rounded-[1.2rem] bg-surface-tertiary text-text-tertiary transition-[margin] group-hover/button:ml-0 group-focus-visible/button:ml-0 group-focus-visible/button:border-2 group-focus-visible/button:border-blue-500 group-focus-visible/button:shadow-[0_0_0_3px_rgba(66,181,220,0.30)] supports-hover:-ml-[3.6rem] tablet:h-[4.2rem]"
              >
                <ChevronRightIcon className="block size-[2rem]" />
              </span>
            </a>
          </div>
          <div className="flex h-full flex-1 flex-col gap-[6.4rem] tablet:flex-none tablet:justify-between tablet:gap-x-[10rem] tablet:pr-[7.4rem]">
            <div className="footer-links flex w-full flex-wrap justify-between gap-x-0 gap-y-[0.5rem] tablet:gap-[7.4rem] desktop:gap-[15rem]">
              {LINK_GROUPS.map((group) => (
                <dl key={group.title} className={group.className}>
                  <dt className="mb-[1rem] text-body-sm text-text-secondary">{group.title}</dt>
                  {group.links.map((link) => (
                    <dd key={link.label} className="mb-[0.7rem] text-body-sm text-text-primary">
                      <a
                        className={linkClassName}
                        href={link.href}
                        target={"external" in link && link.external ? "_blank" : undefined}
                        rel={
                          "external" in link && link.external ? "noopener noreferrer" : undefined
                        }
                      >
                        {link.label}
                      </a>
                    </dd>
                  ))}
                </dl>
              ))}
            </div>
            <div className="mt-auto flex gap-[1.6rem] tablet:mt-0 tablet:block">
              <LogoMark className="w-[3.4rem] fill-current tablet:mb-[1.2rem] tablet:w-[4.3rem]" />
              <div className="flex flex-col items-start gap-[0.8rem]">
                <p className="text-label-lg">
                  © 2026 Medlyn.
                  <br />
                  Built for the AIM Hackathon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <div className="fixed bottom-0 h-[480px] w-full bg-gradient-footer desktop:h-[900px]">
        <Wordmark className="absolute bottom-[1rem] left-[50%] w-[96%] -translate-x-1/2 fill-white" />
      </div>
    </>
  );
}
