"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      router.push("/tasks");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed";
      setError(String(msg));
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>Login</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={submit}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", padding: 10, marginBottom: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: "block", width: "100%", padding: 10, marginBottom: 10 }}
        />
        <button style={{ padding: "10px 14px" }}>Login</button>
      </form>

      <p style={{ marginTop: 12 }}>
        No account? <a href="/signup">Sign up</a>
      </p>
    </div>
  );
}
