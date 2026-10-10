const User = require('../models/User');
const Employee = require('../models/Employee');
const ApiError = require('./ApiError');
const { notifyEmployee, notifyRole, notifyUsers, notifyHR } = require('./notify');

const SLOT_BY_ROLE = { hr_manager: 'hr', super_admin: 'admin' };
const ROLE_BY_SLOT = { hr: 'hr_manager', admin: 'super_admin' };
const SLOT_LABEL = { hr: 'HR', admin: 'Super Admin' };
const DONE = ['approved', 'not_required'];

const hasSteps = (approvals) => Boolean(approvals?.steps?.length);
const idOf = (v) => String(v?._id || v);

/**
 * Approval slots for a new request.
 * kind 'leave' | 'permission' → the employee's reporting managers (all must approve)
 * kind 'late'                 → the employee's late approvers, else their reporting managers
 * The applicant is never their own approver. With no approvers left, falls back to
 * HR + Super Admin dual approval (HR skipped when no other active HR manager exists).
 */
const initialApprovals = async (employeeId, kind = 'leave') => {
  const [emp, applicant] = await Promise.all([
    Employee.findById(employeeId).select('reportingManagers lateApprovers').lean(),
    User.findOne({ employee: employeeId }).select('_id').lean(),
  ]);
  const list = kind === 'late' && emp?.lateApprovers?.length ? emp.lateApprovers : emp?.reportingManagers || [];
  const approverIds = [...new Set(list.map(String))].filter((id) => !applicant || id !== String(applicant._id));
  if (approverIds.length) {
    const active = await User.find({ _id: { $in: approverIds }, status: 'active' }).select('_id').lean();
    if (active.length) return { steps: active.map((u) => ({ user: u._id, status: 'pending' })) };
  }

  const otherHr = await User.exists({
    role: 'hr_manager', status: 'active', ...(applicant && { _id: { $ne: applicant._id } }),
  });
  return { hr: { status: otherHr ? 'pending' : 'not_required' }, admin: { status: 'pending' } };
};

// Mongo filter for "requests waiting for my decision" (prefix 'late.' for late reasons)
const awaitingFilter = (user, prefix = '') => {
  const or = [{ [`${prefix}approvals.steps`]: { $elemMatch: { user: user._id, status: 'pending' } } }];
  const slot = SLOT_BY_ROLE[user.role];
  if (slot) or.push({ [`${prefix}approvals.steps.0`]: { $exists: false }, [`${prefix}approvals.${slot}.status`]: 'pending' });
  return { [`${prefix}status`]: 'pending', $or: or };
};

// Filter for what a plain employee may list: their own requests + the ones they approve
const visibleToEmployee = (user, prefix = '') => ({
  $or: [{ employee: user.employee }, { [`${prefix}approvals.steps.user`]: user._id }],
});

/**
 * Record the current user's decision on `target` (any object with `status` + `approvals`).
 * Any rejection rejects the request. It is approved only when every approver has approved
 * (or, for the legacy shape, when both HR and Super Admin are done).
 * Returns { slot, final, waiting } — waiting = approvers still pending.
 */
const recordDecision = (target, { user, employeeId, decision, remarks }) => {
  if (target.status !== 'pending') throw new ApiError(`This request is already ${target.status}`, 400);

  if (hasSteps(target.approvals)) {
    const step = target.approvals.steps.find((s) => idOf(s.user) === String(user._id));
    if (!step) throw new ApiError('You are not an approver for this request', 403);
    if (step.status !== 'pending') throw new ApiError(`You have already ${step.status} this request`, 400);
    step.status = decision;
    step.at = new Date();
    step.remarks = remarks;
    if (decision === 'rejected') target.status = 'rejected';
    else if (target.approvals.steps.every((s) => s.status === 'approved')) target.status = 'approved';
    const waiting = target.approvals.steps.filter((s) => s.status === 'pending').length;
    return { slot: 'step', final: target.status !== 'pending', waiting };
  }

  const slot = SLOT_BY_ROLE[user.role];
  if (!slot) throw new ApiError('Only HR or Super Admin can approve this request', 403);
  if (user.role !== 'super_admin' && user.employee && String(user.employee) === String(employeeId)) {
    throw new ApiError('You cannot approve your own request', 403);
  }

  const step = target.approvals?.[slot];
  if (!step || step.status === 'not_required') throw new ApiError(`${SLOT_LABEL[slot]} approval is not required for this request`, 400);
  if (step.status !== 'pending') throw new ApiError(`You have already ${step.status} this request`, 400);

  target.approvals[slot] = { status: decision, by: user._id, at: new Date(), remarks };

  if (decision === 'rejected') target.status = 'rejected';
  else if (DONE.includes(target.approvals.hr?.status) && DONE.includes(target.approvals.admin?.status)) target.status = 'approved';

  return { slot, final: target.status !== 'pending', waiting: target.status === 'pending' ? 1 : 0 };
};

// Ping whoever has to decide on a new request
const notifyApprovers = (approvals, payload, excludeUserId) => {
  if (hasSteps(approvals)) return notifyUsers(approvals.steps.map((s) => s.user), payload);
  return notifyHR(payload, excludeUserId);
};

// Tell the employee about progress (and, for the legacy shape, ping the other approver)
const notifyDecision = (target, { slot, final, waiting }, { employeeId, label, link, type }, decidedBy) => {
  const by = decidedBy?.name || SLOT_LABEL[slot] || 'Approver';
  if (final) {
    const approved = target.status === 'approved';
    const remarks = slot === 'step'
      ? target.approvals.steps.find((s) => s.status === 'rejected')?.remarks
      : target.approvals[slot]?.remarks;
    notifyEmployee(employeeId, {
      title: `${label} ${approved ? 'approved ✅' : 'rejected'}`,
      message: approved
        ? `Your ${label.toLowerCase()} was approved by all approvers`
        : `Your ${label.toLowerCase()} was rejected by ${by}${remarks ? `: ${remarks}` : ''}`,
      type, link,
    });
    return;
  }
  if (slot === 'step') {
    notifyEmployee(employeeId, {
      title: `${label}: approved by ${by}`,
      message: `Waiting for ${waiting} more approver${waiting === 1 ? '' : 's'}`,
      type, link,
    });
    return;
  }
  const other = slot === 'hr' ? 'admin' : 'hr';
  notifyEmployee(employeeId, {
    title: `${label}: ${SLOT_LABEL[slot]} approved`,
    message: `Waiting for ${SLOT_LABEL[other]} approval`,
    type, link,
  });
  notifyRole(ROLE_BY_SLOT[other], {
    title: `${label} awaiting your approval`,
    message: `${SLOT_LABEL[slot]} has approved. Your approval is needed to complete it.`,
    type, link,
  });
};

const approvalPopulate = (prefix = '') => [
  { path: `${prefix}approvals.steps.user`, select: 'name role' },
  { path: `${prefix}approvals.hr.by`, select: 'name' },
  { path: `${prefix}approvals.admin.by`, select: 'name' },
];
const APPROVAL_POPULATE = approvalPopulate();

module.exports = {
  initialApprovals, awaitingFilter, visibleToEmployee, recordDecision, notifyApprovers, notifyDecision,
  SLOT_BY_ROLE, APPROVAL_POPULATE, approvalPopulate,
};
