import { describe, expect, it } from "vitest";
import { reviewScope, sessionForPatient, validReviewSession } from "../review/session.ts";

describe("review session readiness", () => {
  it.each([null, undefined, 0, "", " ", "\t", " padded", "padded "])(
    "rejects an unready session %j",
    (value) => expect(validReviewSession(value)).toBe(false),
  );

  it("accepts existing non-UUID sessions", () => {
    expect(validReviewSession("existing-session")).toBe(true);
  });

  it("waits for both a valid session and patient", () => {
    expect(reviewScope("", "patient-a")).toBeNull();
    expect(reviewScope("session", null)).toBeNull();
    expect(reviewScope("session", "")).toBeNull();
    expect(reviewScope("session", "invalid/patient")).toBeNull();
    expect(reviewScope("session", "patient-a")).not.toBe(reviewScope("session", "patient-b"));
  });

  it("hides the previous patient's session on the first render of a switch", () => {
    const session = { patientId: "patient-a", id: "session-a" };
    expect(sessionForPatient(null, "patient-a")).toBe("");
    expect(sessionForPatient(session, "patient-a")).toBe("session-a");
    expect(sessionForPatient(session, "patient-b")).toBe("");
    expect(sessionForPatient({ ...session, id: " " }, "patient-a")).toBe("");
  });
});
