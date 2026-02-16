"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import styles from "./tasks.module.css";

export default function Tasks() {
  const router = useRouter();

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
  const [statusFilter, setStatusFilter] = useState("");
  const [dueThisWeek, setDueThisWeek] = useState(false);

  const [sortBy, setSortBy] = useState("due_asc"); // due_asc | due_desc | priority | status | title
  const [error, setError] = useState("");

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null); // { due_date, confidence, reasoning }
  const [aiError, setAiError] = useState("");

  // Inline edit
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const formatDue = (isoOrDate) => {
    if (!isoOrDate) return "";
    const s = String(isoOrDate);
    const d = s.length === 10 ? new Date(`${s}T12:00:00Z`) : new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().slice(0, 10);
  };

  const toDueIso = (yyyyMmDd) => new Date(`${yyyyMmDd}T12:00:00Z`).toISOString();

  const normalizeStatus = (s) => {
    if (s === "in_progress") return "in_progress";
    if (s === "done") return "done";
    return "todo";
  };

  const normalizePriority = (p) => {
    if (p === "high") return "high";
    if (p === "low") return "low";
    return "medium";
  };

  const priorityRank = { high: 3, medium: 2, low: 1 };
  const statusRank = { todo: 1, in_progress: 2, done: 3 };

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

      setAiSuggestion(res.data || null);

      const suggested = res.data?.due_date;
      if (suggested) setDueDate(String(suggested).slice(0, 10));
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
      setAiError(err?.response?.data?.detail || err?.message || "AI suggestion failed");
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
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to add task");
    }
  };

  const cycleStatus = async (t) => {
    const s = normalizeStatus(t.status);
    const next = s === "todo" ? "in_progress" : s === "in_progress" ? "done" : "todo";

    setError("");
    try {
      await api.patch(`/tasks/${t.id}`, { status: next }, { headers: authHeaders() });
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to update status");
    }
  };

  const del = async (id) => {
    setError("");
    try {
      const ok = confirm("Delete this task?");
      if (!ok) return;

      await api.delete(`/tasks/${id}`, { headers: authHeaders() });

      if (editingId === id) {
        setEditingId(null);
        setEditDraft(null);
      }

      load();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to delete task");
    }
  };

  const beginEdit = (t) => {
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
      const payload = {
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
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Failed to save changes");
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

    const dueVal = (t) => {
      const s = formatDue(t.due_date);
      if (!s) return Number.POSITIVE_INFINITY;
      const ts = new Date(`${s}T12:00:00Z`).getTime();
      return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
    };

    arr.sort((a, b) => {
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "status")
        return (
          (statusRank[normalizeStatus(a.status)] ?? 9) -
          (statusRank[normalizeStatus(b.status)] ?? 9)
        );
      if (sortBy === "priority")
        return (
          (priorityRank[normalizePriority(b.priority)] ?? 0) -
          (priorityRank[normalizePriority(a.priority)] ?? 0)
        );
      if (sortBy === "due_desc") return dueVal(b) - dueVal(a);
      return dueVal(a) - dueVal(b); // due_asc
    });

    return arr;
  }, [tasks, sortBy]);

  const priorityBadgeClass = (pRaw) => {
    const p = normalizePriority(pRaw);
    if (p === "high") return `${styles.badge} ${styles.badgeHigh}`;
    if (p === "low") return `${styles.badge} ${styles.badgeLow}`;
    return `${styles.badge} ${styles.badgeMedium}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.h1}>Tasks</h1>
        <button className={styles.button} onClick={logout}>
          Logout
        </button>
      </div>

      {/* Create */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>Create task</p>

        <div className={styles.grid2}>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <input
            className={styles.input}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <textarea
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
        />

        <div className={styles.row} style={{ marginTop: 10 }}>
          <button className={styles.buttonPrimary} onClick={add}>
            Add
          </button>

          <button className={styles.button} onClick={suggestDueDate} disabled={aiLoading}>
            {aiLoading ? "Suggesting..." : "Suggest due date"}
          </button>

          {aiSuggestion?.due_date && (
            <span className={styles.muted}>
              Suggested: <strong>{String(aiSuggestion.due_date).slice(0, 10)}</strong> (
              {aiSuggestion.confidence})
              {aiSuggestion.reasoning ? <span> — {aiSuggestion.reasoning}</span> : null}
            </span>
          )}
        </div>

        {aiError && <p className={styles.error}>{aiError}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {/* Filters + Sort */}
      <div className={styles.row} style={{ marginTop: 16 }}>
        <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={dueThisWeek} onChange={(e) => setDueThisWeek(e.target.checked)} />
          Due this week
        </label>

        <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Sort:
          <select className={styles.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="due_asc">Due date (soonest)</option>
            <option value="due_desc">Due date (latest)</option>
            <option value="priority">Priority (high → low)</option>
            <option value="status">Status (todo → done)</option>
            <option value="title">Title (A → Z)</option>
          </select>
        </label>

        <button className={styles.button} onClick={load}>
          Refresh
        </button>
      </div>

      {/* List */}
      <div style={{ marginTop: 14 }}>
        {sortedTasks.length === 0 ? (
          <p className={styles.muted}>No tasks yet.</p>
        ) : (
          <ul className={styles.list}>
            {sortedTasks.map((t) => {
              const isEditing = editingId === t.id;

              return (
                <li key={t.id} className={`${styles.task} ${isEditing ? styles.taskEditing : ""}`}>
                  <div style={{ flex: 1 }}>
                    <div className={styles.row}>
                      {isEditing ? (
                        <input
                          className={styles.input}
                          value={editDraft?.title ?? ""}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))
                          }
                          style={{ maxWidth: 520 }}
                        />
                      ) : (
                        <span className={styles.taskTitle}>{t.title}</span>
                      )}

                      <span className={priorityBadgeClass(t.priority)}>{normalizePriority(t.priority)}</span>

                      <span className={styles.muted}>Status: {normalizeStatus(t.status)}</span>

                      {t.due_date && <span className={styles.muted}>Due: {formatDue(t.due_date)}</span>}
                    </div>

                    {isEditing ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                        <textarea
                          className={styles.textarea}
                          value={editDraft?.description ?? ""}
                          onChange={(e) =>
                            setEditDraft((d) => (d ? { ...d, description: e.target.value } : d))
                          }
                          rows={3}
                        />

                        <div className={styles.row}>
                          <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            Due:
                            <input
                              className={styles.input}
                              type="date"
                              value={editDraft?.dueDate ?? ""}
                              onChange={(e) =>
                                setEditDraft((d) => (d ? { ...d, dueDate: e.target.value } : d))
                              }
                              style={{ width: 180 }}
                            />
                          </label>

                          <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            Priority:
                            <select
                              className={styles.select}
                              value={editDraft?.priority ?? "medium"}
                              onChange={(e) =>
                                setEditDraft((d) => (d ? { ...d, priority: e.target.value } : d))
                              }
                            >
                              <option value="high">high</option>
                              <option value="medium">medium</option>
                              <option value="low">low</option>
                            </select>
                          </label>

                          <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            Status:
                            <select
                              className={styles.select}
                              value={editDraft?.status ?? "todo"}
                              onChange={(e) =>
                                setEditDraft((d) => (d ? { ...d, status: e.target.value } : d))
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
                      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>{t.description}</div>
                    ) : null}
                  </div>

                  <div className={styles.actions}>
                    {isEditing ? (
                      <>
                        <button className={styles.buttonPrimary} onClick={saveEdit} disabled={savingEdit}>
                          {savingEdit ? "Saving..." : "Save"}
                        </button>
                        <button className={styles.button} onClick={cancelEdit} disabled={savingEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={styles.button} onClick={() => beginEdit(t)}>
                          Edit
                        </button>
                        <button className={styles.button} onClick={() => cycleStatus(t)}>
                          Next status
                        </button>
                        <button className={styles.buttonDanger} onClick={() => del(t.id)}>
                          Delete
                        </button>
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
