import React, { useState } from "react";
import pb from "../services/pocketbase";
import "./Login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(""); // New state for success messages

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const authData = await pb.collection("admins").authWithPassword(email, password);

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

  // 📧 New Forgot Password Handler
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // PocketBase built-in reset request
      await pb.collection("admins").requestPasswordReset(email);
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setError("Failed to send reset email. Verify the email is correct.");
      console.error("Reset error:", err);
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

          {/* 🔗 Forgot Password Link */}
          <div className="forgot-password-container">
            <button 
              type="button" 
              className="forgot-link" 
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Processing..." : "Login"}
          </button>
        </form>

        <footer className="login-footer">© {new Date().getFullYear()} VRLogical Technologies</footer>
      </div>
    </div>
  );  
}