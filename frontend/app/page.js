"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem("token")));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setHasToken(false);
    router.push("/login");
  };

  return (
    <div style={{ maxWidth: 760, margin: "70px auto", fontFamily: "Arial" }}>
      <h1>Task Manager</h1>
      <p style={{ marginTop: 8 }}>
        {hasToken
          ? "You’re signed in. Go to your tasks."
          : "Welcome. Please login or create an account."}
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        {!hasToken ? (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign up</Link>
          </>
        ) : (
          <>
            <Link href="/tasks">Go to Tasks</Link>
            <button onClick={logout}>Logout</button>
          </>
        )}
      </div>

      <p style={{ marginTop: 22, color: "#555" }}>
        API: {process.env.NEXT_PUBLIC_API_BASE_URL || "(not set)"}
      </p>
    </div>
  );
}
