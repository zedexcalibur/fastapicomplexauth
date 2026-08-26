import { Navigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../auth/useAuth";

export default function PublicRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
    return (
        <AuthLayout title="Login">
        <p>Checking session...</p>
        </AuthLayout>
    );
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}