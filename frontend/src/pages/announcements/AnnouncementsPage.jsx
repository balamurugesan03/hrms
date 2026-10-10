import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Chip, IconButton, Tooltip, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  FormControlLabel, Switch, Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PushPinIcon from '@mui/icons-material/PushPin';
import CampaignIcon from '@mui/icons-material/Campaign';
import toast from 'react-hot-toast';
import { announcementApi, departmentApi } from '../../api/index';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { PRIORITY_COLOR } from '../../components/dashboard/AnnouncementsCard';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/helpers';

const EMPTY = { title: '', content: '', priority: 'normal', department: '', pinned: false, expiresAt: '' };
const BORDER = { normal: '#1976d2', important: '#f59e0b', urgent: '#ef4444' };

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const isHR = ['super_admin', 'hr_manager'].includes(user?.role);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await announcementApi.getAll({ limit: 100, includeExpired: isHR });
      setItems(data.data);
    } catch {}
    finally { setLoading(false); }
  }, [isHR]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => {
    if (isHR) departmentApi.getDropdown().then(({ data }) => setDepartments(data.data)).catch(() => {});
  }, [isHR]);

  const openCreate = () => { setEditId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (a) => {
    setEditId(a._id);
    setForm({
      title: a.title, content: a.content, priority: a.priority,
      department: a.department?._id || '', pinned: a.pinned,
      expiresAt: a.expiresAt ? a.expiresAt.split('T')[0] : '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return toast.error('Title and content are required');
    setSaving(true);
    try {
      if (editId) {
        await announcementApi.update(editId, form);
        toast.success('Announcement updated');
      } else {
        await announcementApi.create(form);
        toast.success('Announcement published & everyone notified');
      }
      setOpen(false);
      fetchItems();
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await announcementApi.delete(deleteId);
      toast.success('Announcement deleted');
      setDeleteId(null);
      fetchItems();
    } catch {}
  };

  const isExpired = (a) => a.expiresAt && new Date(a.expiresAt) < new Date();

  return (
    <Box>
      <PageHeader
        title="Announcements"
        subtitle="Company news, policies and updates"
        action={isHR && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Announcement</Button>}
      />

      {loading ? (
        <Grid container spacing={2}>{[1, 2, 3].map((i) => <Grid item xs={12} key={i}><Skeleton variant="rounded" height={110} /></Grid>)}</Grid>
      ) : items.length === 0 ? (
        <Card><CardContent sx={{ textAlign: 'center', py: 8 }}>
          <CampaignIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
          <Typography color="text.secondary">No announcements yet</Typography>
        </CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {items.map((a) => (
            <Grid item xs={12} key={a._id}>
              <Card sx={{ borderLeft: 4, borderColor: BORDER[a.priority], opacity: isExpired(a) ? 0.55 : 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                    {a.pinned && <PushPinIcon fontSize="small" color="primary" sx={{ mt: 0.3 }} />}
                    <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, minWidth: 0 }}>{a.title}</Typography>
                    {a.priority !== 'normal' && <Chip size="small" label={a.priority} color={PRIORITY_COLOR[a.priority]} sx={{ textTransform: 'capitalize' }} />}
                    <Chip size="small" variant="outlined" label={a.department?.departmentName || 'Everyone'} />
                    {isExpired(a) && <Chip size="small" label="Expired" />}
                    {isHR && (
                      <Box>
                        <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(a)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteId(a._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', my: 1 }}>{a.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Posted by {a.createdBy?.name || 'HR'} · {formatDate(a.createdAt)}
                    {a.expiresAt && ` · Expires ${formatDate(a.expiresAt)}`}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField label="Title" fullWidth size="small" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} inputProps={{ maxLength: 200 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Content" fullWidth multiline minRows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Priority" fullWidth size="small" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="important">Important</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Audience" fullWidth size="small" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <MenuItem value="">Everyone</MenuItem>
                {departments.map((d) => <MenuItem key={d._id} value={d._id}>{d.departmentName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Expires on (optional)" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />} label="Pin to top" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{editId ? 'Save' : 'Publish'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete announcement"
        message="This announcement will be removed for everyone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </Box>
  );
};

export default AnnouncementsPage;
