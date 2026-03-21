import { SocketProvider } from "./context/SocketContext";
import { useSocket } from "./hooks/useSocket";
import { HomePage } from "./components/HomePage";
import { RoomPage } from "./components/RoomPage";

function AppContent() {
  const { status } = useSocket();

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
