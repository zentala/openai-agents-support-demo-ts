/** The human work count reads as a sentence, including the singular case. */
export const humanQueueLabel = (count: number): string => `${count} ${count === 1 ? "needs" : "need"} a human`;
