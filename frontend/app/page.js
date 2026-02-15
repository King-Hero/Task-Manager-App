import Link from "next/link";

export default function Home() {
  return (
    <div style={{ maxWidth: 760, margin: "70px auto", fontFamily: "Arial" }}>
      <h1>Task Manager</h1>
      <p>Welcome. Please login or create an account.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
        <Link href="/login">Login</Link>
        <Link href="/signup">Sign up</Link>
        <Link href="/tasks">Tasks</Link>
      </div>
    </div>
  );
}
