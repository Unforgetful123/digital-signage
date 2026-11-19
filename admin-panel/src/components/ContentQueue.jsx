import React, { useEffect, useRef, useState } from 'react';
import pb from '../services/pocketbase';
import { logEvent } from '../services/eventLog';
import {
  QUEUE_ID,
  buildQueue,
  contentStatus,
  deviceOnline,
  keyOf,
  moveItem,
  orderedContent,
} from '../../../shared/playback.mjs';
import './ContentQueue.css';

const TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  youtube: 'YouTube',
  ppt: 'PDF',
  pdf: 'PDF',
  birthday: 'Birthday',
};

function displayName(screen) {
  return screen.name || screen.code || screen.id;
}

function itemDetails(item) {
  const type = TYPE_LABELS[item.type] || item.type || 'Content';

  if (Number(item.duration) > 0) {
    const perPage = item.type === 'ppt' || item.type === 'pdf';
    return `${type} · ${item.duration}s${perPage ? ' / page' : ''}`;
  }

  if (item.type === 'video' || item.type === 'youtube') {
    return `${type} · Full video`;
  }

  return type;
}

function reportTitle(title, type, fallback) {
  if (!title) return fallback;
  return TYPE_LABELS[type] ? `${title} (${TYPE_LABELS[type]})` : title;
}

export default function ContentQueue() {
  const [content, setContent] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [devices, setDevices] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [draft, setDraft] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [dragging, setDragging] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now);

  const draftBase = useRef(null);
  const dragId = useRef('');

  useEffect(() => {
    let disposed = false;
    let latestRequest = 0;
    const subscriptions = [];

    async function load() {
      const request = ++latestRequest;

      try {
        const [items, people, screens, queue] = await Promise.all([
          pb.collection('content').getFullList({ requestKey: null }),
          pb.collection('birthday').getFullList({ requestKey: null }),
          pb.collection('displays').getFullList({ requestKey: null }),
          pb.collection('playback_queues').getOne(QUEUE_ID, {
            requestKey: null,
          }),
        ]);

        if (disposed || request !== latestRequest) return;

        setContent(items);
        setBirthdays(people);
        setDevices(screens);
        setSavedIds(queue.content_ids || []);
        setNow(Date.now());
        setReady(true);
        setLoadError('');
      } catch {
        if (disposed || request !== latestRequest) return;

        setReady(false);
        setLoadError(
          'Could not load the queue. Check the server connection, permissions, and queue migration.'
        );
      } finally {
        if (!disposed && request === latestRequest) setLoading(false);
      }
    }

    async function subscribe() {
      const collections = ['content', 'birthday', 'displays', 'playback_queues'];

      for (const collection of collections) {
        if (disposed) return;

        try {
          const unsubscribe = await pb.collection(collection).subscribe('*', load);
          if (disposed) unsubscribe();
          else subscriptions.push(unsubscribe);
        } catch {
          // Polling continues if realtime updates are unavailable.
        }
      }
    }

    load();
    subscribe();

    const poll = setInterval(load, 15000);
    const clock = setInterval(() => setNow(Date.now()), 10000);

    return () => {
      disposed = true;
      clearInterval(poll);
      clearInterval(clock);
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const order = draft ?? savedIds;
  const uploads = orderedContent(content, order);

  const screens = devices
    .filter(screen => screen.device_role !== 'pc_receiver')
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));

  const selectedScreen = screens.find(screen => screen.id === selectedId);

  // All content is a library view. A selected screen uses the player's
  // own queue builder, including location, schedule, and birthday placement.
  const rows = selectedScreen
    ? buildQueue(content, birthdays, order, selectedScreen.location, now)
    : [...uploads, ...buildQueue([], birthdays, [], 'Global', now)];

  const changedElsewhere =
    draft !== null && JSON.stringify(savedIds) !== draftBase.current;

  // Reordering always uses upload IDs. A birthday or filtered-out upload
  // must never shift the wrong media item when a row is moved.
  const visibleUploads = rows.filter(item => item.type !== 'birthday');
  const visibleUploadIndex = new Map(
    visibleUploads.map((item, index) => [item.id, index])
  );

  const playingScreens = new Map();

  for (const screen of screens) {
    if (!deviceOnline(screen, now) || !screen.current_item_key) continue;
    if (['idle', 'alert', 'command'].includes(screen.current_type)) continue;

    const key = screen.current_item_key;
    if (!playingScreens.has(key)) playingScreens.set(key, []);
    playingScreens.get(key).push(displayName(screen));
  }

  function reorder(sourceId, targetId) {
    if (busy || !ready || changedElsewhere || sourceId === targetId) return;

    const ids = uploads.map(item => item.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    if (draft === null) draftBase.current = JSON.stringify(savedIds);

    setDraft(moveItem(ids, from, to));
    setActionError('');
    setNotice('Unsaved queue order');
  }

  function discard() {
    draftBase.current = null;
    setDraft(null);
    setNotice('');
    setActionError('');
  }

  function endDrag() {
    dragId.current = '';
    setDragging('');
  }

  async function save() {
    if (busy || !ready || draft === null || changedElsewhere) return;

    setBusy(true);
    setActionError('');

    try {
      const collection = pb.collection('playback_queues');
      const latest = await collection.getOne(QUEUE_ID, { requestKey: null });

      if (JSON.stringify(latest.content_ids || []) !== draftBase.current) {
        setSavedIds(latest.content_ids || []);
        throw new Error(
          'Another session changed the queue. Discard your draft and reorder again.'
        );
      }

      const ids = uploads.map(item => item.id);
      await collection.update(QUEUE_ID, { content_ids: ids }, { requestKey: null });

      setSavedIds(ids);
      setDraft(null);
      draftBase.current = null;
      setNotice('Queue saved. Players use the new order after the current item.');

      await logEvent({
        action: 'content_reorder',
        target: 'Shared playback queue',
        details: ids.join(', '),
      });
    } catch (err) {
      setActionError(err.message || 'Could not save the queue.');
    } finally {
      setBusy(false);
    }
  }

  async function removeContent(item) {
    if (busy || !ready) return;

    const isBirthday = item.type === 'birthday';
    const title = item.title || item.name || 'Untitled';

    const message = isBirthday
      ? `Delete the birthday entry for "${title}"? This removes it from today's queue and future birthday schedules.`
      : `Permanently remove "${title}" from the content library and all monitor queues?`;

    if (!window.confirm(message)) return;

    setBusy(true);
    setActionError('');
    setNotice('');

    try {
      const collection = isBirthday ? 'birthday' : 'content';
      await pb.collection(collection).delete(item.id);

      if (isBirthday) {
        setBirthdays(people => people.filter(person => person.id !== item.id));
      } else {
        setContent(items => items.filter(entry => entry.id !== item.id));
        setDraft(current => current?.filter(id => id !== item.id) ?? null);
      }

      setNotice(
        isBirthday ? `Removed the birthday entry for "${title}".` : `Removed "${title}".`
      );

      await logEvent({
        action: isBirthday ? 'birthday_delete' : 'content_delete',
        target: title,
        details: `Removed ${collection} record ${item.id} from Content & Queue`,
      });
    } catch (err) {
      setActionError(err.message || `Could not remove "${title}".`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="content-queue">
      <div className="queue-heading">
        <div>
          <h2>Content &amp; Queue</h2>
          <p>
            {selectedScreen
              ? `Playback order for ${displayName(selectedScreen)}.`
              : 'Select a website display to see its playback order.'}
          </p>
        </div>

        {ready && (
          <span className="queue-count">
            {rows.length} {rows.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      <div className="queue-controls">
        <label htmlFor="queue-monitor">Preview a website display</label>

        <select
          id="queue-monitor"
          value={selectedScreen?.id || ''}
          onChange={event => setSelectedId(event.target.value)}
        >
          <option value="">All content</option>
          {screens.map(screen => (
            <option key={screen.id} value={screen.id}>
              {displayName(screen)} — {screen.location || 'Unassigned'}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={draft === null || busy || !ready || changedElsewhere}
          onClick={save}
        >
          Save order
        </button>

        <button
          type="button"
          className="queue-secondary"
          disabled={draft === null || busy}
          onClick={discard}
        >
          Discard changes
        </button>
      </div>

      {notice && <p role="status" className="queue-notice">{notice}</p>}

      {changedElsewhere && (
        <p role="alert" className="queue-error">
          Another session changed the saved queue. Discard your draft before editing again.
        </p>
      )}

      {(loadError || actionError) && (
        <p role="alert" className="queue-error">{loadError || actionError}</p>
      )}

      {ready && selectedScreen && (
        <div className="queue-preview">
          <h3>{displayName(selectedScreen)} · {selectedScreen.location || 'Unassigned'}</h3>
          <p>
            {deviceOnline(selectedScreen, now) ? 'Now playing' : 'Last reported'}:{' '}
            <strong>
              {reportTitle(selectedScreen.current_title, selectedScreen.current_type, 'Idle')}
            </strong>
            {' · '}
            {deviceOnline(selectedScreen, now) ? 'Up next' : 'Last reported next'}:{' '}
            <strong>
              {reportTitle(selectedScreen.next_title, selectedScreen.next_type, 'Not reported yet')}
            </strong>
          </p>
        </div>
      )}

      {loading && <p role="status">Loading content…</p>}

      {ready && rows.length === 0 && (
        <p className="queue-empty">
          {selectedScreen
            ? 'No content is scheduled for this display right now.'
            : 'No content to display.'}
        </p>
      )}

      {ready && rows.length > 0 && (
        <div className="queue-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Content</th>
                <th>Target</th>
                <th>Status / schedule</th>
                <th>Playing on</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item, index) => {
                const key = keyOf(item);
                const title = item.title || 'Untitled';
                const automatic = item.type === 'birthday';
                const uploadIndex = visibleUploadIndex.get(item.id);
                const monitors = playingScreens.get(key) || [];
                const status = monitors.length ? 'Now playing' : contentStatus(item, now);
                const canMove = !automatic && !busy && !changedElsewhere;

                return (
                  <tr
                    key={key}
                    draggable={canMove}
                    className={dragging === key ? 'queue-dragging' : ''}
                    onDragStart={event => {
                      if (!canMove) return;
                      dragId.current = item.id;
                      setDragging(key);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.id);
                    }}
                    onDragOver={event => {
                      if (!canMove || !dragId.current) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={event => {
                      event.preventDefault();
                      if (canMove && dragId.current) reorder(dragId.current, item.id);
                      endDrag();
                    }}
                    onDragEnd={endDrag}
                  >
                    <td>
                      <div className="queue-order">
                        <span>{automatic && !selectedScreen ? 'Auto' : index + 1}</span>
                        {!automatic && (
                          <>
                            <button
                              type="button"
                              aria-label={`Move ${title} up`}
                              disabled={!canMove || uploadIndex === 0}
                              onClick={() => reorder(item.id, visibleUploads[uploadIndex - 1].id)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${title} down`}
                              disabled={!canMove || uploadIndex === visibleUploads.length - 1}
                              onClick={() => reorder(item.id, visibleUploads[uploadIndex + 1].id)}
                            >
                              ↓
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                    <td>
                      <strong>{title}</strong>
                      <small>{itemDetails(item)}</small>
                    </td>

                    <td>{item.location || 'Global'}</td>

                    <td>
                      <span className={`queue-status ${status.toLowerCase().replaceAll(' ', '-')}`}>
                        {status}
                      </span>
                      {automatic ? (
                        <small>Today</small>
                      ) : (
                        <>
                          <small>
                            {item.start_time
                              ? `From ${new Date(item.start_time).toLocaleString()}`
                              : 'No start limit'}
                          </small>
                          <small>
                            {item.end_time
                              ? `Until ${new Date(item.end_time).toLocaleString()}`
                              : 'No end limit'}
                          </small>
                        </>
                      )}
                    </td>

                    <td>{monitors.join(', ') || '—'}</td>
                    <td>
                      <button
                        type="button"
                        disabled={busy || !ready}
                        aria-label={automatic ? `Remove birthday for ${title}` : `Remove ${title}`}
                        onClick={() => removeContent(item)}
                      >
                        {automatic ? 'Remove birthday' : 'Remove content'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}