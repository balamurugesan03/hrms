const XLSX = require('xlsx');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { dayKey } = require('../utils/time');

const Company = require('../models/Company');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Shift = require('../models/Shift');
const Holiday = require('../models/Holiday');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveType = require('../models/LeaveType');
const Leave = require('../models/Leave');
const Permission = require('../models/Permission');
const Payroll = require('../models/Payroll');
const Expense = require('../models/Expense');
const Asset = require('../models/Asset');
const Job = require('../models/Job');
const Performance = require('../models/Performance');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');

// Each module groups the collections that belong to it. `dateField` is used by the
// optional from/to filter; collections without one (masters) are always exported in full.
const MODULES = {
  organization: {
    label: 'Organization',
    collections: [
      { name: 'company', model: Company },
      { name: 'departments', model: Department },
      { name: 'designations', model: Designation },
      { name: 'shifts', model: Shift },
      { name: 'holidays', model: Holiday, dateField: 'holidayDate' },
    ],
  },
  employees: {
    label: 'Employees & Users',
    collections: [
      { name: 'employees', model: Employee },
      // select:false fields (password hash, reset/refresh tokens) are never exported
      { name: 'users', model: User },
    ],
  },
  attendance: {
    label: 'Attendance',
    collections: [{ name: 'attendance', model: Attendance, dateField: 'date' }],
  },
  leave: {
    label: 'Leave & Permission',
    collections: [
      { name: 'leaveTypes', model: LeaveType },
      { name: 'leaves', model: Leave, dateField: 'fromDate' },
      { name: 'permissions', model: Permission, dateField: 'date' },
    ],
  },
  payroll: {
    label: 'Payroll',
    collections: [{ name: 'payroll', model: Payroll, monthYear: true }],
  },
  expenses: {
    label: 'Expenses',
    collections: [{ name: 'expenses', model: Expense, dateField: 'expenseDate' }],
  },
  assets: {
    label: 'Assets',
    collections: [{ name: 'assets', model: Asset }],
  },
  recruitment: {
    label: 'Recruitment',
    collections: [{ name: 'jobs', model: Job }],
  },
  performance: {
    label: 'Performance',
    collections: [{ name: 'performance', model: Performance, dateField: 'reviewDate' }],
  },
  announcements: {
    label: 'Announcements & Notifications',
    collections: [
      { name: 'announcements', model: Announcement, dateField: 'createdAt' },
      { name: 'notifications', model: Notification, dateField: 'createdAt' },
    ],
  },
};

const buildFilter = (col, from, to) => {
  if (!from && !to) return {};
  if (col.monthYear) {
    // Payroll is keyed by month/year, compare as yyyymm
    const conds = [];
    if (from) conds.push({ $gte: [{ $add: [{ $multiply: ['$year', 100] }, '$month'] }, from.getFullYear() * 100 + from.getMonth() + 1] });
    if (to) conds.push({ $lte: [{ $add: [{ $multiply: ['$year', 100] }, '$month'] }, to.getFullYear() * 100 + to.getMonth() + 1] });
    return { $expr: { $and: conds } };
  }
  if (!col.dateField) return {};
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return { [col.dateField]: range };
};

const parseDate = (value, endOfDay) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(`Invalid date: ${value}`, 400);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
};

// Server local time, same as the rest of the app (utils/time.js). Date-only values
// (stored at local or UTC midnight) print as YYYY-MM-DD, timestamps as YYYY-MM-DD HH:mm.
const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => {
  const day = dayKey(d);
  const dateOnly = (d.getHours() === 0 && d.getMinutes() === 0) || (d.getUTCHours() === 0 && d.getUTCMinutes() === 0);
  return dateOnly ? day : `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const isObjectId = (v) => v?._bsontype === 'ObjectId' || v?._bsontype === 'ObjectID';

// Readable labels for referenced records, so the Excel shows "Developer" instead of
// a raw ObjectId. ObjectIds are unique across collections, so one map covers all refs.
const LABEL_SOURCES = [
  { model: Department, select: 'departmentName', label: (d) => d.departmentName },
  { model: Designation, select: 'designationName', label: (d) => d.designationName },
  { model: Shift, select: 'shiftName', label: (d) => d.shiftName },
  { model: LeaveType, select: 'leaveTypeName', label: (d) => d.leaveTypeName },
  { model: Employee, select: 'employeeId firstName lastName', label: (d) => `${d.employeeId} - ${d.firstName} ${d.lastName}` },
  { model: User, select: 'name email', label: (d) => `${d.name} (${d.email})` },
  { model: Asset, select: 'assetCode assetName', label: (d) => `${d.assetCode} - ${d.assetName}` },
  { model: Job, select: 'jobTitle', label: (d) => d.jobTitle },
];

const buildLabels = async () => {
  const labels = new Map();
  for (const src of LABEL_SOURCES) {
    const docs = await src.model.find().select(src.select).lean();
    docs.forEach((d) => labels.set(d._id.toString(), src.label(d)));
  }
  return labels;
};

// Swap referenced ObjectIds for their labels; a record's own _id stays as the id.
const humanize = (value, labels, key) => {
  if (isObjectId(value)) {
    const id = value.toString();
    return key === '_id' ? id : labels.get(id) || id;
  }
  if (value instanceof Date || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => humanize(v, labels));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, humanize(v, labels, k)]));
};

// Flatten a document into a single-level row for Excel: nested objects become
// dotted keys; simple lists are comma-joined, lists of objects stored as JSON text.
const MAX_CELL = 32000; // Excel cell limit is 32767 chars
const flatten = (obj, prefix = '', out = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    if (key === '__v') return;
    const k = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) {
      out[k] = '';
    } else if (value instanceof Date) {
      out[k] = formatDate(value);
    } else if (isObjectId(value)) {
      out[k] = value.toString();
    } else if (Array.isArray(value)) {
      const simple = value.every((v) => v === null || typeof v !== 'object' || v instanceof Date);
      const text = simple
        ? value.map((v) => (v instanceof Date ? formatDate(v) : v)).join(', ')
        : JSON.stringify(value);
      out[k] = text.length > MAX_CELL ? `${text.slice(0, MAX_CELL)}…` : text;
    } else if (typeof value === 'object') {
      flatten(value, k, out);
    } else {
      out[k] = value;
    }
  });
  return out;
};

const resolveModules = (param) => {
  const keys = param ? String(param).split(',').map((s) => s.trim()).filter(Boolean) : Object.keys(MODULES);
  const unknown = keys.filter((k) => !MODULES[k]);
  if (unknown.length) throw new ApiError(`Unknown module(s): ${unknown.join(', ')}`, 400);
  if (!keys.length) throw new ApiError('Select at least one module', 400);
  return keys;
};

// GET /api/backup/modules — module list with record counts
const listModules = async (req, res, next) => {
  try {
    const data = await Promise.all(
      Object.entries(MODULES).map(async ([key, mod]) => {
        const collections = await Promise.all(
          mod.collections.map(async (c) => ({
            name: c.name,
            count: await c.model.countDocuments(),
            dateFilter: Boolean(c.dateField || c.monthYear),
          }))
        );
        return {
          key,
          label: mod.label,
          collections,
          total: collections.reduce((s, c) => s + c.count, 0),
        };
      })
    );
    ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
};

// GET /api/backup/export?modules=a,b&format=xlsx|json&from=YYYY-MM-DD&to=YYYY-MM-DD
const exportBackup = async (req, res, next) => {
  try {
    const { format = 'xlsx' } = req.query;
    if (!['xlsx', 'json'].includes(format)) throw new ApiError('format must be xlsx or json', 400);
    const keys = resolveModules(req.query.modules);
    const from = parseDate(req.query.from, false);
    const to = parseDate(req.query.to, true);

    const result = {};
    for (const key of keys) {
      result[key] = {};
      for (const col of MODULES[key].collections) {
        result[key][col.name] = await col.model.find(buildFilter(col, from, to)).lean();
      }
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const base = keys.length === 1 ? `hrms_backup_${keys[0]}` : 'hrms_backup';

    if (format === 'json') {
      const payload = {
        meta: {
          app: 'hrms',
          exportedAt: new Date().toISOString(),
          exportedBy: req.user.email,
          modules: keys,
          from: from?.toISOString() || null,
          to: to?.toISOString() || null,
        },
        data: result,
      };
      res.setHeader('Content-Disposition', `attachment; filename=${base}_${stamp}.json`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(payload, null, 2));
    }

    const labels = await buildLabels();
    const wb = XLSX.utils.book_new();
    for (const key of keys) {
      for (const [name, docs] of Object.entries(result[key])) {
        const rows = docs.map((d) => flatten(humanize(d, labels)));
        const ws = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['No records']]);
        // Sheet names are limited to 31 chars
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      }
    }
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=${base}_${stamp}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { listModules, exportBackup };
