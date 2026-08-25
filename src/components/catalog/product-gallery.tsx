"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  images: string[];
  name: string;
  imageFit: "contain" | "cover";
};

export function ProductGallery({ images, name, imageFit }: Props) {
  const [active, setActive] = useState(0);
  const hasImages = images.length > 0;
  const current = hasImages ? images[active]! : null;

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {images.length > 1 && (
        <div className="flex md:flex-col gap-2 md:w-20 overflow-x-auto md:overflow-y-auto md:max-h-[600px]">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 aspect-square w-20 border bg-white overflow-hidden transition-colors",
                i === active ? "border-neutral-900" : "border-neutral-200 hover:border-neutral-400",
              )}
              aria-label={`Фото ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className={imageFit === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain p-1"}
              />
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 aspect-square bg-white border border-neutral-200 overflow-hidden">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt={name}
            className={imageFit === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain p-8"}
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-neutral-400 tracking-widest">GA-DE</div>
        )}
      </div>
    </div>
  );
}
