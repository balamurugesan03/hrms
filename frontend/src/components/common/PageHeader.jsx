import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const PageHeader = ({ title, subtitle, breadcrumbs = [], action }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 0.5 }}>
          {breadcrumbs.map((crumb, idx) =>
            crumb.path ? (
              <Link
                key={idx}
                component="button"
                variant="caption"
                color="text.secondary"
                onClick={() => navigate(crumb.path)}
                underline="hover"
                sx={{ cursor: 'pointer' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography key={idx} variant="caption" color="text.primary">
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Box>
    </Box>
  );
};

export default PageHeader;
