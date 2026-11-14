"use client";
import { ShopApp } from "@/components/shop/ShopApp";
import { apiServices } from "@/components/shop/services";
import type { BuyerLocale } from "@/lib/types";

export function ShopEntry({ initialLocale }: { initialLocale: BuyerLocale }) {
  return <ShopApp initialLocale={initialLocale} services={apiServices} />;
}
