"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { flattenActions } from "@/store/flatten-actions";
import {
  RealtimeActionImpl,
  type RealtimeAction,
} from "@/store/realtime/actions";
import {
  initialState,
  type RealtimeState,
} from "@/store/realtime/state";

export type RealtimeStore = RealtimeState & RealtimeAction;

export const useRealtimeStore = create<RealtimeStore>()(
  devtools(
    (set, get, api) => ({
      ...initialState,
      ...flattenActions<RealtimeAction>([
        new RealtimeActionImpl(set, get, api),
      ]),
    }),
    { name: "realtime" },
  ),
);
