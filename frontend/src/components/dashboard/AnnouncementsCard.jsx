import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, Typography, Button, Chip, Divider } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import PushPinIcon from '@mui/icons-material/PushPin';
import { useNavigate } from 'react-router-dom';
import { announcementApi } from '../../api/index';
import { formatDate } from '../../utils/helpers';

export const PRIORITY_COLOR = { normal: 'default', important: 'warning', urgent: 'error' };

const AnnouncementsCard = ({ limit = 4 }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    announcementApi.getAll({ limit }).then(({ data }) => setItems(data.data)).catch(() => {});
  }, [limit]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <CampaignIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>Announcements</Typography>
          <Button size="small" onClick={() => navigate('/announcements')}>View all</Button>
        </Box>

        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No announcements yet</Typography>
        ) : items.map((a, idx) => (
          <Box key={a._id}>
            {idx > 0 && <Divider sx={{ my: 1.25 }} />}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              {a.pinned && <PushPinIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
              <Typography variant="body2" fontWeight={700} noWrap sx={{ flexGrow: 1 }}>{a.title}</Typography>
              {a.priority !== 'normal' && <Chip label={a.priority} size="small" color={PRIORITY_COLOR[a.priority]} sx={{ height: 20, fontSize: 10, textTransform: 'capitalize' }} />}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {a.content}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
              {a.createdBy?.name} · {formatDate(a.createdAt)}
            </Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

export default AnnouncementsCard;
