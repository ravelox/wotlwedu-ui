import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { extractCollection, extractUnreadNotificationCount } from "../lib/api";
import { connectLiveNotifications } from "../lib/liveNotifications";

export default function AppShell({
  children,
  session,
  api,
  appVersion,
  activeWorkgroupId,
  onChangeActiveWorkgroupId,
  themeMode,
  onChangeThemeMode,
  onLogout,
}) {
  const [workgroups, setWorkgroups] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const activeWorkgroup = workgroups.find((workgroup) => workgroup.id === activeWorkgroupId);
  const navItems = [
    { label: "Home", short: "Home", to: "/app/home" },
    { label: "Vote", short: "Vote", to: "/app/cast-vote" },
    { label: "Create", short: "Create", to: "/app/create-poll", primary: true },
    { label: "Polls", short: "Polls", to: "/app/polls" },
    { label: "Alerts", short: "Alerts", to: "/app/notifications", badge: unreadCount },
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadChromeData() {
      if (!session?.authToken) return;

      const [workgroupsRes, unreadRes] = await Promise.all([
        api.get("/space", { params: { page: 1, items: 100 } }),
        api.get("/notification/unreadcount"),
      ]);

      if (!cancelled) {
        const workgroupsList = extractCollection(workgroupsRes, "workgroups");
        setWorkgroups(Array.isArray(workgroupsList) ? workgroupsList : []);

        setUnreadCount(extractUnreadNotificationCount(unreadRes));
      }
    }

    loadChromeData().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [api, session?.authToken]);

  useEffect(() => {
    if (!session?.userId) return undefined;
    const socket = connectLiveNotifications({
      api,
      userId: session.userId,
      onNotification: (payload) => {
        if (payload?.unreadCount !== undefined) {
          setUnreadCount(extractUnreadNotificationCount(payload));
          return;
        }
        setUnreadCount((current) => current + 1);
      },
      onPollUpdate: () => {
        api.get("/notification/unreadcount")
          .then((response) => {
            setUnreadCount(extractUnreadNotificationCount(response));
          })
          .catch(() => {});
      },
    });

    return () => {
      if (socket) {
        socket.emit("unregister");
        socket.disconnect();
      }
    };
  }, [api, session?.userId]);

  return (
    <div className="app-frame">
      <div className="device-shell">
        <div className="device-background" />
        <div className="device-screen">
          <header className="shell-topbar">
            <div className="app-brand-block">
              <div className="brand-mark">W</div>
              <div>
                <p className="eyebrow">wotlwedu</p>
                <h1>{session?.alias || session?.email || "Workspace"}</h1>
              </div>
            </div>
            <div className="topbar-actions">
              <NavLink
                to="/app/home"
                className={({ isActive }) =>
                  `topbar-link${isActive ? " topbar-link-active" : ""}`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/app/notifications"
                className={({ isActive }) =>
                  `topbar-link${isActive ? " topbar-link-active" : ""}`
                }
              >
                Alerts
              </NavLink>
              <NavLink
                to="/app/profile"
                className={({ isActive }) =>
                  `topbar-link${isActive ? " topbar-link-active" : ""}`
                }
              >
                Profile
              </NavLink>
              <div className="topbar-pill">
                <span className="status-dot" />
                {unreadCount} notifications
              </div>
              <button className="btn btn-secondary shell-logout" onClick={onLogout} type="button">
                Logout
              </button>
            </div>
          </header>

          <section className="shell-meta">
            <div className="scope-card">
              <div>
                <div className="scope-label">Current Space</div>
                <div>{activeWorkgroup?.name || "All visible spaces"}</div>
              </div>
              <div>
                <div className="scope-label">Space Scope</div>
                <select
                  value={activeWorkgroupId || ""}
                  onChange={(event) =>
                    onChangeActiveWorkgroupId(
                      event.target.value === "" ? null : event.target.value
                    )
                  }
                >
                  <option value="">All visible spaces</option>
                  {workgroups.map((workgroup) => (
                    <option key={workgroup.id} value={workgroup.id}>
                      {workgroup.name || workgroup.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="scope-label">Theme</div>
                <select
                  value={themeMode}
                  onChange={(event) => onChangeThemeMode(event.target.value)}
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="version-badge">v{appVersion}</div>
            </div>
          </section>

          <main className="shell-content">{children}</main>

          <nav
            className="bottom-nav"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `bottom-nav-link${item.primary ? " bottom-nav-primary" : ""}${isActive ? " bottom-nav-link-active" : ""}`
                }
              >
                <span className="bottom-nav-mark">{item.short}</span>
                {item.badge ? <strong className="bottom-nav-badge">{item.badge}</strong> : null}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
