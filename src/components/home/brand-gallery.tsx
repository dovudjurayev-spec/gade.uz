"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Slide = { src: string; alt: string };

const SLIDES: Slide[] = [
  { src: "/brand/slide-1.png", alt: "GA-DE — блеск для губ" },
  { src: "/brand/slide-2.png", alt: "GA-DE — карандаш High Precision" },
  { src: "/brand/slide-3.png", alt: "GA-DE Skinfinity — сыворотка" },
];

const INTERVAL_MS = 5000;

const STACK = [
  { x: 0, y: 0, rot: 0, scale: 1, opacity: 1 },
  { x: 22, y: 16, rot: 5, scale: 0.97, opacity: 0.85 },
  { x: -14, y: 28, rot: -7, scale: 0.94, opacity: 0.65 },
];

export function BrandGallery() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const go = (next: number) => {
    if (next !== index) setIndex(next);
  };

  return (
    <div className="w-full flex flex-col items-end pt-16">
      <div className="relative aspect-square w-full max-w-md">
        {SLIDES.map((slide, i) => {
          const offset = (i - index + SLIDES.length) % SLIDES.length;
          const t = STACK[offset] ?? STACK[STACK.length - 1]!;
          return (
            <div
              key={i}
              className="absolute inset-0 overflow-hidden rounded-[2.5rem] bg-neutral-200 shadow-[0_15px_40px_-20px_rgba(0,0,0,0.25)]"
              style={{
                transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rot}deg) scale(${t.scale})`,
                opacity: t.opacity,
                zIndex: SLIDES.length - offset,
                transition:
                  "transform 700ms cubic-bezier(0.4, 0, 0.2, 1), opacity 700ms ease-out",
              }}
              aria-hidden={offset !== 0}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="28rem"
                priority={i === 0}
                className="object-cover"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 w-full max-w-md">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Слайд ${i + 1}`}
            onClick={() => go(i)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === index ? "w-6 bg-neutral-900" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
