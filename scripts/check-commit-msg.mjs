import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("commit-msg: expected the commit message file path");
  process.exit(1);
}
const firstLine = readFileSync(file, "utf8").split(/\r?\n/, 1)[0];
const conventional =
  /^(feat|fix|refactor|chore|docs|test|perf|build|ci|style|revert)(\([a-z0-9-]+\))?!?: .{1,100}$/;
if (!conventional.test(firstLine) && !/^(Merge .+|Revert ".+")$/.test(firstLine)) {
  console.error("commit-msg: use type(scope): summary (1–100 chars), e.g. feat(lens): add filters");
  process.exit(1);
}
