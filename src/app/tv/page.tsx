import type { Metadata } from "next";
import { TvScreen } from "@/components/tv/TvScreen";

export const metadata: Metadata = {
  title: "7.10 · ארבעה ערוצים",
  description: "כאן 11, 12, 13 ו-14 – מה ששודר ב-7 באוקטובר 2023, בשעה הזו בדיוק.",
};

export default function TvPage() {
  return <TvScreen />;
}
