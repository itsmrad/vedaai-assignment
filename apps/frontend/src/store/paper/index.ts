"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { flattenActions } from "@/store/flatten-actions";
import { PaperActionImpl, type PaperAction } from "@/store/paper/actions";
import { initialState, type PaperState } from "@/store/paper/state";

export type PaperStore = PaperState & PaperAction;

export const usePaperStore = create<PaperStore>()(
  devtools(
    (set, get, api) => ({
      ...initialState,
      ...flattenActions<PaperAction>([new PaperActionImpl(set, get, api)]),
    }),
    { name: "paper" },
  ),
);
