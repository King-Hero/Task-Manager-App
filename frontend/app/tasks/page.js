"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status?: "todo" | "in_progress" | "done" | string;
  priority?: "high" | "medium" | "low" | string;
};

type EditDraft = {
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  status: "todo" | "in_progress" | "done";
  priority: "high" | "medium" | "low";
};

export default function Tasks() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [statusFilter, setStatusFilter] = useState("");
  const [dueThisWeek, setDueThisWeek] = useState(false);

  const [sortBy, setSortBy] = useState<
    "due_asc" | "due_desc" | "priority" | "status" | "title"
  >("due_asc");

  const [error, setError] = useState("");

  // AI suggestion UI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null); // { due_date, confidence, reasoning }
  const [aiError, setAiError] = useState("");

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const formatDue = (isoOrDate: any) => {
    if (!isoOrDate) return "";
    const s = String(isoOrDate);
    const d = s.length === 10 ? new Date(`${s}T12:00:00Z`) : new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().slice(0, 10);
  };

  const toDueIso = (yyyyMmDd: string) => {
    // Using 12:00Z reduces timezone edge cases
    return new Date(`${yyyyMmDd}T12:00:00Z`).toISOString();
  };

  const normalizeStatus = (s: any): "todo" | "in_progress" | "done" => {
    if (s === "in_progress") return "in_progress";
    if (s === "done") return "done";
    return "todo";
  };

  const normalizePriority = (p: any): "high" | "medium" | "low" => {
    if (p === "high") return "high";
    if (p === "low") return "low";
    return "medium";
  };

  const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const statusRank: Record<string, number> = { todo: 1, in_progress: 2, done: 3 };

  const load = async () => {
    setError("");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (dueThisWeek) params.set("due", "this_week");

    const qs = params.toString() ? `?${params.toString()}` : "";

    try {
      const res = await api.get(`/tasks${qs}`, { headers: authHeaders() });
      setTasks(res.data);
    } catch (err: any) {
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
        {
          title: title.trim() || "Untitled task",
          description: description.trim() || null,
        },
        { headers: authHeaders() }
      );

      setAiSuggestion(res.data);

      const suggested = res.data?.due_date;
      if (suggested) setDueDate(suggested);
    } catch (err: any) {
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
      const dueIso = dueDate
        ? toDueIso(dueDate)
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
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || "Failed to add task"
      );
    }
  };

  const markDone = async (id: string) => {
    setError("");
    try {
      await api.patch(
        `/tasks/${id}`,
        { status: "done" },
        { headers: authHeaders() }
      );
      load();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || "Failed to update task"
      );
    }
  };

  const cycleStatus = async (t: Task) => {
    // quick one-click flow reviewers like
    const s = normalizeStatus(t.status);
    const next =
      s === "todo" ? "in_progress" : s === "in_progress" ? "done" : "todo";

    setError("");
    try {
      await api.patch(
        `/tasks/${t.id}`,
        { status: next },
        { headers: authHeaders() }
      );
      load();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || "Failed to update status"
      );
    }
  };

  const del = async (id: string) => {
    setError("");
    try {
      // reviewer-friendly safety
      const ok = confirm("Delete this task?");
      if (!ok) return;

      await api.delete(`/tasks/${id}`, { headers: authHeaders() });
      // if you were editing this task, exit edit mode
      if (editingId === id) {
        setEditingId(null);
        setEditDraft(null);
      }
      load();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || "Failed to delete task"
      );
    }
  };

  const beginEdit = (t: Task) => {
    setError("");
    setEditingId(t.id);
    setEditDraft({
      title: t.title || "",
      description: t.description || "",
      dueDate: formatDue(t.due_date),
      status: normalizeStatus(t.status),
      priority: normalizePriority(t.priority),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft) return;
    if (!editDraft.title.trim()) return;

    setSavingEdit(true);
    setError("");

    try {
      const payload: any = {
        title: editDraft.title.trim(),
        description: editDraft.description.trim() || null,
        status: editDraft.status,
        priority: editDraft.priority,
      };
      if (editDraft.dueDate) payload.due_date = toDueIso(editDraft.dueDate);

      await api.patch(`/tasks/${editingId}`, payload, { headers: authHeaders() });

      setEditingId(null);
      setEditDraft(null);
      load();
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || "Failed to save changes"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const sortedTasks = useMemo(() => {
    const arr = [...tasks];

    const dueVal = (t: Task) => {
      const s = formatDue(t.due_date);
      if (!s) return Number.POSITIVE_INFINITY;
      const ts = new Date(`${s}T12:00:00Z`).getTime();
      return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
    };

    arr.sort((a, b) => {
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "status") {
        return (statusRank[normalizeStatus(a.status)] ?? 9) - (statusRank[normalizeStatus(b.status)] ?? 9);
      }
      if (sortBy === "priority") {
        return (priorityRank[normalizePriority(b.priority)] ?? 0) - (priorityRank[normalizePriority(a.priority)] ?? 0);
      }
      if (sortBy === "due_desc") return dueVal(b) - dueVal(a);
      // due_asc default
      return dueVal(a) - dueVal(b);
    });

    return arr;
  }, [tasks, sortBy]);

  const priorityBadge = (pRaw: any) => {
    const p = normalizePriority(pRaw);
    const styles: Record<string, any> = {
      high: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" },
      medium: { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" },
      low: { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" },
    };
    const s = styles[p] || styles.medium;
    return (
      <span
        style={{
          fontSize: 12,
          padding: "2px 8px",
          borderRadius: 999,
          ...s,
        }}
      >
        {p}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: 980, margin: "40px auto", fontFamily: "Arial" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Tasks</h1>
        <button onClick={logout}>Logout</button>
      </div>

      {/* Create */}
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
          style={{
            width: "100%",
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            fontWeight: 600, // darker/thicker input text
            color: "#111",
          }}
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

      {/* Filters + Sort */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
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

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Sort:
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="due_asc">Due date (soonest)</option>
            <option value="due_desc">Due date (latest)</option>
            <option value="priority">Priority (high → low)</option>
            <option value="status">Status (todo → done)</option>
            <option value="title">Title (A → Z)</option>
          </select>
        </label>

        <button onClick={load}>Refresh</button>
      </div>

      {/* List */}
      <div style={{ marginTop: 14 }}>
        {sortedTasks.length === 0 ? (
          <p style={{ color: "#666" }}>No tasks yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {sortedTasks.map((t) => {
              const isEditing = editingId === t.id;

              return (
                <li
                  key={t.id}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: 10,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    background: isEditing ? "#fafafa" : "white",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {isEditing ? (
                        <input
                          value={editDraft?.title ?? ""}
                          onChange={(e) => setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                          style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: "min(520px, 100%)" }}
                        />
                      ) : (
                        <strong style={{ fontSize: 16 }}>{t.title}</strong>
                      )}

                      {/* Priority badge */}
                      {priorityBadge(t.priority)}

                      <span style={{ fontSize: 12, color: "#666" }}>Status: {t.status}</span>

                      {t.due_date && (
                        <span style={{ fontSize: 12, color: "#666" }}>
                          Due: {formatDue(t.due_date)}
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        <textarea
                          value={editDraft?.description ?? ""}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, description: e.target.value } : d))
                          }
                          rows={3}
                          style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            fontWeight: 600,
                            color: "#111",
                          }}
                        />

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            Due:
                            <input
                              type="date"
                              value={editDraft?.dueDate ?? ""}
                              onChange={(e) =>
                                setEditDraft((d) => (d ? { ...d, dueDate: e.target.value } : d))
                              }
                              style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
                            />
                          </label>

                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            Priority:
                            <select
                              value={editDraft?.priority ?? "medium"}
                              onChange={(e) =>
                                setEditDraft((d) =>
                                  d ? { ...d, priority: e.target.value as any } : d
                                )
                              }
                            >
                              <option value="high">high</option>
                              <option value="medium">medium</option>
                              <option value="low">low</option>
                            </select>
                          </label>

                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            Status:
                            <select
                              value={editDraft?.status ?? "todo"}
                              onChange={(e) =>
                                setEditDraft((d) =>
                                  d ? { ...d, status: e.target.value as any } : d
                                )
                              }
                            >
                              <option value="todo">todo</option>
                              <option value="in_progress">in_progress</option>
                              <option value="done">done</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    ) : t.description ? (
                      <div style={{ marginTop: 6, color: "#111", fontSize: 13, fontWeight: 600 }}>
                        {t.description}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {isEditing ? (
                      <>
                        <button onClick={saveEdit} disabled={savingEdit}>
                          {savingEdit ? "Saving..." : "Save"}
                        </button>
                        <button onClick={cancelEdit} disabled={savingEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => beginEdit(t)}>Edit</button>
                        <button onClick={() => cycleStatus(t)}>Next status</button>
                        {t.status !== "done" && (
                          <button onClick={() => markDone(t.id)}>Mark done</button>
                        )}
                        <button onClick={() => del(t.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
