import { SituationsWorkspace } from "@/components/cockpit/situations-workspace";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const chip = typeof values.chip === "string" ? values.chip : undefined;
  const text = typeof values.text === "string" ? values.text : undefined;
  return <SituationsWorkspace chip={chip} text={text} />;
}
