// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import TestPage from "./pages/TestPage";
// 필요한 경우 다른 페이지 import

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* 기본 경로로 접속하면 Dashboard로 리다이렉트 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* Dashboard 라우트 추가 */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/TestPage" element={<TestPage />} />
      {/* 추후 추가될 다른 페이지 예시 */}
      {/* <Route path="/settings" element={<Settings />} /> */}
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  </BrowserRouter>
);

export default App;
