import { useEffect, useState } from "react";
import type { GameEndDetail, SocketId } from "@sounds-fishy/shared";

interface GameResultsDialogProps {
  detail: GameEndDetail;
  players: SocketId[];
  currentPlayerId: string | null;
  onDismiss: () => void;
}

interface ScoreboardEntry {
  rank: number;
  socketId: SocketId;
  score: number;
  isTied: boolean;
}

function getPlayerLabel(socketId: SocketId, players: SocketId[], currentPlayerId: string | null): string {
  if (socketId === currentPlayerId) return "You";
  const index = players.indexOf(socketId);
  if (index !== -1) return `P${index + 1}`;
  return `Player ${socketId.slice(0, 4)}`;
}

function buildScoreboard(finalScore: Record<string, number>, players: SocketId[]): ScoreboardEntry[] {
  const entries = players
    .map((socketId) => ({
      socketId,
      score: finalScore[socketId] ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  const result: ScoreboardEntry[] = [];
  let currentRank = 1;

  entries.forEach((entry, index) => {
    const isTied = index > 0 && entry.score === entries[index - 1].score;
    if (!isTied && index > 0) {
      currentRank = index + 1;
    }
    result.push({ ...entry, rank: currentRank, isTied });
  });

  return result;
}

function getPodiumLabel(index: number, playerCount: number): string {
  if (index < playerCount) {
    const labels = ["Winner", "1st Runner", "2nd Runner"];
    return labels[index];
  }
  return "";
}

function getPodiumEmoji(index: number): string {
  const emojis = ["🥇", "🥈", "🥉"];
  return emojis[index] ?? "";
}

function getPodiumColor(index: number): string {
  const colors = [
    "bg-yellow-500",
    "bg-gray-400",
    "bg-amber-700",
  ];
  return colors[index] ?? "bg-surface";
}

export function GameResultsDialog({ detail, players, currentPlayerId, onDismiss }: GameResultsDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  };

  const scoreboard = buildScoreboard(detail.finalScore, players);
  const podiumPlayers = [
    detail.winner,
    detail.firstRunner,
    detail.secondRunner,
  ];
  const uniquePodiumPlayers = [...new Set(podiumPlayers.filter((id) => players.includes(id)))];
  const podiumCount = uniquePodiumPlayers.length;

  const PodiumPosition = ({ socketId, index }: { socketId: SocketId | null; index: number }) => {
    const isEmpty = !socketId;

    return (
      <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
        <div className={`text-4xl ${isEmpty ? "opacity-30" : ""}`}>
          {getPodiumEmoji(index)}
        </div>
        <div className={`w-full rounded-xl p-3 text-center ${isEmpty ? "bg-surface border border-dashed border-text-light" : getPodiumColor(index)}`}>
          {isEmpty ? (
            <span className="text-text-light text-sm">—</span>
          ) : (
            <>
              <div className={`text-sm font-bold ${index === 0 ? "text-white" : index === 1 ? "text-gray-800" : "text-white"} truncate`}>
                {getPlayerLabel(socketId, players, currentPlayerId)}
              </div>
              <div className={`text-xs ${index === 0 ? "text-yellow-200" : index === 1 ? "text-gray-600" : "text-amber-200"}`}>
                {detail.finalScore[socketId]} pts
              </div>
            </>
          )}
        </div>
        <div className={`text-xs font-semibold uppercase tracking-wide ${isEmpty ? "text-text-light" : "text-text"}`}>
          {getPodiumLabel(index, podiumCount) || (isEmpty && index >= podiumCount ? "—" : "")}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 sm:p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`bg-gradient-to-b from-surface to-background w-full sm:max-w-md min-h-screen sm:min-h-0 rounded-none sm:rounded-2xl shadow-xl transition-transform duration-300 flex flex-col max-h-screen sm:max-h-[90vh] ${
          isVisible ? "scale-100" : "scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 text-center border-b border-border">
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-2xl font-bold text-text">Game Over!</h2>
          <p className="text-sm text-text-light mt-1">Here's how everyone scored</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-stretch gap-3 mb-6">
            <PodiumPosition socketId={detail.winner as SocketId} index={0} />
            <PodiumPosition socketId={detail.firstRunner as SocketId} index={1} />
            <PodiumPosition socketId={detail.secondRunner as SocketId} index={2} />
          </div>

          <div className="bg-surface rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-primary/10 border-b border-border">
              <p className="text-xs font-semibold text-text uppercase tracking-wide">Full Scoreboard</p>
            </div>
            <div className="divide-y divide-border">
              {scoreboard.map((entry) => {
                const isPodiumPlayer = entry.socketId === detail.winner || entry.socketId === detail.firstRunner || entry.socketId === detail.secondRunner;
                return (
                  <div
                    key={entry.socketId}
                    className={`flex items-center justify-between px-4 py-3 ${
                      isPodiumPlayer ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 text-center text-sm font-bold ${
                        entry.rank === 1 ? "text-yellow-500" : entry.rank === 2 ? "text-gray-400" : entry.rank === 3 ? "text-amber-700" : "text-text-light"
                      }`}>
                        {entry.rank}
                      </span>
                      <span className="text-sm text-text truncate">
                        {getPlayerLabel(entry.socketId, players, currentPlayerId)}
                        {isPodiumPlayer && (
                          <span className="ml-1">{getPodiumEmoji(podiumPlayers.indexOf(entry.socketId))}</span>
                        )}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-text">{entry.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl font-semibold text-white transition-colors bg-primary hover:bg-primary/80"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
