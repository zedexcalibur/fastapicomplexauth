import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/useAuth";
import Router from "./routes/Router";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

function AppContent() {
  const { loading } = useAuth(); // The auth context object has "loading" among other things.

  if (loading) {
    return (
      <div style={styles.loader}>
        Checking session...
      </div>
    );
  }

  return <Router />; // Render full navigation structure of app (entry point to UI).
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="dark"
      />
    </AuthProvider>
  );
}

const styles = {
  loader: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    background: "#111"
  }
};