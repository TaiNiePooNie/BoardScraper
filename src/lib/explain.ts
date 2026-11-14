import type { BoardProfile, BoardShape } from "./types";

/** Plain-language explanations for beginners (shown next to specs). */
export const PROFILE_INFO: Record<BoardProfile, { label: string; text: string }> = {
  camber: { label: "Camber", text: "Arched between the feet. Snappy pop and strong edge grip; less forgiving." },
  rocker: { label: "Rocker", text: "Banana-shaped. Loose, playful and catch-free; floats in powder." },
  flat: { label: "Flat", text: "Flat between the feet. Stable and easy, a balance of grip and play." },
  "hybrid-camber": { label: "Hybrid camber", text: "Camber underfoot, rocker at the tips. Pop and grip with an easier feel." },
  "hybrid-rocker": { label: "Hybrid rocker", text: "Rocker between the feet, camber under them. Forgiving and playful with some grip." },
  "directional-camber": { label: "Directional camber", text: "Camber set back with a rockered nose. Charges hard snow, floats in powder." },
};

export const SHAPE_INFO: Record<BoardShape, { label: string; text: string }> = {
  "true-twin": { label: "True twin", text: "Same both ways. Rides switch naturally: park and freestyle." },
  "directional-twin": { label: "Directional twin", text: "Twin outline with a small directional set-back. Does a bit of everything." },
  directional: { label: "Directional", text: "Made to ride one way. Stable at speed, better in powder." },
  tapered: { label: "Tapered", text: "Wider nose than tail. Sinks the tail in powder for easy float and quick turns." },
};

export const flexWord = (f: number) => (f <= 3 ? "Soft" : f <= 5 ? "Medium-soft" : f <= 7 ? "Medium-stiff" : "Stiff");

/** Simple side-view outline of each profile for a small diagram (viewBox 0 0 120 30). */
export const PROFILE_PATH: Record<BoardProfile, string> = {
  camber: "M4 12 Q10 22 20 22 Q60 12 100 22 Q110 22 116 12",
  rocker: "M4 8 Q20 24 60 24 Q100 24 116 8",
  flat: "M4 12 Q10 22 22 22 L98 22 Q110 22 116 12",
  "hybrid-camber": "M4 8 Q14 22 28 22 Q60 15 92 22 Q106 22 116 8",
  "hybrid-rocker": "M4 10 Q12 20 30 18 Q60 25 90 18 Q108 20 116 10",
  "directional-camber": "M2 6 Q16 22 32 22 Q66 13 104 22 Q112 22 117 14",
};
