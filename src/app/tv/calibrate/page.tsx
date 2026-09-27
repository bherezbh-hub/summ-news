import type { Metadata } from "next";
import { CalibrateScreen } from "@/components/tv/CalibrateScreen";

export const metadata: Metadata = {
  title: "7.10 · כיול ערוצים",
  robots: { index: false },
};

export default function CalibratePage() {
  return <CalibrateScreen />;
}
