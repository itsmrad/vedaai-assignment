// Generic Zustand setter shape used across slices.
// Per the LobeHub Zustand skill, slices use class-based actions and a
// shared StoreSetter<T> type for the `set` parameter.

import type { StateCreator } from "zustand";

export type StoreSetter<T> = Parameters<StateCreator<T, [], []>>[0];
