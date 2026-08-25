import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { toast } from "react-toastify";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // Stops form acting in normal HTML way.
    setLoading(true);

    try {
      await api.post("/reset-password", {
        token,
        new_password: password,
      });

      toast.success("Password reset successful");
      navigate("/login");
    } catch {
      toast.error("Invalid or expired token");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Reset Password</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}