import { Topbar } from "@/components/dashboard/topbar";
import { CreateAssignmentForm } from "@/components/assignments/create-form";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "New Assignment — VedaAI",
};

export default function NewAssignmentPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Topbar title="Create New" />
      <div className="flex flex-1 min-h-0 flex-col items-center overflow-y-auto px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <div className="w-full max-w-3xl pb-12 lg:pb-16">
          {/* Decorative header */}
          <div className="mb-6 flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10">
                <Sparkles className="size-5 text-brand" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Create Assignment
                </h1>
                <p className="text-sm text-muted-foreground">
                  Configure your paper and let the AI draft it. You can regenerate
                  anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Floating form card */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-border/10">
            <CreateAssignmentForm />
          </div>
        </div>
      </div>
    </div>
  );
}
