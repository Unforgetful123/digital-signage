export const QUEUE_ID = 'globalqueue0001';
export const keyOf = item => item ? `${item.type === 'birthday' ? 'birthday' : 'content'}:${item.id}` : '';
export const normalLocation = value => (value || '').trim().toLowerCase();
export function contentStatus(item, now = Date.now()) {
  const start = item.start_time ? Date.parse(item.start_time) : null;
  const end = item.end_time ? Date.parse(item.end_time) : null;
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return 'Invalid schedule';
  if (end !== null && now >= end) return 'Expired';
  if (start !== null && now < start) return 'Scheduled';
  return 'Queued';
}
export function orderedContent(items, ids = []) {
  const ranks = new Map((Array.isArray(ids) ? ids : []).map((id, i) => [id, i]));
  return [...items].sort((a,b) => {
    const ar = ranks.has(a.id) ? ranks.get(a.id) : Infinity;
    const br = ranks.has(b.id) ? ranks.get(b.id) : Infinity;
    if (ar !== br) return ar - br;
    return String(b.created || '').localeCompare(String(a.created || '')) || a.id.localeCompare(b.id);
  });
}
export function buildQueue(content, birthdays, ids, location, now = Date.now(), online = true) {
  const media = orderedContent(content, ids).filter(i => contentStatus(i, now) === 'Queued' &&
    (normalLocation(i.location || 'Global') === 'global' || normalLocation(i.location) === normalLocation(location)) &&
    i.type !== 'alert' && (online || i.type !== 'youtube'));
  const date = new Date(now);
  const mmdd = `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const birthdayItems = birthdays.filter(b => String(b.dob || '').slice(5,10) === mmdd).map(b => ({
    ...b, type:'birthday', title:b.name, location:'Global', duration:b.duration || 10,
  }));
  const result = []; let bi = 0;
  media.forEach((item,i) => { result.push(item); if ((i+1)%3 === 0 && bi < birthdayItems.length) result.push(birthdayItems[bi++]); });
  return result.concat(birthdayItems.slice(bi));
}
export function queuePosition(items, currentKey) {
  const index = Math.max(0, items.findIndex(i => keyOf(i) === currentKey));
  return {index, item:items[index] || null, next:items.length ? items[(index+1)%items.length] : null};
}
export function moveItem(ids, from, to) {
  const result = [...ids];
  if (from < 0 || to < 0 || from >= result.length || to >= result.length) return result;
  result.splice(to, 0, result.splice(from,1)[0]); return result;
}
export const deviceOnline = (d, now = Date.now()) => !!d.last_seen && now - Date.parse(d.last_seen) < 60000;
