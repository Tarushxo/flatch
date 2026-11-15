import type { Metadata } from "next";
import { ListingsScreen } from "./listings-screen";

export const metadata: Metadata = { title: "Your flats" };

export default function ListingsPage() {
  return <ListingsScreen />;
}
