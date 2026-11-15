import type { Metadata } from "next";
import { PostFlat } from "./post-flat";

export const metadata: Metadata = { title: "Post a flat" };

export default function PostFlatPage() {
  return <PostFlat />;
}
