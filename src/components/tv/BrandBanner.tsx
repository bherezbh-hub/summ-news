/* eslint-disable @next/next/no-img-element */

// The party strip: "הדמוקרטים" on the right, the "אמת" ballot slip in the middle
// (standing out of the strip, never cropped) and the "יאיר גולן" band on the left.
export function BrandBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative w-full rounded-2xl bg-[linear-gradient(135deg,#1b2a63_0%,#24388a_55%,#1a2960_100%)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:gap-6 sm:px-8 sm:py-3">
        <img src="/tv/democrats-white.png" alt="הדמוקרטים" className="h-8 w-auto min-w-0 shrink sm:h-12 lg:h-14" />
        <img
          src="/tv/ballot-paper.png"
          alt="פתק אמת – הדמוקרטים בראשות יאיר גולן"
          className="-my-5 h-24 w-auto shrink-0 rotate-3 drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)] sm:-my-7 sm:h-32 lg:h-36"
        />
        <img src="/tv/golan-logo.png" alt="יאיר גולן" className="h-7 w-auto min-w-0 shrink sm:h-11 lg:h-12" />
      </div>
    </div>
  );
}
