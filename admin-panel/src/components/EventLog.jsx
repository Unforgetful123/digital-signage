import React, { useEffect, useState } from 'react';
import pb from '../services/pocketbase';
import './EventLog.css';

const ACTION_LABELS = {
  login: 'Login',
  alert_trigger: 'Live Alert',
  alert_clear: 'Clear Alert',
  alert_schedule: 'Schedule Alert',
  content_upload: 'Upload Content',
  content_bulk: 'Bulk Content',
  content_delete: 'Delete Content',
  birthday_add: 'Add Birthday',
  birthday_bulk: 'Bulk Birthday',
  birthday_delete: 'Delete Birthday',
  display_alert: 'Display Alert',
  display_clear_alert: 'Clear Display Alert',
  display_refresh: 'Refresh Display',
  display_restart: 'Restart Display',
  display_move: 'Move Display',
  display_remove: 'Remove Display',
};

const ACTION_TONES = {
  login: 'neutral',
  alert_trigger: 'danger',
  alert_clear: 'success',
  alert_schedule: 'warn',
  content_upload: 'info',
  content_bulk: 'info',
  content_delete: 'warn',
  birthday_add: 'info',
  birthday_bulk: 'info',
  birthday_delete: 'warn',
  display_alert: 'danger',
  display_clear_alert: 'success',
  display_refresh: 'neutral',
  display_restart: 'warn',
  display_move: 'neutral',
  display_remove: 'danger',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'alerts', label: 'Alerts', actions: ['alert_trigger', 'alert_clear', 'alert_schedule', 'display_alert', 'display_clear_alert'] },
  { id: 'content', label: 'Content', actions: ['content_upload', 'content_bulk', 'content_delete', 'birthday_add', 'birthday_bulk', 'birthday_delete'] },
  { id: 'displays', label: 'Displays', actions: ['display_refresh', 'display_restart', 'display_move', 'display_remove', 'display_alert', 'display_clear_alert'] },
  { id: 'login', label: 'Logins', actions: ['login'] },
];

export default function EventLog() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    let unsub = null;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const list = await pb.collection('event_logs').getList(1, 200, {
          sort: '-created',
          requestKey: null,
        });
        setEvents(list.items);
      } catch (err) {
        console.error('Failed to load event logs:', err);
        setError('Could not load event logs. Restart the admin app once so the database can apply the new collection.');
      } finally {
        setLoading(false);
      }
    }

    load();

    try {
      unsub = pb.collection('event_logs').subscribe('*', ({ action, record }) => {
        setEvents((prev) => {
          if (action === 'delete') return prev.filter((e) => e.id !== record.id);
          const without = prev.filter((e) => e.id !== record.id);
          return [record, ...without].sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 200);
        });
      });
    } catch (err) {
      console.warn('Event log subscribe failed:', err);
    }

    return () => {
      if (unsub) pb.collection('event_logs').unsubscribe('*');
    };
  }, []);

  const activeFilter = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const visible = events.filter((e) => {
    if (!activeFilter.actions) return true;
    return activeFilter.actions.includes(e.action);
  });

  return (
    <div className="event-log">
      <p className="event-log-subtitle">
        Who raised alerts, posted content, or managed displays — newest first.
      </p>

      <div className="event-log-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`event-filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p className="event-log-status">Loading events…</p>}
      {error && <p className="event-log-error">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <p className="event-log-status">No events yet. Actions from Home and Display Monitor will appear here.</p>
      )}

      {!loading && visible.length > 0 && (
        <div className="event-log-table-wrap">
          <table className="event-log-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Admin</th>
                <th>Source</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => (
                <tr key={event.id}>
                  <td className="event-time">
                    {event.created ? new Date(event.created).toLocaleString() : '—'}
                  </td>
                  <td>
                    <span className={`event-badge tone-${ACTION_TONES[event.action] || 'neutral'}`}>
                      {ACTION_LABELS[event.action] || event.action}
                    </span>
                  </td>
                  <td>{event.actor_email || '—'}</td>
                  <td>{event.source === 'display_monitor' ? 'Display Monitor' : 'Admin Panel'}</td>
                  <td>{event.target || '—'}</td>
                  <td className="event-details">{event.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
