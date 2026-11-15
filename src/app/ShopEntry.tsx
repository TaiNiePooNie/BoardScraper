"use client";
import { StoreApp } from "@/components/store/StoreApp";
import { apiServices } from "@/components/shop/services";
import type { BuyerLocale } from "@/lib/types";

export function ShopEntry({ initialLocale, initialBoardId }: { initialLocale: BuyerLocale; initialBoardId?: string }) {
  return <StoreApp initialLocale={initialLocale} services={apiServices} initialBoardId={initialBoardId} />;
}
