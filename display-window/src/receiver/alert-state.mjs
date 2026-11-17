// Pure record-to-alert conversion. Never extend a deadline on heartbeat updates.
export function readAlert(record, now=Date.now(), completedId='') {
  if (!record || record.current_type !== 'alert') return null;
  const expiry = record.current_alert_expires;
  if (expiry && (!Number.isFinite(Date.parse(expiry)) || Date.parse(expiry) <= now)) return null;
  const mode = record.current_announcement_mode || '';
  if (mode && !['record','live'].includes(mode)) return null;
  if (mode === 'live' && (!record.current_offer || !record.current_live_seen || !Number.isFinite(Date.parse(record.current_live_seen)) || now-Date.parse(record.current_live_seen)>25000)) return null;
  const id=record.current_alert_id || JSON.stringify([record.id,record.current_command,record.current_title,record.current_lang,expiry,mode,record.current_audio,record.current_offer,record.current_scope]);
  if (id === completedId) return null;
  return {id, alertId:record.current_alert_id || '', type:record.current_command || 'notice',
    alertLabel:record.current_alert_label || record.current_command || 'Notice',
    message:record.current_title || '', scope:record.current_scope || record.location || 'Global',
    lang:record.current_lang || 'none', expiresAt:expiry || '', mode,
    repeatMinutes:record.current_repeat_minutes || 0, offer:record.current_offer || '', audioFile:record.current_audio || ''};
}
