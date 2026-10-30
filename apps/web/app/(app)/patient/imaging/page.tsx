import type { Metadata } from "next";
import { CategoryPage } from "@/components/categories/category-page";
export const metadata: Metadata = { title: "Imaging · Medlyn" };

export const dynamic = "force-dynamic";
export default function Page() {
  return <CategoryPage category="imaging" />;
}
