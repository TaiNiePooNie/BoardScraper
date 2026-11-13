import type { RetailerAdapter } from "./base";
import { createJsonLdAdapter } from "./jsonLdRetailer";

/**
 * Registered retailers. Add real shops here once their robots.txt/ToS
 * have been reviewed. The entry below is a template, not a live target.
 */
export const ADAPTERS: Record<string, RetailerAdapter> = {
  example: createJsonLdAdapter({
    retailer: {
      id: "example",
      name: "Example Shop",
      homepage: "https://shop.example.com",
      country: "DE",
      currency: "EUR",
      pricesIncludeVat: true,
      shipping: [{ destinations: ["DE"], cost: 0 }, { destinations: ["*"], cost: 19.9, freeAbove: 250 }],
    },
    listingUrls: ["https://shop.example.com/snowboards"],
    productLinkSelector: "a.product-tile__link",
    nextPageSelector: "a[rel=next]",
    wasPriceSelector: ".price--was",
  }),
};
