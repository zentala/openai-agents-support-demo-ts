/**
 * The people who may use the consultant console. A fixed list is enough for a demo.
 *
 * SECURITY (demo limit): the console trusts the name the browser sends. In production the consultant
 * is the identity from the login session (SSO), never a value the client picks.
 */
export const CONSULTANTS = ["Marta Nowak", "Tomasz Berg", "Eva Lindqvist"] as const;

export type ConsultantName = (typeof CONSULTANTS)[number];

export const isConsultant = (name: string): name is ConsultantName => (CONSULTANTS as readonly string[]).includes(name);
