import type { Metadata } from "next";
import { InterestedScreen } from "./interested-screen";

export const metadata: Metadata = { title: "Interested" };

export default function InterestedPage() {
  return <InterestedScreen />;
}
