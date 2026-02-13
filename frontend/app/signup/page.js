"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/signup", { email, password });
      router.push("/login");
    } catch (err) {
      setError("Signup failed (email may already be registered)");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>Sign up</h1>
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
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: "block", width: "100%", padding: 10, marginBottom: 10 }}
        />
        <button style={{ padding: "10px 14px" }}>Create account</button>
      </form>

      <p style={{ marginTop: 12 }}>
        Already have an account? <a href="/login">Login</a>
      </p>
    </div>
  );
}
