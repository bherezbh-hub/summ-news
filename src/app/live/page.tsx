import type { Metadata } from "next";
import { LiveScreen } from "@/components/live/LiveScreen";

// Internal page: not linked from anywhere and kept out of search engines.
export const metadata: Metadata = {
  title: "ערוצי החדשות · שידור חי",
  robots: { index: false },
};

export default function LivePage() {
  return <LiveScreen />;
}
