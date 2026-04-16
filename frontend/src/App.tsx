import { Routes, Route } from "react-router-dom";
import { useAutoConnect } from "./hooks/useAutoConnect";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import RequestPage from "./pages/RequestPage";
import NewRequest from "./pages/NewRequest";

export default function App() {
  useAutoConnect();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/request/:id" element={<RequestPage />} />
        <Route path="/new" element={<NewRequest />} />
      </Routes>
    </Layout>
  );
}
