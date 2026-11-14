import { z } from "zod";
import { RiderInput } from "./types";

/** Shapes shared by the app and /api/me. */
export const AlertSettings = z.object({
  enabled: z.boolean(),
  mode: z.enum(["weekly", "new-match"]),
  weekday: z.number().int().min(0).max(6),
  priceDrops: z.boolean(),
  buddyIds: z.array(z.string()).max(20),
});
export type AlertSettings = z.infer<typeof AlertSettings>;

export const DEFAULT_ALERTS: AlertSettings = { enabled: false, mode: "weekly", weekday: 5, priceDrops: true, buddyIds: [] };

export const Buddy = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(40),
  avatar: z.number().int().min(1).max(8),
  rider: RiderInput,
  budget: z.object({ min: z.number().nullable(), max: z.number().nullable() }),
});
export type Buddy = z.infer<typeof Buddy>;

export const MePayload = z.object({
  buddies: z.array(Buddy).max(20),
  activeId: z.string().max(40).nullable(),
  holds: z.array(z.string()).max(500),
  alerts: AlertSettings,
  country: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
});
export type MePayload = z.infer<typeof MePayload>;
