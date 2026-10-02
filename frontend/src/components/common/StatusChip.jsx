import React from 'react';
import { Chip } from '@mui/material';
import { getStatusColor } from '../../utils/helpers';

const StatusChip = ({ status, size = 'small', sx = {} }) => {
  if (!status) return null;
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Chip
      label={label}
      color={getStatusColor(status)}
      size={size}
      sx={{ fontWeight: 500, fontSize: 11, height: 22, ...sx }}
    />
  );
};

export default StatusChip;
