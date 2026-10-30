import { type ValidationContext, validateClaims } from "@medlyn/engine/claims/validate";
import type { Claim } from "@medlyn/engine/contracts";

// An isolated process keeps the shared validator's semantic cache out of an independent audit.
process.env.DATABASE_URL = "";
let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;
const { claims, context } = JSON.parse(input) as { claims: Claim[]; context: ValidationContext };
const checked = await validateClaims(claims, context);
process.stdout.write(
  JSON.stringify(checked.map((claim) => ({ id: claim.id, validation: claim.validation }))),
);
