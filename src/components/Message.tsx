"use client";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function Message({ role, content }: MessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
        }`}
      >
        <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
      </div>
    </div>
  );
}
