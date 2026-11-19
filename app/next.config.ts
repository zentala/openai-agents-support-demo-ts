import type { NextConfig } from "next";

/**
 * Next.js config. The Agents SDK and the openai client run only on the server
 * (route handlers), so we keep them out of the browser bundle.
 */
const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@openai/agents", "openai"],
  // Next 16 blocks dev resources (hot reload, client JS) for hosts other than
  // "localhost". We open the app via 127.0.0.1, so allow it explicitly.
  // Extra hosts (e.g. a local reverse-proxy domain) come from DEV_ORIGINS,
  // a comma-separated list, so no machine-specific name is committed here.
  allowedDevOrigins: ["127.0.0.1", ...(process.env.DEV_ORIGINS?.split(",").filter(Boolean) ?? [])],
  // Do not generate an AGENTS.md next to our own docs.
  agentRules: false,
};

export default config;
