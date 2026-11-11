/** Agents SDK per-invocation providers. Classifiers and embeddings share only the request scope. */
import { OpenAIProvider, Runner, type RunConfig } from "@openai/agents";
import OpenAI from "openai";
import { isPublicDemo, requestApiKey } from "@/lib/security/request-key";

export function createRequestRunner(options: Partial<RunConfig> = {}): Runner {
  const apiKey = requestApiKey();
  // SECURITY: pin the official endpoint; do not inherit the owner's organization or project.
  const modelProvider = apiKey ? new OpenAIProvider({ openAIClient: visitorClient(apiKey) }) : undefined;
  return new Runner({ ...options, modelProvider, tracingDisabled: isPublicDemo() });
}

function visitorClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1", organization: null, project: null });
}

/** No shared client, key cache, or credentials in serializable agent context. */
export function createEmbeddingClient(): OpenAI {
  const apiKey = requestApiKey();
  return apiKey ? visitorClient(apiKey) : new OpenAI();
}
