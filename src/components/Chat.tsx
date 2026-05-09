"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage, AGENTS, type AgentId } from "@/lib/api";
import Message from "@/components/Message";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<AgentId>("discovery");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedAgent = AGENTS.find((a) => a.id === agent)!;

  const loadingMessages: Record<string, string> = {
    discovery: "Searching patents and FDA databases...",
    search: "Analyzing query and fetching candidates...",
    biosimilar: "Running biosimilar screening pipeline...",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendMessage(trimmed, agent);
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `> **Error**\n>\n> ${error instanceof Error ? error.message : "Something went wrong"}.\n>\n> Please try again or select a different agent.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-3xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Ask a question about biotech data...</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Message key={i} role={msg.role} content={msg.content} />
          ))
        )}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              {loadingMessages[agent] || "Processing..."}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="agent-select" className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Agent:
          </label>
          <select
            id="agent-select"
            value={agent}
            onChange={(e) => setAgent(e.target.value as AgentId)}
            disabled={loading}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {selectedAgent.description}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
