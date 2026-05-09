const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type AgentId = "discovery" | "search" | "biosimilar";

export interface AgentOption {
  id: AgentId;
  label: string;
  description: string;
}

export const AGENTS: AgentOption[] = [
  {
    id: "discovery",
    label: "Discovery",
    description: "Search patent and FDA adverse event databases by drug name",
  },
  {
    id: "search",
    label: "Drug Search",
    description:
      "Find drug candidates by target, indication, or modality across multiple databases",
  },
  {
    id: "biosimilar",
    label: "Biosimilar Screening",
    description: "Screen biologics (mAbs, fusion proteins, insulins, ADCs, and more) for biosimilar development opportunity",
  },
];

export async function sendMessage(
  message: string,
  agent: AgentId = "discovery",
): Promise<string> {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, agent }),
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.response;
}
