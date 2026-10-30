const SMALL_TALK =
  /^(?:(?:hi|hello|hey|good (?:morning|afternoon|evening))(?: medlyn)?|(?:thank you|thanks)(?: (?:a lot|so much|medlyn))?|who are you|what (?:are you|can you do)|how (?:are you|can you help(?: me)?)|help(?: me)?|what is medlyn)[\s.!?]*$/i;

/** Only whole, non-clinical messages qualify; mixed clinical requests keep the evidence path. */
export function smallTalkReply(text: string): string | null {
  if (!SMALL_TALK.test(text.trim())) return null;
  return "Hello! I'm Medlyn, your source-linked clinical assistant. For this patient, I can show documented medications, compare measurements over time, or help investigate an open question.";
}
