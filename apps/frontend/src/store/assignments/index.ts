"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { flattenActions } from "@/store/flatten-actions";
import {
  AssignmentsActionImpl,
  type AssignmentsAction,
} from "@/store/assignments/actions";
import {
  initialState,
  type AssignmentsState,
} from "@/store/assignments/state";

export type AssignmentsStore = AssignmentsState & AssignmentsAction;

export const useAssignmentsStore = create<AssignmentsStore>()(
  devtools(
    (set, get, api) => ({
      ...initialState,
      ...flattenActions<AssignmentsAction>([
        new AssignmentsActionImpl(set, get, api),
      ]),
    }),
    { name: "assignments" },
  ),
);
