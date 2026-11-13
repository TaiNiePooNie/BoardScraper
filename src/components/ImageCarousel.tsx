"use client";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useState } from "react";
import { ZoomModal } from "./ZoomModal";

/** Scraped product images. Click opens the zoom lightbox at the current slide. */
export function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  if (!images.length) return <div className="aspect-[4/5] rounded-xl bg-slate-100 dark:bg-slate-800" />;
  const go = (d: number) => setI((p) => (p + d + images.length) % images.length);

  return (
    <div className="group relative">
      <button type="button" onClick={() => setZoomOpen(true)} className="block w-full cursor-zoom-in overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" aria-label="Zoom image">
        <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${i * 100}%)` }}>
          {images.map((src, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={idx} src={src} alt={`${alt} ${idx + 1}`} loading="lazy" className="aspect-[4/5] w-full shrink-0 object-contain" />
          ))}
        </div>
        <ZoomIn className="absolute right-2 top-2 h-5 w-5 rounded bg-black/50 p-0.5 text-white opacity-0 transition group-hover:opacity-100" />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={() => go(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow opacity-0 transition group-hover:opacity-100 dark:bg-slate-900/80" aria-label="Previous image">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => go(1)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow opacity-0 transition group-hover:opacity-100 dark:bg-slate-900/80" aria-label="Next image">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="mt-2 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} aria-label={`Image ${idx + 1}`} className={clsx("h-1.5 rounded-full transition-all", idx === i ? "w-5 bg-glacier" : "w-1.5 bg-slate-300 dark:bg-slate-600")} />
            ))}
          </div>
        </>
      )}
      {zoomOpen && <ZoomModal images={images} alt={alt} startIndex={i} onClose={() => setZoomOpen(false)} />}
    </div>
  );
}
