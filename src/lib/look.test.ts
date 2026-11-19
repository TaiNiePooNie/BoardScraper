import { describe, expect, it } from "vitest";
import { boardHue, heroWord, SPORT_HUE } from "./look";

describe("hero word", () => {
  it.each([
    ["Flagship", "FLAGSHIP"],
    ["Odysea X Mayhem Round Nose Fish", "MAYHEM"],
    ["Solstice B4Bc Fish", "SOLSTICE"],
    ["Deep Fake", "DEEP FAKE"],
    ["Royal 144", "ROYAL"],
    ["Hybrid Plus White - Epoxy - Future", "HYBRID"],
    ["Instigator PurePop Camber", "INSTIGATOR"],
    ["Lotus - Women's", "LOTUS"],
    ["T. Rice Orca", "RICE ORCA"],
    ["Blow", "BLOW"],
    ["8.0", "8.0"],
  ])("%s → %s", (model, word) => expect(heroWord(model)).toBe(word));
});

describe("board hue", () => {
  it("uses the first coloured photo colour, else the sport's hue", () => {
    expect(boardHue({ sport: "snow", colors: ["black", "green"] })).toBe(145);
    expect(boardHue({ sport: "surf", colors: ["white"] })).toBe(SPORT_HUE.surf);
    expect(boardHue({ sport: "skate" })).toBe(SPORT_HUE.skate);
  });
});
