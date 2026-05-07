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
    description: "Search patents and FDA adverse-event data",
  },
  {
    id: "search",
    label: "Drug Search",
    description:
      "Multi-source drug discovery with ranked scoring across trials, patents, and literature",
  },
  {
    id: "biosimilar",
    label: "Biosimilar Screening",
    description: "Screen monoclonal antibodies for biosimilar development opportunity",
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
