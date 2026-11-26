/** How the visitor sees a missing OpenAI key: one error type, one sentence, one click target. */

export const KEY_REQUIRED_TYPE = "VisitorKeyRequired";

/** True for a chat sentence or event text built from the VisitorKeyRequired error. */
export const isKeyRequiredText = (text: string): boolean => text.includes(KEY_REQUIRED_TYPE);
