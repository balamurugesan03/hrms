import React, { useState } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, Link } from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../api/axiosInstance';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';

const schema = yup.object({ email: yup.string().email('Invalid email').required('Email is required') });

const ForgotPassword = () => {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ email }) => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1976d2 0%, #7c3aed 100%)', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <MarkEmailReadIcon sx={{ fontSize: 52, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>Forgot Password</Typography>
            <Typography variant="body2" color="text.secondary">Enter your email to receive reset link</Typography>
          </Box>

          {success ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Password reset link sent! Check your email inbox.
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
              <form onSubmit={handleSubmit(onSubmit)}>
                <TextField {...register('email')} label="Email Address" fullWidth margin="normal" error={!!errors.email} helperText={errors.email?.message} />
                <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 2, py: 1.5, borderRadius: 2 }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          )}

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link component={RouterLink} to="/login" variant="body2">Back to Login</Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;
