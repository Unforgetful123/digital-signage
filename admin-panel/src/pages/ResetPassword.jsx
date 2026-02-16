import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import pb from "../services/pocketbase";
import "./Login.css"; // Reuse your login styles

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const token = searchParams.get("token"); // Grabs the token from the email link

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    setError("");

    try {
      // 🔐 This sends the token and new password to PocketBase
      // Use pb.admins if you are resetting a system admin
      // Use pb.collection("admins") if it's your custom collection
      await pb.admins.confirmPasswordReset(
        token,
        newPassword,
        confirmPassword
      );
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000); // Redirect to login after 3 seconds
    } catch (err) {
      setError("Link expired or invalid. Please request a new reset email.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Create New Password</h1>
        
        {success ? (
          <div className="success-text">
            Password updated successfully! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}