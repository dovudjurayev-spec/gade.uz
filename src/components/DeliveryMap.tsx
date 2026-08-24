"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { WAREHOUSE } from "@/lib/delivery";

type Ymaps = {
  ready: (cb: () => void) => void;
  Map: new (
    el: HTMLElement,
    opts: { center: [number, number]; zoom: number; controls: string[] },
  ) => YmapsMap;
  Placemark: new (
    coords: [number, number],
    props: Record<string, string>,
    opts: Record<string, unknown>,
  ) => YmapsPlacemark;
};

type YmapsMap = {
  geoObjects: { add: (o: unknown) => void };
  events: {
    add: (
      evt: string,
      cb: (e: { get: (k: string) => unknown }) => void,
    ) => void;
  };
  setCenter: (
    c: [number, number],
    zoom?: number,
    opts?: { duration?: number; checkZoomRange?: boolean },
  ) => void;
  destroy: () => void;
};

type YmapsPlacemark = {
  geometry: {
    setCoordinates: (c: [number, number]) => void;
    getCoordinates: () => [number, number];
  };
  options: { set: (k: string, v: unknown) => void };
  events: { add: (evt: string, cb: () => void) => void };
};

type YmapsWindow = Window & { ymaps?: Ymaps };

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number } | null) => void;
};

let ymapsPromise: Promise<Ymaps> | null = null;

function loadYmaps(apiKey: string): Promise<Ymaps> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as YmapsWindow;
  if (w.ymaps) return Promise.resolve(w.ymaps);
  if (ymapsPromise) return ymapsPromise;
  ymapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      const ymaps = (window as YmapsWindow).ymaps;
      if (!ymaps) return reject(new Error("ymaps not available"));
      ymaps.ready(() => resolve(ymaps));
    };
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));
    document.head.appendChild(script);
  });
  return ymapsPromise;
}

export default function DeliveryMap({ value, onChange }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const moveMarkerRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);
  // Keep a stable ref to onChange so map init doesn't need to re-run when parent re-renders
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Capture the initial value only — map ownership after that is imperative
  const initialValueRef = useRef(value);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;

    loadYmaps(apiKey)
      .then((ymaps) => {
        if (cancelled || !container) return;
        // Guard against StrictMode double-mount leaving stale map in container
        if (destroyRef.current) destroyRef.current();

        const initial = initialValueRef.current ?? WAREHOUSE;
        const map = new ymaps.Map(container, {
          center: [initial.lat, initial.lng],
          zoom: initialValueRef.current ? 15 : 12,
          controls: ["zoomControl"],
        });

        const warehouse = new ymaps.Placemark(
          [WAREHOUSE.lat, WAREHOUSE.lng],
          { hintContent: "Наш склад", balloonContent: WAREHOUSE.address },
          { preset: "islands#grayHomeIcon" },
        );
        map.geoObjects.add(warehouse);

        const placemark = new ymaps.Placemark(
          [initial.lat, initial.lng],
          { hintContent: "Адрес доставки — перетащите метку" },
          { preset: "islands#redIcon", draggable: true },
        );
        map.geoObjects.add(placemark);

        map.events.add("click", (e) => {
          if (e.get("target") !== map) return;
          const [lat, lng] = e.get("coords") as [number, number];
          placemark.geometry.setCoordinates([lat, lng]);
          onChangeRef.current({ lat, lng });
        });
        placemark.events.add("dragend", () => {
          const [lat, lng] = placemark.geometry.getCoordinates();
          onChangeRef.current({ lat, lng });
        });

        // Imperative API for external updates (geolocation button)
        moveMarkerRef.current = (lat: number, lng: number) => {
          placemark.geometry.setCoordinates([lat, lng]);
          map.setCenter([lat, lng], 15, { duration: 0 });
          onChangeRef.current({ lat, lng });
        };

        destroyRef.current = () => {
          moveMarkerRef.current = null;
          try {
            map.destroy();
          } catch {}
        };

        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => {
      cancelled = true;
      if (destroyRef.current) {
        destroyRef.current();
        destroyRef.current = null;
      }
    };
  }, [apiKey]);

  function handleGeolocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (moveMarkerRef.current) moveMarkerRef.current(lat, lng);
        else onChange({ lat, lng });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  if (!apiKey) {
    return (
      <div className="border border-dashed border-neutral-300 bg-neutral-50 p-4 text-xs text-neutral-600">
        Карта временно недоступна. Стоимость доставки будет уточнена менеджером
        после оформления заказа.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative border overflow-hidden">
        <div ref={containerRef} className="h-64 w-full bg-neutral-100" />
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center text-xs text-neutral-500 pointer-events-none">
            Загружаем карту…
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center text-xs text-red-600 pointer-events-none">
            Не удалось загрузить карту
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
          Кликните по карте или перетащите метку
        </span>
        <button
          type="button"
          onClick={handleGeolocation}
          className="inline-flex items-center gap-1.5 uppercase tracking-widest text-neutral-500 hover:text-neutral-900"
        >
          <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
          Моё местоположение
        </button>
      </div>
    </div>
  );
}
