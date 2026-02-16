"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

export default function Tasks() {
  const router = useRouter();

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [statusFilter, setStatusFilter] = useState("");
  const [dueThisWeek, setDueThisWeek] = useState(false);

  const [error, setError] = useState("");

  // AI suggestion UI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // { due_date, confidence, reasoning }
  const [aiError, setAiError] = useState("");

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const formatDue = (isoOrDate) => {
    if (!isoOrDate) return "";
    // supports YYYY-MM-DD or ISO
    const s = String(isoOrDate);
    const d = s.length === 10 ? new Date(`${s}T12:00:00Z`) : new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().slice(0, 10);
  };

  const load = async () => {
    setError("");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (dueThisWeek) params.set("due", "this_week");

    const qs = params.toString() ? `?${params.toString()}` : "";

    try {
      const res = await api.get(`/tasks${qs}`, { headers: authHeaders() });
      setTasks(res.data);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      setError(
        err?.response?.data?.detail || err?.message || "Failed to load tasks"
      );
    }
  };

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dueThisWeek]);

  const suggestDueDate = async () => {
    if (!title.trim() && !description.trim()) return;

    setAiError("");
    setAiLoading(true);

    try {
      const res = await api.post(
        "/ai/suggest-due-date",
        { title: title.trim() || "Untitled task", description: description.trim() || null },
        { headers: authHeaders() }
      );

      setAiSuggestion(res.data);

      // backend returns YYYY-MM-DD; store as YYYY-MM-DD for date input
      const suggested = res.data?.due_date;
      if (suggested) setDueDate(suggested);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      setAiError(
        err?.response?.data?.detail || err?.message || "AI suggestion failed"
      );
    } finally {
      setAiLoading(false);
    }
  };

  const add = async () => {
    if (!title.trim()) return;

    setError("");

    try {
      // If user chose a YYYY-MM-DD, convert to ISO safely.
      // Using 12:00Z reduces “yesterday/tomorrow” timezone display issues.
      const dueIso = dueDate
        ? new Date(`${dueDate}T12:00:00Z`).toISOString()
        : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      await api.post(
        "/tasks",
        {
          title: title.trim(),
          description: description.trim() || null,
          status: "todo",
          priority: "medium",
          due_date: dueIso,
        },
        { headers: authHeaders() }
      );

      setTitle("");
      setDescription("");
      setDueDate("");
      setAiSuggestion(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to add task");
    }
  };

  const markDone = async (id) => {
    setError("");
    try {
      await api.patch(
        `/tasks/${id}`,
        { status: "done" },
        { headers: authHeaders() }
      );
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to update task");
    }
  };

  const del = async (id) => {
    setError("");
    try {
      await api.delete(`/tasks/${id}`, { headers: authHeaders() });
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to delete task");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div style={{ maxWidth: 860, margin: "40px auto", fontFamily: "Arial" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid #e5e5e5", borderRadius: 10 }}>
        <h3 style={{ margin: "0 0 10px 0" }}>Create task</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
          />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={add}>Add</button>

          <button onClick={suggestDueDate} disabled={aiLoading}>
            {aiLoading ? "Suggesting..." : "Suggest due date"}
          </button>

          {aiSuggestion?.due_date && (
            <span style={{ fontSize: 13, color: "#444", alignSelf: "center" }}>
              Suggested: <strong>{aiSuggestion.due_date}</strong> ({aiSuggestion.confidence})
              {aiSuggestion.reasoning ? (
                <span style={{ color: "#666" }}> — {aiSuggestion.reasoning}</span>
              ) : null}
            </span>
          )}
        </div>

        {aiError && <p style={{ color: "crimson", marginTop: 8 }}>{aiError}</p>}
        {error && <p style={{ color: "crimson", marginTop: 8 }}>{error}</p>}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={dueThisWeek}
            onChange={(e) => setDueThisWeek(e.target.checked)}
          />
          Due this week
        </label>

        <button onClick={load}>Refresh</button>
      </div>

      <div style={{ marginTop: 14 }}>
        {tasks.length === 0 ? (
          <p style={{ color: "#666" }}>No tasks yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {tasks.map((t) => (
              <li
                key={t.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 16 }}>{t.title}</strong>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      Status: {t.status}
                    </span>
                    {t.due_date && (
                      <span style={{ fontSize: 12, color: "#666" }}>
                        Due: {formatDue(t.due_date)}
                      </span>
                    )}
                  </div>

                  {t.description ? (
                    <div style={{ marginTop: 6, color: "#444", fontSize: 13 }}>
                      {t.description}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {t.status !== "done" && (
                    <button onClick={() => markDone(t.id)}>Mark done</button>
                  )}
                  <button onClick={() => del(t.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
