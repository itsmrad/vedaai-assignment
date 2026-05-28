import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata = { title: "Settings — VedaAI" };

export default function Page() {
  return (
    <>
      <Topbar title="Settings" />
      <div className="flex flex-1 items-center justify-center p-6">
        <ComingSoon
          title="Settings"
          description="Profile, billing, and integration preferences will live here."
        />
      </div>
    </>
  );
}
