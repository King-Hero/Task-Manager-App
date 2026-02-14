"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";

export default function Tasks() {
  const router = useRouter();

  // Data
  const [tasks, setTasks] = useState([]);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState(() => isoToDateInput(defaultDueISO(3)));

  // Filters / UX
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dueThisWeek, setDueThisWeek] = useState(false);
  const [sortMode, setSortMode] = useState("due_asc"); // due_asc | due_desc | priority_desc | updated_desc

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingPriority, setEditingPriority] = useState("medium");
  const [editingStatus, setEditingStatus] = useState("todo");
  const [editingDue, setEditingDue] = useState("");

  // Errors
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
      setTasks(res.data || []);
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
      await api.post(
        "/tasks",
        {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          due_date: dateInputToISO(dueDate),
        },
        { headers: authHeaders() }
      );

      // Reset form
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
      setDueDate(isoToDateInput(defaultDueISO(3)));

      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to add task");
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

  const markDone = async (id) => {
    setError("");
    try {
      await api.patch(`/tasks/${id}`, { status: "done" }, { headers: authHeaders() });
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to update task");
    }
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditingTitle(t.title || "");
    setEditingDescription(t.description || "");
    setEditingPriority(t.priority || "medium");
    setEditingStatus(t.status || "todo");
    setEditingDue(isoToDateInput(t.due_date || defaultDueISO(3)));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
    setEditingDescription("");
    setEditingPriority("medium");
    setEditingStatus("todo");
    setEditingDue("");
  };

  const saveEdit = async () => {
    if (!editingId) return;

    setError("");
    try {
      await api.patch(
        `/tasks/${editingId}`,
        {
          title: editingTitle.trim(),
          description: editingDescription.trim() || undefined,
          priority: editingPriority,
          status: editingStatus,
          due_date: dateInputToISO(editingDue),
        },
        { headers: authHeaders() }
      );

      cancelEdit();
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to update task");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  // Client-side search + sort (keeps backend simple)
  const visibleTasks = useMemo(() => {
    let out = [...tasks];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((t) => (t.title || "").toLowerCase().includes(q));
    }

    out.sort((a, b) => {
      if (sortMode === "due_asc") return toTime(a.due_date) - toTime(b.due_date);
      if (sortMode === "due_desc") return toTime(b.due_date) - toTime(a.due_date);
      if (sortMode === "priority_desc") return prioRank(b.priority) - prioRank(a.priority);
      if (sortMode === "updated_desc") return toTime(b.updated_at) - toTime(a.updated_at);
      return 0;
    });

    return out;
  }, [tasks, search, sortMode]);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.h1}>Task Manager</div>
          <div style={styles.sub}>Filter, prioritize, and stay ahead of deadlines.</div>
        </div>
        <button onClick={logout} style={styles.btnGhost}>
          Logout
        </button>
      </div>

      {/* Create Task */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Create Task</div>

        <div style={styles.grid2}>
          <div style={styles.field}>
            <label style={styles.label}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prepare weekly report"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a short note..."
            rows={3}
            style={styles.textarea}
          />
        </div>

        <div style={styles.grid3}>
          <div style={styles.field}>
            <label style={styles.label}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={styles.input}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div style={{ ...styles.field, justifyContent: "flex-end" }}>
            <button onClick={add} style={styles.btnPrimary}>
              + Add Task
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
      </div>

      {/* Filters */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Filters</div>

        <div style={styles.filtersRow}>
          <div style={{ ...styles.field, flex: 1, minWidth: 220 }}>
            <label style={styles.label}>Search (title)</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              style={styles.input}
            />
          </div>

          <div style={{ ...styles.field, minWidth: 180 }}>
            <label style={styles.label}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.input}
            >
              <option value="">All</option>
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div style={{ ...styles.field, minWidth: 200 }}>
            <label style={styles.label}>Sort</label>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={styles.input}>
              <option value="due_asc">Due date (soonest)</option>
              <option value="due_desc">Due date (latest)</option>
              <option value="priority_desc">Priority (high → low)</option>
              <option value="updated_desc">Updated (newest)</option>
            </select>
          </div>

          <div style={{ ...styles.field, minWidth: 160 }}>
            <label style={styles.label}>Due</label>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={dueThisWeek}
                onChange={(e) => setDueThisWeek(e.target.checked)}
              />
              Due this week
            </label>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div style={styles.sectionTitle}>Tasks ({visibleTasks.length})</div>

      {visibleTasks.length === 0 ? (
        <div style={styles.empty}>No tasks found. Create one above.</div>
      ) : (
        <div style={styles.list}>
          {visibleTasks.map((t) => {
            const chip = dueChip(t);
            const statusPill = pillStyles(t.status);
            const prioPill = prioStyles(t.priority);

            return (
              <div key={t.id} style={styles.taskCard}>
                <div style={styles.taskTopRow}>
                  <div style={styles.taskTitle}>
                    {editingId === t.id ? (
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        style={styles.input}
                      />
                    ) : (
                      t.title
                    )}
                  </div>

                  {chip && <span style={{ ...styles.chip, ...chip.style }}>{chip.text}</span>}
                </div>

                <div style={styles.metaRow}>
                  <span style={{ ...styles.pill, ...statusPill }}>{prettyStatus(t.status)}</span>
                  <span style={{ ...styles.pill, ...prioPill }}>{prettyPriority(t.priority)}</span>
                  <span style={styles.metaText}>
                    Due: <strong>{formatDate(t.due_date)}</strong>
                  </span>
                </div>

                {editingId === t.id ? (
                  <>
                    <div style={styles.grid2}>
                      <div style={styles.field}>
                        <label style={styles.label}>Description</label>
                        <textarea
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          rows={3}
                          style={styles.textarea}
                        />
                      </div>

                      <div style={styles.field}>
                        <label style={styles.label}>Due date</label>
                        <input
                          type="date"
                          value={editingDue}
                          onChange={(e) => setEditingDue(e.target.value)}
                          style={styles.input}
                        />

                        <label style={{ ...styles.label, marginTop: 10 }}>Priority</label>
                        <select
                          value={editingPriority}
                          onChange={(e) => setEditingPriority(e.target.value)}
                          style={styles.input}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>

                        <label style={{ ...styles.label, marginTop: 10 }}>Status</label>
                        <select
                          value={editingStatus}
                          onChange={(e) => setEditingStatus(e.target.value)}
                          style={styles.input}
                        >
                          <option value="todo">Todo</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                    </div>

                    <div style={styles.actionsRow}>
                      <button onClick={saveEdit} style={styles.btnPrimary}>
                        Save
                      </button>
                      <button onClick={cancelEdit} style={styles.btnGhost}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {t.description ? <div style={styles.desc}>{t.description}</div> : null}

                    <div style={styles.actionsRow}>
                      <button onClick={() => startEdit(t)} style={styles.btnGhost}>
                        Edit
                      </button>

                      {t.status !== "done" && (
                        <button onClick={() => markDone(t.id)} style={styles.btnGhost}>
                          Mark done
                        </button>
                      )}

                      <button onClick={() => del(t.id)} style={styles.btnDanger}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------
   Helpers (no dependencies)
-------------------------- */

function defaultDueISO(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isoToDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  // YYYY-MM-DD
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateInputToISO(dateStr) {
  // dateStr is YYYY-MM-DD
  if (!dateStr) return undefined;
  // interpret as local date at end of day to avoid timezone surprises
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return dt.toISOString();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toTime(iso) {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function formatDate(iso) {
  if (!iso) return "—";
  // If it's an ISO timestamp, take the date-only part for stable display
  // e.g. "2026-02-13T23:59:59.000Z" -> "2026-02-13"
  const s = String(iso);
  if (s.includes("T")) return s.split("T")[0];
  return s;
}

function prettyStatus(s) {
  if (s === "in_progress") return "In progress";
  if (s === "done") return "Done";
  return "Todo";
}

function prettyPriority(p) {
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Medium";
}

function prioRank(p) {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

function dueChip(t) {
  const due = t?.due_date ? new Date(t.due_date) : null;
  if (!due) return null;

  if (t.status === "done") {
    return { text: "Done", style: { background: "#eef2ff", color: "#3730a3", borderColor: "#c7d2fe" } };
  }

  const now = new Date();
  const dueTime = due.getTime();
  const nowTime = now.getTime();

  // normalize to date-only comparisons by using end-of-day in ISO conversion
  const diffDays = Math.ceil((dueTime - nowTime) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return { text: "Overdue", style: { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" } };
  }
  if (diffDays <= 3) {
    return { text: "Due soon", style: { background: "#fff7ed", color: "#9a3412", borderColor: "#fed7aa" } };
  }
  return null;
}

function pillStyles(status) {
  if (status === "done") return { background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" };
  if (status === "in_progress") return { background: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" };
  return { background: "#f8fafc", color: "#334155", borderColor: "#e2e8f0" };
}

function prioStyles(p) {
  if (p === "high") return { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" };
  if (p === "low") return { background: "#f1f5f9", color: "#334155", borderColor: "#e2e8f0" };
  return { background: "#fff7ed", color: "#9a3412", borderColor: "#fed7aa" };
}

/* -------------------------
   Minimal styles (MVP)
-------------------------- */

const styles = {
  page: {
    maxWidth: 980,
    margin: "36px auto",
    padding: "0 16px",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  h1: { fontSize: 26, fontWeight: 800, letterSpacing: "-0.3px" },
  sub: { marginTop: 4, color: "#475569" },

  sectionTitle: { marginTop: 18, marginBottom: 10, fontWeight: 800, fontSize: 16 },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    marginBottom: 12,
  },
  cardTitle: { fontWeight: 800, marginBottom: 12 },

  field: { display: "flex", flexDirection: "column" },
  label: { fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 },

  input: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 10px",
    outline: "none",
  },
  textarea: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 10px",
    outline: "none",
    resize: "vertical",
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 220px",
    gap: 12,
    marginBottom: 12,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 200px",
    gap: 12,
    alignItems: "end",
  },

  filtersRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "end",
  },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "#334155" },

  error: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    fontWeight: 700,
  },

  list: { display: "flex", flexDirection: "column", gap: 12 },
  taskCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  taskTopRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  taskTitle: { fontSize: 16, fontWeight: 800, flex: 1 },

  metaRow: { display: "flex", gap: 10, alignItems: "center", marginTop: 10, flexWrap: "wrap" },
  metaText: { color: "#475569" },

  pill: {
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 800,
  },
  chip: {
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  desc: { marginTop: 10, color: "#334155" },

  actionsRow: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },

  btnPrimary: {
    background: "#0f172a",
    color: "white",
    border: "1px solid #0f172a",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
  },
  btnGhost: {
    background: "white",
    color: "#0f172a",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
  },
  btnDanger: {
    background: "#fff1f2",
    color: "#9f1239",
    border: "1px solid #fecdd3",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
  },

  empty: {
    padding: 16,
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    color: "#475569",
    background: "#f8fafc",
  },
};
