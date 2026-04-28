import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await login(form.username, form.password);

      if (user.role === "admin") navigate("/admin");
      else if (user.role === "engineer") navigate("/engineer");
      else if (user.role === "client") navigate("/client");
      else navigate("/login");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #000000 0%, #0a0a0a 60%, #111111 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          background: "#0a0a0a",
          border: "1px solid rgba(255,165,0,0.15)",
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
        }}
      >
        {/* LEFT PANEL */}
        <div
          style={{
            padding: "48px",
            background:
              "linear-gradient(135deg, #000000 0%, #111111 50%, #1a1a1a 100%)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "6px 12px",
                borderRadius: "999px",
                background: "rgba(255,165,0,0.1)",
                color: "#FFA500",
                border: "1px solid rgba(255,165,0,0.3)",
                fontSize: "12px",
                fontWeight: "800",
                marginBottom: "18px",
              }}
            >
              BCN Incident Platform
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                lineHeight: 1.15,
                fontWeight: "800",
              }}
            >
              Manage incidents with speed, clarity, and control.
            </h1>

            <p
              style={{
                marginTop: "18px",
                fontSize: "16px",
                lineHeight: 1.7,
                color: "#d4d4d4",
                maxWidth: "520px",
              }}
            >
              Access your workspace as an admin, engineer, or client. Track issues,
              coordinate updates, and keep operations moving.
            </p>
          </div>

          <div style={{ display: "grid", gap: "14px", marginTop: "32px" }}>
            <FeatureRow text="Role-based access for Admin, Engineer, and Client users" />
            <FeatureRow text="Live incident tracking and updates" />
            <FeatureRow text="Fast resolution workflow" />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          style={{
            padding: "48px 38px",
            background: "#000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "400px" }}>
            <div style={{ marginBottom: "28px" }}>
              <h2
                style={{
                  margin: 0,
                  color: "#ffffff",
                  fontSize: "30px",
                  fontWeight: "800",
                }}
              >
                Login
              </h2>
              <p style={{ marginTop: "10px", color: "#aaa" }}>
                Enter your credentials to continue.
              </p>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "14px",
                  background: "rgba(255,69,58,0.1)",
                  border: "1px solid rgba(255,69,58,0.3)",
                  color: "#ff6b6b",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>Username</label>
                  <input
                    type="text"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#FFA500",
                    color: "#000",
                    border: "none",
                    borderRadius: "14px",
                    padding: "13px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 10px 25px rgba(255,165,0,0.3)",
                  }}
                >
                  {submitting ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ text }) {
  return (
    <div style={{ display: "flex", gap: "12px", color: "#e5e5e5" }}>
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: "#FFA500",
          boxShadow: "0 0 10px rgba(255,165,0,0.7)",
        }}
      />
      <span>{text}</span>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontSize: "13px",
  fontWeight: "700",
  color: "#FFA500",
};

const inputStyle = {
  width: "100%",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid rgba(255,165,0,0.2)",
  background: "#111",
  color: "#fff",
  outline: "none",
};
