import { NextResponse } from "next/server";
import { z } from "zod";
import {
  calculateCourierPriceTiyin,
  isWithinDeliveryZone,
  routeDistanceKm,
  WAREHOUSE,
} from "@/lib/delivery";

const bodySchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  subtotalTiyin: z.number().int().nonnegative().default(0),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const { lat, lng, subtotalTiyin } = parsed.data;

  if (!isWithinDeliveryZone({ lat, lng })) {
    return NextResponse.json({
      ok: false,
      error: "Точка вне зоны доставки по Ташкенту",
    });
  }

  const distanceKm = routeDistanceKm({ lat, lng });
  const priceTiyin = calculateCourierPriceTiyin(distanceKm, subtotalTiyin);
  const address = await reverseGeocode(lat, lng);

  return NextResponse.json({
    ok: true,
    distanceKm: Math.round(distanceKm * 10) / 10,
    priceTiyin,
    address,
    warehouse: WAREHOUSE,
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = process.env.YANDEX_GEOCODER_API_KEY;
  if (!key) return null;
  try {
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${key}&geocode=${lng},${lat}&format=json&lang=ru_RU&results=1&kind=house`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      response?: {
        GeoObjectCollection?: {
          featureMember?: Array<{
            GeoObject?: {
              name?: string;
              metaDataProperty?: { GeocoderMetaData?: { text?: string } };
            };
          }>;
        };
      };
    };
    const found =
      data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    return found?.metaDataProperty?.GeocoderMetaData?.text ?? found?.name ?? null;
  } catch {
    return null;
  }
}
