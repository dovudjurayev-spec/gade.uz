"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type Slide = { src: string | null; alt: string };

const SLIDES: Slide[] = [
  { src: null, alt: "Композиция GA-DE #1" },
  { src: null, alt: "Композиция GA-DE #2" },
  { src: null, alt: "Композиция GA-DE #3" },
];

const INTERVAL_MS = 5000;
const SWIPE_MS = 600;

const STACK_TRANSFORMS = [
  { x: 0, y: 0, rot: 0, scale: 1, opacity: 1 },
  { x: 22, y: 16, rot: 5, scale: 0.97, opacity: 0.85 },
  { x: -14, y: 28, rot: -7, scale: 0.94, opacity: 0.65 },
];

export function BrandGallery() {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const indexRef = useRef(0);
  const leavingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const go = useCallback((next: number) => {
    const cur = indexRef.current;
    if (next === cur) return;
    setLeaving(cur);
    if (leavingTimer.current) clearTimeout(leavingTimer.current);
    leavingTimer.current = setTimeout(() => setLeaving(null), SWIPE_MS);
    setIndex(next);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      go((indexRef.current + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => {
      clearInterval(tick);
      if (leavingTimer.current) clearTimeout(leavingTimer.current);
    };
  }, [go]);

  return (
    <div className="w-full flex flex-col items-center md:items-end md:pt-16">
      <div className="relative aspect-square w-full max-w-md">
        {SLIDES.map((slide, i) => {
          const offset = (i - index + SLIDES.length) % SLIDES.length;
          const isTop = offset === 0;
          const isLeaving = leaving === i;
          const t = (STACK_TRANSFORMS[offset] ?? STACK_TRANSFORMS[STACK_TRANSFORMS.length - 1])!;

          const style: React.CSSProperties = isLeaving
            ? {
                transform: `translate(140%, -8%) rotate(18deg) scale(0.95)`,
                opacity: 0,
                zIndex: SLIDES.length + 1,
                pointerEvents: "none",
                transition: `transform ${SWIPE_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${SWIPE_MS}ms ease-out`,
              }
            : {
                transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rot}deg) scale(${t.scale})`,
                opacity: t.opacity,
                zIndex: SLIDES.length - offset,
                pointerEvents: isTop ? "auto" : "none",
                transition: `transform ${SWIPE_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${SWIPE_MS}ms ease-out`,
              };

          return (
            <div
              key={i}
              className="absolute inset-0 overflow-hidden rounded-[2.5rem] bg-neutral-200 shadow-[0_15px_40px_-20px_rgba(0,0,0,0.25)]"
              style={style}
              aria-hidden={!isTop}
            >
              {slide.src ? (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="(min-width: 768px) 28rem, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-neutral-200" />
              )}
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
