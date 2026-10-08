const { BrowserRouter, Routes, Route, Navigate } = ReactRouterDOM;

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="container pb-4">{children}</main>
      <footer className="text-center text-muted py-3 small">
        &copy; 2026 Siyafundza Private School LMS
      </footer>
    </>
  );
}

function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/" element={
          user ? <AppLayout><Dashboard /></AppLayout> : <Navigate to="/login" />
        } />
        <Route path="/resources" element={
          user ? <AppLayout><ResourcesPage /></AppLayout> : <Navigate to="/login" />
        } />
        <Route path="/tests" element={
          user ? <AppLayout><TestsPage /></AppLayout> : <Navigate to="/login" />
        } />
        <Route path="/tests/create" element={
          user?.role === "teacher" ? <AppLayout><CreateTestPage /></AppLayout> : <Navigate to="/" />
        } />
        <Route path="/tests/:testId/edit" element={
          user?.role === "teacher" ? <AppLayout><EditTestPage /></AppLayout> : <Navigate to="/" />
        } />
        <Route path="/tests/:testId/take" element={
          user ? <AppLayout><TakeTestPage /></AppLayout> : <Navigate to="/login" />
        } />
        <Route path="/submissions" element={
          user?.role === "teacher" ? <AppLayout><SubmissionsPage /></AppLayout> : <Navigate to="/" />
        } />
        <Route path="/submissions/:submissionId/grade" element={
          user?.role === "teacher" ? <AppLayout><GradePage /></AppLayout> : <Navigate to="/" />
        } />
        <Route path="/results/:submissionId" element={
          user ? <AppLayout><ResultPage /></AppLayout> : <Navigate to="/login" />
        } />
        <Route path="/users" element={
          user?.role === "teacher" ? <AppLayout><UsersPage /></AppLayout> : <Navigate to="/" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
