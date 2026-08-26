import styles from "./AuthLayout.module.css";

export default function AuthLayout({title, children}) {
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>
                    {title}
                </h1>
                {children}
            </div>
        </div>
    );
}