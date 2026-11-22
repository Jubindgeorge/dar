/* Shared DAR date and audit helpers. Dates are stored as ISO YYYY-MM-DD; timestamps as ISO 8601. */
(function () {
  const pad = n => String(n).padStart(2, '0');
  const todayISO = () => { const d = new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
  const normalize = value => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') { const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
    const s = String(value).trim();
    const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  };
  const format = value => { const s=normalize(value); return s ? s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4) : '-'; };
  const audit = previous => {
    const user = window.firebase?.auth?.().currentUser;
    const now = new Date().toISOString();
    return { createdDate: previous?.id ? (previous.createdDate || normalize(previous.createdAt) || '') : todayISO(), updatedAt: now, updatedBy: user?.email || user?.uid || 'Unknown' };
  };
  window.darDates = { todayISO, normalize, format, audit };
  window.darFormatTableDate = format;
})();
