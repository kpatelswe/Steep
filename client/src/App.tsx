import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import CheckEmail from "./pages/CheckEmail";
import Follow from "./pages/Follow";
import Home from "./pages/Home";
import Landing from "./pages/Landing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/follow" element={<Follow />} />
        <Route path="/home" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
