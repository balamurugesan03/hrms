import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Avatar, Chip,
  List, ListItem, ListItemText, ListItemIcon, Divider, Paper,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import EventNoteIcon from '@mui/icons-material/EventNote';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventIcon from '@mui/icons-material/Event';
import PaymentsIcon from '@mui/icons-material/Payments';
import { dashboardApi } from '../../api/index';
import StatCard from '../../components/common/StatCard';
import { formatCurrency, formatDate } from '../../utils/helpers';

const COLORS = ['#1976d2', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [employeeGrowth, setEmployeeGrowth] = useState([]);
  const [leaveAnalytics, setLeaveAnalytics] = useState([]);
  const [payrollAnalytics, setPayrollAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, trendRes, growthRes, leaveRes, payrollRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getAttendanceTrend({ days: 14 }),
          dashboardApi.getEmployeeGrowth(),
          dashboardApi.getLeaveAnalytics(),
          dashboardApi.getPayrollAnalytics(),
        ]);
        setStats(statsRes.data.data);
        setAttendanceTrend(trendRes.data.data);
        setEmployeeGrowth(growthRes.data.data);
        setLeaveAnalytics(leaveRes.data.data);
        setPayrollAnalytics(payrollRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Dashboard Overview</Typography>

      {/* Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Total Employees" value={stats?.totalEmployees ?? 0} icon={<PeopleIcon />} color="primary" subtitle="All time" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Active Employees" value={stats?.activeEmployees ?? 0} icon={<PersonIcon />} color="success" subtitle="Currently active" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Today Present" value={stats?.todayAttendance ?? 0} icon={<EventNoteIcon />} color="info" subtitle="Checked in today" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="On Leave" value={stats?.onLeaveToday ?? 0} icon={<BeachAccessIcon />} color="warning" subtitle="Approved leaves today" loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Monthly Payroll" value={formatCurrency(stats?.monthlyPayrollCost)} icon={<PaymentsIcon />} color="secondary" subtitle="Current month" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="New This Month" value={stats?.newEmployeesThisMonth ?? 0} icon={<PersonIcon />} color="success" subtitle="Joined this month" loading={loading} />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* Attendance Trend */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Attendance Trend (Last 14 Days)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={attendanceTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#1976d2" fill="url(#colorPresent)" strokeWidth={2} />
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Stats */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Department Headcount</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(stats?.departmentStats || []).map((dept, idx) => (
                  <Box key={dept._id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: `${COLORS[idx % COLORS.length]}22`, color: COLORS[idx % COLORS.length], fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {dept.departmentName?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={500} noWrap>{dept.departmentName}</Typography>
                        <Typography variant="caption" fontWeight={700} color="primary">{dept.count}</Typography>
                      </Box>
                      <Box sx={{ height: 4, bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', bgcolor: COLORS[idx % COLORS.length], borderRadius: 2, width: `${Math.min(100, (dept.count / (stats?.activeEmployees || 1)) * 100)}%` }} />
                      </Box>
                    </Box>
                  </Box>
                ))}
                {(!stats?.departmentStats || stats.departmentStats.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No data available</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={2.5}>
        {/* Payroll Analytics */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Payroll Analytics (This Year)</Typography>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={payrollAnalytics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={(v) => ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][v]} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="totalGross" name="Gross Salary" fill="#1976d2" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="totalNet" name="Net Salary" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Leave Analytics */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Leave Distribution</Typography>
              {leaveAnalytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={leaveAnalytics} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="total" nameKey="_id" paddingAngle={3}>
                      {leaveAnalytics.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend formatter={(val) => <span style={{ fontSize: 11 }}>{val}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography variant="body2" color="text.secondary">No leave data this year</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Holidays */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>Upcoming Holidays</Typography>
              {(stats?.upcomingHolidays || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No upcoming holidays</Typography>
              ) : (
                <List disablePadding>
                  {(stats?.upcomingHolidays || []).map((h, idx) => (
                    <React.Fragment key={h._id}>
                      {idx > 0 && <Divider component="li" />}
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 44 }}>
                          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' + '20', color: 'primary.main' }}>
                            <EventIcon fontSize="small" />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{h.holidayName}</Typography>}
                          secondary={formatDate(h.holidayDate)}
                        />
                        <Chip label={h.holidayType} size="small" color="primary" variant="outlined" sx={{ fontSize: 10 }} />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Employee Growth */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Employee Growth</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={employeeGrowth}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" name="New Employees" stroke="#7c3aed" fill="url(#growthGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
