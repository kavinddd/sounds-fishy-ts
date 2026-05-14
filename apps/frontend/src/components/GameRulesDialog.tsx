interface GameRulesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameRulesDialog({ isOpen, onClose }: GameRulesDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="text-lg font-bold text-text">How to Play</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          <section>
            <h3 className="font-semibold text-text mb-2">Roles</h3>
            <ul className="space-y-2 text-sm text-text-light">
              <li>
                <span className="font-medium text-text">🎯 Master:</span> Knows the
                secret word, runs the game
              </li>
              <li>
                <span className="font-medium text-text">🐟 Blue Fish:</span> Knows
                the word, must help master (say the answer)
              </li>
              <li>
                <span className="font-medium text-text">🐠 Red Fish:</span>
                Doesn&apos;t know the word, tries to guess
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-text mb-2">Scoring</h3>
            <ul className="space-y-2 text-sm text-text-light">
              <li>
                <span className="font-medium text-text">Master wins</span> (blue
                eliminated): Master gets +1 per eliminated
              </li>
              <li>
                <span className="font-medium text-text">Blue wins</span> (all red
                eliminated): Blue gets +2
              </li>
              <li>
                <span className="font-medium text-text">All red survive:</span>{" "}
                Each surviving red gets +2
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-text mb-2">Game End</h3>
            <p className="text-sm text-text-light">
              The game ends when every player has been Master once. Everyone will
              be Master exactly once.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}