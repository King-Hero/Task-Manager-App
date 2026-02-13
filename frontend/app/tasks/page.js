"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

export default function Tasks() {
  const router = useRouter();

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dueThisWeek, setDueThisWeek] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

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
      setError(err?.response?.data?.detail || err?.message || "Failed to load tasks");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dueThisWeek]);

  const add = async () => {
    if (!title.trim()) return;

    setError("");
    try {
      const due = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      await api.post(
        "/tasks",
        {
          title: title.trim(),
          status: "todo",
          priority: "medium",
          due_date: due,
        },
        { headers: authHeaders() }
      );

      setTitle("");
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to add task");
    }
  };

  const markDone = async (id) => {
    setError("");
    try {
      await api.patch(`/tasks/${id}`, { status: "done" }, { headers: authHeaders() });
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
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>Tasks</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={logout}>Logout</button>

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
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={add}>Add</button>
      </div>

      <ul>
        {tasks.map((t) => (
          <li key={t.id} style={{ marginBottom: 8 }}>
            <strong>{t.title}</strong> — {t.status}
            <button style={{ marginLeft: 10 }} onClick={() => markDone(t.id)}>
              Mark done
            </button>
            <button style={{ marginLeft: 10 }} onClick={() => del(t.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
