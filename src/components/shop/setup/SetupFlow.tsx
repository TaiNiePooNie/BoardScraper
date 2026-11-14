"use client";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, X } from "lucide-react";
import { useState } from "react";
import { ASSETS } from "@/lib/assets";
import type { Profile } from "@/lib/profile";
import { recommend, requiresWide, WIDE_THRESHOLD_EU, WIDE_THRESHOLD_US } from "@/lib/sizing";
import type { CurrencyCode, FitPreference, RiderInput, RiderStyle, SkillLevel } from "@/lib/types";
import type { AlertSettings } from "@/lib/account";
import { AlertSettingsForm } from "../account/AlertSettingsForm";
import { AvatarPicker } from "../account/Avatar";
import { SignInOptions } from "../account/SignInOptions";
import { AssetImg } from "../../AssetImg";
import { Logo } from "../Logo";
import type { AccountServices } from "../services";
import { BudgetRange } from "./BudgetRange";
import { ChoiceCards } from "./ChoiceCards";
import { SizePreview } from "./SizePreview";
import { SliderField } from "./SliderField";
import { SlotPicker } from "./SlotPicker";

const US_SIZES = Array.from({ length: 29 }, (_, i) => 1 + i * 0.5); // 1–15 (kids from 1)
const EU_SIZES = Array.from({ length: 41 }, (_, i) => 30 + i * 0.5); // 30–50

const BASE_STEPS = [
  { key: "rider", title: "Who's riding?", mascot: ASSETS.mascot.wave },
  { key: "boots", title: "Boot size", mascot: ASSETS.mascot.point },
  { key: "style", title: "How do you ride?", mascot: ASSETS.mascot.ride },
  { key: "skill", title: "Your level", mascot: ASSETS.mascot.thinking },
  { key: "budget", title: "Your budget", mascot: ASSETS.mascot.celebrate },
] as const;
const INBOX_STEP = { key: "inbox", title: "Deals in your inbox?", mascot: ASSETS.mascotCard } as const;

/** Optional last step on first setup: opt in to deal emails (needs an account). */
export interface InboxStep {
  account: AccountServices;
  providers: { google: boolean; apple: boolean; email: boolean };
  signedIn: boolean;
  alerts: AlertSettings;
  onAlerts: (a: AlertSettings) => void;
  /** Save the setup so far (before signing in redirects away). */
  onPersist: (p: Profile, who: { name: string; avatar: number }) => void;
}

/** Lean, step-by-step rider setup. Sliders, a wheel and cards; every number can also be typed. */
export function SetupFlow({ initial, name: initialName, avatar: initialAvatar, currency, onDone, onClose, inbox }: {
  initial: Profile;
  name: string;
  avatar: number;
  currency: CurrencyCode;
  onDone: (p: Profile, who: { name: string; avatar: number }) => void;
  onClose?: () => void;
  inbox?: InboxStep;
}) {
  const STEPS = inbox ? [...BASE_STEPS, INBOX_STEP] : BASE_STEPS;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [dir, setDir] = useState(1);
  const [rider, setRider] = useState<RiderInput>(initial.rider);
  const [budget, setBudget] = useState(initial.budget);
  const set = <K extends keyof RiderInput>(k: K, v: RiderInput[K]) => setRider((r) => ({ ...r, [k]: v }));
  const rec = recommend(rider);
  const wide = requiresWide(rider.bootSize, rider.bootSystem);
  const last = step === STEPS.length - 1;
  const go = (d: number) => {
    setDir(d);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + d)));
  };

  // Switching to Kids from adult numbers (or back) moves the sliders to a sensible start.
  const pickFit = (fit: FitPreference) => {
    setRider((r) => {
      if (fit === "kids" && r.weightKg > 50) return { ...r, fit, heightCm: 135, weightKg: 32, bootSize: r.bootSystem === "US" ? 4 : 36 };
      if (fit !== "kids" && r.fit === "kids" && r.weightKg < 45) return { ...r, fit, heightCm: 175, weightKg: 72, bootSize: r.bootSystem === "US" ? 9 : 42.5 };
      return { ...r, fit };
    });
  };

  const switchSystem = (sys: "US" | "EU") => {
    if (sys === rider.bootSystem) return;
    const converted = sys === "EU" ? Math.round((rider.bootSize + 33.5) * 2) / 2 : Math.round((rider.bootSize - 33.5) * 2) / 2;
    setRider((r) => ({ ...r, bootSystem: sys, bootSize: converted }));
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-asphalt" role="dialog" aria-modal="true" aria-label="Rider setup">
      <img src={ASSETS.heroShopfront} alt="" className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-55" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-r from-asphalt via-asphalt/80 to-asphalt/20" />
      <img src={ASSETS.mountains} alt="" className="pointer-events-none fixed inset-x-0 bottom-0 w-full opacity-70" />

      <div className="app-gutter relative mx-auto flex min-h-full max-w-6xl flex-col py-6">
        <div className="flex items-center gap-3">
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-full border-2 border-paper/30 bg-asphalt/80 p-2 text-paper" aria-label="Close setup">
              <X className="h-5 w-5" />
            </button>
          )}
          <Logo height={44} />
        </div>

        <div className="mt-6 w-full max-w-md md:mt-12">
          <div className="sticker relative p-5 pt-6 sm:p-6">
            <AssetImg
              key={step}
              src={STEPS[step].mascot}
              alt=""
              className="pointer-events-none absolute -right-6 -top-16 h-28 w-28 rotate-6 sm:-right-14 sm:h-36 sm:w-36"
              fallback={<img src={ASSETS.mascot.celebrate} alt="" className="pointer-events-none absolute -right-6 -top-16 h-28 w-28 rotate-6 sm:-right-14 sm:h-36 sm:w-36" />}
            />
            <div className="mb-1 flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((s, i) => (
                <span key={s.key} className={clsx("h-1.5 rounded-full transition-all", i === step ? "w-8 bg-acid" : i < step ? "w-4 bg-acid/60" : "w-4 bg-paper/20")} />
              ))}
            </div>
            <h1 className="headline mb-5 text-4xl">{STEPS[step].title}</h1>

            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-5"
              >
                {step === 0 && (
                  <>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="rider-name" className="text-xs font-bold uppercase tracking-[0.14em] text-paper/60">Name</label>
                      <input id="rider-name" className="input !py-2.5 !text-base" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Me" />
                      <AvatarPicker value={avatar} name={name} onChange={setAvatar} />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-paper/60">Who&apos;s it for?</div>
                      <ChoiceCards<FitPreference>
                        name="Who's it for"
                        columns={4}
                        compact
                        value={rider.fit ?? "any"}
                        onChange={pickFit}
                        choices={[
                          { id: "kids", label: "Kids", icon: ASSETS.fit.kids },
                          { id: "mens", label: "Men", icon: ASSETS.fit.mens },
                          { id: "womens", label: "Women", icon: ASSETS.fit.womens },
                          { id: "any", label: "All", icon: ASSETS.fit.any },
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-3">
                      <div className="flex min-w-0 flex-col gap-4">
                        <SliderField id="height" label="Height" unit="cm" min={90} max={210} value={rider.heightCm} onChange={(v) => set("heightCm", v)} />
                        <SliderField id="weight" label="Weight" unit="kg" min={15} max={140} step={0.5} value={rider.weightKg} onChange={(v) => set("weightKg", v)} />
                      </div>
                      <SizePreview heightCm={rider.heightCm} weightKg={rider.weightKg} boardCm={rec.idealLengthCm} wide={wide} fit={rider.fit ?? "any"} />
                    </div>
                    <p className="text-xs text-paper/60">Weight decides your board length; height only fine-tunes it.</p>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div className="flex justify-center gap-2" role="radiogroup" aria-label="Size system">
                      {(["US", "EU"] as const).map((sys) => (
                        <button key={sys} type="button" role="radio" aria-checked={rider.bootSystem === sys} onClick={() => switchSystem(sys)}
                          className={clsx("headline rounded-full border-2 px-5 py-1.5 text-lg", rider.bootSystem === sys ? "border-acid bg-acid text-asphalt" : "border-paper/25 text-paper")}>
                          {sys}
                        </button>
                      ))}
                    </div>
                    <SlotPicker
                      id="boot"
                      label={`Boot size (${rider.bootSystem})`}
                      values={rider.bootSystem === "US" ? US_SIZES : EU_SIZES}
                      value={rider.bootSize}
                      onChange={(v) => set("bootSize", v)}
                      format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
                    />
                    <p className={clsx("rounded-xl px-3 py-2 text-center text-sm font-semibold", wide ? "bg-orange/15 text-orange" : "bg-paper/5 text-paper/70")}>
                      {wide
                        ? `Big feet! Wide (W) boards only, so your toes don't drag.`
                        : `Regular width boards. Wide kicks in at US ${WIDE_THRESHOLD_US} / EU ${WIDE_THRESHOLD_EU}.`}
                    </p>
                  </>
                )}

                {step === 2 && (
                  <ChoiceCards<RiderStyle>
                    name="Riding style"
                    columns={2}
                    value={rider.style}
                    onChange={(v) => set("style", v)}
                    choices={[
                      { id: "any", label: "All styles", hint: "Show every board", icon: ASSETS.styleAny },
                      { id: "park", label: "Park", hint: "Rails, jumps, butters", icon: ASSETS.style.park },
                      { id: "all-mountain", label: "All-Mountain", hint: "A bit of everything", icon: ASSETS.style["all-mountain"] },
                      { id: "freeride", label: "Freeride", hint: "Powder, steeps, speed", icon: ASSETS.style.freeride },
                    ]}
                  />
                )}

                {step === 3 && (
                  <ChoiceCards<SkillLevel>
                    name="Skill level"
                    columns={2}
                    value={rider.skill ?? "intermediate"}
                    onChange={(v) => set("skill", v)}
                    choices={[
                      { id: "beginner", label: "Beginner", hint: "First weeks on snow", icon: ASSETS.skill.beginner },
                      { id: "intermediate", label: "Intermediate", hint: "Linking turns on reds", icon: ASSETS.skill.intermediate },
                      { id: "advanced", label: "Advanced", hint: "Any run, some park", icon: ASSETS.skill.advanced },
                      { id: "expert", label: "Expert", hint: "Steeps, big air, speed", icon: ASSETS.skill.expert },
                    ]}
                  />
                )}

                {step === 4 && <BudgetRange value={budget} onChange={setBudget} currency={currency} />}

                {step === 5 && inbox && (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-paper/75">Get boards that fit you by email: a weekly roundup or as soon as a new one fits. Totally optional.</p>
                    <AlertSettingsForm value={inbox.alerts} onChange={inbox.onAlerts} buddies={[]} />
                    {inbox.alerts.enabled && !inbox.signedIn && (
                      <div className="rounded-2xl border-2 border-paper/15 p-3">
                        <p className="mb-3 text-sm font-semibold">Sign in so we know where to send them:</p>
                        <SignInOptions account={inbox.account} providers={inbox.providers} beforeSignIn={() => inbox.onPersist({ rider, budget }, { name: name.trim() || "Me", avatar })} />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center gap-3">
              {step > 0 && (
                <button type="button" onClick={() => go(-1)} className="btn-ghost flex items-center gap-1" aria-label="Back">
                  <ChevronLeft className="h-4 w-4" />Back
                </button>
              )}
              <button
                type="button"
                className="btn-acid ml-auto flex-1"
                onClick={() => (last ? onDone({ rider, budget }, { name: name.trim() || "Me", avatar }) : go(1))}
              >
                {last ? (inbox && !inbox.alerts.enabled ? "No thanks, open the shop" : "Open the shop") : "Next"}
              </button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-paper/60">
            Your board: <b className="text-paper">{rec.idealLengthCm}{rec.requiresWide ? "W" : ""} cm</b> · flex {rec.flexRange[0]}–{rec.flexRange[1]} · saved on this device
          </p>
        </div>
      </div>
    </div>
  );
}
