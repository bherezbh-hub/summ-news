import type { Metadata } from "next";
import { TvScreen } from "@/components/tv/TvScreen";

// Working copy of /tv with the time bar, for checking and tuning the sync.
export const metadata: Metadata = {
  title: "7.10 · בדיקת זמנים",
  robots: { index: false },
};

export default function TvTimestampPage() {
  return <TvScreen timeControls />;
}
