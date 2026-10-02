import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton } from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axiosInstance';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';

const schema = yup.object({
  password: yup.string().min(6, 'Min 6 characters').required('Password is required'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required(),
});

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ password, confirmPassword }) => {
    setError('');
    setLoading(true);
    try {
      await api.put(`/auth/reset-password/${token}`, { password, confirmPassword });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1976d2 0%, #7c3aed 100%)', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockResetIcon sx={{ fontSize: 52, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>Reset Password</Typography>
            <Typography variant="body2" color="text.secondary">Enter your new password</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register('password')}
              label="New Password"
              type={showPass ? 'text' : 'password'}
              fullWidth margin="normal"
              error={!!errors.password} helperText={errors.password?.message}
              InputProps={{
                endAdornment: <InputAdornment position="end">
                  <IconButton onClick={() => setShowPass((p) => !p)} size="small">
                    {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>,
              }}
            />
            <TextField {...register('confirmPassword')} label="Confirm Password" type="password" fullWidth margin="normal" error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} />
            <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2, py: 1.5, borderRadius: 2 }}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPassword;
