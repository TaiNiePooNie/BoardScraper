"use client";
import { StoreApp } from "@/components/store/StoreApp";
import { apiServices } from "@/components/shop/services";
import type { BuyerLocale } from "@/lib/types";

export function ShopEntry({ initialLocale }: { initialLocale: BuyerLocale }) {
  return <StoreApp initialLocale={initialLocale} services={apiServices} />;
}
