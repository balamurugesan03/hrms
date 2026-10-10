import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button, Avatar, IconButton, Tooltip, Divider,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import toast from 'react-hot-toast';
import { companyApi } from '../../api/index';
import { useCompany } from '../../contexts/CompanyContext';

const EMPTY = {
  companyName: '', legalName: '', tagline: '', email: '', phone: '', website: '',
  gstNumber: '', panNumber: '', tanNumber: '',
  address: { street: '', city: '', state: '', country: 'India', pincode: '' },
};

const fromCompany = (c) => ({
  ...EMPTY,
  ...Object.fromEntries(Object.keys(EMPTY).filter((k) => k !== 'address').map((k) => [k, c?.[k] || ''])),
  address: { ...EMPTY.address, ...(c?.address || {}) },
});

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', py: 0.75, gap: 2 }}>
    <Typography variant="body2" color="text.secondary" sx={{ width: 140, flexShrink: 0 }}>{label}</Typography>
    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{value || '-'}</Typography>
  </Box>
);

// Company details: editable by the Super Admin, read-only for everyone else
const CompanyDetailsCard = ({ editable }) => {
  const { company, logoUrl, setCompany } = useCompany();
  const [form, setForm] = useState(EMPTY);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(fromCompany(company));
    setLogo(null);
    setLogoPreview(null);
    setRemoveLogo(false);
  }, [company]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setAddr = (key) => (e) => setForm((f) => ({ ...f, address: { ...f.address, [key]: e.target.value } }));

  const onLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const save = async () => {
    if (!form.companyName.trim()) return toast.error('Company name is required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, k === 'address' ? JSON.stringify(v) : v));
      if (logo) fd.append('logo', logo);
      if (removeLogo) fd.append('removeLogo', 'true');
      const { data } = await companyApi.update(fd);
      setCompany(data.data);
      toast.success('Company details saved');
    } catch {}
    finally { setSaving(false); }
  };

  const shownLogo = removeLogo ? null : logoPreview || logoUrl;
  const addr = company?.address || {};
  const addressText = [addr.street, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(', ');

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <BusinessIcon color="primary" />
          <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>Company Details</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar src={shownLogo || undefined} variant="rounded" sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 26 }}>
              {(form.companyName || 'C')[0]?.toUpperCase()}
            </Avatar>
            {editable && (
              <IconButton
                component="label" size="small"
                sx={{ position: 'absolute', bottom: -6, right: -6, bgcolor: 'primary.main', color: '#fff', width: 26, height: 26, '&:hover': { bgcolor: 'primary.dark' } }}
              >
                <PhotoCameraIcon sx={{ fontSize: 14 }} />
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onLogo} />
              </IconButton>
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>{company?.companyName || '-'}</Typography>
            {company?.tagline && <Typography variant="body2" color="text.secondary" noWrap>{company.tagline}</Typography>}
            {editable && shownLogo && (
              <Tooltip title="Remove logo">
                <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} sx={{ mt: 0.5, px: 0 }}
                  onClick={() => { setLogo(null); setLogoPreview(null); setRemoveLogo(true); }}>
                  Remove logo
                </Button>
              </Tooltip>
            )}
            {editable && !shownLogo && (
              <Typography variant="caption" color="text.secondary" display="block">PNG or JPG logo also appears on payslips</Typography>
            )}
          </Box>
        </Box>

        {editable ? (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField label="Company Name *" fullWidth size="small" value={form.companyName} onChange={set('companyName')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Legal / Registered Name" fullWidth size="small" value={form.legalName} onChange={set('legalName')} /></Grid>
              <Grid item xs={12}><TextField label="Tagline" fullWidth size="small" value={form.tagline} onChange={set('tagline')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Email" type="email" fullWidth size="small" value={form.email} onChange={set('email')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Phone" fullWidth size="small" value={form.phone} onChange={set('phone')} /></Grid>
              <Grid item xs={12}><TextField label="Website" fullWidth size="small" value={form.website} onChange={set('website')} placeholder="https://" /></Grid>
            </Grid>
            <Divider sx={{ my: 2.5 }}><Typography variant="caption" color="text.secondary">Address</Typography></Divider>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField label="Street" fullWidth size="small" multiline rows={2} value={form.address.street} onChange={setAddr('street')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="City" fullWidth size="small" value={form.address.city} onChange={setAddr('city')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="State" fullWidth size="small" value={form.address.state} onChange={setAddr('state')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Country" fullWidth size="small" value={form.address.country} onChange={setAddr('country')} /></Grid>
              <Grid item xs={12} sm={6}><TextField label="Pincode" fullWidth size="small" value={form.address.pincode} onChange={setAddr('pincode')} /></Grid>
            </Grid>
            <Divider sx={{ my: 2.5 }}><Typography variant="caption" color="text.secondary">Statutory</Typography></Divider>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}><TextField label="GST Number" fullWidth size="small" value={form.gstNumber} onChange={set('gstNumber')} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="PAN" fullWidth size="small" value={form.panNumber} onChange={set('panNumber')} /></Grid>
              <Grid item xs={12} sm={4}><TextField label="TAN" fullWidth size="small" value={form.tanNumber} onChange={set('tanNumber')} /></Grid>
            </Grid>
            <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Company Details'}
              </Button>
            </Box>
          </>
        ) : (
          <Box>
            <InfoRow label="Legal Name" value={company?.legalName} />
            <InfoRow label="Email" value={company?.email} />
            <InfoRow label="Phone" value={company?.phone} />
            <InfoRow label="Website" value={company?.website} />
            <InfoRow label="Address" value={addressText} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyDetailsCard;
