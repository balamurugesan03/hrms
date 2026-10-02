import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Grid, TextField, MenuItem, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Card, CardContent, Typography,
  List, ListItem, ListItemText, ListItemIcon, Chip,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArticleIcon from '@mui/icons-material/Article';
import toast from 'react-hot-toast';
import { documentApi, employeeApi } from '../../api/index';
import PageHeader from '../../components/common/PageHeader';
import { formatDate, getApiUrl } from '../../utils/helpers';

const DOC_TYPES = ['aadhaar', 'pan', 'passport', 'certificate', 'offer_letter', 'other'];

const DocumentsPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({ documentType: 'aadhaar', documentName: '' });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { employeeApi.getAll({ limit: 200 }).then(({ data }) => setEmployees(data.data)).catch(() => {}); }, []);

  const fetchDocs = useCallback(async () => {
    if (!selectedEmp) return;
    setLoading(true);
    try { const { data } = await documentApi.getAll(selectedEmp); setDocuments(data.data || []); } catch {} finally { setLoading(false); }
  }, [selectedEmp]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async () => {
    if (!file || !selectedEmp) return toast.error('Select employee and file');
    const fd = new FormData();
    fd.append('employeeId', selectedEmp);
    fd.append('documentType', uploadForm.documentType);
    fd.append('documentName', uploadForm.documentName || file.name);
    fd.append('document', file);
    try { await documentApi.upload(fd); toast.success('Document uploaded'); setOpenUpload(false); setFile(null); fetchDocs(); } catch {}
  };

  const handleDelete = async (docId) => {
    try { await documentApi.delete(selectedEmp, docId); toast.success('Document deleted'); fetchDocs(); } catch {}
  };

  return (
    <Box>
      <PageHeader title="Document Management" subtitle="Upload and manage employee documents" />

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField select label="Select Employee" sx={{ width: 280 }} size="small" value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}>
          <MenuItem value="">Select Employee</MenuItem>
          {employees.map((e) => <MenuItem key={e._id} value={e._id}>{`${e.firstName} ${e.lastName} (${e.employeeId})`}</MenuItem>)}
        </TextField>
        {selectedEmp && <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setOpenUpload(true)}>Upload Document</Button>}
      </Box>

      {selectedEmp && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Documents ({documents.length})</Typography>
            {documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No documents found for this employee</Typography>
            ) : (
              <List>
                {documents.map((doc, idx) => (
                  <ListItem
                    key={doc._id}
                    divider={idx < documents.length - 1}
                    sx={{ px: 0 }}
                    secondaryAction={
                      <Box>
                        <Tooltip title="View">
                          <IconButton size="small" color="primary" href={getApiUrl(`uploads/documents/${doc.filePath}`)} target="_blank" component="a">
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(doc._id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      <ArticleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={doc.documentName}
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={doc.documentType?.replace('_', ' ')} size="small" variant="outlined" />
                          <Typography variant="caption" color="text.secondary">{formatDate(doc.uploadedAt)}</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={600}>Upload Document</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select label="Document Type" fullWidth size="small" value={uploadForm.documentType} onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}>
                {DOC_TYPES.map((t) => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Document Name" fullWidth size="small" value={uploadForm.documentName} onChange={(e) => setUploadForm({ ...uploadForm, documentName: e.target.value })} placeholder="e.g. Aadhaar Card" />
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" component="label" fullWidth>
                {file ? file.name : 'Choose File (PDF, PNG, JPG)'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(e) => setFile(e.target.files[0])} />
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenUpload(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleUpload} variant="contained">Upload</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsPage;
