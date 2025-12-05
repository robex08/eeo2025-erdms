import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Box, Chip } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Info as InfoIcon
} from '@mui/icons-material';

/**
 * ReportCard - Karta pro jednotlivý report
 * Zobrazí název, popis, prioritu a tlačítko pro spuštění
 */
const ReportCard = ({ 
  title, 
  description, 
  icon: Icon = AssessmentIcon,
  priority = 'medium',
  onGenerate,
  disabled = false,
  badge = null
}) => {
  
  const getPriorityColor = () => {
    switch(priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getPriorityLabel = () => {
    switch(priority) {
      case 'high': return 'Vysoká';
      case 'medium': return 'Střední';
      case 'low': return 'Nízká';
      default: return '';
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: disabled ? 'none' : 'translateY(-4px)',
          boxShadow: disabled ? 1 : 4
        },
        opacity: disabled ? 0.6 : 1
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              backgroundColor: 'primary.light',
              borderRadius: 2,
              p: 1,
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon sx={{ color: 'primary.dark', fontSize: 28 }} />
          </Box>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              {title}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={getPriorityLabel()} 
                size="small" 
                color={getPriorityColor()}
              />
              {badge && (
                <Chip 
                  label={badge} 
                  size="small" 
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onGenerate}
          disabled={disabled}
          startIcon={<TrendingUpIcon />}
        >
          Zobrazit report
        </Button>
      </CardActions>
    </Card>
  );
};

export default ReportCard;
