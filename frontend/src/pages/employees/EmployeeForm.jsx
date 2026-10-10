import React, { useState, useEffect } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, Typography, Card, CardContent,
  Avatar, IconButton, Divider, Tabs, Tab, FormControlLabel, Switch, Autocomplete, Chip,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { employeeApi, departmentApi, designationApi, shiftApi } from '../../api/index';
import PageHeader from '../../components/common/PageHeader';
import { BLOOD_GROUPS, GENDER_OPTIONS, EMPLOYMENT_TYPES, getApiUrl } from '../../utils/helpers';

const schema = yup.object({
  firstName: yup.string().min(2).max(50).required('First name is required'),
  lastName: yup.string().min(2).max(50).required('Last name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  gender: yup.string().required('Gender is required'),
  joiningDate: yup.string().required('Joining date is required'),
  department: yup.string().required('Department is required'),
  designation: yup.string().required('Designation is required'),
  shift: yup.string().required('Shift is required'),
  reportingManagers: yup.array().min(1, 'Select at least one reporting manager'),
  // Required when creating; optional on edit (blank keeps the current password)
  password: yup.string().when('$isEdit', {
    is: true,
    then: (s) => s.test('len', 'Password must be at least 6 characters', (v) => !v || v.length >= 6),
    otherwise: (s) => s.required('Login password is required').min(6, 'Password must be at least 6 characters'),
  }),
});

// Which tab each required field lives on, to jump there when validation fails
const FIELD_TAB = { firstName: 0, lastName: 0, email: 0, gender: 0, password: 0, joiningDate: 1, department: 1, designation: 1, shift: 1, reportingManagers: 1 };
const ROLE_LABEL = { super_admin: 'Super Admin', hr_manager: 'HR', employee: 'Employee' };
const idOf = (v) => String(v?._id || v);

// Multi-select of login users (any role) stored as an array of user ids
const UserMultiSelect = ({ control, name, label, options, helperText }) => (
  <Controller
    name={name} control={control}
    render={({ field, fieldState }) => (
      <Autocomplete
        multiple size="small" options={options}
        value={options.filter((o) => field.value?.includes(o._id))}
        onChange={(_, picked) => field.onChange(picked.map((o) => o._id))}
        getOptionLabel={(o) => `${o.name} (${ROLE_LABEL[o.role] || o.role})`}
        isOptionEqualToValue={(o, v) => o._id === v._id}
        renderTags={(value, getTagProps) => value.map((o, i) => <Chip size="small" label={o.name} {...getTagProps({ index: i })} key={o._id} />)}
        renderInput={(params) => (
          <TextField {...params} label={label} error={!!fieldState.error} helperText={fieldState.error?.message || helperText} />
        )}
      />
    )}
  />
);

const TabPanel = ({ children, value, index }) => (
  <Box hidden={value !== index} sx={{ pt: 2 }}>{value === index && children}</Box>
);

// Defined outside EmployeeForm so it keeps the same identity across renders
// (an inline component remounts the input on every keystroke and drops focus)
const F = ({ control, name, label, required, helperText, ...rest }) => (
  <Controller
    name={name} control={control}
    render={({ field, fieldState }) => (
      <TextField
        {...field} label={label} fullWidth size="small"
        error={!!fieldState.error} helperText={fieldState.error?.message || helperText}
        {...rest}
      />
    )}
  />
);

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');

  const [tab, setTab] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [approverOptions, setApproverOptions] = useState([]);
  const [ownUserId, setOwnUserId] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema, { context: { isEdit } }),
    defaultValues: {
      firstName: '', lastName: '', email: '', gender: '', dob: '', mobile: '',
      bloodGroup: '', maritalStatus: '', joiningDate: '',
      department: '', designation: '', reportingManagers: [], lateApprovers: [], shift: '',
      employmentType: 'full_time', salary: '', isDriver: false, password: '',
      address: { street: '', city: '', state: '', country: 'India', pincode: '' },
      bankName: '', accountNumber: '', ifscCode: '',
      panNumber: '', aadhaarNumber: '', status: 'active',
    },
  });

  const selectedDept = watch('department');

  useEffect(() => {
    departmentApi.getDropdown().then(({ data }) => setDepartments(data.data)).catch(() => {});
    employeeApi.getApproverOptions().then(({ data }) => setApproverOptions(data.data)).catch(() => {});
    shiftApi.getAll().then(({ data }) => setShifts(data.data.filter((x) => x.status !== 'inactive'))).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDept) {
      designationApi.getDropdown(selectedDept).then(({ data }) => setDesignations(data.data)).catch(() => {});
    }
  }, [selectedDept]);

  useEffect(() => {
    if (!isEdit) return;
    setFetchLoading(true);
    employeeApi.getById(id).then(({ data }) => {
      const emp = data.data;
      reset({
        firstName: emp.firstName, lastName: emp.lastName, email: emp.email,
        gender: emp.gender, dob: emp.dob ? emp.dob.split('T')[0] : '',
        mobile: emp.mobile || '', bloodGroup: emp.bloodGroup || '',
        maritalStatus: emp.maritalStatus || '',
        joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
        department: emp.department?._id || '', designation: emp.designation?._id || '',
        reportingManagers: (emp.reportingManagers || []).map(idOf),
        lateApprovers: (emp.lateApprovers || []).map(idOf),
        shift: emp.shift?._id || emp.shift || '',
        employmentType: emp.employmentType || 'full_time', salary: emp.salary || '',
        isDriver: Boolean(emp.isDriver), password: '',
        address: {
          street: emp.address?.street || '',
          city: emp.address?.city || '',
          state: emp.address?.state || '',
          country: emp.address?.country || 'India',
          pincode: emp.address?.pincode || '',
        },
        bankName: emp.bankName || '', accountNumber: emp.accountNumber || '',
        ifscCode: emp.ifscCode || '', panNumber: emp.panNumber || '',
        aadhaarNumber: emp.aadhaarNumber || '', status: emp.status || 'active',
      });
      setOwnUserId(emp.user ? idOf(emp.user) : null);
      if (emp.photo) setPhotoPreview(getApiUrl(`uploads/photos/${emp.photo}`));
    }).catch(() => {}).finally(() => setFetchLoading(false));
  }, [id, isEdit, reset]);

  const onPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Required fields are spread over tabs: show the first error and switch to its tab
  const onInvalid = (errs) => {
    const first = Object.keys(FIELD_TAB).find((k) => errs[k]) || Object.keys(errs)[0];
    if (first in FIELD_TAB) setTab(FIELD_TAB[first]);
    toast.error(errs[first]?.message || 'Please fill all required fields');
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const fd = new FormData();
      // react-hook-form nests the 'address.*' fields into data.address; send it once as JSON
      const { address, ...rest } = data;
      Object.entries(rest).forEach(([key, val]) => {
        if (Array.isArray(val)) fd.append(key, JSON.stringify(val));
        else if (val !== '' && val != null) fd.append(key, val);
      });
      fd.append('address', JSON.stringify(address || {}));

      if (photo) fd.append('photo', photo);

      if (isEdit) { await employeeApi.update(id, fd); toast.success('Employee updated!'); }
      else { await employeeApi.create(fd); toast.success('Employee created!'); }

      navigate('/employees');
    } catch {}
    finally { setLoading(false); }
  };

  if (fetchLoading) return <Box sx={{ p: 4, textAlign: 'center' }}>Loading employee data...</Box>;

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit Employee' : 'Add Employee'}
        breadcrumbs={[{ label: 'Employees', path: '/employees' }, { label: isEdit ? 'Edit' : 'Add' }]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/employees')}>Back</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit(onSubmit, onInvalid)} disabled={loading}>
              {loading ? 'Saving...' : 'Save Employee'}
            </Button>
          </Box>
        }
      />

      <Grid container spacing={2.5}>
        {/* Photo Card */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar src={photoPreview} sx={{ width: 100, height: 100, mx: 'auto', mb: 1, fontSize: 32, bgcolor: 'primary.main' }}>
                  {watch('firstName')?.[0]}{watch('lastName')?.[0]}
                </Avatar>
                <IconButton
                  component="label"
                  size="small"
                  sx={{ position: 'absolute', bottom: 4, right: -4, bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' }, width: 28, height: 28 }}
                >
                  <PhotoCameraIcon sx={{ fontSize: 14 }} />
                  <input type="file" accept="image/*" hidden onChange={onPhotoChange} />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Click camera to upload photo</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Form Card */}
        <Grid item xs={12} md={9}>
          <Card>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Personal Info" />
              <Tab label="Employment" />
              <Tab label="Address" />
              <Tab label="Bank & Documents" />
            </Tabs>

            <CardContent>
              {/* Personal Info */}
              <TabPanel value={tab} index={0}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><F control={control} name="firstName" label="First Name *" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="lastName" label="Last Name *" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="email" label="Email *" type="email" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="mobile" label="Mobile" /></Grid>
                  <Grid item xs={12} sm={6}>
                    <F
                      control={control} name="password" type="password" autoComplete="new-password"
                      label={isEdit ? 'New Login Password' : 'Login Password *'}
                      helperText={isEdit ? 'Leave blank to keep the current password' : 'Minimum 6 characters'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="gender" control={control} render={({ field }) => (
                      <TextField {...field} select label="Gender *" fullWidth size="small" error={!!errors.gender} helperText={errors.gender?.message}>
                        {GENDER_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                      </TextField>
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="dob" label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="bloodGroup" control={control} render={({ field }) => (
                      <TextField {...field} select label="Blood Group" fullWidth size="small">
                        <MenuItem value="">Select</MenuItem>
                        {BLOOD_GROUPS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                      </TextField>
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="maritalStatus" control={control} render={({ field }) => (
                      <TextField {...field} select label="Marital Status" fullWidth size="small">
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="single">Single</MenuItem>
                        <MenuItem value="married">Married</MenuItem>
                        <MenuItem value="divorced">Divorced</MenuItem>
                        <MenuItem value="widowed">Widowed</MenuItem>
                      </TextField>
                    )} />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Employment */}
              <TabPanel value={tab} index={1}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><F control={control} name="joiningDate" label="Joining Date *" type="date" InputLabelProps={{ shrink: true }} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="department" control={control} render={({ field }) => (
                      <TextField {...field} select label="Department *" fullWidth size="small" error={!!errors.department} helperText={errors.department?.message}>
                        <MenuItem value="">Select Department</MenuItem>
                        {departments.map((d) => <MenuItem key={d._id} value={d._id}>{d.departmentName}</MenuItem>)}
                      </TextField>
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="designation" control={control} render={({ field }) => (
                      <TextField {...field} select label="Designation *" fullWidth size="small" error={!!errors.designation} helperText={errors.designation?.message}>
                        <MenuItem value="">Select Designation</MenuItem>
                        {designations.map((d) => <MenuItem key={d._id} value={d._id}>{d.designationName}</MenuItem>)}
                      </TextField>
                    )} />
                  </Grid>
                  <Grid item xs={12}>
                    <UserMultiSelect
                      control={control} name="reportingManagers" label="Reporting Managers *"
                      options={approverOptions.filter((o) => o._id !== ownUserId)}
                      helperText="All selected people must approve this employee's leave and permission requests"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <UserMultiSelect
                      control={control} name="lateApprovers" label="Late Check-in Approvers"
                      options={approverOptions.filter((o) => o._id !== ownUserId)}
                      helperText="Who reviews late check-in reasons. Leave empty to use the reporting managers."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="employmentType" control={control} render={({ field }) => (
                      <TextField {...field} select label="Employment Type" fullWidth size="small">
                        {EMPLOYMENT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                      </TextField>
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="shift" control={control} render={({ field }) => (
                      <TextField {...field} select label="Shift *" fullWidth size="small" error={!!errors.shift} helperText={errors.shift?.message || 'Used to detect late check-in'}>
                        {shifts.map((x) => <MenuItem key={x._id} value={x._id}>{`${x.shiftName} (${x.startTime} – ${x.endTime})`}</MenuItem>)}
                      </TextField>
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="salary" label="Salary (INR)" type="number" /></Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="isDriver" control={control} render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                        label="Driver (logs pickup location & late reason at check-in)"
                      />
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="status" control={control} render={({ field }) => (
                      <TextField {...field} select label="Status" fullWidth size="small">
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="terminated">Terminated</MenuItem>
                        <MenuItem value="on_leave">On Leave</MenuItem>
                      </TextField>
                    )} />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Address */}
              <TabPanel value={tab} index={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12}><F control={control} name="address.street" label="Street Address" multiline rows={2} /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="address.city" label="City" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="address.state" label="State" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="address.country" label="Country" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="address.pincode" label="Pincode" /></Grid>
                </Grid>
              </TabPanel>

              {/* Bank & Documents */}
              <TabPanel value={tab} index={3}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Bank Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><F control={control} name="bankName" label="Bank Name" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="accountNumber" label="Account Number" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="ifscCode" label="IFSC Code" /></Grid>
                </Grid>
                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Government IDs</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><F control={control} name="panNumber" label="PAN Number" /></Grid>
                  <Grid item xs={12} sm={6}><F control={control} name="aadhaarNumber" label="Aadhaar Number" /></Grid>
                </Grid>
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeForm;
