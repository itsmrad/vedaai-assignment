import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata = { title: "My Library — VedaAI" };

export default function Page() {
  return (
    <>
      <Topbar title="My Library" />
      <div className="flex flex-1 items-center justify-center p-6">
        <ComingSoon
          title="My Library is coming soon"
          description="Save question banks, templates, and rubrics for re-use across assignments."
        />
      </div>
    </>
  );
}
