import { z } from "zod";

/** Shared rules for the Feedback & support form (client + server). */
export const FEEDBACK_KINDS = ["question", "bug", "feature", "feedback", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_LIMITS = {
  files: 5,
  imageBytes: 10 * 1024 * 1024,
  videoBytes: 25 * 1024 * 1024,
  totalBytes: 40 * 1024 * 1024,
  /** Upload chunk: below Vercel's 4.5 MB request limit. */
  chunkBytes: 3 * 1024 * 1024,
  perHour: 8,
} as const;

export const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif|heic|heif)|video\/(mp4|quicktime|webm))$/;

export const FeedbackInput = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  subject: z.string().trim().min(3, "Add a short subject").max(140),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)").max(5000),
  email: z.string().trim().email("That doesn't look like an email address").max(200).optional().or(z.literal("")),
  /** Honeypot: humans never fill this. */
  website: z.string().max(500).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});
export type FeedbackInput = z.infer<typeof FeedbackInput>;

export const MediaInput = z.object({
  filename: z.string().trim().min(1).max(200),
  mime: z.string().regex(ALLOWED_MIME, "Only photos (JPG, PNG, WebP, GIF, HEIC) and videos (MP4, MOV, WebM)"),
  size: z.number().int().positive(),
});

export function mediaLimitError(m: { mime: string; size: number }): string | null {
  const video = m.mime.startsWith("video/");
  const max = video ? FEEDBACK_LIMITS.videoBytes : FEEDBACK_LIMITS.imageBytes;
  return m.size > max ? `${video ? "Videos" : "Photos"} can be up to ${max / 1024 / 1024} MB` : null;
}

export const KIND_LABEL: Record<FeedbackKind, string> = {
  question: "Question",
  bug: "Bug report",
  feature: "Feature request",
  feedback: "Feedback",
  other: "Something else",
};
