import pb from './pocketbase';

/**
 * Write an audit event. Failures are swallowed so logging never blocks the UI action.
 */
export async function logEvent({
  action,
  details = '',
  target = '',
  source = 'admin_panel',
}) {
  try {
    const actor = pb.authStore.model;
    await pb.collection('event_logs').create({
      action,
      details: String(details || '').slice(0, 2000),
      target: String(target || '').slice(0, 500),
      source,
      actor_email: actor?.email || 'unknown',
      actor_id: actor?.id || '',
    }, { requestKey: null });
  } catch (err) {
    console.warn('[eventLog] Failed to write event:', err?.message || err);
  }
}
