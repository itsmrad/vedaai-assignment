import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileTabbar } from "@/components/dashboard/mobile-tabbar";
import { RealtimeProvider } from "@/components/providers/realtime-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RealtimeProvider>
      <div className="flex h-svh w-full overflow-hidden bg-surface p-0 lg:gap-3 lg:p-3">
        <Sidebar />
        <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden rounded-none bg-card pb-20 lg:rounded-2xl lg:pb-0 lg:shadow-sm lg:ring-1 lg:ring-border/50">
          {children}
        </div>
        <MobileTabbar />
      </div>
    </RealtimeProvider>
  );
}
