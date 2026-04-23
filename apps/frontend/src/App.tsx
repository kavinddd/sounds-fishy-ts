import { useEffect } from "react";
import { SocketProvider } from "./context/SocketContext";
import { useSocket } from "./hooks/useSocket";
import { toast, Toaster } from "sonner";
import { HomePage } from "./components/HomePage";
import { RoomPage } from "./components/RoomPage";
import { GameView } from "./components/GameView";

function AppContent() {
  const { status, error } = useSocket();

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

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
