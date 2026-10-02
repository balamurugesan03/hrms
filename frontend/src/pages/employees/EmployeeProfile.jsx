import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Avatar, Chip, Button,
  Divider, Tab, Tabs, List, ListItem, ListItemText, IconButton, Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useNavigate, useParams } from 'react-router-dom';
import { employeeApi, documentApi, leaveApi } from '../../api/index';
import StatusChip from '../../components/common/StatusChip';
import { formatDate, formatCurrency, getApiUrl } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';

const TabPanel = ({ value, index, children }) => (
  <Box hidden={value !== index} sx={{ pt: 2 }}>{value === index && children}</Box>
);

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', py: 1, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
    <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>{label}</Typography>
    <Typography variant="body2" fontWeight={500}>{value || '-'}</Typography>
  </Box>
);

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [tab, setTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [loading, setLoading] = useState(true);

  const canEdit = ['super_admin', 'hr_manager'].includes(user?.role);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data } = id ? await employeeApi.getById(id) : await employeeApi.getProfile();
        setEmployee(data.data);
        const empId = data.data._id;
        const [docsRes, leaveRes] = await Promise.all([
          documentApi.getAll(empId),
          leaveApi.getBalance(empId),
        ]);
        setDocuments(docsRes.data.data || []);
        setLeaveBalance(leaveRes.data.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    fetchEmployee();
  }, [id]);

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}>Loading...</Box>;
  if (!employee) return <Box sx={{ p: 4, textAlign: 'center' }}>Employee not found</Box>;

  const photoUrl = employee.photo ? getApiUrl(`uploads/photos/${employee.photo}`) : undefined;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        {id && <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => navigate('/employees')}>Back</Button>}
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>Employee Profile</Typography>
        {canEdit && id && (
          <Button startIcon={<EditIcon />} variant="contained" onClick={() => navigate(`/employees/${id}/edit`)}>Edit</Button>
        )}
      </Box>

      <Grid container spacing={2.5}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Avatar src={photoUrl} sx={{ width: 100, height: 100, mx: 'auto', mb: 2, fontSize: 32, bgcolor: 'primary.main' }}>
                {employee.firstName?.[0]}{employee.lastName?.[0]}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>{employee.fullName || `${employee.firstName} ${employee.lastName}`}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{employee.designation?.designationName}</Typography>
              <Chip label={employee.employeeId} size="small" color="primary" variant="outlined" sx={{ mb: 2 }} />
              <StatusChip status={employee.status} sx={{ ml: 1 }} />

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">{employee.email}</Typography>
                </Box>
                {employee.mobile && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{employee.mobile}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon fontSize="small" color="action" />
                  <Typography variant="body2">{employee.department?.departmentName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WorkIcon fontSize="small" color="action" />
                  <Typography variant="body2">{employee.designation?.designationName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon fontSize="small" color="action" />
                  <Typography variant="body2">Joined {formatDate(employee.joiningDate)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Leave Balance */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Leave Balance</Typography>
              {leaveBalance.map((lb) => (
                <Box key={lb.leaveType._id} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={500}>{lb.leaveType.leaveTypeName}</Typography>
                    <Typography variant="caption" fontWeight={700}>{lb.remaining}/{lb.allocated} days</Typography>
                  </Box>
                  <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 3 }}>
                    <Box sx={{ height: '100%', bgcolor: 'primary.main', borderRadius: 3, width: `${Math.min(100, (lb.remaining / lb.allocated) * 100)}%` }} />
                  </Box>
                </Box>
              ))}
              {leaveBalance.length === 0 && <Typography variant="body2" color="text.secondary">No leave types configured</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Details */}
        <Grid item xs={12} md={8}>
          <Card>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Personal Info" />
              <Tab label="Employment" />
              <Tab label="Bank & Docs" />
            </Tabs>

            <CardContent>
              <TabPanel value={tab} index={0}>
                <InfoRow label="Full Name" value={`${employee.firstName} ${employee.lastName}`} />
                <InfoRow label="Gender" value={employee.gender} />
                <InfoRow label="Date of Birth" value={formatDate(employee.dob)} />
                <InfoRow label="Blood Group" value={employee.bloodGroup} />
                <InfoRow label="Marital Status" value={employee.maritalStatus} />
                <InfoRow label="Mobile" value={employee.mobile} />
                <InfoRow label="Email" value={employee.email} />
                <InfoRow label="Address" value={employee.address ? `${employee.address.street || ''}, ${employee.address.city || ''}, ${employee.address.state || ''} - ${employee.address.pincode || ''}` : '-'} />
              </TabPanel>

              <TabPanel value={tab} index={1}>
                <InfoRow label="Employee ID" value={employee.employeeId} />
                <InfoRow label="Department" value={employee.department?.departmentName} />
                <InfoRow label="Designation" value={employee.designation?.designationName} />
                <InfoRow label="Employment Type" value={employee.employmentType?.replace('_', ' ')} />
                <InfoRow label="Joining Date" value={formatDate(employee.joiningDate)} />
                <InfoRow label="Reporting Manager" value={employee.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : '-'} />
                <InfoRow label="Salary" value={formatCurrency(employee.salary)} />
                <InfoRow label="Status" value={<StatusChip status={employee.status} />} />
              </TabPanel>

              <TabPanel value={tab} index={2}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Bank Details</Typography>
                <InfoRow label="Bank Name" value={employee.bankName} />
                <InfoRow label="Account Number" value={employee.accountNumber} />
                <InfoRow label="IFSC Code" value={employee.ifscCode} />
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Documents ({documents.length})</Typography>
                {documents.map((doc) => (
                  <Box key={doc._id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{doc.documentName}</Typography>
                      <Typography variant="caption" color="text.secondary">{doc.documentType?.replace('_', ' ')}</Typography>
                    </Box>
                    <Button size="small" variant="outlined" href={getApiUrl(`uploads/documents/${doc.filePath}`)} target="_blank">View</Button>
                  </Box>
                ))}
                {documents.length === 0 && <Typography variant="body2" color="text.secondary">No documents uploaded</Typography>}
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EmployeeProfile;
