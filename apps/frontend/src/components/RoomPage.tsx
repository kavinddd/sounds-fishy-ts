import { useState, useRef, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";
import { Button } from "./Button";
import { Card } from "./Input";
import { Bubbles } from "./Bubbles";
import type { Chat } from "@sounds-fishy/shared";

export function RoomPage() {
  const { playerId, chats, sendChat, leaveRoom } = useSocket();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const handleSend = async () => {
    if (message.trim()) {
      setIsSending(true);
      await sendChat(message.trim());
      setMessage("");
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
    <div className="min-h-screen flex flex-col">
      <Bubbles />
      
      <header className="bg-surface/80 backdrop-blur-sm shadow-md px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-accent">
              Room
            </h1>
          </div>
          <Button onClick={leaveRoom} variant="outline" className="px-4 py-2 text-sm">
            Leave
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 pb-24">
        <Card className="h-full min-h-[50vh] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {chats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-light">
                <p className="text-center">
                  No messages yet.<br />
                  Say hello!
                </p>
              </div>
            ) : (
              chats.map((chat: Chat, index: number) => {
                const isOwn = chat.from === playerId;
                return (
                  <div
                    key={index}
                    className={`px-4 py-2 max-w-[80%] rounded-2xl ${
                      isOwn
                        ? "bg-primary ml-auto rounded-tr-sm"
                        : "bg-secondary rounded-tl-sm"
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-sm text-text-light mb-1">
                        Player {chat.from.slice(0, 4)}
                      </p>
                    )}
                    <p className="text-text">{chat.message}</p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </Card>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-sm p-4">
        <div className="max-w-lg mx-auto flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-2xl border-2 border-primary/30 bg-white text-text placeholder:text-text-light focus:outline-none focus:border-primary transition-colors"
          />
          <Button onClick={handleSend} disabled={!message.trim() || isSending} className="px-6">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
