/**
 * Update Notification Modal
 * 
 * Moderní modal pro informování uživatele o dostupné aktualizaci.
 * Používá Material-UI komponenty pro konzistentní vzhled.
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import RefreshIcon from '@mui/icons-material/Refresh';

const UpdateNotificationModal = ({ open, onClose, onUpdate, versionData }) => {
  const buildTime = versionData?.buildTime 
    ? new Date(versionData.buildTime).toLocaleString('cs-CZ', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    : 'nedávno';

  const handleUpdate = () => {
    onUpdate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <SystemUpdateAltIcon 
          sx={{ 
            fontSize: 32, 
            color: 'primary.main' 
          }} 
        />
        <Box>
          <Typography variant="h6" component="div">
            Nová verze aplikace ({process.env.REACT_APP_VERSION || 'N/A'})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Aktualizace ze {buildTime}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Je dostupná aktualizovaná verze aplikace s nejnovějšími funkcemi a opravami.
        </Alert>

        <Typography variant="body2" color="text.secondary" paragraph>
          Pro zajištění správné funkčnosti doporučujeme stránku obnovit.
          Vaše neuložené změny by měly být automaticky uloženy, ale pro jistotu
          si je zkontrolujte před obnovením.
        </Typography>

        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200'
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Build hash:
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'primary.main',
              wordBreak: 'break-all'
            }}
          >
            {versionData?.buildHash || 'N/A'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button 
          onClick={onClose}
          color="inherit"
          sx={{ mr: 1 }}
        >
          Později
        </Button>
        <Button
          onClick={handleUpdate}
          variant="contained"
          startIcon={<RefreshIcon />}
          color="primary"
          autoFocus
        >
          Obnovit nyní
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdateNotificationModal;
