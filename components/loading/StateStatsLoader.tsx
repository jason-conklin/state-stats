"use client";

import Image from "next/image";

const ANIMATION_FRAMES = [
  "/statestats-animation-frame1.png",
  "/statestats-animation-frame2.png",
  "/statestats-animation-frame3.png",
  "/statestats-animation-frame4.png",
  "/statestats_logo.png",
] as const;

const FRAME_INTERVAL_MS = 110;
const TOTAL_DURATION_MS = ANIMATION_FRAMES.length * FRAME_INTERVAL_MS;

type Props = {
  visible?: boolean;
  message?: string;
};

export function StateStatsLoader({
  visible = true,
  message = "Loading StateStats...",
}: Props) {
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
        className="ss-loader-pulse flex flex-col items-center gap-4 rounded-[28px] border border-white/75 bg-white/72 px-7 py-6 text-center shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
      >
        <div className="relative w-20 sm:w-24 md:w-28">
          {ANIMATION_FRAMES.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt=""
              aria-hidden
              width={128}
              height={128}
              priority
              className={`ss-loader-frame absolute inset-0 h-auto w-full ${
                index === ANIMATION_FRAMES.length - 1 ? "ss-loader-frame-final" : ""
              }`}
              style={{
                animationDelay: `${index * FRAME_INTERVAL_MS}ms`,
                animationDuration: `${TOTAL_DURATION_MS}ms`,
              }}
              sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 112px"
            />
          ))}
          <div className="w-full pb-[100%]" aria-hidden />
        </div>
        <p className="text-xs font-medium tracking-[0.18em] text-slate-600 sm:text-sm">
          {message}
        </p>
      </div>
    </div>
  );
}
