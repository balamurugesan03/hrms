// Shared HH:mm / calendar-day helpers (server local time)

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

const nowHHmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Records may be stored at local midnight or UTC midnight; the local calendar date is the same for both in IST
const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Local midnight of a 'YYYY-MM-DD' string (or a Date)
const startOfDay = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const monthRange = (month, year) => ({
  start: new Date(year, month - 1, 1),
  end: new Date(year, month, 1), // exclusive
});

const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};

module.exports = { toMinutes, nowHHmm, dayKey, startOfDay, monthRange, formatMinutes };
