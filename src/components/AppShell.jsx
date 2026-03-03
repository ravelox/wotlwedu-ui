import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { extractCollection } from "../lib/api";

const NAV_ITEMS = [
  { label: "Home", to: "/app/home", icon: "◐" },
  { label: "Vote", to: "/app/cast-vote", icon: "◎" },
  { label: "Elections", to: "/app/elections", icon: "◒" },
  { label: "Friends", to: "/app/friend", icon: "◌" },
  { label: "Profile", to: "/app/profile", icon: "◍" },
];

export default function AppShell({
  children,
  session,
  api,
  appVersion,
  activeWorkgroupId,
  onChangeActiveWorkgroupId,
}) {
  const [workgroups, setWorkgroups] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadChromeData() {
      if (!session?.authToken) return;

      const [workgroupsRes, unreadRes] = await Promise.all([
        api.get("/workgroup", { params: { page: 1, items: 100 } }),
        api.get("/notification/unreadcount"),
      ]);

      if (!cancelled) {
        const workgroupsList = extractCollection(workgroupsRes, "workgroups");
        setWorkgroups(Array.isArray(workgroupsList) ? workgroupsList : []);

        const unread =
          unreadRes.data?.count ??
          unreadRes.data?.data?.count ??
          unreadRes.data?.data ??
          0;
        setUnreadCount(Number(unread) || 0);
      }
    }

    loadChromeData().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [api, session?.authToken]);

  return (
    <div className="app-frame">
      <div className="device-shell">
        <div className="device-background" />
        <div className="device-screen">
          <header className="shell-topbar">
            <div>
              <p className="eyebrow">wotlwedu UI</p>
              <h1>{session?.alias || session?.email || "Workspace"}</h1>
            </div>
            <div className="topbar-pill">
              <span className="status-dot" />
              {unreadCount} alerts
            </div>
          </header>

          <section className="shell-meta">
            <div className="scope-card">
              <div>
                <div className="scope-label">Workgroup Scope</div>
                <select
                  value={activeWorkgroupId || ""}
                  onChange={(event) =>
                    onChangeActiveWorkgroupId(
                      event.target.value === "" ? null : event.target.value
                    )
                  }
                >
                  <option value="">All visible workgroups</option>
                  {workgroups.map((workgroup) => (
                    <option key={workgroup.id} value={workgroup.id}>
                      {workgroup.name || workgroup.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="version-badge">v{appVersion}</div>
            </div>
          </section>

          <main className="shell-content">{children}</main>

          <nav className="bottom-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `bottom-nav-link${isActive ? " bottom-nav-link-active" : ""}`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
