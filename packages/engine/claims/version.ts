const fallback = process.env.MODEL_FAST_FALLBACK ? `|${process.env.MODEL_FAST_FALLBACK}` : "";

export const VALIDATOR_VERSION = `claims-1:semantic-1:code-2:model=${process.env.MODEL_FAST ?? "unset"}${fallback}`;
