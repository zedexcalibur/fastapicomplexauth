import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className={styles.layout}>
      
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
      
        <h3>My App</h3>

        <nav className={styles.nav}>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <div style={{ marginTop: "auto" }}>
          <p>{user?.username}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
    </aside>

      {/* MAIN CONTENT */}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}