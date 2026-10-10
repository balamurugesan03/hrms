import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { formatDate } from '../../utils/helpers';

const SLOTS = [['hr', 'HR'], ['admin', 'Admin']];
const ICON = {
  approved: <CheckIcon sx={{ fontSize: 14 }} />,
  rejected: <CloseIcon sx={{ fontSize: 14 }} />,
  pending: <HourglassEmptyIcon sx={{ fontSize: 14 }} />,
};
const COLOR = { approved: 'success', rejected: 'error', pending: 'warning', not_required: 'default' };
const idOf = (v) => String(v?._id || v);

const StepChip = ({ label, status, tip }) => (
  <Tooltip title={tip}>
    <Chip
      size="small" variant="outlined" color={COLOR[status]} icon={ICON[status]} label={label}
      sx={{ height: 22, fontSize: 11, maxWidth: 120, '& .MuiChip-icon': { ml: 0.5 } }}
    />
  </Tooltip>
);

const decidedTip = (status, name, at, remarks) =>
  `${status} by ${name}${at ? ` on ${formatDate(at)}` : ''}${remarks ? ` — ${remarks}` : ''}`;

// One chip per approver: reporting managers ("Priya ✓  Ravi ⏳"), or the legacy "HR ✓  Admin ⏳"
const ApprovalStatus = ({ approvals }) => (
  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
    {approvals?.steps?.length
      ? approvals.steps.map((step) => {
        const name = step.user?.name || 'Approver';
        return (
          <StepChip
            key={idOf(step.user)} label={name.split(' ')[0]} status={step.status}
            tip={step.status === 'pending' ? `Waiting for ${name}` : decidedTip(step.status, name, step.at, step.remarks)}
          />
        );
      })
      : SLOTS.map(([slot, label]) => {
        const step = approvals?.[slot] || { status: 'pending' };
        if (step.status === 'not_required') return null;
        return (
          <StepChip
            key={slot} label={label} status={step.status}
            tip={step.status === 'pending' ? `Waiting for ${label}` : decidedTip(step.status, step.by?.name || label, step.at, step.remarks)}
          />
        );
      })}
  </Box>
);

// True when the current user can still approve / reject this request
export const myPendingSlot = (user, item) => {
  if (!user || item?.status !== 'pending') return null;
  const steps = item?.approvals?.steps;
  if (steps?.length) return steps.some((s) => idOf(s.user) === String(user._id) && s.status === 'pending') ? 'step' : null;

  const slot = user.role === 'super_admin' ? 'admin' : user.role === 'hr_manager' ? 'hr' : null;
  if (!slot) return null;
  const ownerId = item.employee?._id || item.employee;
  const myEmployee = user.employee?._id || user.employee;
  if (slot === 'hr' && myEmployee && String(myEmployee) === String(ownerId)) return null; // no self-approval
  return item?.approvals?.[slot]?.status === 'pending' ? slot : null;
};

// Whether to show "Awaiting my approval" views to this user
export const canApprove = (user) => ['super_admin', 'hr_manager'].includes(user?.role) || Boolean(user?.isApprover);

export default ApprovalStatus;
