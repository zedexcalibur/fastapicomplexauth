import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { toast } from "react-toastify";
import styles from "./Login.module.css";
import { Link } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // Prevents submission in normal HTML way.
    setLoading(true);

    try {
      await login(identifier, password);
      toast.success("Logged in");
      navigate("/dashboard");
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Login">
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          placeholder="Username or email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className={styles.input}
        />

        <input
          className={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button disabled={loading} className={styles.button}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p className={styles.footer}>
          Don't have an account?{" "}
          <Link to="/register" className={styles.link}>
            Register
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}