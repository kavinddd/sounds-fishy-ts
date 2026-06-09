import { useEffect, useState } from "react";
import { SocketProvider } from "./context/SocketContext";
import { useSocket } from "./hooks/useSocket";
import { toast, Toaster } from "sonner";
import { HomePage } from "./components/HomePage";
import { RoomPage } from "./components/RoomPage";
import { GameView } from "./components/GameView";
import { GameResultsDialog } from "./components/GameResultsDialog";

function AppContent() {
  const { status, error, gameEndDetail, playerId, roomState } = useSocket();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (gameEndDetail) {
      setDismissed(false);
    }
  }, [gameEndDetail]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleDismissResults = () => {
    setDismissed(true);
  };

  if (gameEndDetail && !dismissed) {
    return (
      <>
        {status === "in-room" && <RoomPage />}
        <GameResultsDialog
          detail={gameEndDetail}
          players={roomState?.players ?? []}
          currentPlayerId={playerId}
          onDismiss={handleDismissResults}
        />
      </>
    );
  }

  if (status === "in-game") {
    return <GameView />;
  }

  if (status === "in-room") {
    return <RoomPage />;
  }

  return <HomePage />;
}

function App() {
  return (
    <SocketProvider>
      <Toaster />
      <AppContent />
    </SocketProvider>
  );
}

export default App;
