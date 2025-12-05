/**
 * 🔒 LOCK STATUS BADGE - Zobrazení stavu uzamčení pokladní knihy
 *
 * Komponenta pro vizualizaci stavu uzamčení a možnost změny stavu.
 * Podporuje 3 stavy:
 * - OTEVŘENÁ (🔓) - lze editovat
 * - UZAVŘENÁ (🔒) - uzavřena uživatelem, může otevřít vlastník nebo správce
 * - ZAMKNUTA (🔐) - zamknuta správcem, může otevřít jen správce
 *
 * @author FE Team
 * @date 9. listopadu 2025
 */

import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import {
  LockOpen as UnlockedIcon,
  Lock as LockedIcon,
  LockClock as ClosedIcon,
  MoreVert as MoreIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import {
  LOCK_STATUS,
  getLockStatusInfo,
  canChangeLockStatus
} from '../utils/cashbookPermissions';

const LockStatusBadge = ({
  cashbook,
  userDetail,
  onStatusChange,
  size = 'medium'
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const currentStatus = cashbook.stav_uzamceni || LOCK_STATUS.OPEN;
  const statusInfo = getLockStatusInfo(currentStatus);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusClick = (newStatus) => {
    const check = canChangeLockStatus(userDetail, cashbook, newStatus);

    if (!check.canChange) {
      alert(check.reason);
      handleMenuClose();
      return;
    }

    // Zobrazit potvrzovací dialog
    setConfirmDialog({
      newStatus,
      statusInfo: getLockStatusInfo(newStatus)
    });
    handleMenuClose();
  };

  const handleConfirm = async () => {
    if (!confirmDialog) return;

    try {
      await onStatusChange(cashbook.id, confirmDialog.newStatus);
      setConfirmDialog(null);
    } catch (error) {
      console.error('Chyba při změně stavu:', error);
      alert('Nepodařilo se změnit stav pokladní knihy');
    }
  };

  const handleCancel = () => {
    setConfirmDialog(null);
  };

  // Ikona podle stavu
  const getIcon = () => {
    switch (currentStatus) {
      case LOCK_STATUS.OPEN:
        return <UnlockedIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
      case LOCK_STATUS.CLOSED:
        return <ClosedIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
      case LOCK_STATUS.LOCKED:
        return <LockedIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
      default:
        return <UnlockedIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
    }
  };

  // Zjistit, jaké změny jsou možné
  const canOpenCheck = canChangeLockStatus(userDetail, cashbook, LOCK_STATUS.OPEN);
  const canCloseCheck = canChangeLockStatus(userDetail, cashbook, LOCK_STATUS.CLOSED);
  const canLockCheck = canChangeLockStatus(userDetail, cashbook, LOCK_STATUS.LOCKED);

  const hasAnyAction = canOpenCheck.canChange || canCloseCheck.canChange || canLockCheck.canChange;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title={statusInfo.description}>
        <Chip
          icon={getIcon()}
          label={statusInfo.label}
          color={statusInfo.color}
          size={size}
          variant="outlined"
        />
      </Tooltip>

      {hasAnyAction && (
        <Tooltip title="Změnit stav uzamčení">
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {currentStatus !== LOCK_STATUS.OPEN && canOpenCheck.canChange && (
          <MenuItem onClick={() => handleStatusClick(LOCK_STATUS.OPEN)}>
            <ListItemIcon>
              <UnlockedIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Otevřít</ListItemText>
          </MenuItem>
        )}

        {currentStatus !== LOCK_STATUS.CLOSED && canCloseCheck.canChange && (
          <MenuItem onClick={() => handleStatusClick(LOCK_STATUS.CLOSED)}>
            <ListItemIcon>
              <ClosedIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>Uzavřít</ListItemText>
          </MenuItem>
        )}

        {currentStatus !== LOCK_STATUS.LOCKED && canLockCheck.canChange && (
          <MenuItem onClick={() => handleStatusClick(LOCK_STATUS.LOCKED)}>
            <ListItemIcon>
              <LockedIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Zamknout</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Potvrzovací dialog */}
      <Dialog open={Boolean(confirmDialog)} onClose={handleCancel}>
        <DialogTitle>
          Změna stavu pokladní knihy
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Opravdu chcete změnit stav pokladní knihy na{' '}
            <strong>
              {confirmDialog?.statusInfo.icon} {confirmDialog?.statusInfo.label}
            </strong>?
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <DialogContentText variant="body2" color="text.secondary">
              {confirmDialog?.statusInfo.description}
            </DialogContentText>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Zrušit</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={confirmDialog?.statusInfo.color || 'primary'}
            startIcon={<CheckIcon />}
          >
            Potvrdit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LockStatusBadge;
