import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import AppShell from "./components/AppShell";
import LegacyAppRedirect from "./components/LegacyAppRedirect";
import { clearSession, getSession, setSession } from "./lib/session";
import { createApi } from "./lib/api";
import { getActiveWorkgroupId, setActiveWorkgroupId } from "./lib/workgroupScope";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterConfirmPage from "./pages/RegisterConfirmPage";
import PasswordRequestPage from "./pages/PasswordRequestPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import Verify2FAPage from "./pages/Verify2FAPage";
import DashboardPage from "./pages/DashboardPage";
import ElectionsPage from "./pages/ElectionsPage";
import FriendsPage from "./pages/FriendsPage";
import NotificationsPage from "./pages/NotificationsPage";
import PreferencesPage from "./pages/PreferencesPage";
import ProfilePage from "./pages/ProfilePage";
import SupportPage from "./pages/SupportPage";
import ContentManagerPage from "./pages/ContentManagerPage";
import ErrorPage from "./pages/ErrorPage";
import StatisticsPage from "./pages/StatisticsPage";
import VotingPage from "./pages/VotingPage";

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_WOTLWEDU_API_BASE_URL || "https://api.wotlwedu.com:9876";
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.1.10";
const API_STORAGE_KEY = "wotlwedu_ui_api_base_url";

function RequireAuth({ session, children }) {
  const location = useLocation();
  if (!session?.authToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState(getSession());
  const [baseUrl, setBaseUrlState] = useState(
    localStorage.getItem(API_STORAGE_KEY) || DEFAULT_API_BASE_URL
  );
  const [activeWorkgroupId, setActiveWorkgroupIdState] = useState(getActiveWorkgroupId());

  const api = useMemo(() => {
    return createApi(baseUrl, () => {
      clearSession();
      setSessionState(null);
      setActiveWorkgroupId(null);
      setActiveWorkgroupIdState(null);
      navigate("/login", { replace: true });
    });
  }, [baseUrl, navigate]);

  function handleLogin(payload) {
    const data = payload?.data || payload;
    const nextSession = {
      authToken: data?.authToken,
      refreshToken: data?.refreshToken,
      userId: data?.userId,
      email: data?.email,
      alias: data?.alias,
      systemAdmin: data?.systemAdmin === true,
      organizationAdmin: data?.organizationAdmin === true,
      workgroupAdmin: data?.workgroupAdmin === true,
      organizationId: data?.organizationId || null,
      adminWorkgroupId: data?.adminWorkgroupId || null,
    };

    setSession(nextSession);
    setSessionState(nextSession);

    if (!getActiveWorkgroupId() && nextSession.workgroupAdmin && nextSession.adminWorkgroupId) {
      setActiveWorkgroupId(nextSession.adminWorkgroupId);
      setActiveWorkgroupIdState(nextSession.adminWorkgroupId);
    }

    navigate("/app/home", { replace: true });
  }

  function handleSessionRefresh(payload) {
    const data = payload?.data || payload;
    const nextSession = {
      authToken: data?.authToken || session?.authToken,
      refreshToken: data?.refreshToken || session?.refreshToken,
      userId: data?.userId || session?.userId,
      email: data?.email || session?.email,
      alias: data?.alias || session?.alias,
      systemAdmin: data?.systemAdmin === true,
      organizationAdmin: data?.organizationAdmin === true,
      workgroupAdmin: data?.workgroupAdmin === true,
      organizationId: data?.organizationId || session?.organizationId || null,
      adminWorkgroupId: data?.adminWorkgroupId || session?.adminWorkgroupId || null,
    };

    setSession(nextSession);
    setSessionState(nextSession);
  }

  function handleLogout() {
    clearSession();
    setSessionState(null);
    setActiveWorkgroupId(null);
    setActiveWorkgroupIdState(null);
    navigate("/login", { replace: true });
  }

  function handleChangeActiveWorkgroupId(id) {
    setActiveWorkgroupId(id);
    setActiveWorkgroupIdState(id);
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage api={api} appVersion={APP_VERSION} onLogin={handleLogin} />}
      />
      <Route path="/register" element={<RegisterPage api={api} appVersion={APP_VERSION} />} />
      <Route
        path="/confirm/:tokenId"
        element={<RegisterConfirmPage api={api} appVersion={APP_VERSION} />}
      />
      <Route
        path="/pwdrequest"
        element={<PasswordRequestPage api={api} appVersion={APP_VERSION} />}
      />
      <Route
        path="/pwdreset/:userId/:resetToken"
        element={<PasswordResetPage api={api} appVersion={APP_VERSION} />}
      />
      <Route
        path="/auth/verify/:userId/:verificationToken"
        element={<Verify2FAPage api={api} appVersion={APP_VERSION} />}
      />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/home" element={<Navigate to="/app/home" replace />} />
      <Route path="/cast-vote" element={<Navigate to="/app/cast-vote" replace />} />
      <Route
        path="/cast-vote/:electionId"
        element={<LegacyAppRedirect to="/app/cast-vote/:electionId" />}
      />
      <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
      <Route path="/friend" element={<Navigate to="/app/friend" replace />} />
      <Route path="/notification" element={<Navigate to="/app/notification" replace />} />
      <Route path="/image" element={<Navigate to="/app/image" replace />} />
      <Route path="/image/add" element={<Navigate to="/app/image/add" replace />} />
      <Route path="/image/:recordId" element={<LegacyAppRedirect to="/app/image/:recordId" />} />
      <Route path="/item" element={<Navigate to="/app/item" replace />} />
      <Route path="/item/add" element={<Navigate to="/app/item/add" replace />} />
      <Route path="/item/:recordId" element={<LegacyAppRedirect to="/app/item/:recordId" />} />
      <Route path="/list" element={<Navigate to="/app/list" replace />} />
      <Route path="/list/add" element={<Navigate to="/app/list/add" replace />} />
      <Route path="/list/:recordId" element={<LegacyAppRedirect to="/app/list/:recordId" />} />
      <Route path="/election" element={<Navigate to="/app/election" replace />} />
      <Route path="/election/add" element={<Navigate to="/app/election/add" replace />} />
      <Route path="/election/:recordId" element={<LegacyAppRedirect to="/app/election/:recordId" />} />
      <Route path="/preference" element={<Navigate to="/app/preference" replace />} />
      <Route path="/preference/add" element={<Navigate to="/app/preference/add" replace />} />
      <Route
        path="/preference/:preferenceId"
        element={<LegacyAppRedirect to="/app/preference/:preferenceId" />}
      />
      <Route
        path="/statistics/:electionId"
        element={<LegacyAppRedirect to="/app/statistics/:electionId" />}
      />
      <Route path="/2fa" element={<Navigate to="/app/profile" replace />} />
      <Route path="/error" element={<ErrorPage appVersion={APP_VERSION} />} />
      <Route
        path="/app/*"
        element={
          <RequireAuth session={session}>
            <AppShell
              api={api}
              appVersion={APP_VERSION}
              session={session}
              activeWorkgroupId={activeWorkgroupId}
              onChangeActiveWorkgroupId={handleChangeActiveWorkgroupId}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/app/home" replace />} />
                <Route
                  path="/home"
                  element={<DashboardPage api={api} activeWorkgroupId={activeWorkgroupId} />}
                />
                <Route
                  path="/dashboard"
                  element={<DashboardPage api={api} activeWorkgroupId={activeWorkgroupId} />}
                />
                <Route path="/cast-vote" element={<VotingPage api={api} />} />
                <Route path="/cast-vote/:electionId" element={<VotingPage api={api} />} />
                <Route
                  path="/elections"
                  element={<ElectionsPage api={api} activeWorkgroupId={activeWorkgroupId} />}
                />
                <Route path="/friend" element={<FriendsPage api={api} />} />
                <Route path="/notification" element={<NotificationsPage api={api} />} />
                <Route path="/notifications" element={<NotificationsPage api={api} />} />
                <Route
                  path="/image"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="image" />
                  }
                />
                <Route
                  path="/image/add"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="image" />
                  }
                />
                <Route
                  path="/image/:recordId"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="image" />
                  }
                />
                <Route
                  path="/item"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="item" />
                  }
                />
                <Route
                  path="/item/add"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="item" />
                  }
                />
                <Route
                  path="/item/:recordId"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="item" />
                  }
                />
                <Route
                  path="/list"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="list" />
                  }
                />
                <Route
                  path="/list/add"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="list" />
                  }
                />
                <Route
                  path="/list/:recordId"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="list" />
                  }
                />
                <Route
                  path="/election"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="election" />
                  }
                />
                <Route
                  path="/election/add"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="election" />
                  }
                />
                <Route
                  path="/election/:recordId"
                  element={
                    <ContentManagerPage api={api} activeWorkgroupId={activeWorkgroupId} kindOverride="election" />
                  }
                />
                <Route path="/preference" element={<PreferencesPage api={api} />} />
                <Route path="/preference/add" element={<PreferencesPage api={api} />} />
                <Route path="/preference/:preferenceId" element={<PreferencesPage api={api} />} />
                <Route path="/statistics/:electionId" element={<StatisticsPage api={api} />} />
                <Route
                  path="/profile"
                  element={
                    <ProfilePage
                      api={api}
                      onSessionRefresh={handleSessionRefresh}
                      session={session}
                      activeWorkgroupId={activeWorkgroupId}
                      onLogout={handleLogout}
                    />
                  }
                />
                <Route path="/support" element={<SupportPage api={api} session={session} />} />
                <Route path="*" element={<Navigate to="/app/home" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to={session?.authToken ? "/app/home" : "/login"} replace />} />
    </Routes>
  );
}
