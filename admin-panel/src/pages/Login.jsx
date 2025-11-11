import React, { useState } from "react";
import pb from "../services/pocketbase";
import "./Login.css"; // 👈 create this CSS file below

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 🔐 Authenticate with PocketBase
      const authData = await pb.collection("admins").authWithPassword(email, password);

      // 🪵 Log successful login
      await pb.collection("login_logs").create({
        user: authData.record.id,
        email: authData.record.email,
        time: new Date().toISOString(),
      });

      onLogin(authData.record);
    } catch (err) {
      setError("Invalid email or password");
      console.error("Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">VRL Smart Digital Signage</h1>
        <h2 className="login-subtitle">Admin Login</h2>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <footer className="login-footer">© {new Date().getFullYear()} VRLogical Technologies</footer>
      </div>
    </div>
  );
}
