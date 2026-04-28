import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";

export default function EngineerDashboard() {
  const { user, logout } = useAuth();

  // =========================
  // STATE
  // =========================
  const [activeMenu, setActiveMenu] = useState("incidents");

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  // Stores note/image input per incident
  const [formData, setFormData] = useState({});

  // Stores update history per incident
  const [updatesByIncident, setUpdatesByIncident] = useState({});
  const [updatesLoading, setUpdatesLoading] = useState({});

  // Change password form
  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // =========================
  // FETCH INCIDENTS ASSIGNED / AVAILABLE TO ENGINEER
  // =========================
  async function fetchIncidents() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/incidents/engineer/all", {
        method: "GET",
      });

      const incidentList = Array.isArray(data) ? data : [];
      setIncidents(incidentList);
    } catch (err) {
      setError(err.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // FETCH UPDATE HISTORY FOR INCIDENT
  // =========================
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

  // =========================
  // HANDLE INPUT CHANGE FOR A SPECIFIC INCIDENT
  // =========================
  function handleInputChange(id, field, value) {
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  }

  // =========================
  // ACCEPT INCIDENT
  // =========================
  async function acceptIncident(incidentId) {
    try {
      setActionLoading(incidentId);

      await apiRequest(`/incidents/${incidentId}/accept`, {
        method: "POST",
      });

      await fetchIncidents();
      await fetchIncidentUpdates(incidentId);
    } catch (err) {
      alert(err.message || "Failed to accept incident");
    } finally {
      setActionLoading(null);
    }
  }

  // =========================
  // ADD PROGRESS UPDATE
  // =========================
  async function addUpdate(incidentId) {
    try {
      setActionLoading(incidentId);

      const payload = formData[incidentId] || {};

      await apiRequest(`/incidents/${incidentId}/update`, {
        method: "POST",
        body: JSON.stringify({
          note: payload.note || "",
          image_url: payload.image_url || "",
        }),
      });

      await fetchIncidentUpdates(incidentId);
      await fetchIncidents();
    } catch (err) {
      alert(err.message || "Failed to add update");
    } finally {
      setActionLoading(null);
    }
  }

  // =========================
  // MARK INCIDENT AS COMPLETED
  // =========================
  async function completeIncident(incidentId) {
    try {
      setActionLoading(incidentId);

      const payload = formData[incidentId] || {};

      await apiRequest(`/incidents/${incidentId}/complete`, {
        method: "POST",
        body: JSON.stringify({
          note: payload.note || "Work completed",
          image_url: payload.image_url || "",
        }),
      });

      await fetchIncidentUpdates(incidentId);
      await fetchIncidents();
    } catch (err) {
      alert(err.message || "Failed to complete incident");
    } finally {
      setActionLoading(null);
    }
  }

  // =========================
  // CHANGE PASSWORD
  // =========================
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

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    fetchIncidents();
  }, []);

  // =========================
  // LOAD UPDATES FOR ALL INCIDENTS
  // =========================
  useEffect(() => {
    incidents.forEach((incident) => {
      fetchIncidentUpdates(incident.id);
    });
  }, [incidents]);

  // =========================
  // SUMMARY COUNTS
  // =========================
  const summary = useMemo(() => {
    return {
      total: incidents.length,
      pending: incidents.filter((incident) => incident.status === "pending").length,
      inProgress: incidents.filter((incident) => incident.status === "in_progress").length,
      completed: incidents.filter((incident) => incident.status === "completed").length,
      verified: incidents.filter((incident) => incident.status === "verified").length,
    };
  }, [incidents]);

  // =========================
  // STATUS BADGE COLORS
  // =========================
  function getStatusStyle(status) {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      padding: "6px 12px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: "700",
      letterSpacing: "0.4px",
      textTransform: "capitalize",
      border: "1px solid transparent",
    };

    if (status === "pending") {
      return {
        ...base,
        background: "rgba(250, 204, 21, 0.14)",
        color: "#FACC15",
        borderColor: "rgba(250, 204, 21, 0.3)",
      };
    }

    if (status === "in_progress") {
      return {
        ...base,
        background: "rgba(59, 130, 246, 0.14)",
        color: "#93C5FD",
        borderColor: "rgba(59, 130, 246, 0.28)",
      };
    }

    if (status === "completed") {
      return {
        ...base,
        background: "rgba(239, 68, 68, 0.14)",
        color: "#FCA5A5",
        borderColor: "rgba(239, 68, 68, 0.28)",
      };
    }

    if (status === "verified") {
      return {
        ...base,
        background: "rgba(34, 197, 94, 0.14)",
        color: "#86EFAC",
        borderColor: "rgba(34, 197, 94, 0.28)",
      };
    }

    return {
      ...base,
      background: "rgba(255,255,255,0.06)",
      color: "#E5E7EB",
      borderColor: "rgba(255,255,255,0.12)",
    };
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
          <SummaryCard label="Total Incidents" value={summary.total} accent="#FACC15" />
          <SummaryCard label="Pending" value={summary.pending} accent="#FACC15" />
          <SummaryCard label="In Progress" value={summary.inProgress} accent="#60A5FA" />
          <SummaryCard label="Completed" value={summary.completed} accent="#F87171" />
          <SummaryCard label="Verified" value={summary.verified} accent="#4ADE80" />
        </div>

        <div
          style={{
            marginBottom: "18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#FFFFFF" }}>Incident Queue</h2>
            <p style={{ marginTop: "6px", color: "#93C5FD" }}>
              Accept pending jobs, update progress, and mark work as complete.
            </p>
          </div>

          <button onClick={fetchIncidents} style={secondaryButtonStyle}>
            Refresh
          </button>
        </div>

        {loading && <div style={infoPanelStyle}>Loading incidents...</div>}
        {error && !loading && <div style={errorPanelStyle}>{error}</div>}
        {!loading && incidents.length === 0 && (
          <div style={emptyStateStyle}>
            <h3 style={{ marginTop: 0, color: "#FFFFFF" }}>No open incidents found</h3>
            <p style={{ marginBottom: 0, color: "#BFDBFE" }}>
              When incidents are assigned or available to you, they will appear here.
            </p>
          </div>
        )}

        {!loading && incidents.length > 0 && (
          <div style={{ display: "grid", gap: "20px" }}>
            {incidents.map((incident) => (
              <div key={incident.id} style={incidentCardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "14px",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    marginBottom: "18px",
                  }}
                >
                  <div>
                    <div style={incidentIdStyle}>Incident #{incident.id}</div>
                    <h3 style={{ margin: "8px 0 8px", fontSize: "24px", color: "#FFFFFF" }}>
                      {incident.title}
                    </h3>
                    <p style={{ margin: 0, color: "#BFDBFE", lineHeight: 1.6 }}>
                      {incident.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      alignItems: "flex-end",
                    }}
                  >
                    <span style={getStatusStyle(incident.status)}>
                      {incident.status?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div style={detailsGridStyle}>
                  <DetailBox label="Location" value={incident.location || "No location"} />
                  <DetailBox label="Status" value={incident.status || "N/A"} />
                  <DetailBox label="Title" value={incident.title || "N/A"} />
                </div>

                <div style={actionPanelStyle}>
                  <h4 style={{ marginTop: 0, marginBottom: "12px", color: "#FFFFFF" }}>
                    Work Update
                  </h4>

                  <textarea
                    placeholder="Add progress note..."
                    value={formData[incident.id]?.note || ""}
                    onChange={(e) => handleInputChange(incident.id, "note", e.target.value)}
                    rows={4}
                    style={textareaStyle}
                  />

                  <input
                    type="text"
                    placeholder="Image URL / evidence link"
                    value={formData[incident.id]?.image_url || ""}
                    onChange={(e) =>
                      handleInputChange(incident.id, "image_url", e.target.value)
                    }
                    style={{ ...inputStyle, marginTop: "10px" }}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "14px",
                    }}
                  >
                    {incident.status === "pending" && (
                      <button
                        onClick={() => acceptIncident(incident.id)}
                        disabled={actionLoading === incident.id}
                        style={yellowButtonStyle}
                      >
                        {actionLoading === incident.id ? "Accepting..." : "Accept Incident"}
                      </button>
                    )}

                    {incident.status === "in_progress" && (
                      <>
                        <button
                          onClick={() => addUpdate(incident.id)}
                          disabled={actionLoading === incident.id}
                          style={blueButtonStyle}
                        >
                          {actionLoading === incident.id ? "Saving..." : "Add Update"}
                        </button>

                        <button
                          onClick={() => completeIncident(incident.id)}
                          disabled={actionLoading === incident.id}
                          style={redButtonStyle}
                        >
                          {actionLoading === incident.id ? "Completing..." : "Mark Complete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: "20px" }}>
                  <h4 style={{ marginTop: 0, marginBottom: "12px", color: "#FFFFFF" }}>
                    Update History
                  </h4>

                  {updatesLoading[incident.id] ? (
                    <div style={infoMiniStyle}>Loading updates...</div>
                  ) : updatesByIncident[incident.id]?.length > 0 ? (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {updatesByIncident[incident.id].map((update) => (
                        <div key={update.id} style={updateCardStyle}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "10px",
                              flexWrap: "wrap",
                              marginBottom: "10px",
                            }}
                          >
                            <span style={getStatusStyle(update.status)}>
                              {update.status?.replace("_", " ")}
                            </span>

                            <span style={{ color: "#93C5FD", fontSize: "13px" }}>
                              {new Date(update.created_at).toLocaleString()}
                            </span>
                          </div>

                          <p style={updateTextStyle}>
                            <strong>Note:</strong> {update.note || "No note"}
                          </p>
                          <p style={updateTextStyle}>
                            <strong>Image:</strong> {update.image_url || "No image"}
                          </p>
                          <p style={updateTextStyle}>
                            <strong>Updated By:</strong> {update.updated_by || "Unknown"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={infoMiniStyle}>No updates yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  function renderSettingsView() {
    return (
      <div
        style={{
          background: "linear-gradient(180deg, rgba(8,22,48,0.95) 0%, rgba(11,30,58,0.95) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "18px",
          padding: "20px",
          boxShadow: "0 14px 28px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <h2 style={{ margin: 0, color: "#FFFFFF" }}>Settings</h2>
          <p style={{ marginTop: "6px", color: "#93C5FD" }}>
            Manage your account settings and change your password.
          </p>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <h3 style={{ margin: 0, color: "#FFFFFF" }}>Change Password</h3>
          <p style={{ marginTop: "6px", color: "#93C5FD" }}>
            Update your account password securely.
          </p>
        </div>

        {passwordError ? (
          <div
            style={{
              marginBottom: "12px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "rgba(220, 38, 38, 0.14)",
              color: "#FCA5A5",
              border: "1px solid rgba(239, 68, 68, 0.28)",
            }}
          >
            {passwordError}
          </div>
        ) : null}

        {passwordSuccess ? (
          <div
            style={{
              marginBottom: "12px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "rgba(34, 197, 94, 0.14)",
              color: "#86EFAC",
              border: "1px solid rgba(34, 197, 94, 0.28)",
            }}
          >
            {passwordSuccess}
          </div>
        ) : null}

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
            style={{ ...yellowButtonStyle, marginTop: "14px" }}
          >
            {passwordLoading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #061225 0%, #0B1E3A 55%, #0F274A 100%)",
        color: "#E5E7EB",
        padding: "24px",
      }}
    >
      <div style={heroStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "18px",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={heroPillStyle}>Engineer Workspace</div>
            <h1 style={{ margin: "14px 0 8px", fontSize: "32px", color: "#FFFFFF" }}>
              Engineer Dashboard
            </h1>
            <p style={{ margin: 0, color: "#BFDBFE", lineHeight: 1.6 }}>
              Welcome back, {user?.name || user?.username || "Engineer"}.
              Manage incidents and account settings from one place.
            </p>
          </div>

          <button onClick={logout} style={logoutButtonStyle}>
            Logout
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <div style={sidebarStyle}>
          <div style={{ marginBottom: "14px" }}>
            <h3 style={{ margin: 0, color: "#FFFFFF" }}>Menu</h3>
            <p style={{ marginTop: "6px", color: "#93C5FD", fontSize: "14px" }}>
              Navigate your workspace
            </p>
          </div>

          <button
            onClick={() => setActiveMenu("incidents")}
            style={{
              ...menuButtonStyle,
              ...(activeMenu === "incidents" ? activeMenuButtonStyle : {}),
            }}
          >
            Incidents
          </button>

          <button
            onClick={() => setActiveMenu("settings")}
            style={{
              ...menuButtonStyle,
              ...(activeMenu === "settings" ? activeMenuButtonStyle : {}),
            }}
          >
            Settings
          </button>
        </div>

        <div>
          {activeMenu === "incidents" && renderIncidentsView()}
          {activeMenu === "settings" && renderSettingsView()}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(8,22,48,0.95) 0%, rgba(11,30,58,0.95) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `4px solid ${accent}`,
        borderRadius: "18px",
        padding: "18px",
        boxShadow: "0 14px 28px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ fontSize: "13px", color: "#93C5FD", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: "800", color: "#FFFFFF" }}>
        {value}
      </div>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "14px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: "700",
          color: "#93C5FD",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ color: "#F8FAFC", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

const heroStyle = {
  background:
    "linear-gradient(135deg, rgba(8,22,48,0.95) 0%, rgba(17,24,39,0.95) 50%, rgba(30,58,138,0.92) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "22px",
  padding: "28px",
  marginBottom: "24px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
};

const heroPillStyle = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "rgba(250, 204, 21, 0.14)",
  color: "#FACC15",
  border: "1px solid rgba(250, 204, 21, 0.28)",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};

const sidebarStyle = {
  background: "linear-gradient(180deg, rgba(8,22,48,0.96) 0%, rgba(11,30,58,0.96) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  padding: "18px",
  boxShadow: "0 16px 32px rgba(0,0,0,0.22)",
  position: "sticky",
  top: "24px",
};

const menuButtonStyle = {
  width: "100%",
  textAlign: "left",
  padding: "14px 16px",
  marginBottom: "10px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#E5E7EB",
  fontWeight: "700",
  cursor: "pointer",
};

const activeMenuButtonStyle = {
  background: "rgba(250, 204, 21, 0.14)",
  color: "#FACC15",
  border: "1px solid rgba(250, 204, 21, 0.28)",
};

const incidentCardStyle = {
  background: "linear-gradient(180deg, rgba(8,22,48,0.96) 0%, rgba(11,30,58,0.96) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  padding: "20px",
  boxShadow: "0 16px 32px rgba(0,0,0,0.22)",
};

const incidentIdStyle = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.06)",
  color: "#93C5FD",
  fontSize: "12px",
  fontWeight: "700",
  border: "1px solid rgba(255,255,255,0.08)",
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const actionPanelStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "16px",
};

const updateCardStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "14px",
};

const updateTextStyle = {
  margin: "6px 0",
  color: "#E5E7EB",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(6, 18, 37, 0.92)",
  color: "#F9FAFB",
  outline: "none",
  fontSize: "14px",
  boxSizing: "border-box",
};

const textareaStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(6, 18, 37, 0.92)",
  color: "#F9FAFB",
  outline: "none",
  fontSize: "14px",
  resize: "vertical",
  boxSizing: "border-box",
};

const yellowButtonStyle = {
  background: "#FACC15",
  color: "#111827",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "800",
  cursor: "pointer",
};

const blueButtonStyle = {
  background: "#2563EB",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "800",
  cursor: "pointer",
};

const redButtonStyle = {
  background: "#DC2626",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "800",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  background: "rgba(250, 204, 21, 0.14)",
  color: "#FACC15",
  border: "1px solid rgba(250, 204, 21, 0.28)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: "700",
  cursor: "pointer",
};

const logoutButtonStyle = {
  background: "rgba(220, 38, 38, 0.16)",
  color: "#FCA5A5",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: "12px",
  padding: "10px 16px",
  fontWeight: "700",
  cursor: "pointer",
};

const infoPanelStyle = {
  background: "rgba(37, 99, 235, 0.12)",
  color: "#BFDBFE",
  border: "1px solid rgba(59, 130, 246, 0.26)",
  borderRadius: "16px",
  padding: "16px",
};

const errorPanelStyle = {
  background: "rgba(220, 38, 38, 0.12)",
  color: "#FCA5A5",
  border: "1px solid rgba(239, 68, 68, 0.26)",
  borderRadius: "16px",
  padding: "16px",
};

const emptyStateStyle = {
  background: "linear-gradient(180deg, rgba(8,22,48,0.92) 0%, rgba(11,30,58,0.92) 100%)",
  border: "1px dashed rgba(255,255,255,0.14)",
  borderRadius: "18px",
  padding: "24px",
};

const infoMiniStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px dashed rgba(255,255,255,0.12)",
  borderRadius: "12px",
  padding: "12px",
  color: "#BFDBFE",
};