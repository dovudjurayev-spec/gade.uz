"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Slide = { src: string; alt: string };

const SLIDES: Slide[] = [
  { src: "/brand/slide-1.png", alt: "GA-DE — блеск для губ" },
  { src: "/brand/slide-2.png", alt: "GA-DE — карандаш High Precision" },
  { src: "/brand/slide-3.png", alt: "GA-DE Skinfinity — сыворотка" },
];

const INTERVAL_MS = 4500;

export function BrandGallery() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full flex flex-col items-end pt-16">
      <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-[2.5rem] bg-neutral-100 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.3)]">
        {SLIDES.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? "scale(1)" : "scale(1.04)",
                transition:
                  "opacity 900ms ease-out, transform 4500ms ease-out",
                zIndex: isActive ? 2 : 1,
              }}
              aria-hidden={!isActive}
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
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              i === index ? "w-6 bg-neutral-900" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
