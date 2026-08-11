import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticationService, ProjectService, ReportService } from './services/api';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// App Pages
import Dashboard from './pages/dashboard/Dashboard';
import CreateProject from './pages/projects/CreateProject';
import ProjectDetails from './pages/projects/ProjectDetails';
import UserProfile from './pages/profile/UserProfile';
import Settings from './pages/settings/Settings';

// Layout Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// React Error Boundary to catch UI errors gracefully and prevent black screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xl">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-100">Application View Recovered</h2>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            An unexpected view state occurred. Click below to return safely to the main dashboard.
          </p>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [projects, setProjects] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  // Keep a ref of projects to prevent stale closure inside polling interval
  const projectsRef = React.useRef([]);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Fetch data from database for current authenticated user
  async function fetchData(activeSession) {
    const currentSession = activeSession || session;
    if (!currentSession?.user?.id) {
      setProjects([]);
      setTestCases([]);
      setExecutions([]);
      setSelectedProject(null);
      setLoading(false);
      return;
    }

    const userId = currentSession.user.id;

    try {
      const projData = await ProjectService.listProjects();
      const testData = await ProjectService.listTestCases();
      const execData = await ReportService.listAllExecutions();

      if (projData) {
        setProjects(projData);
        projectsRef.current = projData;

        if (projData.length > 0) {
          setSelectedProject(projData[0]);
        } else {
          setSelectedProject(null);
        }

        const projIds = new Set(projData.map(p => p.id));
        if (testData) {
          setTestCases(testData.filter(t => projIds.has(t.project_id || t.projectId) || t.user_id === userId));
        } else {
          setTestCases([]);
        }

        if (execData) {
          setExecutions(execData.filter(e => projIds.has(e.project_id || e.projectId) || e.user_id === userId));
        } else {
          setExecutions([]);
        }
      } else {
        setProjects([]);
        setTestCases([]);
        setExecutions([]);
        setSelectedProject(null);
      }
    } catch (err) {
      console.error('Error fetching dynamic cloud records:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Re-fetch data on Auth state changes (Login / Logout / Token refresh)
    const { data: { subscription } } = AuthenticationService.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        fetchData(currentSession);
      } else {
        setProjects([]);
        setTestCases([]);
        setExecutions([]);
        setSelectedProject(null);
        setLoading(false);
      }
    });

    // POLLING: Poll executions every 3 seconds without stale closure wiping state
    const execPollInterval = setInterval(async () => {
      if (!session?.user?.id) return;
      const currentUserId = session.user.id;
      try {
        const execData = await ReportService.listAllExecutions();

        if (execData && execData.length > 0) {
          const currentProjIds = new Set(projectsRef.current.map(p => p.id));
          if (currentProjIds.size > 0) {
            setExecutions(execData.filter(e => currentProjIds.has(e.project_id || e.projectId) || e.user_id === currentUserId));
          }
        }
      } catch (e) {
        // silent polling error fallback
      }
    }, 3000);

    return () => {
      subscription?.unsubscribe();
      clearInterval(execPollInterval);
    };
  }, [session?.user?.id]);

  // ── 20-Minute Session Inactivity Auto-Logout Manager ──
  useEffect(() => {
    const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
    const THROTTLE_MS = 10000; // Only update timestamp at most once every 10 seconds

    function recordActivity() {
      const now = Date.now();
      const lastActiveStr = localStorage.getItem('last_active_timestamp');
      if (!lastActiveStr || (now - parseInt(lastActiveStr, 10)) > THROTTLE_MS) {
        localStorage.setItem('last_active_timestamp', now.toString());
      }
    }

    function checkInactivity() {
      const lastActiveStr = localStorage.getItem('last_active_timestamp');
      if (lastActiveStr) {
        const inactiveMs = Date.now() - parseInt(lastActiveStr, 10);
        if (inactiveMs >= INACTIVITY_LIMIT_MS) {
          console.warn('[Session Security] User inactive for 20+ minutes. Signing out...');
          localStorage.removeItem('last_active_timestamp');
          AuthenticationService.logout().then(() => {
            setSession(null);
          });
        }
      } else {
        localStorage.setItem('last_active_timestamp', Date.now().toString());
      }
    }

    recordActivity();

    // Listen for user activity events
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, recordActivity);
    });

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check inactivity state every 10 seconds
    const inactivityInterval = setInterval(checkInactivity, 10000);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, recordActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(inactivityInterval);
    };
  }, []);

  const handleAddProject = async (newProj) => {
    try {
      const createdProj = await ProjectService.createProject(newProj.name, newProj.description);
      if (createdProj) {
        setProjects(prev => [createdProj, ...prev]);
        setSelectedProject(createdProj);
        return createdProj;
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
    return null;
  };

  const handleAddTest = async (newTest) => {
    try {
      const createdTest = await ProjectService.createTestCase(newTest);
      if (createdTest) {
        setTestCases([createdTest, ...testCases]);
      }
    } catch (err) {
      console.error('Failed to add test case:', err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await ProjectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => String(p.id) !== String(projectId)));
      setTestCases(prev => prev.filter(tc => String(tc.project_id || tc.projectId) !== String(projectId)));
      setExecutions(prev => prev.filter(e => String(e.project_id || e.projectId) !== String(projectId)));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={session ? <Navigate to="/" replace /> : <Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/*" element={
            !session ? (
              <Navigate to="/login" replace />
            ) : (
              <div className="flex h-screen overflow-hidden page-bg">
                <Sidebar projects={projects} selectedProject={selectedProject} setSelectedProject={setSelectedProject} />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header selectedProject={selectedProject} />
                  <main className="flex-1 overflow-y-auto p-6 scrollbar-thin page-bg">
                    <Routes>
                      <Route path="/" element={<Dashboard projects={projects} executions={executions} onDeleteProject={handleDeleteProject} />} />
                      <Route path="/projects/create" element={<CreateProject projects={projects} setProjects={handleAddProject} />} />
                      <Route path="/projects/:id" element={
                        <ProjectDetails
                          projects={projects}
                          testCases={testCases}
                          setTestCases={saveTestsState => setTestCases(saveTestsState)}
                          executions={executions}
                          setExecutions={saveRunsState => setExecutions(saveRunsState)}
                          onDeleteProject={handleDeleteProject}
                        />
                      } />
                      <Route path="/profile" element={<UserProfile />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </div>
            )
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
