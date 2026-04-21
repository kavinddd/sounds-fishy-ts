import { SocketProvider } from "./context/SocketContext";
import { useSocket } from "./hooks/useSocket";
import { HomePage } from "./components/HomePage";
import { RoomPage } from "./components/RoomPage";
import { GameView } from "./components/GameView";

function AppContent() {
  const { status } = useSocket();

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
      <AppContent />
    </SocketProvider>
  );
}

export default App;
