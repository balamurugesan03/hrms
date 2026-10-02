import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const ConfirmDialog = ({
  open,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  onConfirm,
  onClose,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'error',
  loading = false,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
    <DialogTitle sx={{ pb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon color="warning" />
        <Typography variant="h6" fontWeight={600}>{title}</Typography>
      </Box>
    </DialogTitle>
    <DialogContent>
      <Typography color="text.secondary">{message}</Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
      <Button onClick={onClose} disabled={loading} variant="outlined" size="medium">
        {cancelText}
      </Button>
      <Button onClick={onConfirm} color={confirmColor} variant="contained" disabled={loading} size="medium">
        {loading ? 'Processing...' : confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
