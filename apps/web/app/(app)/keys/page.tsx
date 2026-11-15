import type { Metadata } from "next";
import { KeysScreen } from "./keys-screen";

export const metadata: Metadata = { title: "Keys" };

export default function KeysPage() {
  return <KeysScreen />;
}
