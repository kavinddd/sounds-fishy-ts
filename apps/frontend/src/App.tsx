import type { ApiResponse, User } from "@sounds-fishy/shared";

function App() {
  const response: ApiResponse<User> = {
    data: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
    },
    message: "Hello from shared types!",
  };

  return (
    <div>
      <h1>Sounds Fishy</h1>
      <pre>{JSON.stringify(response, null, 2)}</pre>
    </div>
  );
}

export default App;

