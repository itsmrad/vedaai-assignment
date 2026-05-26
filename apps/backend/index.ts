import { start } from "~/server";

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("\n[startup error]", err instanceof Error ? err.message : err, "\n");
  process.exit(1);
});
