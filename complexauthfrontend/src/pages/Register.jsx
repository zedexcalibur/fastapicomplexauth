import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { api } from "../api";
import AuthLayout from "../components/AuthLayout"
import { toast } from "react-toastify";

export default function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();
    const { login } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    async function handleSubmit(e) {
        e.preventDefault(); // Stops browser doing its default behaviour i.e. submitting
        // form in usual HTML way.
        // Without it, submitting would reload the page, kill the React app state and
        // lose all the JS state.

        setError("");
        setLoading(true);

        try {
            await api.post("/register", {
                username,
                email,
                password
            });

            await login(username, password);
            toast.success("Account created");
            navigate("/");

        } catch (err) {

            if (err.response?.data?.detail) {
                toast.error(err.response.data.detail);
            } else {
                toast.error("Something went wrong.");
            }

        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout title="Register">
            <h1>Create Account</h1>

            <form onSubmit={handleSubmit}>

                <input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                    <p>{error}</p>
                )}

                <button disabled={loading}>
                    {loading ? "Creating..." : "Register"}
                </button>

            </form>

            <p>
                Already have an account?{" "}
                <Link to="/login">
                    Login
                </Link>
            </p>

        </AuthLayout>
    );
}