import Image from "next/image";
import { HeroActions } from "./hero-actions";
import { LogoMark } from "./icons";

export function Cta() {
  return (
    <section className="cta-container flex w-screen items-center justify-center px-[1.6rem] pt-[1.6rem] pb-[1.6rem] tablet:px-[2.4rem] tablet:py-[2.4rem] desktop:px-[3.2rem] desktop:py-[3.2em]">
      <div className="relative aspect-[362/463] h-full max-h-[465px] w-full max-w-[2056px] overflow-hidden rounded-[1.6rem] tablet:h-auto tablet:max-h-[700px] desktop:aspect-[1664/876] desktop:max-h-[876px]">
        <Image
          src="/images/cta-poppies.png"
          alt="Close-up of vibrant yellow poppies against a blurred blue sky, conveying a sense of warmth and tranquility. The foreground is softly out of focus."
          fill
          sizes="100vw"
          className="h-full w-full rounded-[3.2rem] object-cover tablet:rounded-[5.6rem] desktop:rounded-[6.4rem]"
        />
        <div className="absolute top-0 left-0 flex h-full w-full flex-col items-center justify-center text-center">
          <span className="mb-[2.4rem] block w-[6.4rem] fill-white tablet:mb-[3.2rem] tablet:w-[10rem] desktop:w-[12rem]">
            <LogoMark className="w-full fill-white" />
          </span>
          <h2 className="mb-[1.6rem] text-heading-lg text-white tablet:mb-[2.4rem]">
            A breath of fresh air
            <br />
            for your clinic
          </h2>
          <HeroActions className="mt-[1.6rem]" />
        </div>
      </div>
    </section>
  );
}
