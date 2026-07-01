import { BrowserRouter } from "react-router-dom";
import { AppShell } from "./components/AppRoutes";
import "./styles.css";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
