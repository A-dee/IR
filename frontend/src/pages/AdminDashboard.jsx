import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import ThemeToggle from "../components/ThemeToggle";

// Sidebar sections for the admin dashboard
const sidebarItems = [
  { key: "overview", label: "Overview" },
  { key: "all", label: "All Incidents" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "verified", label: "Verified" },
  { key: "engineers", label: "Engineers" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  // -----------------------------
  // Responsive layout state
  // -----------------------------
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1100;
  const isCompact = windowWidth < 1100;

  // -----------------------------
  // Dashboard / incident states
  // -----------------------------
  const [dashboardData, setDashboardData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [updatesByIncident, setUpdatesByIncident] = useState({});
  const [updatesLoading, setUpdatesLoading] = useState({});

  // -----------------------------
  // Engineer management states
  // -----------------------------
  const [engineers, setEngineers] = useState([]);
  const [engineersLoading, setEngineersLoading] = useState(false);
  const [createEngineerLoading, setCreateEngineerLoading] = useState(false);
  const [deleteEngineerLoadingId, setDeleteEngineerLoadingId] = useState(null);

  // Backend expects: name, password, role, optional company_id
  const [engineerForm, setEngineerForm] = useState({
    name: "",
    password: "",
  });

  // -----------------------------
  // General UI states
  // -----------------------------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [engineerError, setEngineerError] = useState("");
  const [engineerSuccess, setEngineerSuccess] = useState("");

  const [activeView, setActiveView] = useState("overview");
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  // -----------------------------
  // Filters
  // -----------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [engineerFilter, setEngineerFilter] = useState("all");

  // =========================================================
  // HANDLE WINDOW RESIZE
  // =========================================================
  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // =========================================================
  // FETCH DASHBOARD SUMMARY
  // =========================================================
  async function fetchDashboard() {
    const data = await apiRequest("/admin/dashboard", {
      method: "GET",
    });

    setDashboardData(data);
  }

  // =========================================================
  // FETCH ALL INCIDENTS
  // =========================================================
  async function fetchIncidents() {
    const data = await apiRequest("/incidents/", {
      method: "GET",
    });

    const incidentList = Array.isArray(data) ? data : [];
    setIncidents(incidentList);

    if (incidentList.length > 0 && !selectedIncidentId) {
      setSelectedIncidentId(incidentList[0].id);
    }
  }

  // =========================================================
  // FETCH ALL USERS, THEN KEEP ONLY ACTIVE ENGINEERS
  // =========================================================
  async function fetchEngineers() {
    try {
      setEngineersLoading(true);
      setEngineerError("");

      const data = await apiRequest("/admin/users", {
        method: "GET",
      });

      const users = Array.isArray(data) ? data : [];

      const onlyEngineers = users.filter(
        (person) => person.role === "engineer" && person.is_active !== false
      );

      setEngineers(onlyEngineers);
    } catch (err) {
      setEngineerError(err.message || "Failed to load engineers");
    } finally {
      setEngineersLoading(false);
    }
  }

  // =========================================================
  // FETCH UPDATES FOR EACH INCIDENT
  // =========================================================
  async function fetchIncidentUpdates(incidentId) {
    try {
      setUpdatesLoading((prev) => ({
        ...prev,
        [incidentId]: true,
      }));

      const data = await apiRequest(`/incidents/${incidentId}/updates`, {
        method: "GET",
      });

      setUpdatesByIncident((prev) => ({
        ...prev,
        [incidentId]: Array.isArray(data) ? data : [],
      }));
    } catch (err) {
      console.error(`Failed to fetch updates for incident ${incidentId}:`, err.message);
    } finally {
      setUpdatesLoading((prev) => ({
        ...prev,
        [incidentId]: false,
      }));
    }
  }

  // =========================================================
  // LOAD EVERYTHING NEEDED FOR DASHBOARD
  // =========================================================
  async function loadData() {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchDashboard(),
        fetchIncidents(),
        fetchEngineers(),
      ]);
    } catch (err) {
      setError(err.message || "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // CREATE ENGINEER
  // =========================================================
  async function handleCreateEngineer(e) {
    e.preventDefault();
    setEngineerError("");
    setEngineerSuccess("");

    if (!engineerForm.name.trim() || !engineerForm.password.trim()) {
      setEngineerError("Name and password are required.");
      return;
    }

    try {
      setCreateEngineerLoading(true);

      await apiRequest("/admin/create-user", {
        method: "POST",
        body: JSON.stringify({
          name: engineerForm.name.trim(),
          password: engineerForm.password,
          role: "engineer",
          company_id: null,
        }),
      });

      setEngineerSuccess("Engineer created successfully.");

      setEngineerForm({
        name: "",
        password: "",
      });

      await fetchEngineers();
    } catch (err) {
      setEngineerError(err.message || "Failed to create engineer");
    } finally {
      setCreateEngineerLoading(false);
    }
  }

  // =========================================================
  // DEACTIVATE ENGINEER
  // =========================================================
  async function handleDeactivateEngineer(engineerId) {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this engineer?"
    );
    if (!confirmed) return;

    try {
      setDeleteEngineerLoadingId(engineerId);
      setEngineerError("");
      setEngineerSuccess("");

      await apiRequest(`/admin/users/${engineerId}/deactivate`, {
        method: "PATCH",
      });

      setEngineerSuccess("Engineer deactivated successfully.");
      await fetchEngineers();
    } catch (err) {
      setEngineerError(err.message || "Failed to deactivate engineer");
    } finally {
      setDeleteEngineerLoadingId(null);
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================
  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // LOAD INCIDENT UPDATE HISTORY
  // =========================================================
  useEffect(() => {
    incidents.forEach((incident) => {
      if (!updatesByIncident[incident.id]) {
        fetchIncidentUpdates(incident.id);
      }
    });
  }, [incidents]);

  // =========================================================
  // FILTER OPTIONS
  // =========================================================
  const companyOptions = useMemo(() => {
    return [
      ...new Set(
        incidents
          .map((incident) => incident.company_name)
          .filter(Boolean)
      ),
    ];
  }, [incidents]);

  const clientOptions = useMemo(() => {
    return [
      ...new Set(
        incidents
          .map((incident) => incident.created_by_username)
          .filter(Boolean)
      ),
    ];
  }, [incidents]);

  const engineerOptions = useMemo(() => {
    const assignedFromIncidents = incidents.flatMap(
      (incident) => incident.assigned_engineers || []
    );

    const usernamesFromIncidents = assignedFromIncidents
      .map((engineer) => engineer.username)
      .filter(Boolean);

    const usernamesFromUsersTable = engineers
      .map((engineer) => engineer.username)
      .filter(Boolean);

    return [...new Set([...usernamesFromIncidents, ...usernamesFromUsersTable])];
  }, [incidents, engineers]);

  // =========================================================
  // FILTER INCIDENTS
  // =========================================================
  const filteredIncidents = useMemo(() => {
    let result = [...incidents];

    if (activeView !== "overview" && activeView !== "all" && activeView !== "engineers") {
      result = result.filter((incident) => incident.status === activeView);
    }

    if (statusFilter !== "all") {
      result = result.filter((incident) => incident.status === statusFilter);
    }

    if (companyFilter !== "all") {
      result = result.filter((incident) => incident.company_name === companyFilter);
    }

    if (clientFilter !== "all") {
      result = result.filter(
        (incident) => incident.created_by_username === clientFilter
      );
    }

    if (engineerFilter !== "all") {
      result = result.filter((incident) =>
        (incident.assigned_engineers || []).some(
          (engineer) => engineer.username === engineerFilter
        )
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();

      result = result.filter((incident) =>
        [
          incident.title,
          incident.description,
          incident.location,
          incident.created_by_username,
          incident.created_by_name,
          incident.company_name,
          incident.status,
          ...(incident.assigned_engineers || []).flatMap((eng) => [
            eng.username,
            eng.name,
          ]),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    }

    return result;
  }, [
    incidents,
    activeView,
    statusFilter,
    companyFilter,
    clientFilter,
    engineerFilter,
    searchTerm,
  ]);

  // =========================================================
  // SELECTED INCIDENT
  // =========================================================
  const selectedIncident =
    filteredIncidents.find((incident) => incident.id === selectedIncidentId) ||
    filteredIncidents[0] ||
    null;

  useEffect(() => {
    if (
      activeView !== "engineers" &&
      selectedIncident &&
      selectedIncident.id !== selectedIncidentId
    ) {
      setSelectedIncidentId(selectedIncident.id);
    }
  }, [selectedIncident, selectedIncidentId, activeView]);

  // =========================================================
  // HELPER: STATUS COLORS
  // =========================================================
  function getStatusTheme(status) {
    if (status === "pending") {
      return {
        bg: "linear-gradient(180deg, rgba(250, 204, 21, 0.12) 0%, rgba(250, 204, 21, 0.06) 100%)",
        border: "1px solid rgba(250, 204, 21, 0.25)",
        text: "#FACC15",
        pillBg: "rgba(250, 204, 21, 0.16)",
      };
    }

    if (status === "in_progress") {
      return {
        bg: "linear-gradient(180deg, rgba(59, 130, 246, 0.14) 0%, rgba(59, 130, 246, 0.06) 100%)",
        border: "1px solid rgba(96, 165, 250, 0.22)",
        text: "#93C5FD",
        pillBg: "rgba(59, 130, 246, 0.16)",
      };
    }

    if (status === "completed") {
      return {
        bg: "linear-gradient(180deg, rgba(239, 68, 68, 0.14) 0%, rgba(239, 68, 68, 0.06) 100%)",
        border: "1px solid rgba(248, 113, 113, 0.22)",
        text: "#FCA5A5",
        pillBg: "rgba(239, 68, 68, 0.16)",
      };
    }

    if (status === "verified") {
      return {
        bg: "linear-gradient(180deg, rgba(34, 197, 94, 0.14) 0%, rgba(34, 197, 94, 0.06) 100%)",
        border: "1px solid rgba(134, 239, 172, 0.22)",
        text: "#86EFAC",
        pillBg: "rgba(34, 197, 94, 0.16)",
      };
    }

    return {
      bg: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      text: "#E5E7EB",
      pillBg: "rgba(255,255,255,0.08)",
    };
  }

  // =========================================================
  // LOADING / ERROR STATES
  // =========================================================
  if (loading) {
    return (
      <div style={{ padding: "20px", color: "var(--text-secondary)", background: "var(--page-bg)", minHeight: "100vh" }}>
        Loading admin dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "var(--error-text)", background: "var(--page-bg)", minHeight: "100vh" }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isCompact ? "1fr" : "260px 1fr",
        minHeight: "100vh",
        background: "var(--page-bg)",
        color: "var(--text-secondary)",
      }}
    >
      {/* =========================
          SIDEBAR / TOP PANEL
      ========================= */}
      <aside
        style={{
          background: "var(--sidebar-gradient)",
          color: "var(--text-primary)",
          padding: "24px 18px",
          borderRight: isCompact ? "none" : "1px solid rgba(255,165,0,0.14)",
          borderBottom: isCompact ? "1px solid rgba(255,165,0,0.14)" : "none",
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          style={{
            padding: "14px",
            borderRadius: "18px",
            background: "rgba(255,165,0,0.08)",
            border: "1px solid rgba(255,165,0,0.18)",
            marginBottom: "22px",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "6px", color: "var(--text-primary)" }}>Admin Panel</h2>
          <p style={{ fontSize: "14px", margin: 0, color: "var(--text-muted)" }}>
            {user?.username || user?.email || user?.name || "Admin"}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(auto-fit, minmax(140px, 1fr))" : "1fr",
            gap: "10px",
          }}
        >
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: "12px",
                border: activeView === item.key
                  ? "1px solid rgba(255,165,0,0.30)"
                  : "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
                background: activeView === item.key
                  ? "linear-gradient(90deg, rgba(255,165,0,0.22) 0%, rgba(255,165,0,0.08) 100%)"
                  : "rgba(255,255,255,0.03)",
                color: activeView === item.key ? "#FFA500" : "var(--text-secondary)",
                fontWeight: activeView === item.key ? "700" : "500",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "20px", display: "flex", flexDirection: isCompact ? "row" : "column", gap: "10px" }}>
          <ThemeToggle style={{ flex: isCompact ? "none" : undefined, justifyContent: "center" }} />
          <button
            onClick={logout}
            style={{
              flex: isCompact ? "none" : undefined,
              width: isCompact ? "auto" : "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid var(--logout-border)",
              cursor: "pointer",
              background: "var(--logout-bg)",
              color: "var(--logout-text)",
              fontWeight: "700",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}
      <main style={{ padding: isMobile ? "16px" : "26px" }}>
        <div
          style={{
            marginBottom: "22px",
            background: "var(--hero-gradient)",
            borderRadius: "22px",
            padding: isMobile ? "20px" : "26px",
            border: "1px solid rgba(255,165,0,0.14)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: "999px",
              background: "rgba(255,165,0,0.14)",
              color: "#FFA500",
              border: "1px solid rgba(255,165,0,0.28)",
              fontSize: "12px",
              fontWeight: "800",
              letterSpacing: "0.4px",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Control Center
          </div>

          <h1 style={{ margin: "0 0 8px", color: "var(--text-primary)", fontSize: isMobile ? "28px" : "36px" }}>
            Admin Dashboard
          </h1>
          <p style={{ margin: 0, color: "var(--text-faint)", lineHeight: 1.6 }}>
            Monitor incidents, engineers, clients, and full update history.
          </p>
        </div>

        {activeView === "engineers" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "420px 1fr",
              gap: "20px",
              alignItems: "start",
            }}
          >
            <section style={darkPanelStyle}>
              <h2 style={{ marginTop: 0, color: "#FFFFFF" }}>Create Engineer</h2>

              {engineerError ? <div style={errorBoxStyle}>{engineerError}</div> : null}
              {engineerSuccess ? <div style={successBoxStyle}>{engineerSuccess}</div> : null}

              <form onSubmit={handleCreateEngineer}>
                <div style={{ display: "grid", gap: "12px" }}>
                  <input
                    type="text"
                    placeholder="Engineer name"
                    value={engineerForm.name}
                    onChange={(e) =>
                      setEngineerForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />

                  <input
                    type="password"
                    placeholder="Password"
                    value={engineerForm.password}
                    onChange={(e) =>
                      setEngineerForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  />

                  <button
                    type="submit"
                    disabled={createEngineerLoading}
                    style={goldButtonStyle}
                  >
                    {createEngineerLoading ? "Creating..." : "Create Engineer"}
                  </button>
                </div>
              </form>
            </section>

            <section style={darkPanelStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ margin: 0, color: "#FFFFFF" }}>Engineers</h2>

                <button onClick={fetchEngineers} style={secondaryDarkButtonStyle}>
                  Refresh
                </button>
              </div>

              {engineersLoading ? (
                <p style={{ color: "#bdbdbd" }}>Loading engineers...</p>
              ) : engineers.length === 0 ? (
                <p style={{ color: "#bdbdbd" }}>No active engineers found.</p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {engineers.map((engineer) => (
                    <div
                      key={engineer.id}
                      style={{
                        border: "1px solid rgba(255,165,0,0.12)",
                        borderRadius: "14px",
                        padding: "16px",
                        background: "rgba(255,165,0,0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "18px", fontWeight: "700", color: "#FFFFFF" }}>
                            {engineer.name || "No name"}
                          </div>

                          <div style={{ color: "#c8c8c8", marginTop: "6px" }}>
                            Username: {engineer.username || "N/A"}
                          </div>

                          <div style={{ color: "#c8c8c8", marginTop: "4px" }}>
                            Role: {engineer.role || "N/A"}
                          </div>

                          <div style={{ color: "#c8c8c8", marginTop: "4px" }}>
                            Active: {engineer.is_active ? "Yes" : "No"}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeactivateEngineer(engineer.id)}
                          disabled={deleteEngineerLoadingId === engineer.id}
                          style={redButtonStyle}
                        >
                          {deleteEngineerLoadingId === engineer.id
                            ? "Deactivating..."
                            : "Deactivate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr 1fr"
                  : "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "14px",
                marginBottom: "20px",
              }}
            >
              <SummaryCard label="Total" value={dashboardData?.summary?.total_incidents ?? 0} accent="#FFA500" />
              <SummaryCard label="Pending" value={dashboardData?.summary?.pending ?? 0} accent="#FACC15" />
              <SummaryCard label="In Progress" value={dashboardData?.summary?.in_progress ?? 0} accent="#60A5FA" />
              <SummaryCard label="Completed" value={dashboardData?.summary?.completed ?? 0} accent="#F87171" />
              <SummaryCard label="Verified" value={dashboardData?.summary?.verified ?? 0} accent="#4ADE80" />
            </div>

            {/* Filter bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "2fr 1fr 1fr 1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
                background: "var(--panel-bg)",
                padding: "16px",
                borderRadius: "16px",
                border: "1px solid rgba(255,165,0,0.14)",
                boxShadow: "var(--shadow)",
              }}
            >
              <input
                type="text"
                placeholder="Search by title, client, engineer, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={inputStyle}
              />

              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={inputStyle}>
                <option value="all">All Companies</option>
                {companyOptions.map((companyName) => (
                  <option key={companyName} value={companyName}>
                    {companyName}
                  </option>
                ))}
              </select>

              <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} style={inputStyle}>
                <option value="all">All Clients</option>
                {clientOptions.map((clientUsername) => (
                  <option key={clientUsername} value={clientUsername}>
                    {clientUsername}
                  </option>
                ))}
              </select>

              <select value={engineerFilter} onChange={(e) => setEngineerFilter(e.target.value)} style={inputStyle}>
                <option value="all">All Engineers</option>
                {engineerOptions.map((engineerUsername) => (
                  <option key={engineerUsername} value={engineerUsername}>
                    {engineerUsername}
                  </option>
                ))}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="verified">Verified</option>
              </select>
            </div>

            {/* Incident layout */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "390px 1fr",
                gap: "20px",
                alignItems: "start",
              }}
            >
              {/* Incident list */}
              <section
                style={{
                  background: "var(--panel-bg)",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,165,0,0.14)",
                  padding: "16px",
                  maxHeight: isCompact ? "none" : "75vh",
                  overflowY: isCompact ? "visible" : "auto",
                  boxShadow: "var(--shadow)",
                }}
              >
                <h3 style={{ marginTop: 0, color: "var(--text-primary)" }}>
                  {activeView === "overview"
                    ? "Incident List"
                    : sidebarItems.find((item) => item.key === activeView)?.label}
                </h3>

                {filteredIncidents.length === 0 ? (
                  <p style={{ color: "var(--text-faint)" }}>No incidents match the current filters.</p>
                ) : (
                  filteredIncidents.map((incident) => {
                    const statusTheme = getStatusTheme(incident.status);

                    return (
                      <button
                        key={incident.id}
                        onClick={() => setSelectedIncidentId(incident.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "14px",
                          marginBottom: "12px",
                          borderRadius: "14px",
                          border:
                            selectedIncident?.id === incident.id
                              ? "1px solid rgba(255,165,0,0.38)"
                              : statusTheme.border,
                          background:
                            selectedIncident?.id === incident.id
                              ? `linear-gradient(180deg, rgba(255,165,0,0.12) 0%, rgba(255,165,0,0.06) 100%), ${statusTheme.bg}`
                              : statusTheme.bg,
                          cursor: "pointer",
                          color: "#E5E7EB",
                          boxShadow:
                            selectedIncident?.id === incident.id
                              ? "0 10px 22px rgba(255,165,0,0.08)"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                            alignItems: "center",
                            marginBottom: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                            {incident.title}
                          </div>

                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "999px",
                              background: statusTheme.pillBg,
                              color: statusTheme.text,
                              fontSize: "12px",
                              fontWeight: "700",
                              textTransform: "capitalize",
                            }}
                          >
                            {incident.status?.replace("_", " ")}
                          </span>
                        </div>

                        <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "4px" }}>
                          {incident.location || "No location"}
                        </div>

                        <div style={{ fontSize: "13px", color: "#b5b5b5", marginBottom: "4px" }}>
                          {incident.company_name || "No company"}
                        </div>

                        <div style={{ fontSize: "13px", color: "#FFA500" }}>
                          Client: {incident.created_by_username || "Unknown"}
                        </div>
                      </button>
                    );
                  })
                )}
              </section>

              {/* Incident details */}
              <section
                style={{
                  background: "var(--panel-bg)",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,165,0,0.14)",
                  padding: isMobile ? "16px" : "22px",
                  minHeight: isCompact ? "auto" : "75vh",
                  boxShadow: "var(--shadow)",
                }}
              >
                {!selectedIncident ? (
                  <p style={{ color: "#bdbdbd" }}>Select an incident to view details.</p>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: "16px",
                      }}
                    >
                      <h2 style={{ marginTop: 0, marginBottom: 0, color: "var(--text-primary)", fontSize: isMobile ? "24px" : "30px" }}>
                        {selectedIncident.title}
                      </h2>

                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          borderRadius: "999px",
                          background: getStatusTheme(selectedIncident.status).pillBg,
                          color: getStatusTheme(selectedIncident.status).text,
                          fontSize: "12px",
                          fontWeight: "700",
                          textTransform: "capitalize",
                          border: getStatusTheme(selectedIncident.status).border,
                        }}
                      >
                        {selectedIncident.status?.replace("_", " ")}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <DetailBox label="Description" value={selectedIncident.description} />
                      <DetailBox label="Location" value={selectedIncident.location || "No location"} />
                      <DetailBox label="Client Username" value={selectedIncident.created_by_username || "Unknown"} />
                      <DetailBox label="Client Name" value={selectedIncident.created_by_name || "Unknown"} />
                      <DetailBox label="Client Role" value={selectedIncident.created_by_role || "Unknown"} />
                      <DetailBox label="Company" value={selectedIncident.company_name || "Unknown"} />
                    </div>

                    <div
                      style={{
                        marginTop: "18px",
                        padding: "16px",
                        borderRadius: "16px",
                        background: "rgba(255,165,0,0.04)",
                        border: "1px solid rgba(255,165,0,0.12)",
                      }}
                    >
                      <strong style={{ color: "#FFA500" }}>Assigned Engineers:</strong>{" "}
                      <span style={{ color: "#E5E7EB" }}>
                        {selectedIncident.assigned_engineers?.length > 0
                          ? selectedIncident.assigned_engineers
                              .map(
                                (engineer) =>
                                  `${engineer.username} (${engineer.name || "No name"})`
                              )
                              .join(", ")
                          : "None"}
                      </span>
                    </div>

                    <h3 style={{ marginTop: "26px", color: "#FFFFFF" }}>Update History</h3>

                    {updatesLoading[selectedIncident.id] ? (
                      <p style={{ color: "#bdbdbd" }}>Loading updates...</p>
                    ) : updatesByIncident[selectedIncident.id]?.length > 0 ? (
                      updatesByIncident[selectedIncident.id].map((update) => {
                        const updateTheme = getStatusTheme(update.status);

                        return (
                          <div
                            key={update.id}
                            style={{
                              background: updateTheme.bg,
                              border: updateTheme.border,
                              borderRadius: "14px",
                              padding: "14px",
                              marginBottom: "12px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "10px",
                                flexWrap: "wrap",
                                marginBottom: "10px",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "5px 10px",
                                  borderRadius: "999px",
                                  background: updateTheme.pillBg,
                                  color: updateTheme.text,
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  textTransform: "capitalize",
                                }}
                              >
                                {update.status?.replace("_", " ")}
                              </span>

                              <span style={{ color: "#cfcfcf", fontSize: "13px" }}>
                                {new Date(update.created_at).toLocaleString()}
                              </span>
                            </div>

                            <p style={detailTextStyle}>
                              <strong>Note:</strong> {update.note || "No note"}
                            </p>

                            <p style={detailTextStyle}>
                              <strong>Image:</strong> {update.image_url || "No image"}
                            </p>

                            <p style={detailTextStyle}>
                              <strong>Updated By:</strong> {update.updated_by_username || "Unknown"}
                            </p>

                            <p style={detailTextStyle}>
                              <strong>Updater Name:</strong> {update.updated_by_name || "Unknown"}
                            </p>

                            <p style={detailTextStyle}>
                              <strong>Updater Role:</strong> {update.updated_by_role || "Unknown"}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ color: "#bdbdbd" }}>No updates yet.</p>
                    )}
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, accent = "#FFA500" }) {
  return (
    <div
      style={{
        background: "var(--panel-gradient)",
        borderRadius: "16px",
        border: "1px solid rgba(255,165,0,0.12)",
        borderLeft: `4px solid ${accent}`,
        padding: "16px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(255,165,0,0.04)",
        border: "1px solid rgba(255,165,0,0.12)",
        borderRadius: "14px",
        padding: "14px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: "700", color: "#FFA500", marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

const darkPanelStyle = {
  background: "var(--panel-gradient)",
  borderRadius: "18px",
  border: "1px solid rgba(255,165,0,0.12)",
  padding: "20px",
  boxShadow: "var(--shadow)",
};

const inputStyle = {
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255,165,0,0.18)",
  background: "var(--input-bg)",
  color: "var(--input-color)",
  outline: "none",
  fontSize: "14px",
};

const goldButtonStyle = {
  padding: "12px 14px",
  borderRadius: "12px",
  border: "none",
  cursor: "pointer",
  background: "#FFA500",
  color: "#111827",
  fontWeight: "800",
  boxShadow: "0 10px 24px rgba(255,165,0,0.22)",
};

const redButtonStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(239, 68, 68, 0.28)",
  cursor: "pointer",
  background: "linear-gradient(180deg, rgba(220, 38, 38, 0.2) 0%, rgba(153, 27, 27, 0.22) 100%)",
  color: "#FCA5A5",
  fontWeight: "700",
};

const secondaryDarkButtonStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid rgba(255,165,0,0.22)",
  background: "rgba(255,165,0,0.08)",
  color: "#FFA500",
  cursor: "pointer",
  fontWeight: "700",
};

const detailTextStyle = {
  margin: "6px 0",
  color: "var(--text-secondary)",
};

const errorBoxStyle = {
  marginBottom: "12px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "var(--error-bg)",
  color: "var(--error-text)",
  border: "1px solid var(--error-border)",
};

const successBoxStyle = {
  marginBottom: "12px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "var(--success-bg)",
  color: "var(--success-text)",
  border: "1px solid var(--success-border)",
};