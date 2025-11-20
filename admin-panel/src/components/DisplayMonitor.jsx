import React, { useEffect, useState } from "react";
import pb from "../services/pocketbase";
import "./DisplayMonitor.css";

const ONLINE_THRESHOLD_MS = 60 * 1000;

function computeStatus(lastSeen) {
  if (!lastSeen) return "offline";
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff <= ONLINE_THRESHOLD_MS ? "online" : "offline";
}

function formatDuration(ms) {
  if (!ms || ms < 0) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function DisplayMonitor() {
  const [displays, setDisplays] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let unsub = null;

    async function load() {
      try {
        const list = await pb.collection("displays").getFullList({
          sort: "location,name",
          requestKey: null,
          signal: controller.signal,
        });
        setDisplays(list);
      } catch (err) {
        if (err.name === "AbortError") {
          console.warn("Fetch aborted");
        } else {
          console.error("Failed to load displays:", err);
        }
      }
    }

    load();

    unsub = pb.collection("displays").subscribe("*", ({ action, record }) => {
      setDisplays((prev) => {
        // 1. Remove the old version of the record (if it exists)
        const filtered = prev.filter((d) => d.id !== record.id);
        
        if (action === "delete") {
          return filtered;
        }

        // 2. Insert the new record
        const updatedList = [...filtered, record];
        
        // 3. Re-sort the list to maintain order (location, name)
        // Note: Sorting client-side is necessary if the initial fetch was sorted.
        updatedList.sort((a, b) => {
            const locA = (a.location || "").toLowerCase();
            const locB = (b.location || "").toLowerCase();
            const nameA = (a.name || "").toLowerCase();
            const nameB = (b.name || "").toLowerCase();

            if (locA < locB) return -1;
            if (locA > locB) return 1;
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        return updatedList;
      });
    });

    return () => {
      if (unsub) pb.collection("displays").unsubscribe("*");
      controller.abort();
    };
  }, []);

  function getIp(d) {
    return d.ip_address || "-";
  }

  const filteredDisplays = displays.filter((d) => {
    const status = computeStatus(d.last_seen);
    if (statusFilter === "online") return status === "online";
    if (statusFilter === "offline") return status === "offline";
    return true;
  });

  async function handleRefresh(display) {
    try {
      setIsBusy(true);
      await pb.collection("displays").update(display.id, {
        current_type: "command",
        current_title: "REFRESH",
      });
      alert(`Refresh command sent to ${display.name || display.code}`);
    } catch (err) {
      console.error(err);
      alert("Failed to send refresh.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRestart(display) {
    try {
      setIsBusy(true);
      await pb.collection("displays").update(display.id, {
        current_type: "command",
        current_title: "RESTART",
      });
      alert(`Restart command sent to ${display.name || display.code}`);
    } catch (err) {
      console.error(err);
      alert("Failed to send restart.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSendAlert(display) {
    const msg = window.prompt(`Enter alert/message to show on ${display.name || display.code}:`);
    if (!msg || !msg.trim()) return;

    try {
      setIsBusy(true);
      await pb.collection("displays").update(display.id, {
        current_type: "alert",
        current_title: msg.trim(),
      });
      alert("Alert command stored. Make sure your Player handles alert type.");
    } catch (err) {
      console.error(err);
      alert("Failed to send alert.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReassignLocation(display) {
    const newLoc = window.prompt(`New location for ${display.name || display.code}:`, display.location || "");
    if (newLoc == null || !newLoc.trim()) return alert("Location cannot be empty.");

    try {
      setIsBusy(true);
      await pb.collection("displays").update(display.id, {
        location: newLoc.trim(),
      });
      alert("Location updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to update location.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRemove(display) {
    if (!window.confirm(`Remove display "${display.name || display.code}"?`)) return;

    try {
      setIsBusy(true);
      await pb.collection("displays").delete(display.id);
      alert("Display removed.");
    } catch (err) {
      console.error(err);
      alert("Failed to remove display.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClearAlert(display) {
    if (!window.confirm(`Clear the active alert on "${display.name || display.code}"?`)) return;

    try {
        setIsBusy(true);
        // Clearing both current_type and current_title will dismiss the alert on the player.
        await pb.collection("displays").update(display.id, {
          current_type: null,
          current_title: null,
        });
        alert(`Alert cleared for ${display.name || display.code}.`);
      } catch (err) {
        console.error(err);
        alert("Failed to clear alert.");
      } finally {
        setIsBusy(false);
      }
    }

  return (
    <div className="display-monitor">
      <h2>📺 Display Status Monitor</h2>
      <div className="subtitle">Live view of all display windows (OPDs, medicals, halls, canteens, etc.).</div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Filter:</strong>{" "}
        <button onClick={() => setStatusFilter("all")} disabled={statusFilter === "all"}>All</button>{" "}
        <button onClick={() => setStatusFilter("online")} disabled={statusFilter === "online"}>Online</button>{" "}
        <button onClick={() => setStatusFilter("offline")} disabled={statusFilter === "offline"}>Offline</button>
      </div>

      {isBusy && <p className="working">Sending command...</p>}

      <table className="display-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Location</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Uptime</th>
            <th>Now Playing</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredDisplays.map((d) => {
            const status = computeStatus(d.last_seen);
            const createdTime = d.created ? new Date(d.created).getTime() : null;
            const lastSeenTime = d.last_seen ? new Date(d.last_seen).getTime() : null;
            const uptimeMs = status === "online" && createdTime ? (lastSeenTime || Date.now()) - createdTime : null;

            return (
              <tr key={d.id}>
                <td>{d.code}</td>
                <td>{d.name}</td>
                <td>{d.location}</td>
                <td>
                  <span className={`status-badge ${status}`}>{status === "online" ? "Online" : "Offline"}</span>
                </td>
                <td>{d.last_seen ? new Date(d.last_seen).toLocaleString() : "-"}</td>
                <td>{uptimeMs ? formatDuration(uptimeMs) : "-"}</td>
                <td>
                  {d.current_title ? (
                    <>
                      <strong>{d.current_title}</strong>
                      <br />
                      <small>
                        ({d.current_type === "birthday" ? "🎂 Birthday" :
                          d.current_type === "alert" ? "🚨 Alert" :
                          d.current_type || "Content"})
                      </small>
                    </>
                  ) : (
                    <span style={{ color: "#777" }}>Idle</span>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button onClick={() => handleRefresh(d)} disabled={isBusy}>Refresh</button>{" "}
                  <button onClick={() => handleRestart(d)} disabled={isBusy}>Reset</button>{" "}
                  <button onClick={() => handleSendAlert(d)} disabled={isBusy}>Alert</button>{" "}
                  {/* 🚨 NEW CLEAR ALERT BUTTON */}
                  {/* Show only if an alert is currently active */}
                  {d.current_type === "alert" && (
                    <button onClick={() => handleClearAlert(d)} disabled={isBusy} style={{ color: "orange" }}>
                      Clear Alert
                    </button>
                  )}{" "}
                  <button onClick={() => handleReassignLocation(d)} disabled={isBusy}>Move</button>{" "}
                  <button onClick={() => handleRemove(d)} disabled={isBusy} style={{ color: "red" }}>Remove</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
