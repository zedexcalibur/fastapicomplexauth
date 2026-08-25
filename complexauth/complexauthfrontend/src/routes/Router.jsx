import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Register from "../pages/Register";
import Settings from "../pages/Settings";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import AuthRedirect from "../components/AuthRedirect";
import PublicRoute from "../auth/PublicRoute";
import ProtectedRoute from "../auth/ProtectedRoute";
import AppLayout from "../components/AppLayout";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>

        {/* If going to /, go to login or dashboard accordingly.*/}
        <Route path="/" 
          element={
            <AuthRedirect />
          }
        />
        {/* If going to /login, check whether loading and already logged in. */}
        <Route
          path="/login"
          element={
              <PublicRoute>
                  <Login />
              </PublicRoute>
          }
        />
        {/* Normal routes. */}
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected layout routes - checks if loading and logged in. */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}