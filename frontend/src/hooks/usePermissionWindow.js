import { useState, useEffect } from 'react';
import { permissionApi } from '../api/index';

const DEFAULT_CUTOFF = '09:15';

export const fmt12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const isBeforeCutoff = (cutoff) => {
  const [h, m] = cutoff.split(':').map(Number);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() <= h * 60 + m;
};

// Permission requests are accepted only before the daily cutoff (default 9:15 AM, set on the server).
// Re-checks every 30s so request buttons switch off on time without a reload.
const usePermissionWindow = () => {
  const [cutoff, setCutoff] = useState(DEFAULT_CUTOFF);
  const [open, setOpen] = useState(() => isBeforeCutoff(DEFAULT_CUTOFF));

  useEffect(() => {
    permissionApi.getQuota().then(({ data }) => data.data?.sameDayCutoff && setCutoff(data.data.sameDayCutoff)).catch(() => {});
  }, []);

  useEffect(() => {
    setOpen(isBeforeCutoff(cutoff));
    const t = setInterval(() => setOpen(isBeforeCutoff(cutoff)), 30000);
    return () => clearInterval(t);
  }, [cutoff]);

  return { open, cutoff, closedMessage: `Permission requests can only be submitted before ${fmt12(cutoff)}` };
};

export default usePermissionWindow;
