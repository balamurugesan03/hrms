import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Grid, Alert,
  InputAdornment, IconButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../../components/common/PageHeader';

const SettingsPage = () => {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match');
    if (form.newPassword.length < 6) return setError('Password must be at least 6 characters');
    setError('');
    setLoading(true);
    try {
      await changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  const PasswordField = ({ name, label, showKey }) => (
    <TextField
      label={label} type={showPass[showKey] ? 'text' : 'password'} fullWidth
      value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => setShowPass((p) => ({ ...p, [showKey]: !p[showKey] }))} size="small">
              {showPass[showKey] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Manage your account settings" />
      <Grid container spacing={2.5} sx={{ maxWidth: 600 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <LockIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>Change Password</Typography>
              </Box>

              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}><PasswordField name="currentPassword" label="Current Password" showKey="current" /></Grid>
                  <Grid item xs={12}><PasswordField name="newPassword" label="New Password" showKey="new" /></Grid>
                  <Grid item xs={12}><PasswordField name="confirmPassword" label="Confirm New Password" showKey="confirm" /></Grid>
                  <Grid item xs={12}>
                    <Button type="submit" variant="contained" disabled={loading} sx={{ mt: 1 }}>
                      {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
