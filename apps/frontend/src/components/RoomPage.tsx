import { useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { Button } from "./Button";
import { Bubbles } from "./Bubbles";
import { ChatPanel } from "./ChatPanel";

const DEV_MODE = import.meta.env.DEV;

export function RoomPage() {
  const {
    playerId,
    roomId,
    roomState,
    chats,
    isHost,
    sendChat,
    leaveRoom,
    startGame,
  } = useSocket();
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStartGame = async () => {
    await startGame();
  };

  const handleCopyCode = async () => {
    if (roomId) {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const players = roomState?.players ?? [];

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden">
      <Bubbles />

      <header className="flex-shrink-0 bg-surface/80 backdrop-blur-sm shadow-md px-3 py-2 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold text-accent">Room</h1>
            {roomId && (
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-xs text-text-light bg-background px-1.5 py-0.5 rounded hover:bg-background/80 transition-colors"
              >
                {copied ? (
                  <>
                    <svg
                      className="w-3 h-3 lg:w-5 lg:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-xs lg:text-base">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3 lg:w-5 lg:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-xs lg:text-sm">{roomId}</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPlayers(true)}
              className="flex items-center gap-1 px-2 py-1.5 text-sm bg-background rounded hover:bg-background/80 transition-colors"
            >
              <svg
                className="w-4 h-4 lg:w-5 lg:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-xs lg:text-sm">{players.length}</span>
            </button>
            <Button
              onClick={leaveRoom}
              variant="outline"
              className="px-3 py-1.5 text-sm"
            >
              Leave
            </Button>
          </div>
        </div>
      </header>

      <aside className="hidden lg:flex lg:flex-col w-72 bg-surface/50 border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-xl font-bold text-accent">Room</h1>
            <Button
              onClick={leaveRoom}
              variant="outline"
              className="px-3 py-1.5 text-sm"
            >
              Leave
            </Button>
          </div>
          {roomId && (
            <button
              onClick={handleCopyCode}
              className="w-full bg-background rounded-lg p-3 hover:bg-background/80 transition-colors text-left"
            >
              <p className="text-xs lg:text-sm text-text-light mb-1">
                Room Code
              </p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-mono font-bold text-text">
                  {roomId}
                </p>
                {copied ? (
                  <span className="text-xs lg:text-sm text-green-600">
                    Copied!
                  </span>
                ) : (
                  <svg
                    className="w-4 h-4 lg:w-5 lg:h-5 text-text-light"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
            </button>
          )}
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-text">
              Players ({players.length})
            </h2>
            {isHost && (
              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                You are host
              </span>
            )}
          </div>
          <ul className="space-y-2">
            {players.map((player) => {
              const isPlayerHost = roomState?.hostId === player;
              const isCurrentPlayer = player === playerId;
              return (
                <li
                  key={player}
                  className="flex items-center justify-between px-3 py-2.5 bg-background rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm lg:text-base">
                      {player.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm lg:text-base text-text">
                      Player {player.slice(0, 4)}
                      {isCurrentPlayer && (
                        <span className="text-text-light"> (you)</span>
                      )}
                    </span>
                  </div>
                  {isPlayerHost && (
                    <span className="text-xs lg:text-sm bg-primary/20 text-primary px-2 py-0.5 rounded">
                      Host
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {isHost && (
            <div className="mt-6 pt-4 border-t border-border">
              <Button onClick={handleStartGame} className="w-full">
                Start Game
              </Button>
            </div>
          )}
        </div>

        {DEV_MODE && (
          <div className="p-4 border-t border-border">
            <button
              onClick={() => setShowDevInfo(!showDevInfo)}
              className="text-xs text-text-light hover:text-text underline mb-2"
            >
              {showDevInfo ? "Hide" : "Show"} Room State (DEV)
            </button>
            {showDevInfo && roomState && (
              <pre className="bg-background p-2 rounded-lg text-xs text-text overflow-x-auto max-h-40">
                {JSON.stringify(roomState, null, 2)}
              </pre>
            )}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col w-full min-h-0 lg:h-screen lg:max-h-screen">
        {DEV_MODE && !showPlayers && (
          <div className="p-3 lg:p-2 flex-shrink-0">
            <button
              onClick={() => setShowDevInfo(!showDevInfo)}
              className="text-xs text-text-light hover:text-text underline"
            >
              {showDevInfo ? "Hide" : "Show"} Room State (DEV)
            </button>
            {showDevInfo && roomState && (
              <pre className="bg-background p-2 rounded-lg text-xs text-text overflow-x-auto mt-1">
                {JSON.stringify(roomState, null, 2)}
              </pre>
            )}
          </div>
        )}

        <ChatPanel
          messages={chats}
          currentPlayerId={playerId}
          onSend={sendChat}
        />
      </main>

      {showPlayers && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center lg:hidden"
          onClick={() => setShowPlayers(false)}
        >
          <div
            className="bg-surface w-full max-w-md max-h-[70vh] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-text">
                  Players ({players.length})
                </h2>
                {isHost && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                    Host
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowPlayers(false)}
                className="p-1 hover:bg-background rounded"
              >
                <svg
                  className="w-5 h-5 lg:w-6 lg:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <ul className="space-y-2">
                {players.map((player) => {
                  const isPlayerHost = roomState?.hostId === player;
                  const isCurrentPlayer = player === playerId;
                  return (
                    <li
                      key={player}
                      className="flex items-center justify-between px-3 py-2 bg-background rounded-lg"
                    >
                      <span className="text-text">
                        Player {player.slice(0, 4)}
                        {isCurrentPlayer && " (you)"}
                      </span>
                      {isPlayerHost && !isHost && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          Host
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {isHost && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Button onClick={handleStartGame} className="w-full">
                    Start Game
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
