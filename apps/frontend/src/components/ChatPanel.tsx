import { useState, useRef, useEffect } from "react";
import type { Chat } from "@sounds-fishy/shared";
import { Button } from "./Button";

interface ChatPanelProps {
  messages: Chat[];
  currentPlayerId: string | null;
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatPanel({
  messages,
  currentPlayerId,
  onSend,
  disabled = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() && !disabled) {
      setIsSending(true);
      await onSend(input.trim());
      setInput("");
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-3 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-light">
            <p className="text-center text-sm">
              No messages yet.
              <br />
              Say hello!
            </p>
          </div>
        ) : (
          messages.map((chat, index) => {
            const isOwn = chat.from === currentPlayerId;
            return (
              <div
                key={index}
                className={`px-3 py-1.5 max-w-[85%] rounded-2xl ${
                  isOwn
                    ? "bg-primary ml-auto rounded-tr-sm"
                    : "bg-secondary rounded-tl-sm"
                }`}
              >
                {!isOwn && (
                  <p className="text-xs text-text-light mb-0.5">
                    Player {chat.from.slice(0, 4)}
                  </p>
                )}
                <p className="text-sm text-text">{chat.message}</p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-3 border-t border-border bg-surface/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Chat disabled" : "Type..."}
            disabled={disabled}
            className="flex-1 px-3 py-2 rounded-xl border-2 border-primary/30 bg-white text-text placeholder:text-text-light focus:outline-none focus:border-primary transition-colors text-base disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending || disabled}
            className="px-4"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
