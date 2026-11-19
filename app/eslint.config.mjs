import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Flat config: Next.js recommended rules + TypeScript rules (includes no-explicit-any).
const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", ".cache/**"] },
];

export default config;
