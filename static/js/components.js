const { Link, NavLink, useNavigate } = ReactRouterDOM;
const { useState, useEffect } = React;

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark mb-4">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          <i className="bi bi-mortarboard-fill me-1"></i> Siyafundza LMS
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><NavLink className="nav-link" to="/">Dashboard</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/resources">Resources</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/tests">Tests</NavLink></li>
            {user.role === "teacher" && (
              <>
                <li className="nav-item"><NavLink className="nav-link" to="/submissions">Submissions</NavLink></li>
                <li className="nav-item"><NavLink className="nav-link" to="/users">Users</NavLink></li>
              </>
            )}
          </ul>
          <span className="navbar-text text-white me-3">
            <i className="bi bi-person-circle"></i> {user.full_name}{" "}
            <span className="badge bg-light text-dark badge-role">{user.role}</span>
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

function Alert({ type, message, onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${type} alert-dismissible fade show`} role="alert">
      {message}
      {onClose && <button type="button" className="btn-close" onClick={onClose}></button>}
    </div>
  );
}

function Loading() {
  return (
    <div className="spinner-overlay">
      <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }}></div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="card p-3 text-center h-100">
      <div className="stat-num">{value}</div>
      <div className="text-muted">{label}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="alert alert-info mb-0">{text}</div>;
}

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user && role && user.role !== role) navigate("/");
  }, [user, loading, role]);
  if (loading) return <Loading />;
  if (!user) return null;
  if (role && user.role !== role) return null;
  return children;
}
