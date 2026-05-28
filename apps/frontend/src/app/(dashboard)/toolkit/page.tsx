import { Topbar } from "@/components/dashboard/topbar";
import { ComingSoon } from "@/components/dashboard/coming-soon";

export const metadata = { title: "AI Teacher's Toolkit — VedaAI" };

export default function Page() {
  return (
    <>
      <Topbar title="AI Teacher's Toolkit" />
      <div className="flex flex-1 items-center justify-center p-6">
        <ComingSoon
          title="AI Teacher's Toolkit"
          description="Lesson plans, rubric builders, and grading helpers — landing in the next release."
        />
      </div>
    </>
  );
}
