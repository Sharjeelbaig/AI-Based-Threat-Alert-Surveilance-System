import { CameraFeed } from "./components/CameraFeed";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>🔒 Intruder Alert System</h1>
        <p>Desktop Security Monitor</p>
      </header>
      <main className="app-main">
        <CameraFeed />
      </main>
    </div>
  );
}

export default App;
