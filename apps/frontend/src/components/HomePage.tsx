import { useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { Button } from "./Button";
import { Input, Card } from "./Input";
import { Bubbles } from "./Bubbles";

export function HomePage() {
  const { hostRoom, joinRoom, status, error } = useSocket();
  const [joinRoomId, setJoinRoomId] = useState("");

  const handleJoin = () => {
    if (joinRoomId.trim()) {
      joinRoom(joinRoomId.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Bubbles />
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="font-display text-5xl font-bold text-accent animate-bubble">
            Sounds Fishy
          </h1>
          <p className="text-text-light text-lg">
            A game of lies and laughter
          </p>
        </div>

        <Card className="space-y-6">
          {error && (
            <div className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={hostRoom}
            disabled={status === "connecting"}
            className="w-full"
          >
            {status === "connecting" ? "Creating..." : "Host a Room"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-primary/30" />
            <span className="text-text-light text-sm">or</span>
            <div className="flex-1 h-px bg-primary/30" />
          </div>

          <div className="space-y-3">
            <Input
              value={joinRoomId}
              onChange={setJoinRoomId}
              placeholder="Enter room code"
            />
            <Button
              onClick={handleJoin}
              variant="secondary"
              disabled={status === "connecting" || !joinRoomId.trim()}
              className="w-full"
            >
              Join Room
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
