import { useEffect, useRef, useState } from "react";
import type { EliminatedDetail, SocketId } from "@sounds-fishy/shared";

interface EliminationDialogProps {
  detail: EliminatedDetail;
  players: SocketId[];
  currentPlayerId: string | null;
  onDismiss: () => void;
}

function getEliminatedLabel(socketId: SocketId, players: SocketId[], currentPlayerId: string | null): string {
  if (socketId === currentPlayerId) return "You";
  const index = players.indexOf(socketId);
  if (index !== -1) return `P${index + 1}`;
  return `Player ${socketId.slice(0, 4)}`;
}

export function EliminationDialog({ detail, players, currentPlayerId, onDismiss }: EliminationDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isRed = detail.role === "red";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));

    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 200);
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [detail, onDismiss]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  };

  const roleLabel = isRed ? "Red Fish" : "Blue Fish";
  const roleBadgeColor = isRed ? "bg-red-500" : "bg-blue-500";
  const labelColor = isRed ? "text-red-600" : "text-blue-600";

  return (
    <div
      className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 sm:p-4 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleDismiss}
    >
      <div
        className={`bg-surface w-full sm:max-w-sm min-h-screen sm:min-h-0 rounded-none sm:rounded-2xl shadow-xl transition-transform duration-200 flex flex-col ${
          isVisible ? "scale-100" : "scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-text">
            Player Eliminated
          </h2>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-background rounded"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="text-4xl">{isRed ? "🐟" : "🐠"}</div>
            <p className="text-lg font-bold text-text">
              {getEliminatedLabel(detail.socketId, players, currentPlayerId)}
            </p>
            <div className={`inline-block ${roleBadgeColor} text-white px-4 py-1.5 rounded-full text-sm font-medium`}>
              {roleLabel}
            </div>
          </div>

          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${labelColor}`}>
              {isRed ? "Their Hint (disguise)" : "Their Hint (answer)"}
            </p>
            <div className="bg-background rounded-xl p-4 max-h-32 overflow-y-auto">
              <p className="text-sm text-text font-medium">
                {detail.hint || <span className="italic text-text-light">No hint given</span>}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl font-semibold text-white transition-colors bg-text-light hover:bg-text"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
