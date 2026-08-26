import { useAuth } from "../auth/useAuth";

export default function Dashboard() {
    const { user } = useAuth();

    return (
        <>
            <h1>Dashboard</h1>
            <p>
                Welcome
                {" "}
                <strong>
                    {user?.username}
                </strong>
            </p>

            <p>
                Email:
                {" "}
                {user?.email}
            </p>
        </>
    );
}