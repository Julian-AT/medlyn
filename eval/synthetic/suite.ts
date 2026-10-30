export type Suite = "real" | "synthetic" | "all";
export function parseSuite(args: string[]): Suite {
  const flags = args.flatMap((arg, index) =>
    arg === "--suite"
      ? [args[index + 1]]
      : arg.startsWith("--suite=")
        ? [arg.slice("--suite=".length)]
        : [],
  );
  if (!flags.length) return "real";
  if (flags.length > 1 || !["real", "synthetic", "all"].includes(flags[0])) {
    throw new Error("Use --suite real|synthetic|all exactly once");
  }
  return flags[0] as Suite;
}
