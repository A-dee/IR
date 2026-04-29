import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import ThemeToggle from "../components/ThemeToggle";

export default function ClientDashboard() {
  const { user, logout } = useAuth();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;
  const isCompact = windowWidth < 1100;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    function handleResize() { setWindowWidth(window.innerWidth); }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const clientDisplayName =
    user?.company_name ||
    user?.company?.name ||
    user?.name ||
    user?.full_name ||
    user?.username ||
    "Client";

  const [activeMenu, setActiveMenu] = useState("create_incident");

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const [updatesByIncident, setUpdatesByIncident] = useState({});
  const [updatesLoading, setUpdatesLoading] = useState({});

  const [form, setForm] = useState({
    title: "",
    description: "",
    image: "",
    location: "",
  });

  const [verifyData, setVerifyData] = useState({});

  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  async function fetchClientIncidents() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/incidents/client/my", {
        method: "GET",
      });

      const incidentList = Array.isArray(data) ? data : [];
      setIncidents(incidentList);

      for (const incident of incidentList) {
        fetchIncidentUpdates(incident.id);
      }
    } catch (err) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }

  async function fetchIncidentUpdates(incidentId) {
    try {
      setUpdatesLoading((prev) => ({ ...prev, [incidentId]: true }));

      const data = await apiRequest(`/incidents/${incidentId}/updates`, {
        method: "GET",
      });

      setUpdatesByIncident((prev) => ({
        ...prev,
        [incidentId]: Array.isArray(data) ? data : [],
      }));
    } catch (err) {
      console.error(`Failed to load updates for incident ${incidentId}:`, err.message);
    } finally {
      setUpdatesLoading((prev) => ({ ...prev, [incidentId]: false }));
    }
  }

  function handleFormChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleVerifyChange(id, field, value) {
    setVerifyData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  }

  async function createIncident(e) {
    e.preventDefault();

    try {
      setCreating(true);
      setError("");

      await apiRequest("/incidents/", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setForm({
        title: "",
        description: "",
        image: "",
        location: "",
      });

      await fetchClientIncidents();
      setActiveMenu("incidents");
    } catch (err) {
      setError(err.message || "Failed to create incident");
    } finally {
      setCreating(false);
    }
  }

  async function verifyIncident(incidentId) {
    try {
      setActionLoading(incidentId);

      const payload = verifyData[incidentId] || {};

      await apiRequest(`/incidents/${incidentId}/verify`, {
        method: "POST",
        body: JSON.stringify({
          note: payload.note || "Verified by client",
          image_url: payload.image_url || "",
        }),
      });

      await fetchIncidentUpdates(incidentId);
      await fetchClientIncidents();
    } catch (err) {
      alert(err.message || "Failed to verify incident");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (
      !passwordForm.old_password.trim() ||
      !passwordForm.new_password.trim() ||
      !passwordForm.confirm_password.trim()
    ) {
      setPasswordError("All password fields are required.");
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    try {
      setPasswordLoading(true);

      await apiRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
        }),
      });

      setPasswordSuccess("Password changed successfully.");
      setPasswordForm({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  }

  useEffect(() => {
    fetchClientIncidents();
  }, []);

  const summary = useMemo(() => {
    return {
      total: incidents.length,
      pending: incidents.filter((i) => i.status === "pending").length,
      inProgress: incidents.filter((i) => i.status === "in_progress").length,
      completed: incidents.filter((i) => i.status === "completed").length,
      verified: incidents.filter((i) => i.status === "verified").length,
    };
  }, [incidents]);

  const incidentsToVerify = useMemo(() => {
    return incidents.filter((incident) => incident.status === "completed");
  }, [incidents]);

  function getStatusBadgeStyle(status) {
    const baseStyle = {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 12px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: "800",
      textTransform: "capitalize",
      letterSpacing: "0.3px",
      border: "1px solid transparent",
    };

    if (status === "pending") {
      return {
        ...baseStyle,
        background: "rgba(245, 158, 11, 0.14)",
        color: "#FBBF24",
        borderColor: "rgba(245, 158, 11, 0.35)",
      };
    }

    if (status === "in_progress") {
      return {
        ...baseStyle,
        background: "rgba(234, 179, 8, 0.12)",
        color: "#FDE047",
        borderColor: "rgba(234, 179, 8, 0.3)",
      };
    }

    if (status === "completed") {
      return {
        ...baseStyle,
        background: "rgba(255, 215, 0, 0.12)",
        color: "#FFD700",
        borderColor: "rgba(255, 215, 0, 0.35)",
      };
    }

    if (status === "verified") {
      return {
        ...baseStyle,
        background: "rgba(34, 197, 94, 0.14)",
        color: "#86EFAC",
        borderColor: "rgba(34, 197, 94, 0.28)",
      };
    }

    return {
      ...baseStyle,
      background: "rgba(255,255,255,0.06)",
      color: "#E5E7EB",
      borderColor: "rgba(255,255,255,0.12)",
    };
  }

  function getStatusAccent(status) {
    if (status === "pending") return "#F59E0B";
    if (status === "in_progress") return "#EAB308";
    if (status === "completed") return "#FFD700";
    if (status === "verified") return "#22C55E";
    return "#A1A1AA";
  }

  function renderCreateIncidentView() {
    return (
      <section style={panelStyle}>
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", color: "#FFFFFF" }}>Create Incident</h2>
          <p style={{ marginTop: "6px", color: "#D4AF37" }}>
            Report a new issue and let the engineers handle it.
          </p>
        </div>

        {error ? <div style={errorBoxStyle}>{error}</div> : null}

        <form onSubmit={createIncident}>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Incident Title</label>
              <input
                type="text"
                name="title"
                placeholder="Enter incident title"
                value={form.title}
                onChange={handleFormChange}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                name="description"
                placeholder="Describe the issue clearly"
                value={form.description}
                onChange={handleFormChange}
                required
                rows={5}
                style={textareaStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Image / Reference</label>
              <input
                type="text"
                name="image"
                placeholder="Image path or placeholder"
                value={form.image}
                onChange={handleFormChange}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                name="location"
                placeholder="Enter issue location"
                value={form.location}
                onChange={handleFormChange}
                required
                style={inputStyle}
              />
            </div>

            <button type="submit" disabled={creating} style={goldButtonStyle}>
              {creating ? "Creating..." : "Create Incident"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderIncidentsView() {
    return (
      <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <SummaryCard label="Total Incidents" value={summary.total} accent="#D4AF37" />
          <SummaryCard label="Pending" value={summary.pending} accent="#F59E0B" />
          <SummaryCard label="In Progress" value={summary.inProgress} accent="#EAB308" />
          <SummaryCard label="Completed" value={summary.completed} accent="#FFD700" />
          <SummaryCard label="Verified" value={summary.verified} accent="#22C55E" />
        </div>

        <section style={panelStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "24px", color: "#FFFFFF" }}>All Incidents</h2>
              <p style={{ marginTop: "6px", color: "#D4AF37" }}>
                View every incident and track all status updates.
              </p>
            </div>

            <button onClick={fetchClientIncidents} style={secondaryButtonStyle}>
              Refresh
            </button>
          </div>

          {loading && <div style={infoPanelStyle}>Loading incidents...</div>}
          {error && !loading && <div style={errorBoxStyle}>{error}</div>}
          {!loading && incidents.length === 0 && (
            <div style={emptyStateStyle}>
              <h3 style={{ marginTop: 0, color: "#FFFFFF" }}>No incidents yet</h3>
              <p style={{ marginBottom: 0, color: "#D4AF37" }}>
                Once you create an incident, it will appear here.
              </p>
            </div>
          )}

          {!loading && incidents.length > 0 && (
            <div style={{ display: "grid", gap: "18px" }}>
              {incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  updatesByIncident={updatesByIncident}
                  updatesLoading={updatesLoading}
                  getStatusAccent={getStatusAccent}
                  getStatusBadgeStyle={getStatusBadgeStyle}
                />
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  function renderToVerifyView() {
    return (
      <section style={panelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "24px", color: "#FFFFFF" }}>Incidents To Verify</h2>
            <p style={{ marginTop: "6px", color: "#D4AF37" }}>
              These are completed incidents waiting for your confirmation.
            </p>
          </div>

          <button onClick={fetchClientIncidents} style={secondaryButtonStyle}>
            Refresh
          </button>
        </div>

        {loading && <div style={infoPanelStyle}>Loading incidents...</div>}
        {!loading && incidentsToVerify.length === 0 && (
          <div style={emptyStateStyle}>
            <h3 style={{ marginTop: 0, color: "#FFFFFF" }}>Nothing to verify</h3>
            <p style={{ marginBottom: 0, color: "#D4AF37" }}>
              Completed incidents waiting for approval will show here.
            </p>
          </div>
        )}

        {!loading && incidentsToVerify.length > 0 && (
          <div style={{ display: "grid", gap: "18px" }}>
            {incidentsToVerify.map((incident) => (
              <div
                key={incident.id}
                style={{
                  ...incidentCardStyle,
                  borderLeft: `4px solid ${getStatusAccent(incident.status)}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <div style={incidentIdStyle}>Incident #{incident.id}</div>
                    <h3 style={{ margin: "8px 0 0", fontSize: "22px", color: "#FFFFFF" }}>
                      {incident.title}
                    </h3>
                    <p style={{ marginTop: "8px", marginBottom: 0, color: "#D6D3D1" }}>
                      {incident.location || "No location provided"}
                    </p>
                  </div>

                  <span style={getStatusBadgeStyle(incident.status)}>
                    {incident.status?.replace("_", " ")}
                  </span>
                </div>

                <div style={detailsGridStyle}>
                  <DetailItem label="Description" value={incident.description} />
                  <DetailItem label="Location" value={incident.location || "N/A"} />
                  <DetailItem label="Status" value={incident.status || "N/A"} />
                </div>

                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ marginTop: 0, marginBottom: "12px", color: "#FFFFFF" }}>
                    Update History
                  </h4>

                  {updatesLoading[incident.id] ? (
                    <div style={infoMiniStyle}>Loading updates...</div>
                  ) : updatesByIncident[incident.id]?.length > 0 ? (
                    <div style={{ display: "grid", gap: "10px" }}>
                      {updatesByIncident[incident.id].map((update) => (
                        <div
                          key={update.id}
                          style={{
                            ...updateCardStyle,
                            borderLeft: `4px solid ${getStatusAccent(update.status)}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "10px",
                              flexWrap: "wrap",
                              marginBottom: "8px",
                            }}
                          >
                            <span style={getStatusBadgeStyle(update.status)}>
                              {update.status?.replace("_", " ")}
                            </span>

                            <span style={{ color: "#D4AF37", fontSize: "13px" }}>
                              {new Date(update.created_at).toLocaleString()}
                            </span>
                          </div>

                          <p style={{ margin: "6px 0", color: "#E5E7EB" }}>
                            <strong>Note:</strong> {update.note || "No note"}
                          </p>
                          <p style={{ margin: "6px 0", color: "#E5E7EB" }}>
                            <strong>Image:</strong> {update.image_url || "No image"}
                          </p>
                          <p style={{ margin: "6px 0", color: "#E5E7EB" }}>
                            <strong>Updated By:</strong> {update.updated_by || "Unknown"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={emptyMiniStateStyle}>No updates yet.</div>
                  )}
                </div>

                <div style={verifySectionStyle}>
                  <h4 style={{ marginTop: 0, marginBottom: "12px", color: "#FFFFFF" }}>
                    Verify Completed Incident
                  </h4>

                  <textarea
                    placeholder="Verification note"
                    value={verifyData[incident.id]?.note || ""}
                    onChange={(e) =>
                      handleVerifyChange(incident.id, "note", e.target.value)
                    }
                    rows={4}
                    style={textareaStyle}
                  />

                  <input
                    type="text"
                    placeholder="Verification image URL"
                    value={verifyData[incident.id]?.image_url || ""}
                    onChange={(e) =>
                      handleVerifyChange(incident.id, "image_url", e.target.value)
                    }
                    style={{ ...inputStyle, marginTop: "10px" }}
                  />

                  <button
                    onClick={() => verifyIncident(incident.id)}
                    disabled={actionLoading === incident.id}
                    style={{ ...greenButtonStyle, marginTop: "12px" }}
                  >
                    {actionLoading === incident.id ? "Verifying..." : "Verify Incident"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <section style={panelStyle}>
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", color: "#FFFFFF" }}>Settings</h2>
          <p style={{ marginTop: "6px", color: "#D4AF37" }}>
            Update your account settings and password.
          </p>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <h3 style={{ margin: 0, color: "#FFFFFF" }}>Change Password</h3>
          <p style={{ marginTop: "6px", color: "#C9A227" }}>
            Update your account password securely.
          </p>
        </div>

        {passwordError ? <div style={errorBoxStyle}>{passwordError}</div> : null}
        {passwordSuccess ? <div style={successBoxStyle}>{passwordSuccess}</div> : null}

        <form onSubmit={handleChangePassword}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <input
              type="password"
              placeholder="Old password"
              value={passwordForm.old_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  old_password: e.target.value,
                }))
              }
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="New password"
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  new_password: e.target.value,
                }))
              }
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirm_password: e.target.value,
                }))
              }
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            style={{ ...goldButtonStyle, marginTop: "14px" }}
          >
            {passwordLoading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--page-bg)",
        color: "var(--text-secondary)",
        padding: isMobile ? "12px" : "24px",
      }}
    >
      <div style={heroStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={heroPillStyle}>Client Workspace</div>
            <h1 style={{ margin: "12px 0 6px", fontSize: isMobile ? "26px" : "32px", color: "var(--text-primary)" }}>
              Client Dashboard
            </h1>
            <p style={{ marginTop: "8px", marginBottom: 0, color: "#D4AF37" }}>
              Welcome back, {clientDisplayName}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <ThemeToggle />
            <button onClick={logout} style={logoutButtonStyle}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar toggle */}
      {isCompact && (
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          style={{
            marginBottom: "14px",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid rgba(212,175,55,0.3)",
            background: "rgba(212,175,55,0.1)",
            color: "#D4AF37",
            fontWeight: "700",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          {sidebarOpen ? "Close Menu ▲" : "Menu ▼"}
        </button>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "260px 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {(!isCompact || sidebarOpen) && (
          <aside style={sidebarStyle}>
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Menu</h3>
              <p style={{ marginTop: "6px", color: "var(--text-faint)", fontSize: "14px" }}>
                Navigate your workspace
              </p>
            </div>

            <div style={{ display: isCompact ? "flex" : "block", gap: "10px", flexWrap: "wrap" }}>
              {[
                { key: "create_incident", label: "Create Incident" },
                { key: "incidents", label: "Incidents" },
                { key: "to_verify", label: "To Verify" },
                { key: "settings", label: "Settings" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setActiveMenu(key); setSidebarOpen(false); }}
                  style={{
                    ...menuButtonStyle,
                    ...(activeMenu === key ? activeMenuButtonStyle : {}),
                    flex: isCompact ? "1" : undefined,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </aside>
        )}

        <main>
          {activeMenu === "create_incident" && renderCreateIncidentView()}
          {activeMenu === "incidents" && renderIncidentsView()}
          {activeMenu === "to_verify" && renderToVerifyView()}
          {activeMenu === "settings" && renderSettingsView()}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div
      style={{
        background: "var(--panel-gradient)",
        borderRadius: "18px",
        padding: "18px",
        border: "1px solid rgba(212, 175, 55, 0.18)",
        borderLeft: `4px solid ${accent}`,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ fontSize: "14px", color: "#C9A227", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div
      style={{
        background: "var(--overlay-subtle)",
        border: "1px solid rgba(212, 175, 55, 0.12)",
        borderRadius: "12px",
        padding: "14px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: "700",
          color: "#C9A227",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function IncidentCard({
  incident,
  updatesByIncident,
  updatesLoading,
  getStatusAccent,
  getStatusBadgeStyle,
}) {
  return (
    <div
      style={{
        ...incidentCardStyle,
        borderLeft: `4px solid ${getStatusAccent(incident.status)}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div>
          <div style={incidentIdStyle}>Incident #{incident.id}</div>
          <h3 style={{ margin: "8px 0 0", fontSize: "22px", color: "#FFFFFF" }}>
            {incident.title}
          </h3>
          <p style={{ marginTop: "8px", marginBottom: 0, color: "#D6D3D1" }}>
            {incident.location || "No location provided"}
          </p>
        </div>

        <span style={getStatusBadgeStyle(incident.status)}>
          {incident.status?.replace("_", " ")}
        </span>
      </div>

      <div style={detailsGridStyle}>
        <DetailItem label="Description" value={incident.description} />
        <DetailItem label="Location" value={incident.location || "N/A"} />
        <DetailItem label="Status" value={incident.status || "N/A"} />
      </div>

      <div style={{ marginTop: "20px" }}>
        <h4 style={{ marginTop: 0, marginBottom: "12px", color: "#FFFFFF" }}>
          Update History
        </h4>

        {updatesLoading[incident.id] ? (
          <div style={infoMiniStyle}>Loading updates...</div>
        ) : updatesByIncident[incident.id]?.length > 0 ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {updatesByIncident[incident.id].map((update) => (
              <div
                key={update.id}
                style={{
                  ...updateCardStyle,
                  borderLeft: `4px solid ${getStatusAccent(update.status)}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginBottom: "8px",
                  }}
                >
                  <span style={getStatusBadgeStyle(update.status)}>
                    {update.status?.replace("_", " ")}
                  </span>

                  <span style={{ color: "#D4AF37", fontSize: "13px" }}>
                    {new Date(update.created_at).toLocaleString()}
                  </span>
                </div>

                <p style={{ margin: "6px 0", color: "#E5E7EB" }}>
                  <strong>Note:</strong> {update.note || "No note"}
                </p>
                <p style={{ margin: "6px 0", color: "#E5E7EB" }}>
                  <strong>Image:</strong> {update.image_url || "No image"}
                </p>
                <p style={{ margin: "6px 0", color: "#E5E7EB" }}>
                  <strong>Updated By:</strong> {update.updated_by || "Unknown"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={emptyMiniStateStyle}>No updates yet.</div>
        )}
      </div>
    </div>
  );
}

const heroStyle = {
  background: "var(--hero-gradient)",
  border: "1px solid rgba(212, 175, 55, 0.18)",
  borderRadius: "22px",
  padding: "28px",
  marginBottom: "24px",
  boxShadow: "var(--shadow-lg)",
};

const heroPillStyle = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "rgba(212, 175, 55, 0.12)",
  color: "#D4AF37",
  border: "1px solid rgba(212, 175, 55, 0.26)",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};

const sidebarStyle = {
  background: "var(--sidebar-gradient)",
  border: "1px solid rgba(212, 175, 55, 0.16)",
  borderRadius: "20px",
  padding: "18px",
  boxShadow: "var(--shadow)",
  position: "sticky",
  top: "24px",
};

const menuButtonStyle = {
  width: "100%",
  textAlign: "left",
  padding: "14px 16px",
  marginBottom: "10px",
  borderRadius: "12px",
  border: "1px solid rgba(212, 175, 55, 0.12)",
  background: "var(--overlay-subtle)",
  color: "var(--text-secondary)",
  fontWeight: "700",
  cursor: "pointer",
};

const activeMenuButtonStyle = {
  background: "rgba(212, 175, 55, 0.14)",
  color: "#FFD700",
  border: "1px solid rgba(212, 175, 55, 0.32)",
};

const panelStyle = {
  background: "var(--panel-gradient)",
  borderRadius: "20px",
  padding: "22px",
  border: "1px solid rgba(212, 175, 55, 0.14)",
  boxShadow: "var(--shadow)",
};

const incidentCardStyle = {
  border: "1px solid rgba(212, 175, 55, 0.12)",
  borderRadius: "18px",
  padding: "18px",
  background: "var(--card-bg)",
  boxShadow: "var(--shadow-sm)",
};

const updateCardStyle = {
  background: "var(--overlay-subtle)",
  border: "1px solid rgba(212, 175, 55, 0.12)",
  borderRadius: "12px",
  padding: "12px",
};

const verifySectionStyle = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "16px",
  background: "rgba(255,215,0,0.04)",
  border: "1px solid rgba(212, 175, 55, 0.14)",
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const incidentIdStyle = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: "999px",
  background: "rgba(212, 175, 55, 0.08)",
  color: "#D4AF37",
  fontSize: "12px",
  fontWeight: "700",
  border: "1px solid rgba(212, 175, 55, 0.14)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(212, 175, 55, 0.18)",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "var(--input-bg)",
  color: "var(--input-color)",
};

const textareaStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(212, 175, 55, 0.18)",
  outline: "none",
  fontSize: "14px",
  resize: "vertical",
  boxSizing: "border-box",
  background: "var(--input-bg)",
  color: "var(--input-color)",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontSize: "13px",
  fontWeight: "700",
  color: "#D4AF37",
};

const goldButtonStyle = {
  background: "linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)",
  color: "#111111",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "800",
  cursor: "pointer",
};

const greenButtonStyle = {
  background: "#16A34A",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "800",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  background: "rgba(212, 175, 55, 0.12)",
  color: "#FFD700",
  border: "1px solid rgba(212, 175, 55, 0.28)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: "700",
  cursor: "pointer",
};

const logoutButtonStyle = {
  background: "var(--logout-bg)",
  color: "var(--logout-text)",
  border: "1px solid var(--logout-border)",
  borderRadius: "12px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: "800",
};

const errorBoxStyle = {
  marginBottom: "14px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "var(--error-bg)",
  border: "1px solid var(--error-border)",
  color: "var(--error-text)",
};

const successBoxStyle = {
  marginBottom: "14px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "var(--success-bg)",
  border: "1px solid var(--success-border)",
  color: "var(--success-text)",
};

const emptyStateStyle = {
  border: "1px dashed rgba(212, 175, 55, 0.2)",
  background: "var(--overlay-faint)",
  padding: "24px",
  borderRadius: "16px",
};

const emptyMiniStateStyle = {
  background: "var(--overlay-subtle)",
  border: "1px dashed rgba(212, 175, 55, 0.18)",
  borderRadius: "12px",
  padding: "12px",
  color: "#D4AF37",
};

const infoPanelStyle = {
  background: "rgba(212, 175, 55, 0.08)",
  color: "#D4AF37",
  border: "1px solid rgba(212, 175, 55, 0.2)",
  borderRadius: "16px",
  padding: "16px",
};

const infoMiniStyle = {
  background: "var(--overlay-subtle)",
  border: "1px dashed rgba(212, 175, 55, 0.16)",
  borderRadius: "12px",
  padding: "12px",
  color: "#D4AF37",
};