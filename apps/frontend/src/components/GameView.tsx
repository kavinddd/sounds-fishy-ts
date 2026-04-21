import { useState, useMemo, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";
import { Button } from "./Button";
import { Bubbles } from "./Bubbles";
import { ChatPanel } from "./ChatPanel";
import type { Role, HintHistory } from "@sounds-fishy/shared";

const DEV_MODE = import.meta.env.DEV;

function getRoleLabel(role: Role): string {
  switch (role) {
    case "master":
      return "Master";
    case "red":
      return "Red Fish";
    case "blue":
      return "Blue Fish";
  }
}

function getRoleColor(role: Role): string {
  switch (role) {
    case "master":
      return "bg-purple-500";
    case "red":
      return "bg-red-500";
    case "blue":
      return "bg-blue-500";
  }
}

function getRoleIcon(role: Role): string {
  switch (role) {
    case "master":
      return "👑";
    case "red":
      return "🐟";
    case "blue":
      return "🐠";
  }
}

export function GameView() {
  const {
    playerId,
    roomState,
    gameState,
    chats,
    selectHinter,
    giveHint,
    eliminate,
    leaveRoom,
    sendChat,
  } = useSocket();

  const [hintInput, setHintInput] = useState("");
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const handleOpenChat = () => {
    setShowChat(true);
    setUnreadChatCount(0);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  useEffect(() => {
    if (!showChat && chats.length > 0) {
      setUnreadChatCount((prev) => prev + 1);
    }
  }, [chats.length, showChat]);

  const players = roomState?.players ?? [];
  const eliminated = gameState?.eliminated ?? [];
  const activePlayers = players.filter((p) => !eliminated.includes(p));

  const myRole = useMemo(() => {
    if (!gameState || !playerId) return null;
    return (gameState as { role: Role }).role ?? null;
  }, [gameState, playerId]);

  const answer = useMemo(() => {
    if (!gameState) return null;
    return (gameState as { answer?: string }).answer ?? null;
  }, [gameState]);

  const isMyTurn =
    gameState?.status === "select-hinter" && myRole === "master";

  const isMyHintTurn =
    gameState?.status === "hint" && gameState.currentHinter === playerId;

  const isMyEliminateTurn =
    gameState?.status === "eliminate" && myRole === "master";

  const availableHinters = activePlayers.filter(
    (p) =>
      p !== gameState?.currentMaster &&
      !gameState?.hints.some((h) => h.hinter === p),
  );

  const handleSelectHinter = async (socketId: string) => {
    await selectHinter(socketId);
  };

  const handleGiveHint = async () => {
    if (hintInput.trim()) {
      await giveHint(hintInput.trim());
      setHintInput("");
    }
  };

  const handleEliminate = async (socketId: string) => {
    await eliminate(socketId);
  };

  const getPhaseTitle = (): string => {
    if (!gameState) return "";
    switch (gameState.status) {
      case "select-hinter":
        return myRole === "master"
          ? "Select a player to give a hint"
          : "Selecting hint giver...";
      case "hint":
        return gameState.currentHinter === playerId
          ? "Give a hint"
          : "Giving hint...";
      case "eliminate":
        return myRole === "master"
          ? "Select a player to eliminate"
          : "Master is eliminating...";
      default:
        return "";
    }
  };

  const getHintInstructions = (): string => {
    if (!gameState || !answer) return "";
    if (myRole === "red") {
      return `Don't say "${answer}"`;
    }
    if (myRole === "blue") {
      return `Say "${answer}"`;
    }
    return "";
  };

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row overflow-hidden">
      <Bubbles />

      <aside className="hidden lg:flex lg:flex-col w-72 bg-surface/50 border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-xl font-bold text-accent">
              Game
            </h1>
            <Button
              onClick={leaveRoom}
              variant="outline"
              className="px-3 py-1.5 text-sm"
            >
              Leave
            </Button>
          </div>
          <div className="bg-background rounded-lg p-3">
            <p className="text-xs text-text-light mb-1">Round</p>
            <p className="text-2xl font-bold text-text">{gameState?.round}</p>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {myRole && (
            <div className="mb-4">
              <p className="text-xs text-text-light mb-1">Your Role</p>
              <div
                className={`${getRoleColor(myRole)} text-white px-3 py-2 rounded-lg text-center font-semibold`}
              >
                {getRoleLabel(myRole)}
              </div>
              {myRole === "master" && (
                <p className="text-xs text-text-light mt-2">
                  You ask questions and eliminate fish
                </p>
              )}
              {(myRole === "red" || myRole === "blue") && (
                <p className="text-xs text-text-light mt-2">
                  {getHintInstructions()}
                </p>
              )}
            </div>
          )}

          <div className="mb-4">
            <p className="text-xs text-text-light mb-2">Question</p>
            <div className="bg-background rounded-lg p-3">
              <p className="text-sm text-text font-medium">
                {gameState?.question}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-text-light mb-2">
              Scores
            </p>
            <div className="space-y-2">
              {players.map((player) => {
                const score = gameState?.currentScore?.[player] ?? 0;
                const isEliminated = eliminated.includes(player);
                const role = gameState?.roles?.[player];
                return (
                  <div
                    key={player}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      isEliminated
                        ? "bg-red-500/20 opacity-50"
                        : "bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {role && <span className="text-sm">{getRoleIcon(role)}</span>}
                      <span
                        className={`text-sm ${
                          isEliminated ? "line-through text-text-light" : "text-text"
                        }`}
                      >
                        {player === playerId ? "You" : `P${players.indexOf(player) + 1}`}
                      </span>
                      {player === gameState?.currentMaster && <span className="text-yellow-500">👑</span>}
                    </div>
                    <span className={`font-bold ${score > 0 ? "text-green-500" : "text-text"}`}>
                      {score}
                    </span>
                  </div>
                );
              })}
            </div>
            {activePlayers.length < players.length && (
              <p className="text-xs text-red-400 mt-2 text-center">
                {players.length - activePlayers.length} eliminated
              </p>
            )}
          </div>

          {gameState?.hints && gameState.hints.length > 0 && (
            <div>
              <p className="text-xs text-text-light mb-2">Hints</p>
              <div className="space-y-2">
                {gameState.hints.map((hint: HintHistory, index: number) => (
                  <div key={index} className="bg-background rounded-lg p-2">
                    <p className="text-sm text-text font-medium">
                      "{hint.hint}"
                    </p>
                    <p className="text-xs text-text-light">
                      - Player {hint.hinter.slice(0, 4)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 border-t border-border">
            <ChatPanel
              messages={chats}
              currentPlayerId={playerId}
              onSend={sendChat}
            />
          </div>
        </div>

        {DEV_MODE && (
          <div className="p-4 border-t border-border">
            <button
              onClick={() => setShowDevInfo(!showDevInfo)}
              className="text-xs text-text-light hover:text-text underline mb-2"
            >
              {showDevInfo ? "Hide" : "Show"} Game State (DEV)
            </button>
            {showDevInfo && gameState && (
              <pre className="bg-background p-2 rounded-lg text-xs text-text overflow-x-auto max-h-40">
                {JSON.stringify(gameState, null, 2)}
              </pre>
            )}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col w-full min-h-0 lg:h-screen lg:max-h-screen">
        {DEV_MODE && (
          <div className="p-3 lg:p-2 flex-shrink-0">
            <button
              onClick={() => setShowDevInfo(!showDevInfo)}
              className="text-xs text-text-light hover:text-text underline"
            >
              {showDevInfo ? "Hide" : "Show"} Game State (DEV)
            </button>
            {showDevInfo && gameState && (
              <pre className="bg-background p-2 rounded-lg text-xs text-text overflow-x-auto mt-1">
                {JSON.stringify(gameState, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="inline-block bg-surface rounded-xl px-4 py-2 shadow-md mb-4">
                <p className="text-xs text-text-light uppercase tracking-wide">
                  Round {gameState?.round}
                </p>
                <p className="text-lg font-bold text-text">{getPhaseTitle()}</p>
              </div>
            </div>

            {gameState?.hints && gameState.hints.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs text-yellow-600 font-semibold mb-2 uppercase">
                  💡 Hints Shared
                </p>
                <div className="space-y-2">
                  {gameState.hints.map((hint, index) => (
                    <div key={index} className="bg-white rounded-lg p-2">
                      <span className="text-yellow-600">"</span>
                      <span className="text-text font-medium">{hint.hint}</span>
                      <span className="text-yellow-600">"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gameState?.status === "select-hinter" && isMyTurn && (
              <div className="space-y-3">
                <p className="text-sm text-text-light text-center">
                  Choose who should give a hint
                </p>
                <div className="space-y-2">
                  {availableHinters.map((player) => (
                    <button
                      key={player}
                      onClick={() => handleSelectHinter(player)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-background rounded-xl hover:bg-primary/10 transition-colors border border-border hover:border-primary"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {player.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-text font-medium">
                          Player {player.slice(0, 4)}
                          {player === playerId && " (you)"}
                        </span>
                      </div>
                      <svg
                        className="w-5 h-5 text-text-light"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameState?.status === "select-hinter" && !isMyTurn && (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                  <p className="text-text font-medium">
                    Waiting for the master to choose...
                  </p>
                </div>
              </div>
            )}

            {gameState?.status === "hint" && isMyHintTurn && (
              <div className="space-y-4">
                <p className="text-sm text-text-light text-center">
                  {getHintInstructions()}
                </p>
                <input
                  type="text"
                  value={hintInput}
                  onChange={(e) => setHintInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hintInput.trim()) {
                      handleGiveHint();
                    }
                  }}
                  placeholder="Type your hint..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-primary/30 bg-white text-text placeholder:text-text-light focus:outline-none focus:border-primary transition-colors text-base"
                  autoFocus
                />
                <Button
                  onClick={handleGiveHint}
                  disabled={!hintInput.trim()}
                  className="w-full"
                >
                  Submit Hint
                </Button>
              </div>
            )}

            {gameState?.status === "hint" && !isMyHintTurn && (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                  </div>
                  <p className="text-text font-medium">
                    {gameState.currentHinter
                      ? `Player ${gameState.currentHinter.slice(0, 4)} is giving a hint...`
                      : "Waiting for hint..."}
                  </p>
                </div>
              </div>
            )}

            {gameState?.status === "eliminate" && isMyEliminateTurn && (
              <div className="space-y-3">
                <p className="text-sm text-text-light text-center">
                  Who is the impostor?
                </p>
                <div className="space-y-2">
                  {activePlayers
                    .filter((p) => p !== playerId)
                    .map((player) => (
                      <button
                        key={player}
                        onClick={() => handleEliminate(player)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-background rounded-xl hover:bg-red-500/20 transition-colors border border-border hover:border-red-500"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                            {player.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-text font-medium">
                            Player {player.slice(0, 4)}
                          </span>
                        </div>
                        <svg
                          className="w-5 h-5 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {gameState?.status === "eliminate" && !isMyEliminateTurn && (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>
                  <p className="text-text font-medium">
                    Master is choosing who to eliminate...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:hidden p-4 border-t border-border bg-surface/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {myRole && (
                <div
                  className={`${getRoleColor(myRole)} text-white px-3 py-1.5 rounded-full text-sm font-medium`}
                >
                  {getRoleLabel(myRole)}
                </div>
              )}
              <div className="text-sm text-text-light">
                Round {gameState?.round}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenChat}
                className="flex items-center gap-1 text-sm font-medium relative"
              >
                <span className={unreadChatCount > 0 ? "text-red-500" : "text-primary"}>💬</span>
                <span className={unreadChatCount > 0 ? "text-red-500" : "text-primary"}>Chat</span>
                {unreadChatCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowScoreboard(true)}
                className="flex items-center gap-1 text-sm text-primary font-medium"
              >
                <span>🏆</span>
                <span>Scores</span>
              </button>
            </div>
          </div>
          {myRole && (myRole === "red" || myRole === "blue") && (
            <p className="text-xs text-text-light">
              {getHintInstructions()}
            </p>
          )}
        </div>

        {showScoreboard && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 lg:hidden"
            onClick={() => setShowScoreboard(false)}
          >
            <div
              className="bg-surface w-full max-w-sm rounded-2xl shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text">🏆 Scores</h2>
                <button
                  onClick={() => setShowScoreboard(false)}
                  className="p-1 hover:bg-background rounded"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {players.map((player, index) => {
                  const score = gameState?.currentScore?.[player] ?? 0;
                  const isEliminated = eliminated.includes(player);
                  const role = gameState?.roles?.[player];
                  return (
                    <div
                      key={player}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                        isEliminated ? "bg-red-500/20 opacity-50" : "bg-background"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {role && <span>{getRoleIcon(role)}</span>}
                        <span className={isEliminated ? "line-through text-text-light" : "text-text"}>
                          {player === playerId ? "You" : `P${index + 1}`}
                        </span>
                        {player === gameState?.currentMaster && <span>👑</span>}
                      </div>
                      <span className={`font-bold ${score > 0 ? "text-green-500" : "text-text"}`}>
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
              {eliminated.length > 0 && (
                <p className="text-xs text-red-400 mt-4 text-center">
                  {eliminated.length} player(s) eliminated
                </p>
              )}
            </div>
          </div>
        )}

        {showChat && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 lg:hidden"
            onClick={handleCloseChat}
          >
            <div
              className="bg-surface w-full max-w-sm h-[80vh] rounded-2xl shadow-xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-bold text-text">💬 Chat</h2>
                <button
                  onClick={handleCloseChat}
                  className="p-1 hover:bg-background rounded"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel
                  messages={chats}
                  currentPlayerId={playerId}
                  onSend={sendChat}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
