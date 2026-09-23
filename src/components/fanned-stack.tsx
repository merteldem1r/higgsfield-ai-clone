import Image from "next/image";

// Our own Flux Dev generations (3:4), see public/showcase/.
const PHOTOS = [
  { src: "/showcase/01.jpg", alt: "Jazz trumpeter in a smoky bar" },
  { src: "/showcase/02.jpg", alt: "Couple under string lights on a rooftop" },
  { src: "/showcase/03.jpg", alt: "Woman in a red phone booth at night" },
  { src: "/showcase/04.jpg", alt: "Man laughing in a cinema seat" },
];

// Full class strings so Tailwind can see them. Hover widens the fan by 3° each way.
const POSE = [
  "-rotate-8 group-hover:-rotate-11 rounded-lg",
  "-rotate-3 group-hover:-rotate-6 rounded-lg [animation-delay:60ms]",
  "rotate-0 group-hover:rotate-3 rounded-full [animation-delay:120ms]",
  "rotate-6 group-hover:rotate-9 rounded-lg [animation-delay:180ms]",
];

const SIZE = {
  hero: { box: "size-28 sm:size-37.5 -ml-7 sm:-ml-9 first:ml-0", px: 150 },
  small: { box: "size-13 -ml-3 first:ml-0", px: 52 },
};

export function FannedStack({ size = "hero" }: { size?: keyof typeof SIZE }) {
  const { box, px } = SIZE[size];
  return (
    <div className="group flex items-center justify-center">
      {PHOTOS.map((photo, i) => (
        <div
          key={photo.src}
          className={`${box} ${POSE[i]} relative -translate-y-1 overflow-hidden border-2 border-white/18 shadow-photo transition-[rotate] duration-500 ease-out motion-safe:animate-fan-in`}
        >
          <Image src={photo.src} alt={photo.alt} fill sizes={`${px}px`} className="object-cover" preload={size === "hero"} />
        </div>
      ))}
    </div>
  );
}
