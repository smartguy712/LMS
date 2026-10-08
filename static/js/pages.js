const { useState, useEffect } = React;
const { Link, useNavigate, useParams } = ReactRouterDOM;

/* ===================== LOGIN ===================== */
function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate("/"); }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card p-4 shadow-lg">
        <div className="text-center mb-3">
          <i className="bi bi-mortarboard-fill" style={{ fontSize: "2.5rem", color: "#1F4E79" }}></i>
          <h3 className="mt-2">Siyafundza LMS</h3>
          <p className="text-muted">Sign in to continue</p>
        </div>
        <Alert type="danger" message={error} onClose={() => setError("")} />
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input className="form-control" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input type="password" className="form-control" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button className="btn btn-brand w-100" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>
        </form>
        <p className="text-center mt-3 mb-0">No account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}

/* ===================== REGISTER ===================== */
function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", username: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { if (user) navigate("/"); }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await register(form);
      setMsg("Registration successful! Please log in.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card p-4 shadow-lg">
        <h3 className="mb-3">Create Account</h3>
        <Alert type="danger" message={error} />
        <Alert type="success" message={msg} />
        <form onSubmit={submit}>
          {["full_name", "username", "email", "password"].map((f) => (
            <div className="mb-3" key={f}>
              <label className="form-label text-capitalize">{f.replace("_", " ")}</label>
              <input type={f === "password" ? "password" : f === "email" ? "email" : "text"}
                className="form-control" required minLength={f === "password" ? 6 : undefined}
                value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            </div>
          ))}
          <button className="btn btn-brand w-100">Register</button>
        </form>
        <p className="text-center mt-3 mb-0">Have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}

/* ===================== DASHBOARD ===================== */
function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    API.get("/dashboard").then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <Alert type="danger" message={err} />;
  if (!data) return <Loading />;

  if (user.role === "teacher") {
    return (
      <div>
        <h2 className="page-title mb-4">Teacher Dashboard</h2>
        <div className="row g-3 mb-4">
          <div className="col-md-4"><StatCard value={data.tests?.length || 0} label="My Tests" /></div>
          <div className="col-md-4"><StatCard value={data.pending?.length || 0} label="Pending Grading" /></div>
          <div className="col-md-4"><StatCard value={data.resources?.length || 0} label="Recent Resources" /></div>
        </div>
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header d-flex justify-content-between">
                <span>My Tests</span>
                <Link to="/tests/create" className="btn btn-sm btn-brand">+ New Test</Link>
              </div>
              <ul className="list-group list-group-flush">
                {(data.tests || []).map((t) => (
                  <li key={t.id} className="list-group-item d-flex justify-content-between">
                    <span>{t.title} <span className="badge bg-secondary">{t.total_marks} marks</span>
                      {t.is_published ? <span className="badge bg-success ms-1">Published</span> : <span className="badge bg-warning text-dark ms-1">Draft</span>}
                    </span>
                    <Link to={`/tests/${t.id}/edit`} className="btn btn-sm btn-outline-primary">Edit</Link>
                  </li>
                ))}
                {!data.tests?.length && <li className="list-group-item text-muted">No tests yet.</li>}
              </ul>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">Pending Submissions</div>
              <ul className="list-group list-group-flush">
                {(data.pending || []).map((s) => (
                  <li key={s.id} className="list-group-item d-flex justify-content-between">
                    <span>{s.student_name} – {s.test_title}</span>
                    <Link to={`/submissions/${s.id}/grade`} className="btn btn-sm btn-warning">Grade</Link>
                  </li>
                ))}
                {!data.pending?.length && <li className="list-group-item text-muted">No pending submissions.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Student dashboard
  return (
    <div>
      <h2 className="page-title mb-4">Student Dashboard</h2>
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between">
              <span>Available Tests</span>
              <Link to="/tests" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <ul className="list-group list-group-flush">
              {(data.tests || []).map((t) => (
                <li key={t.id} className="list-group-item d-flex justify-content-between">
                  <span>{t.title} <span className="badge bg-secondary">{t.total_marks} marks</span></span>
                  <Link to={`/tests/${t.id}/take`} className="btn btn-sm btn-brand">Take Test</Link>
                </li>
              ))}
              {!data.tests?.length && <li className="list-group-item text-muted">No tests available.</li>}
            </ul>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">My Recent Results</div>
            <ul className="list-group list-group-flush">
              {(data.my_subs || []).map((s) => (
                <li key={s.id} className="list-group-item d-flex justify-content-between">
                  <span>{s.test_title}{" "}
                    {s.status === "graded"
                      ? <span className="badge bg-success">{s.score}/{s.max_score}</span>
                      : <span className="badge bg-warning text-dark">{s.status}</span>}
                  </span>
                  <Link to={`/results/${s.id}`} className="btn btn-sm btn-outline-secondary">View</Link>
                </li>
              ))}
              {!data.my_subs?.length && <li className="list-group-item text-muted">No submissions yet.</li>}
            </ul>
          </div>
        </div>
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between">
              <span>Recent Shared Resources</span>
              <Link to="/resources" className="btn btn-sm btn-outline-primary">Browse All</Link>
            </div>
            <ul className="list-group list-group-flush">
              {(data.resources || []).map((r) => (
                <li key={r.id} className="list-group-item">
                  <strong>{r.title}</strong>{" "}
                  <span className="badge bg-info text-dark">{r.resource_type}</span>{" "}
                  <small className="text-muted">by {r.uploader_name}</small>
                </li>
              ))}
              {!data.resources?.length && <li className="list-group-item text-muted">No resources yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== RESOURCES ===================== */
function ResourcesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");
  const [err, setErr] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const load = () => {
    const q = type ? `?type=${type}` : "";
    API.get(`/resources${q}`).then((d) => setItems(d.resources)).catch((e) => setErr(e.message));
  };
  useEffect(load, [type]);

  const del = async (id) => {
    if (!confirm("Delete this resource?")) return;
    await API.del(`/resources/${id}`);
    load();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">Shared Resources</h2>
        <button className="btn btn-brand" onClick={() => setShowUpload(true)}>
          <i className="bi bi-upload"></i> Share Resource
        </button>
      </div>
      <div className="mb-3">
        {["", "notes", "revision", "other"].map((t) => (
          <button key={t || "all"} className={`btn btn-sm me-1 ${type === t ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setType(t)}>{t || "All"}</button>
        ))}
      </div>
      <Alert type="danger" message={err} />
      {showUpload && <UploadResourceModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />}
      <div className="row g-3">
        {items.map((r) => (
          <div className="col-md-4" key={r.id}>
            <div className="card h-100">
              <div className="card-body">
                <h5>{r.title}</h5>
                <span className="badge bg-info text-dark mb-2">{r.resource_type}</span>
                <p className="small text-muted">{r.description || "No description"}</p>
                <p className="small mb-0">By {r.uploader_name}</p>
              </div>
              <div className="card-footer bg-white d-flex gap-2">
                {r.filename && (
                  <a href={`/api/resources/${r.id}/download`} className="btn btn-sm btn-outline-primary" target="_blank">Download</a>
                )}
                {(r.uploaded_by === user.id || user.role === "teacher") && (
                  <button className="btn btn-sm btn-outline-danger" onClick={() => del(r.id)}>Delete</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!items.length && <div className="col-12"><Empty text="No resources found. Be the first to share!" /></div>}
      </div>
    </div>
  );
}

function UploadResourceModal({ onClose, onDone }) {
  const [form, setForm] = useState({ title: "", description: "", resource_type: "notes" });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("resource_type", form.resource_type);
      if (file) fd.append("file", file);
      await API.upload("/resources", fd);
      onDone();
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,.4)" }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Share a Resource</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              <Alert type="danger" message={err} />
              <div className="mb-2">
                <label className="form-label">Title *</label>
                <input className="form-control" required value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="mb-2">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="2" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="mb-2">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.resource_type}
                  onChange={(e) => setForm({ ...form, resource_type: e.target.value })}>
                  <option value="notes">Notes</option>
                  <option value="revision">Revision Exercise</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label">File (optional)</label>
                <input type="file" className="form-control" onChange={(e) => setFile(e.target.files[0])} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-brand" disabled={busy}>{busy ? "Uploading…" : "Share"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ===================== TESTS LIST ===================== */
function TestsPage() {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [err, setErr] = useState("");

  const load = () => API.get("/tests").then((d) => setTests(d.tests)).catch((e) => setErr(e.message));
  useEffect(load, []);

  const del = async (id) => {
    if (!confirm("Delete this test and all submissions?")) return;
    await API.del(`/tests/${id}`);
    load();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">{user.role === "teacher" ? "My Tests" : "Available Tests"}</h2>
        {user.role === "teacher" && <Link to="/tests/create" className="btn btn-brand">+ Create Test</Link>}
      </div>
      <Alert type="danger" message={err} />
      <div className="row g-3">
        {tests.map((t) => (
          <div className="col-md-6" key={t.id}>
            <div className="card">
              <div className="card-body">
                <h5>{t.title}</h5>
                <p className="text-muted small">{t.description || ""}</p>
                <span className="badge bg-secondary me-1">{t.total_marks} marks</span>
                <span className="badge bg-secondary me-1">{t.duration_minutes} min</span>
                {user.role === "teacher" && (
                  t.is_published
                    ? <span className="badge bg-success">Published</span>
                    : <span className="badge bg-warning text-dark">Draft</span>
                )}
              </div>
              <div className="card-footer bg-white d-flex gap-2">
                {user.role === "teacher" ? (
                  <>
                    <Link to={`/tests/${t.id}/edit`} className="btn btn-sm btn-primary">Edit / Questions</Link>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => del(t.id)}>Delete</button>
                  </>
                ) : (
                  <Link to={`/tests/${t.id}/take`} className="btn btn-sm btn-brand">Take Test</Link>
                )}
              </div>
            </div>
          </div>
        ))}
        {!tests.length && <div className="col-12"><Empty text="No tests found." /></div>}
      </div>
    </div>
  );
}

/* ===================== CREATE TEST ===================== */
function CreateTestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", total_marks: 50, duration_minutes: 60 });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const d = await API.post("/tests", form);
      navigate(`/tests/${d.test.id}/edit`);
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-7">
        <div className="card p-4">
          <h3 className="page-title">Create New Test</h3>
          <Alert type="danger" message={err} />
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">Title *</label>
              <input className="form-control" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Grade 4 Religious Education – Term 2" />
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows="2" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Total Marks (max 50)</label>
                <input type="number" className="form-control" min="1" max="50" value={form.total_marks}
                  onChange={(e) => setForm({ ...form, total_marks: +e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Duration (minutes)</label>
                <input type="number" className="form-control" min="5" value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} />
              </div>
            </div>
            <button className="btn btn-brand">Create & Add Questions</button>
            <Link to="/tests" className="btn btn-outline-secondary ms-2">Cancel</Link>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ===================== EDIT TEST ===================== */
function EditTestPage() {
  const { testId } = useParams();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [qForm, setQForm] = useState({
    question_text: "", question_type: "mcq", marks: 1, correct_answer: "",
    opt_a: "", opt_b: "", opt_c: "", opt_d: ""
  });

  const load = () => {
    API.get(`/tests/${testId}`).then((d) => {
      setTest(d.test);
      setQuestions(d.questions || []);
    }).catch((e) => setErr(e.message));
  };
  useEffect(load, [testId]);

  const totalQ = questions.reduce((s, q) => s + q.marks, 0);

  const addQ = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await API.post(`/tests/${testId}/questions`, qForm);
      setQForm({ question_text: "", question_type: "mcq", marks: 1, correct_answer: "", opt_a: "", opt_b: "", opt_c: "", opt_d: "" });
      setMsg("Question added.");
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const delQ = async (qid) => {
    if (!confirm("Delete question?")) return;
    await API.del(`/tests/${testId}/questions/${qid}`);
    load();
  };

  const togglePublish = async () => {
    try {
      await API.post(`/tests/${testId}/${test.is_published ? "unpublish" : "publish"}`, {});
      load();
      setMsg(test.is_published ? "Unpublished." : "Published!");
    } catch (ex) { setErr(ex.message); }
  };

  if (!test && !err) return <Loading />;
  if (err && !test) return <Alert type="danger" message={err} />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="page-title mb-1">{test.title}</h2>
          <span className="badge bg-secondary me-1">{totalQ} / {test.total_marks} marks used</span>
          {test.is_published
            ? <span className="badge bg-success">Published</span>
            : <span className="badge bg-warning text-dark">Draft</span>}
        </div>
        <div className="d-flex gap-2">
          <button className={`btn ${test.is_published ? "btn-outline-warning" : "btn-success"}`} onClick={togglePublish}>
            {test.is_published ? "Unpublish" : "Publish Test"}
          </button>
          <Link to="/tests" className="btn btn-outline-secondary">Back</Link>
        </div>
      </div>
      <Alert type="danger" message={err} onClose={() => setErr("")} />
      <Alert type="success" message={msg} onClose={() => setMsg("")} />
      <div className="row g-4">
        <div className="col-md-7">
          <div className="card">
            <div className="card-header">Questions ({questions.length})</div>
            <ul className="list-group list-group-flush">
              {questions.map((q, i) => (
                <li key={q.id} className="list-group-item d-flex justify-content-between">
                  <div>
                    <strong>Q{i + 1}.</strong> {q.question_text}{" "}
                    <span className="badge bg-info text-dark">{q.question_type}</span>{" "}
                    <span className="badge bg-secondary">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                    {q.correct_answer && <><br /><small className="text-success">Answer: {q.correct_answer}</small></>}
                  </div>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => delQ(q.id)}>×</button>
                </li>
              ))}
              {!questions.length && <li className="list-group-item text-muted">No questions yet.</li>}
            </ul>
          </div>
        </div>
        <div className="col-md-5">
          <div className="card p-3">
            <h5>Add Question</h5>
            <form onSubmit={addQ}>
              <div className="mb-2">
                <label className="form-label">Question Text</label>
                <textarea className="form-control" rows="2" required value={qForm.question_text}
                  onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })} />
              </div>
              <div className="mb-2">
                <label className="form-label">Type</label>
                <select className="form-select" value={qForm.question_type}
                  onChange={(e) => setQForm({ ...qForm, question_type: e.target.value })}>
                  <option value="mcq">Multiple Choice</option>
                  <option value="short">Short Answer</option>
                  <option value="essay">Essay / Long Answer</option>
                </select>
              </div>
              {qForm.question_type === "mcq" && (
                <div className="mb-2">
                  {["a", "b", "c", "d"].map((l) => (
                    <input key={l} className="form-control form-control-sm mb-1"
                      placeholder={`Option ${l.toUpperCase()}`}
                      value={qForm[`opt_${l}`]}
                      onChange={(e) => setQForm({ ...qForm, [`opt_${l}`]: e.target.value })} />
                  ))}
                </div>
              )}
              <div className="mb-2">
                <label className="form-label">Correct Answer <small className="text-muted">(A/B/C/D or exact text)</small></label>
                <input className="form-control" value={qForm.correct_answer}
                  onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">Marks</label>
                <input type="number" className="form-control" min="1" max="50" value={qForm.marks}
                  onChange={(e) => setQForm({ ...qForm, marks: +e.target.value })} />
              </div>
              <button className="btn btn-brand w-100">Add Question</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== TAKE TEST ===================== */
function TakeTestPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    API.get(`/tests/${testId}/take`)
      .then((d) => { setTest(d.test); setQuestions(d.questions || []); })
      .catch((e) => setErr(e.message));
  }, [testId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!confirm("Submit your answers? You cannot change them later.")) return;
    setBusy(true);
    try {
      const d = await API.post(`/tests/${testId}/submit`, { answers });
      navigate(`/results/${d.submission_id}`);
    } catch (ex) { setErr(ex.message); setBusy(false); }
  };

  if (err && !test) return <Alert type="danger" message={err} />;
  if (!test) return <Loading />;

  return (
    <div>
      <div className="card p-4 mb-3">
        <h2 className="page-title">{test.title}</h2>
        <p className="text-muted">{test.description || ""}</p>
        <span className="badge bg-secondary me-1">{test.total_marks} marks</span>
        <span className="badge bg-secondary">{test.duration_minutes} minutes</span>
      </div>
      <Alert type="danger" message={err} />
      <form onSubmit={submit}>
        {questions.map((q, i) => {
          let opts = [];
          try { opts = q.options ? JSON.parse(q.options) : []; } catch (_) {}
          return (
            <div className="card mb-3 q-card" key={q.id}>
              <div className="card-body">
                <h5>Question {i + 1} <span className="badge bg-secondary">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span></h5>
                <p>{q.question_text}</p>
                {q.question_type === "mcq" && ["A", "B", "C", "D"].map((letter, idx) =>
                  opts[idx] ? (
                    <div className="form-check" key={letter}>
                      <input className="form-check-input" type="radio" name={`q_${q.id}`} id={`q${q.id}_${letter}`}
                        value={letter} required
                        checked={answers[q.id] === letter}
                        onChange={() => setAnswers({ ...answers, [q.id]: letter })} />
                      <label className="form-check-label" htmlFor={`q${q.id}_${letter}`}>{letter}. {opts[idx]}</label>
                    </div>
                  ) : null
                )}
                {q.question_type === "short" && (
                  <input className="form-control" required placeholder="Your answer"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                )}
                {q.question_type === "essay" && (
                  <textarea className="form-control" rows="4" required placeholder="Write your answer..."
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                )}
              </div>
            </div>
          );
        })}
        <button className="btn btn-brand btn-lg" disabled={busy}>{busy ? "Submitting…" : "Submit Test"}</button>
        <Link to="/tests" className="btn btn-outline-secondary btn-lg ms-2">Cancel</Link>
      </form>
    </div>
  );
}

/* ===================== SUBMISSIONS (teacher) ===================== */
function SubmissionsPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    API.get("/submissions").then((d) => setRows(d.submissions)).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <h2 className="page-title mb-3">Student Submissions</h2>
      <Alert type="danger" message={err} />
      <div className="table-responsive">
        <table className="table table-hover bg-white">
          <thead className="table-light">
            <tr><th>Student</th><th>Test</th><th>Status</th><th>Score</th><th>Submitted</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.student_name}</td>
                <td>{s.test_title}</td>
                <td>
                  {s.status === "graded" ? <span className="badge bg-success">Graded</span>
                    : s.status === "submitted" ? <span className="badge bg-warning text-dark">Needs Grading</span>
                    : <span className="badge bg-secondary">{s.status}</span>}
                </td>
                <td>{s.score != null ? `${s.score}/${s.max_score}` : "—"}</td>
                <td>{s.submitted_at ? s.submitted_at.slice(0, 16) : "—"}</td>
                <td>
                  {s.status === "submitted"
                    ? <Link to={`/submissions/${s.id}/grade`} className="btn btn-sm btn-warning">Grade</Link>
                    : <Link to={`/results/${s.id}`} className="btn btn-sm btn-outline-secondary">View</Link>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="6" className="text-muted">No submissions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== GRADE ===================== */
function GradePage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [marks, setMarks] = useState({});
  const [feedback, setFeedback] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    API.get(`/submissions/${submissionId}`)
      .then((d) => {
        setSub(d.submission);
        setAnswers(d.answers || []);
        const m = {};
        (d.answers || []).forEach((a) => { m[a.id] = a.marks_awarded ?? ""; });
        setMarks(m);
        setFeedback(d.submission.feedback || "");
      })
      .catch((e) => setErr(e.message));
  }, [submissionId]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await API.post(`/submissions/${submissionId}/grade`, { marks, feedback });
      navigate("/submissions");
    } catch (ex) { setErr(ex.message); setBusy(false); }
  };

  if (!sub && !err) return <Loading />;
  if (err && !sub) return <Alert type="danger" message={err} />;

  return (
    <div>
      <h2 className="page-title">Grade: {sub.student_name} – {sub.test_title}</h2>
      <p className="text-muted">Total possible: {sub.total_marks} marks</p>
      <Alert type="danger" message={err} />
      <form onSubmit={submit}>
        {answers.map((a) => (
          <div className="card mb-3" key={a.id}>
            <div className="card-body">
              <h6>{a.question_text}{" "}
                <span className="badge bg-secondary">{a.max_marks} marks</span>{" "}
                <span className="badge bg-info text-dark">{a.question_type}</span>
              </h6>
              <p className="mb-1"><strong>Student answer:</strong></p>
              <div className="bg-light p-2 rounded mb-2">{a.answer_text || "(blank)"}</div>
              {a.correct_answer && <p className="small text-success">Expected: {a.correct_answer}</p>}
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0">Marks awarded</label>
                <input type="number" className="form-control form-control-sm" style={{ width: 80 }}
                  min="0" max={a.max_marks} step="0.5"
                  value={marks[a.id]}
                  onChange={(e) => setMarks({ ...marks, [a.id]: e.target.value })} />
                <span className="text-muted small">/ {a.max_marks}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="mb-3">
          <label className="form-label">Feedback (optional)</label>
          <textarea className="form-control" rows="2" value={feedback}
            onChange={(e) => setFeedback(e.target.value)} />
        </div>
        <button className="btn btn-brand btn-lg" disabled={busy}>{busy ? "Saving…" : "Save Grade"}</button>
        <Link to="/submissions" className="btn btn-outline-secondary btn-lg ms-2">Cancel</Link>
      </form>
    </div>
  );
}

/* ===================== RESULTS ===================== */
function ResultPage() {
  const { submissionId } = useParams();
  const [sub, setSub] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    API.get(`/results/${submissionId}`)
      .then((d) => { setSub(d.submission); setAnswers(d.answers || []); })
      .catch((e) => setErr(e.message));
  }, [submissionId]);

  if (!sub && !err) return <Loading />;
  if (err) return <Alert type="danger" message={err} />;

  return (
    <div>
      <div className="card p-4 mb-4">
        <h2 className="page-title">{sub.test_title}</h2>
        <p>Student: <strong>{sub.student_name}</strong></p>
        <p>Status: {sub.status === "graded"
          ? <span className="badge bg-success">Graded</span>
          : <span className="badge bg-warning text-dark">{sub.status}</span>}</p>
        {sub.score != null && <h3 className="text-primary">Score: {sub.score} / {sub.total_marks}</h3>}
        {sub.feedback && <div className="alert alert-info mt-2"><strong>Teacher feedback:</strong> {sub.feedback}</div>}
      </div>
      {answers.map((a) => (
        <div className="card mb-2" key={a.id}>
          <div className="card-body">
            <h6>{a.question_text}{" "}
              <span className="badge bg-secondary">
                {a.marks_awarded != null ? a.marks_awarded : "?"} / {a.max_marks}
              </span>
            </h6>
            <p className="mb-0"><strong>Your answer:</strong> {a.answer_text || "(blank)"}</p>
          </div>
        </div>
      ))}
      <Link to="/" className="btn btn-outline-secondary mt-3">Back to Dashboard</Link>
    </div>
  );
}

/* ===================== USERS (admin) ===================== */
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    API.get("/users").then((d) => setUsers(d.users)).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <h2 className="page-title mb-3">Registered Users</h2>
      <p className="text-muted">Teachers act as administrators and can view all users.</p>
      <Alert type="danger" message={err} />
      <div className="table-responsive">
        <table className="table table-hover bg-white">
          <thead className="table-light">
            <tr><th>ID</th><th>Full Name</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.full_name}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${u.role === "teacher" ? "bg-primary" : "bg-secondary"}`}>{u.role}</span></td>
                <td>{u.created_at ? u.created_at.slice(0, 10) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
