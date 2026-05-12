import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Start from "@/pages/Start";
import Facilitator from "@/pages/Facilitator";
import Group from "@/pages/Group";
import Participant from "@/pages/Participant";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/f/:id" element={<Facilitator />} />
        <Route path="/g/:id" element={<Group />} />
        <Route path="/p/:id" element={<Participant />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
