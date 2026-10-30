import { describe, expect, it } from "vitest";
import { smallTalkResponse } from "./small-talk";

describe("tool-free chat replies", () => {
  it.each(["hi", "thanks", "what can you do?"])(
    "streams a normal answer for %s",
    async (question) => {
      const response = smallTalkResponse(question);
      expect(response?.status).toBe(200);
      const body = await response?.text();
      expect(body).toContain('"type":"text-delta"');
      expect(body).toContain('"type":"finish"');
      expect(body).not.toContain("data-validated");
      expect(body).not.toContain("data-evidence-context");
    },
  );

  it.each(["hi, show this patient's medications", "thanks, is kidney function documented?"])(
    "keeps mixed patient requests on the validation path: %s",
    (question) => {
      expect(smallTalkResponse(question)).toBeNull();
    },
  );
});
