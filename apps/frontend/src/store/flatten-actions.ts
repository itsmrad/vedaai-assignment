// Flattens an array of class-based action instances into a single record.
// Methods stay bound to their original instance so private fields keep
// working. Lifted from the LobeHub Zustand skill.

export function flattenActions<T extends object>(instances: object[]): T {
  const out: Record<string, unknown> = {};
  for (const instance of instances) {
    const proto = Object.getPrototypeOf(instance);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === "constructor") continue;
      const value = (instance as Record<string, unknown>)[key];
      if (typeof value === "function") {
        out[key] = (value as (...args: unknown[]) => unknown).bind(instance);
      }
    }
    for (const key of Object.keys(instance)) {
      const value = (instance as Record<string, unknown>)[key];
      out[key] = typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(instance)
        : value;
    }
  }
  return out as T;
}
