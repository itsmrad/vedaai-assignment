import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata = { title: "My Groups — VedaAI" };

export default function Page() {
  return (
    <>
      <Topbar title="My Groups" />
      <div className="flex flex-1 items-center justify-center p-6">
        <ComingSoon
          title="My Groups is coming soon"
          description="Organise your students into classes and sections, then assign papers in bulk."
        />
      </div>
    </>
  );
}
