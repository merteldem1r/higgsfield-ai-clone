import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { ImageStudio } from "./image-studio";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("nav.studio") };
}

export default function ImagePage() {
  return <ImageStudio />;
}
