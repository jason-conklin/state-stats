"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const ANIMATION_FRAMES = [
  "/statestats-animation-frame1.png",
  "/statestats-animation-frame2.png",
  "/statestats-animation-frame3.png",
  "/statestats-animation-frame4.png",
  "/statestats_logo.png",
] as const;

const FULL_LOGO_FRAME = "/statestats_logo.png";
const FRAME_INTERVAL_MS = 150;

type Props = {
  visible?: boolean;
  message?: string;
};

export function StateStatsLoader({
  visible = true,
  message = "Loading StateStats...",
}: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    ANIMATION_FRAMES.forEach((src) => {
      const image = new window.Image();
      image.src = src;
    });
  }, []);

  useEffect(() => {
    if (!visible || prefersReducedMotion) return;

    const intervalId = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % ANIMATION_FRAMES.length);
    }, FRAME_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [prefersReducedMotion, visible]);

  const currentFrame = prefersReducedMotion ? FULL_LOGO_FRAME : ANIMATION_FRAMES[frameIndex];

  return (
    <div
      aria-hidden={!visible}
      className={`pointer-events-none fixed inset-0 z-[140] flex items-center justify-center bg-slate-50/72 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="status"
        aria-live="polite"
        className={`flex flex-col items-center gap-4 rounded-[28px] border border-white/75 bg-white/72 px-7 py-6 text-center shadow-[0_18px_48px_rgba(15,23,42,0.12)] ${
          prefersReducedMotion ? "" : "ss-loader-pulse"
        }`}
      >
        <div className="relative w-20 sm:w-24 md:w-28">
          <Image
            src={currentFrame}
            alt="StateStats loading logo"
            width={128}
            height={128}
            priority
            className="h-auto w-full"
            sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
          />
        </div>
        <p className="text-xs font-medium tracking-[0.18em] text-slate-600 sm:text-sm">
          {message}
        </p>
      </div>
    </div>
  );
}
