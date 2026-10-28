import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDownToLine,
  ArrowUp,
  LayoutDashboard,
  MessageSquare,
  Files,
  Route,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Check,
  Plus,
  Search,
  Clock,
  CalendarDays,
  FileText,
  FolderOpen,
  Upload,
  X,
  LoaderCircle,
  Trash2,
  ExternalLink,
  Leaf,
  CheckCheck,
  BookOpen,
  RefreshCw,
  Menu,
  LockKeyhole,
  MapPin,
  Sparkles,
} from "lucide-react";
import "./style.css";
const visaNames = {
  H1B: "H-1B · Specialty occupation",
  F1: "F-1 · Student visa",
  FAMILY: "Family-based · Adjustment of status",
};
const dateLabel = (s) =>
  s
    ? new Date(s + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Set a target date";
async function api(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers:
      options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" },
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
}
const IconButton = ({ children, ...props }) => (
  <button className="icon-button" {...props}>
    {children}
  </button>
);
function App() {
  const [page, setPage] = useState("Overview"),
    [workspace, setWorkspace] = useState(null),
    [health, setHealth] = useState(null),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false);
  const [receipt, setReceipt] = useState(""),
    [chat, setChat] = useState([]),
    [question, setQuestion] = useState(""),
    [rag, setRag] = useState(true),
    [chatBusy, setChatBusy] = useState(false),
    [processing, setProcessing] = useState(null),
    [processingError, setProcessingError] = useState(""),
    [filter, setFilter] = useState("All documents");
  useEffect(() => {
    api("/api/workspace")
      .then(setWorkspace)
      .catch((e) => setError(e.message));
    api("/api/health")
      .then(setHealth)
      .catch(() => setHealth({ ollama: false, models: [] }));
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    const dialog = document.querySelector('[role="dialog"]');
    const focusable = () =>
      Array.from(dialog.querySelectorAll("button,input,select,a[href]")).filter(
        (el) => !el.disabled,
      );
    focusable()[0]?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        return;
      }
      if (e.key === "Tab") {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal]);
  const navigate = (p) => {
    setPage(p);
    setMobile(false);
    setError("");
  };
  async function action(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(item) {
    await action(async () =>
      setWorkspace(
        await api("/api/completed", {
          method: "PUT",
          body: {
            ids: workspace.completed.includes(item.id)
              ? workspace.completed.filter((id) => id !== item.id)
              : [...workspace.completed, item.id],
          },
        }),
      ),
    );
  }
  async function send(text = question) {
    if (!text.trim() || chatBusy) return;
    setQuestion("");
    setChat((c) => [...c, { role: "user", content: text }]);
    setChatBusy(true);
    try {
      const result = await api("/api/chat", {
        method: "POST",
        body: { message: text, rag, history: chat },
      });
      setChat((c) => [
        ...c,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          grounded: result.grounded,
        },
      ]);
    } catch (e) {
      setChat((c) => [
        ...c,
        { role: "assistant", content: e.message, error: true },
      ]);
    } finally {
      setChatBusy(false);
    }
  }
  const open = (m) => {
    setError("");
    setModal(m);
  };
  if (!workspace)
    return (
      <div className="loading">
        <Leaf size={36} />
        <p>{error || "Opening your private workspace…"}</p>
      </div>
    );
  const items = workspace.checklist,
    done = items.filter((i) => workspace.completed.includes(i.id)).length,
    progress = Math.round((done / items.length) * 100),
    upcoming = [
      ...workspace.milestones.map((m) => ({
        ...m,
        date: m.due,
        type: "Planning target",
      })),
      ...workspace.notices.map((n) => ({ ...n, type: "Notice date" })),
    ]
      .filter((m) => m.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  const title = {
    Overview: "A clearer path forward.",
    Assistant: "A little guidance. A lot more clarity.",
    "Document checklist": "Every document, in its place.",
    Timeline: "Your next steps, mapped out.",
    "Knowledge base": "Your knowledge. Your machine.",
    Settings: "Make yourself at home.",
  }[page];
  const subtitle = {
    Overview: "Your immigration journey, organized in one private workspace.",
    Assistant: "Ask your questions with local AI and sources you can inspect.",
    "Document checklist":
      "A personalized preparation list for your next chapter.",
    Timeline: "Keep your preparation on track, one milestone at a time.",
    "Knowledge base":
      "Add trusted guidance for answers grounded in your own documents.",
    Settings: "Manage your local models and connections.",
  }[page];
  return (
    <div className="app">
      <aside className={mobile ? "sidebar mobile-open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <span className="brand-symbol">
            <Route size={24} />
          </span>
          waypoint<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav>
          {[
            ["Overview", LayoutDashboard],
            ["Assistant", MessageSquare],
            ["Document checklist", Files],
            ["Timeline", Route],
            ["Knowledge base", BookOpen],
          ].map(([name, Icon]) => (
            <button
              key={name}
              className={"nav-item " + (page === name ? "active" : "")}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              {name}
              {name === "Assistant" && <span className="nav-new">LOCAL</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-icon">
              <ShieldCheck size={21} />
            </span>
            <strong>Private by design</strong>
            <p>
              Your documents stay here.
              <br />
              Your journey stays yours.
            </p>
            <span>
              <i /> Local AI workspace
            </span>
          </div>
          <button
            className={"nav-item " + (page === "Settings" ? "active" : "")}
            onClick={() => navigate("Settings")}
          >
            <Settings size={19} />
            Settings
          </button>
          <div className="user">
            <span className="avatar">Y</span>
            <div>
              <strong>Your workspace</strong>
              <small>Personal · On this device</small>
            </div>
            <LockKeyhole size={15} />
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <IconButton
              aria-label="Open menu"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={19} />
            </IconButton>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div className="top-right">
            <span className="local-pill">
              <span
                className={health?.ollama ? "status-dot" : "status-dot gray"}
              />{" "}
              {health?.ollama
                ? "Ollama connected"
                : health
                  ? "Ollama offline"
                  : "Checking local AI"}
            </span>
            <span className="top-divider" />
            <span className="avatar small">Y</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <button
              className="button secondary profile-button"
              onClick={() => open("profile")}
            >
              <span className="flag">🇺🇸</span>
              {workspace.profile.visa === "H1B"
                ? "H-1B visa"
                : workspace.profile.visa === "F1"
                  ? "F-1 visa"
                  : "Family-based"}
              <ChevronDown size={15} />
            </button>
          </div>
          {error && !modal && (
            <div className="alert" role="alert">
              {error}
              <button onClick={() => setError("")} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}
          {page === "Overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <span /> ONE STEP CLOSER
                  </span>
                  <h2>
                    A big journey.
                    <br />A manageable next step.
                  </h2>
                  <p>
                    From your first question to your final document,
                    <br className="desktop" /> make progress with a plan that’s
                    yours.
                  </p>
                  <button
                    className="button light"
                    onClick={() => navigate("Document checklist")}
                  >
                    Continue your checklist
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="journey-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="art-line" />
                  <div className="art-pin">
                    <MapPin size={36} strokeWidth={1.5} />
                  </div>
                  <div className="art-doc">
                    <span className="art-doc-icon">
                      <FileText size={23} />
                    </span>
                    <span className="art-title" />
                    <span className="art-short" />
                    <span className="art-rule" />
                    <span className="art-check">
                      <Check size={12} />
                    </span>
                    <span className="art-rule second" />
                    <span className="art-check second">
                      <Check size={12} />
                    </span>
                    <span className="art-rule third" />
                  </div>
                  <div className="art-label">
                    <ShieldCheck size={17} />
                    Built around your journey
                  </div>
                  <span className="art-star">✦</span>
                </div>
              </section>
              <section className="stats">
                <Stat
                  icon={FolderOpen}
                  label="Documents ready"
                  value={`${done}`}
                  suffix={`/ ${items.length}`}
                  foot={
                    done
                      ? "Looking good. Keep going."
                      : "Your preparation starts here."
                  }
                  tint="mint"
                />
                <Stat
                  icon={Route}
                  label="Checklist progress"
                  value={`${progress}`}
                  suffix="%"
                  foot="A little progress goes a long way"
                  tint="sand"
                  progress={progress}
                />
                <Stat
                  icon={CalendarDays}
                  label="Next milestone"
                  value={
                    upcoming[0]
                      ? dateLabel(upcoming[0].date).replace(
                          ", " + new Date(upcoming[0].date).getFullYear(),
                          "",
                        )
                      : "Not set"
                  }
                  foot={
                    upcoming[0]?.title || "Add a planning target to get started"
                  }
                  tint="purple"
                />
              </section>
              <div className="overview-grid">
                <section className="panel case-panel">
                  <PanelHead
                    icon={Search}
                    title="Case tracker"
                    aside={<span className="badge muted">USCIS</span>}
                  />
                  <p className="section-description">
                    A quick check-in on your application.
                  </p>
                  <form
                    className="receipt-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      action(async () => {
                        setWorkspace(
                          await api("/api/cases", {
                            method: "POST",
                            body: { receipt },
                          }),
                        );
                        setReceipt("");
                        setToast("Case status updated");
                      });
                    }}
                  >
                    <div className="input-icon">
                      <FileText size={17} />
                      <input
                        aria-label="USCIS receipt number"
                        placeholder="Enter receipt number"
                        value={receipt}
                        onChange={(e) =>
                          setReceipt(e.target.value.toUpperCase())
                        }
                        required
                        maxLength={20}
                      />
                    </div>
                    <button className="button primary" disabled={busy}>
                      Track case
                      <ArrowRight size={15} />
                    </button>
                  </form>
                  <small className="input-hint">
                    13 characters · e.g. IOE1234567890
                  </small>
                  {workspace.cases.length ? (
                    workspace.cases.map((c) => (
                      <div className="case-result" key={c.receipt}>
                        <div>
                          <strong>{c.form}</strong>
                          <span className="badge">{c.status}</span>
                        </div>
                        <p>{c.receipt}</p>
                        <p>{c.description}</p>
                        <small>
                          Checked {new Date(c.checkedAt).toLocaleString()}
                        </small>
                        <IconButton
                          aria-label="Remove case"
                          onClick={() =>
                            action(async () =>
                              setWorkspace(
                                await api("/api/cases/" + c.receipt, {
                                  method: "DELETE",
                                }),
                              ),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    ))
                  ) : (
                    <div className="case-empty">
                      <span className="empty-icon">
                        <FolderOpen size={24} />
                      </span>
                      <div>
                        <strong>Your next update belongs here</strong>
                        <p>
                          {health?.caseApi
                            ? "Enter your receipt number to get the latest status."
                            : "Connect your case-status API in Settings to start tracking."}
                        </p>
                      </div>
                    </div>
                  )}
                  <button
                    className="text-link tracker-link"
                    onClick={() => navigate("Settings")}
                  >
                    Manage API connection
                    <ArrowUpRight size={14} />
                  </button>
                </section>
                <section className="panel assistant-card">
                  <div className="assistant-orb">
                    <Sparkles size={23} />
                  </div>
                  <span className="badge">PRIVATE AI</span>
                  <h3>
                    Big questions?
                    <br />
                    Let’s work through them.
                  </h3>
                  <p>
                    Understand your options with an assistant
                    <br className="desktop" /> that keeps your information
                    local.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => navigate("Assistant")}
                  >
                    Ask your assistant
                    <ArrowUpRight size={16} />
                  </button>
                  <div className="card-bottom">
                    <ShieldCheck size={14} />
                    Powered by Ollama · On your device
                  </div>
                </section>
              </div>
              <div className="overview-grid lower">
                <section className="panel checklist-preview">
                  <PanelHead
                    icon={Files}
                    title="Your document checklist"
                    aside={
                      <button
                        className="text-link"
                        onClick={() => navigate("Document checklist")}
                      >
                        View all
                        <ArrowRight size={14} />
                      </button>
                    }
                  />
                  <div className="list-meta">
                    <span>{visaNames[workspace.profile.visa]}</span>
                    <span>
                      {done} of {items.length} ready
                    </span>
                  </div>
                  {items.slice(0, 3).map((i) => (
                    <CheckRow
                      key={i.id}
                      item={i}
                      done={workspace.completed.includes(i.id)}
                      onToggle={() => toggle(i)}
                      disabled={busy}
                    />
                  ))}
                  <div className="panel-footer">
                    <ShieldCheck size={14} />
                    <span>
                      Based on official USCIS & State Department guidance
                    </span>
                  </div>
                </section>
                <section className="panel mini-timeline">
                  <PanelHead
                    icon={CalendarDays}
                    title="What’s ahead"
                    aside={
                      <button
                        className="text-link"
                        onClick={() => navigate("Timeline")}
                      >
                        Timeline
                        <ArrowRight size={14} />
                      </button>
                    }
                  />
                  {upcoming.length ? (
                    upcoming.slice(0, 3).map((m, i) => (
                      <div className="mini-event" key={m.id}>
                        <span
                          className={"event-dot " + (i === 0 ? "current" : "")}
                        />
                        <div>
                          <small>
                            {dateLabel(m.date)} · {m.type}
                          </small>
                          <strong>{m.title}</strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-dates">
                      <CalendarDays size={28} />
                      <strong>Give your journey a date</strong>
                      <p>Add a planning target to map your milestones.</p>
                      <button
                        className="text-link"
                        onClick={() => open("profile")}
                      >
                        Set a target date
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                  <p className="planning-note">
                    Planning targets are not official USCIS deadlines.
                  </p>
                </section>
              </div>
              <section className="panel settings-panel processing-dashboard">
                <PanelHead icon={Clock} title="Current processing times" />
                <p className="section-description">
                  Request a current estimate for a specific form and office. An
                  estimate is not a case-specific deadline.
                </p>
                <form
                  className="processing-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    setProcessingError("");
                    setProcessing(null);
                    action(async () => {
                      try {
                        setProcessing(
                          await api(
                            "/api/processing?" +
                              new URLSearchParams({
                                form: f.get("form"),
                                office: f.get("office"),
                              }),
                          ),
                        );
                      } catch (e) {
                        setProcessingError(e.message);
                      }
                    });
                  }}
                >
                  <label>
                    Form
                    <select name="form">
                      <option>I-129</option>
                      <option>I-485</option>
                      <option>I-130</option>
                      <option>I-539</option>
                      <option>I-765</option>
                    </select>
                  </label>
                  <label>
                    Office / service center
                    <input
                      name="office"
                      placeholder="e.g. California Service Center"
                      required
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    Check estimate
                    <ArrowRight size={15} />
                  </button>
                </form>
                {processingError && (
                  <div className="notice subtle">
                    {processingError}{" "}
                    <a
                      href="https://egov.uscis.gov/processing-times/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View USCIS processing times ↗
                    </a>
                  </div>
                )}
                {processing && (
                  <div className="processing-result">
                    <strong>{processing.estimate}</strong>
                    <p>
                      As of {processing.asOf} ·{" "}
                      {processing.office || "Requested office"}
                    </p>
                    <a
                      href={processing.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Provider source ↗
                    </a>
                  </div>
                )}
              </section>
              <div className="quiet-footer">
                <Leaf size={15} />
                <span>
                  A new chapter takes a little courage. You’ve already started.
                </span>
              </div>
            </>
          )}
          {page === "Document checklist" && (
            <>
              <div className="section-toolbar">
                <div className="tabs">
                  {["All documents", "To prepare", "Ready"].map((f) => (
                    <button
                      className={filter === f ? "selected" : ""}
                      key={f}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <a className="button primary" href="/api/checklist.pdf">
                  <ArrowDownToLine size={16} />
                  Download PDF
                </a>
              </div>
              <div className="checklist-summary">
                <div>
                  <strong>{visaNames[workspace.profile.visa]}</strong>
                  <p>
                    {workspace.profile.location === "inside"
                      ? "Inside"
                      : "Outside"}{" "}
                    the U.S.{" "}
                    {workspace.profile.dependents ? "· With dependents" : ""} ·{" "}
                    {done} of {items.length} documents ready
                  </p>
                </div>
                <button className="text-link" onClick={() => open("profile")}>
                  Personalize checklist
                  <Settings size={15} />
                </button>
                <div className="wide-progress">
                  <i style={{ width: progress + "%" }} />
                </div>
              </div>
              <div className="notice subtle">
                <ShieldCheck size={18} />
                <span>
                  This is a preparation aid. Confirm eligibility and current
                  filing requirements against the official instructions.
                </span>
              </div>
              {[...new Set(items.map((i) => i.group))].map((group) => {
                const rows = items.filter(
                  (i) =>
                    i.group === group &&
                    (filter === "All documents" ||
                      (filter === "Ready") ===
                        workspace.completed.includes(i.id)),
                );
                return rows.length ? (
                  <section className="panel document-group" key={group}>
                    <h3>
                      {group}
                      <span>{rows.length}</span>
                    </h3>
                    {rows.map((i) => (
                      <CheckRow
                        key={i.id}
                        item={i}
                        done={workspace.completed.includes(i.id)}
                        onToggle={() => toggle(i)}
                        expanded
                        disabled={busy}
                      />
                    ))}
                  </section>
                ) : null;
              })}
              <SourceLink source={items[0].source} />
            </>
          )}
          {page === "Timeline" && (
            <>
              <div className="section-toolbar">
                <div className="notice-label">
                  <span className="status-dot" />
                  Your personalized roadmap
                </div>
                <div className="button-group">
                  <button
                    className="button secondary"
                    onClick={() => open("profile")}
                  >
                    <CalendarDays size={16} />
                    Set planning target
                  </button>
                  <button
                    className="button primary"
                    onClick={() => open("notice")}
                  >
                    <Plus size={16} />
                    Add notice date
                  </button>
                </div>
              </div>
              <div className="timeline-layout">
                <section className="panel full-timeline">
                  <h3>Your application milestones</h3>
                  <p className="section-description">
                    Preparation targets and dates from your own notices.
                  </p>
                  {upcoming.length ? (
                    upcoming.map((m, i) => (
                      <article className="timeline-event" key={m.id}>
                        <span className="timeline-node">{i + 1}</span>
                        <div>
                          <div className="timeline-meta">
                            {dateLabel(m.date)}
                            <span
                              className={
                                "badge " +
                                (m.type === "Notice date" ? "" : "muted")
                              }
                            >
                              {m.type}
                            </span>
                          </div>
                          <h3>{m.title}</h3>
                          <p>
                            {m.detail ||
                              "Date entered by you. Verify it against the original notice."}
                          </p>
                          {m.type === "Notice date" && (
                            <button
                              className="text-link"
                              onClick={() =>
                                action(async () =>
                                  setWorkspace(
                                    await api("/api/notices/" + m.id, {
                                      method: "DELETE",
                                    }),
                                  ),
                                )
                              }
                            >
                              Remove date
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <Empty
                      icon={CalendarDays}
                      title="Your timeline is ready to begin"
                      text="Choose a target filing or interview date to create your preparation plan."
                      action={
                        <button
                          className="button primary"
                          onClick={() => open("profile")}
                        >
                          Set a planning target
                          <ArrowRight size={15} />
                        </button>
                      }
                    />
                  )}
                </section>
                <section className="panel deadlines">
                  <h3>Document preparation targets</h3>
                  <p className="section-description">
                    Calculated from your chosen planning date.
                  </p>
                  {items.map((i) => (
                    <div className="deadline-row" key={i.id}>
                      <span
                        className={
                          workspace.completed.includes(i.id)
                            ? "ready-dot"
                            : "pending-dot"
                        }
                      />
                      <div>
                        <strong>{i.title}</strong>
                        <small>{dateLabel(i.due)}</small>
                      </div>
                    </div>
                  ))}
                  <p className="planning-note">
                    These dates are suggestions for organizing work. Official
                    notices and filing windows take precedence.
                  </p>
                </section>
              </div>
            </>
          )}
          {page === "Assistant" && (
            <section className="panel chat-panel">
              <div className="chat-heading">
                <div>
                  <span className="assistant-orb small-orb">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <strong>Waypoint assistant</strong>
                    <small>{workspace.settings.model} · Local inference</small>
                  </div>
                </div>
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={rag}
                    onChange={(e) => setRag(e.target.checked)}
                  />
                  Use knowledge base
                </label>
              </div>
              <div className="chat-messages" aria-live="polite">
                {!chat.length ? (
                  <div className="chat-welcome">
                    <span className="assistant-orb">
                      <MessageSquare size={28} />
                    </span>
                    <h2>Make your next step a little clearer.</h2>
                    <p>
                      Ask a question. Your conversation stays on this machine.
                    </p>
                    <div className="prompt-grid">
                      {[
                        "What should I prepare for my visa application?",
                        "What does a request for evidence mean?",
                        "How can I organize my supporting documents?",
                      ].map((t) => (
                        <button key={t} onClick={() => send(t)}>
                          {t}
                          <ArrowUpRight size={17} />
                        </button>
                      ))}
                    </div>
                    <div className="notice subtle">
                      <BookOpen size={17} />
                      {workspace.documents.length
                        ? `${workspace.documents.length} documents available for local retrieval.`
                        : "Add official guidance to your knowledge base for source-grounded answers."}
                    </div>
                  </div>
                ) : (
                  chat.map((m, i) => (
                    <div
                      className={
                        "chat-message " +
                        m.role +
                        (m.error ? " chat-error" : "")
                      }
                      key={i}
                    >
                      <span className="message-avatar">
                        {m.role === "user" ? "Y" : <Sparkles size={17} />}
                      </span>
                      <div>
                        <strong>
                          {m.role === "user" ? "You" : "Waypoint"}
                        </strong>
                        <div className="message-text">{m.content}</div>
                        {m.role === "assistant" && !m.error && (
                          <>
                            <small className="grounding">
                              {m.grounded
                                ? "Retrieved document references"
                                : "Model knowledge · verify against current official guidance"}
                            </small>
                            {m.sources?.map((s) => (
                              <span className="source-chip" key={s.id}>
                                [{s.id}] {s.name} · chunk {s.chunk}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {chatBusy && (
                  <div className="thinking">
                    <LoaderCircle className="spin" size={17} />
                    Thinking locally… Larger models may take a moment.
                  </div>
                )}
              </div>
              <form
                className="chat-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  aria-label="Your immigration question"
                  placeholder="Ask about your immigration journey…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={6000}
                />
                <button
                  className="send-button"
                  aria-label="Send question"
                  disabled={chatBusy || !question.trim()}
                >
                  <ArrowUp size={20} />
                </button>
              </form>
              <p className="chat-disclaimer">
                <LockKeyhole size={12} />
                Processed locally by Ollama. General information, not legal
                advice.
              </p>
            </section>
          )}
          {page === "Knowledge base" && (
            <>
              <div className="knowledge-intro">
                <div className="notice subtle">
                  <ShieldCheck size={20} />
                  <span>
                    Files are processed locally, embedded by Ollama, and stored
                    only in this workspace. No uploads to ChatGPT or Claude.
                  </span>
                </div>
                <label className={"upload-area " + (busy ? "disabled" : "")}>
                  <Upload size={30} />
                  <strong>
                    {busy
                      ? "Embedding your document locally…"
                      : "Build a more informed assistant"}
                  </strong>
                  <span>Add official guidance or your reference documents</span>
                  <span className="button primary">
                    <Plus size={16} />
                    Choose a file
                  </span>
                  <small>
                    PDF, TXT, Markdown · Up to 10 MB · Text-based documents
                  </small>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        action(async () => {
                          const form = new FormData();
                          form.append("file", f);
                          setWorkspace(
                            await api("/api/documents", {
                              method: "POST",
                              body: form,
                            }),
                          );
                          setToast("Document indexed locally");
                        });
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <section className="panel">
                <PanelHead
                  title="Your library"
                  icon={BookOpen}
                  aside={
                    <span className="badge muted">
                      {workspace.documents.length} documents
                    </span>
                  }
                />
                {workspace.documents.length ? (
                  workspace.documents.map((d) => (
                    <div className="library-row" key={d.id}>
                      <span className="file-icon">
                        <FileText size={22} />
                      </span>
                      <div>
                        <strong>{d.name}</strong>
                        <small>
                          {d.chunks} chunks · {d.embeddingModel} ·{" "}
                          {new Date(d.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                      <IconButton
                        aria-label={"Delete " + d.name}
                        onClick={() =>
                          action(async () =>
                            setWorkspace(
                              await api("/api/documents/" + d.id, {
                                method: "DELETE",
                              }),
                            ),
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </IconButton>
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={FolderOpen}
                    title="A fresh shelf for trusted guidance"
                    text="Your imported documents will appear here. You can delete them at any time."
                  />
                )}
              </section>
              <div className="reference-box">
                <h3>A good place to start</h3>
                <p>
                  Download current official instructions, then add them to your
                  local library.
                </p>
                {Object.values({
                  a: {
                    label: "USCIS · H-1B filing checklist",
                    url: "https://www.uscis.gov/sites/default/files/document/forms/m-735.pdf",
                  },
                  b: {
                    label: "Department of State · Student visas",
                    url: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
                  },
                  c: {
                    label: "USCIS · I-485 instructions",
                    url: "https://www.uscis.gov/sites/default/files/document/forms/i-485instr.pdf",
                  },
                }).map((s) => (
                  <SourceLink key={s.url} source={s} />
                ))}
              </div>
            </>
          )}
          {page === "Settings" && (
            <>
              <section className="panel settings-panel">
                <PanelHead
                  icon={Settings}
                  title="Local AI models"
                  aside={<span className="badge">OLLAMA</span>}
                />
                <p className="section-description">
                  Only downloaded local models are available. Cloud models are
                  excluded.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action(async () => {
                      setWorkspace(
                        await api("/api/settings", {
                          method: "PUT",
                          body: {
                            model: f.get("model"),
                            embedding: f.get("embedding"),
                          },
                        }),
                      );
                      setToast("Local models saved");
                    });
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Chat model
                      <select
                        name="model"
                        defaultValue={workspace.settings.model}
                      >
                        {[
                          ...new Set([
                            workspace.settings.model,
                            ...(health?.models || []),
                          ]),
                        ].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Embedding model
                      <select
                        name="embedding"
                        defaultValue={workspace.settings.embedding}
                      >
                        {[
                          ...new Set([
                            workspace.settings.embedding,
                            ...(health?.models || []),
                          ]),
                        ].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="input-hint">
                    Choose an embedding-capable model for retrieval. Reimport
                    existing documents after changing it.
                  </p>
                  <button
                    className="button primary"
                    disabled={busy || !health?.ollama}
                  >
                    Save models
                    <Check size={15} />
                  </button>
                </form>
              </section>
              <section className="panel settings-panel">
                <PanelHead icon={ShieldCheck} title="Connections & privacy" />
                <div className="connection-row">
                  <div>
                    <strong>Ollama</strong>
                    <p>Local chat and document embeddings</p>
                  </div>
                  <span className={"badge " + (!health?.ollama ? "muted" : "")}>
                    {health?.ollama ? "Connected" : "Offline"}
                  </span>
                </div>
                <div className="connection-row">
                  <div>
                    <strong>Automatic1111</strong>
                    <p>
                      Optional local image engine · not used for immigration
                      answers
                    </p>
                    {health?.imageModels?.length > 0 && (
                      <small>{health.imageModels.join(", ")}</small>
                    )}
                  </div>
                  <span className="badge muted">
                    {health?.automatic1111 ? "Detected" : "Not running"}
                  </span>
                </div>
                <div className="connection-row">
                  <div>
                    <strong>Case-status provider</strong>
                    <p>
                      Configure CASE_API_URL and CASE_API_KEY in your server
                      .env file.
                    </p>
                  </div>
                  <span className="badge muted">
                    {health?.caseApi ? "Configured" : "Not connected"}
                  </span>
                </div>
                <div className="connection-row">
                  <div>
                    <strong>Processing-time provider</strong>
                    <p>
                      Configure PROCESSING_API_URL for current form and office
                      estimates.
                    </p>
                  </div>
                  <span className="badge muted">
                    {health?.processingApi ? "Configured" : "Not connected"}
                  </span>
                </div>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      setHealth(await api("/api/health"));
                      setToast("Connections checked");
                    })
                  }
                >
                  <RefreshCw size={15} />
                  Check connections
                </button>
              </section>
              <section className="panel settings-panel">
                <PanelHead icon={Clock} title="Current processing times" />
                <p className="section-description">
                  Request a current estimate for a specific form and office. An
                  estimate is not a case-specific deadline.
                </p>
                <form
                  className="processing-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    setProcessingError("");
                    setProcessing(null);
                    action(async () => {
                      try {
                        setProcessing(
                          await api(
                            "/api/processing?" +
                              new URLSearchParams({
                                form: f.get("form"),
                                office: f.get("office"),
                              }),
                          ),
                        );
                      } catch (e) {
                        setProcessingError(e.message);
                      }
                    });
                  }}
                >
                  <label>
                    Form
                    <select name="form">
                      <option>I-129</option>
                      <option>I-485</option>
                      <option>I-130</option>
                      <option>I-539</option>
                      <option>I-765</option>
                    </select>
                  </label>
                  <label>
                    Office / service center
                    <input
                      name="office"
                      placeholder="e.g. California Service Center"
                      required
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    Check estimate
                    <ArrowRight size={15} />
                  </button>
                </form>
                {processingError && (
                  <div className="notice subtle">
                    {processingError}{" "}
                    <a
                      href="https://egov.uscis.gov/processing-times/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View USCIS processing times ↗
                    </a>
                  </div>
                )}
                {processing && (
                  <div className="processing-result">
                    <strong>{processing.estimate}</strong>
                    <p>
                      As of {processing.asOf} ·{" "}
                      {processing.office || "Requested office"}
                    </p>
                    <a
                      href={processing.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Provider source ↗
                    </a>
                  </div>
                )}
              </section>
              <div className="notice subtle">
                <LockKeyhole size={18} />
                <span>
                  This is a single-user local workspace. Documents and settings
                  are stored on disk in this project's data folder. Use a
                  secured deployment with authentication before serving multiple
                  customers.
                </span>
              </div>
            </>
          )}
          <footer className="legal-footer">
            <span>Waypoint · Built for your next chapter</span>
            <span>
              General information, not legal advice.{" "}
              <a href="https://www.uscis.gov" target="_blank" rel="noreferrer">
                Always verify official guidance
                <ArrowUpRight size={12} />
              </a>
            </span>
          </footer>
        </main>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "profile"
                ? "Personalize your journey"
                : "Add a notice date"
            }
          >
            <div className="modal-heading">
              <h2>
                {modal === "profile"
                  ? "Your journey, your plan."
                  : "Add an official notice date"}
              </h2>
              <IconButton
                aria-label="Close dialog"
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </IconButton>
            </div>
            <p>
              {modal === "profile"
                ? "Choose your preparation path. F-1 covers consular preparation; family adjustment of status requires being inside the U.S."
                : "Copy the date from your actual notice. We do not calculate official deadlines."}
            </p>
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                action(async () => {
                  setWorkspace(
                    await api(
                      modal === "profile" ? "/api/profile" : "/api/notices",
                      {
                        method: modal === "profile" ? "PUT" : "POST",
                        body:
                          modal === "profile"
                            ? {
                                visa: f.get("visa"),
                                location: f.get("location"),
                                target: f.get("target"),
                                dependents: f.has("dependents"),
                                translations: f.has("translations"),
                              }
                            : { title: f.get("title"), date: f.get("date") },
                      },
                    ),
                  );
                  setModal(null);
                  setToast("Your plan has been updated");
                });
              }}
            >
              {modal === "profile" ? (
                <>
                  <label>
                    Visa / application type
                    <select name="visa" defaultValue={workspace.profile.visa}>
                      {Object.entries(visaNames).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Where are you applying from?
                    <select
                      name="location"
                      defaultValue={workspace.profile.location}
                    >
                      <option value="inside">Inside the United States</option>
                      <option value="outside">Outside the United States</option>
                    </select>
                  </label>
                  <label>
                    Target filing / interview date{" "}
                    <span className="optional">Optional</span>
                    <input
                      name="target"
                      type="date"
                      defaultValue={workspace.profile.target}
                    />
                  </label>
                  <p className="input-hint">
                    Used only to plan preparation. This is not an official
                    deadline.
                  </p>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="dependents"
                      defaultChecked={workspace.profile.dependents}
                    />
                    I’m including a spouse or children
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="translations"
                      defaultChecked={workspace.profile.translations}
                    />
                    I have documents that need English translation
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Milestone title
                    <input
                      name="title"
                      placeholder="e.g. RFE response deadline"
                      required
                      maxLength={120}
                    />
                  </label>
                  <label>
                    Date on your notice
                    <input name="date" type="date" required />
                  </label>
                </>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  {busy ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Save {modal === "profile" ? "my plan" : "date"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Stat({ icon: Icon, label, value, suffix, foot, tint, progress }) {
  return (
    <article className="stat-card">
      <div className="stat-heading">
        <span>{label}</span>
        <span className={"stat-icon " + tint}>
          <Icon size={19} />
        </span>
      </div>
      <div className={"stat-value " + (value === "Not set" ? "smaller" : "")}>
        {value}
        <span>{suffix}</span>
      </div>
      {progress !== undefined ? (
        <div className="stat-progress">
          <i style={{ width: progress + "%" }} />
        </div>
      ) : null}
      <p>{foot}</p>
    </article>
  );
}
function PanelHead({ icon: Icon, title, aside }) {
  return (
    <div className="panel-heading">
      <h3>
        {Icon && <Icon size={18} />}
        {title}
      </h3>
      {aside}
    </div>
  );
}
function CheckRow({ item, done, onToggle, expanded, disabled }) {
  return (
    <div className={"check-row " + (done ? "is-done" : "")}>
      <button
        className="check-toggle"
        aria-label={(done ? "Mark incomplete: " : "Mark ready: ") + item.title}
        aria-pressed={done}
        disabled={disabled}
        onClick={onToggle}
      >
        {done && <Check size={13} />}
      </button>
      <div className="check-content">
        <strong>{item.title}</strong>
        {expanded ? (
          <>
            <p>{item.detail}</p>
            <small>
              {item.due
                ? "Planning target: " + dateLabel(item.due)
                : "Planning date not set"}
            </small>
          </>
        ) : (
          <small>{item.group}</small>
        )}
      </div>
      <span className={"document-state " + (done ? "ready" : "")}>
        {done ? "Ready" : "To prepare"}
      </span>
    </div>
  );
}
function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      <Icon size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function SourceLink({ source }) {
  return (
    <a
      className="source-link"
      href={source.url}
      target="_blank"
      rel="noreferrer"
    >
      <BookOpen size={15} />
      {source.label}
      <ExternalLink size={13} />
    </a>
  );
}
createRoot(document.getElementById("root")).render(<App />);
