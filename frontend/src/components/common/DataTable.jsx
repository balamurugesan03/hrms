import React from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, CircularProgress, Typography, Skeleton,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

const DataTable = ({
  columns,
  rows = [],
  loading = false,
  total = 0,
  page = 1,
  limit = 10,
  onPageChange,
  onLimitChange,
  emptyMessage = 'No records found',
  stickyHeader = true,
  maxHeight = 600,
}) => {
  if (loading) {
    return (
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.field} style={{ width: col.width }}>
                  <Skeleton width={80} height={20} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.field}><Skeleton height={24} /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader={stickyHeader} size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.field}
                  align={col.align || 'left'}
                  style={{ width: col.width, minWidth: col.minWidth || 80 }}
                >
                  {col.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                    <InboxIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography color="text.secondary" variant="body2">{emptyMessage}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={row._id || idx} hover>
                  {columns.map((col) => (
                    <TableCell key={col.field} align={col.align || 'left'} sx={{ py: 1.2 }}>
                      {col.renderCell ? col.renderCell({ row, value: row[col.field] }) : row[col.field] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {onPageChange && (
        <TablePagination
          component="div"
          count={total}
          page={page - 1}
          onPageChange={(_, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      )}
    </Paper>
  );
};

export default DataTable;
