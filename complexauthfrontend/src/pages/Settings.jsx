import { useState } from "react";
import { api } from "../api";
import { toast } from "react-toastify";
import { useAuth } from "../auth/useAuth";

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [newEmail, setNewEmail] = useState("");

  const { refreshUser, logout } = useAuth();

  async function handlePasswordChange() {
    await api.post("/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });

    toast.success("Password updated. Please log in again.");

    await logout();
  }

  async function handleEmailChange() {
    try {
      await api.post("/change-email", {
        new_email: newEmail,
      });

      await refreshUser();

      toast.success("Email updated");
    } catch {
      toast.error("Something went wrong.");
    }
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <h1>Settings</h1>

      <section>
        <h3>Change Password</h3>

        <input
          type="password"
          placeholder="Current password"
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="New password"
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <button onClick={handlePasswordChange}>
          Update Password
        </button>
      </section>

      <hr />

      <section>
        <h3>Change Email</h3>

        <input
          placeholder="New email"
          onChange={(e) => setNewEmail(e.target.value)}
        />

        <button onClick={handleEmailChange}>
          Update Email
        </button>
      </section>
    </div>
  );
}