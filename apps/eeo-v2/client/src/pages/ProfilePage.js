/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext, useMemo, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { loadAuthData } from '../utils/authStorage';
import { User, Mail, Building, Building2, MapPin, Phone, IdCard, Calendar, Shield, RefreshCw, Lock, Key, Hash, MessageSquare, FileText, TrendingUp, XCircle, Archive, CheckCircle, Settings, Info, UserCog, Search, X, Sliders, Eye, Download, Filter, Layout, Save, ChevronDown, ChevronUp, Coins, Clock, Send, ShoppingCart, Bell } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faList, faBoltLightning } from '@fortawesome/free-solid-svg-icons';
import { fetchFreshUserDetail, fetchCiselniky, fetchAllUsers, fetchApprovers } from '../services/api2auth';
import { getOrganizaceDetail } from '../services/apiv2Dictionaries';
import { CustomSelect } from '../components/CustomSelect';
import { getAvailableSections, isSectionAvailable, getFirstAvailableSection } from '../utils/availableSections';
import ModernHelper from '../components/ModernHelper';
import ContactManagement from '../components/ContactManagement';

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinningIcon = styled.span`
  display: inline-block;
  animation: ${spinAnimation} 1s linear infinite;
`;

const PageContainer = styled.div`
  min-height: 100vh;
  padding: 2rem;
  position: relative;
  z-index: 1;

  @media (min-width: 1400px) {
    padding: 2rem 3rem;
  }

  @media (min-width: 1800px) {
    padding: 2rem 4rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ContentWrapper = styled.div`
  width: 100%;
  max-width: none;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  margin: 0 0 1rem 0;
  color: #ffffff;
  font-size: 2.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ProfileCard = styled.div`
  background: linear-gradient(135deg, #1f2a57 0%, #2563eb 70%, #1d4ed8 100%);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: none;
  margin-bottom: 2rem;
  animation: ${slideInUp} 0.6s ease-out 0.1s both;
  overflow: hidden;
`;

const ProfileHeader = styled.div`
  color: #ffffff;
  position: relative;
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  position: relative;
  z-index: 1;
`;

const HeaderTitle = styled.div`
  flex: 1;
`;

const PageSubtitle = styled.p`
  margin: 0;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 12px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    ${props => props.$loading ? css`animation: ${spinAnimation} 1s linear infinite;` : 'animation: none;'}
  }
`;

const StatusBadgeLarge = styled.span`
  background: ${props => props.active ? '#10b981' : '#ef4444'};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 2px 8px ${props => props.active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.8;
  }
`;



const UserAvatar = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const AvatarCircle = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: white;
  border: 4px solid rgba(255, 255, 255, 0.3);
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h2`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
`;

const UserRole = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 1rem;
  opacity: 0.8;
`;

const InfoSection = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  margin-top: 2rem;

  @media (min-width: 1800px) {
    gap: 3rem;
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const InfoCard = styled.div`
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
  }
`;

const CardWithChart = styled(InfoCard)`
  display: flex;
  flex-direction: column;
  min-height: 500px;
`;

const CardContent = styled.div`
  flex: 1;
`;

const PieChartContainer = styled.div`
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 270px;
  height: 270px;
  opacity: 0.9;
  
  &:hover {
    opacity: 1;
  }
`;

const PieChartSvg = styled.svg`
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
`;

const SectionDivider = styled.div`
  height: 1px;
  background: #e2e8f0;
  margin: 1.5rem 0;
`;

const CardTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${props => props.color || '#3b82f6'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const InfoValue = styled.div`
  font-size: 1rem;
  color: #1e293b;
  font-weight: 600;
  margin-top: 0.125rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  line-height: 1.4;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  z-index: 10;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  ${css`animation: ${spinAnimation} 1s linear infinite;`}
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.active ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.active ? '#166534' : '#dc2626'};
`;

const EmptyValue = styled.span`
  color: #9ca3af;
  font-style: italic;
`;

/* Permissions Section Components */
const PermissionsTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const PermissionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
`;

const SearchBoxWrapper = styled.div`
  position: relative;
  width: 400px;
`;

const SearchBox = styled.input`
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  width: 100%;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    color: #1e293b;
  }
`;

const RolesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const RoleBlock = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const RoleHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
`;

const RoleTitle = styled.h4`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
`;

const RoleDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #64748b;
  font-style: italic;
`;

const PermissionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
`;

const PermissionCard = styled.div`
  background: ${props => props.$isDuplicate ? '#fff7ed' : '#f8fafc'};
  border: 1px solid ${props => props.$isDuplicate ? '#fed7aa' : '#e2e8f0'};
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: ${props => props.$isDuplicate ? '#ffedd5' : '#f1f5f9'};
    border-color: ${props => props.$isDuplicate ? '#fdba74' : '#cbd5e1'};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const PermissionCode = styled.div`
  font-weight: 600;
  color: #1e40af;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '✓';
    color: #10b981;
    font-weight: bold;
  }
`;

const PermissionDescription = styled.div`
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.4;
`;

const DuplicateBadge = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: #f97316;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);
`;

const DirectRightsSection = styled.div`
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 3px solid #e2e8f0;
`;

const DirectRightsTitle = styled.h4`
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '⚡';
    font-size: 1.2rem;
  }
`;

/* Settings Section Components */
const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const SuppliersContainer = styled.div`
  width: 100%;
`;

const SettingsSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SettingsSectionTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
  user-select: none;
  transition: all 0.2s ease;
`;

const SettingsSectionTitleContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
`;

const CollapseIconButton = styled.button`
  background: transparent;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s ease;
  border-radius: 6px;
  margin-left: auto;
  
  &:hover {
    background: #f3f4f6;
    color: #3b82f6;
  }
  
  svg {
    transition: transform 0.3s ease;
    transform: ${props => props.$collapsed ? 'rotate(0deg)' : 'rotate(180deg)'};
  }
`;

const CollapsibleContent = styled.div`
  max-height: ${props => props.$collapsed ? '0' : '5000px'};
  overflow: ${props => props.$collapsed ? 'hidden' : 'visible'};
  transition: max-height 0.4s ease-in-out;
  opacity: ${props => props.$collapsed ? '0' : '1'};
  transition: max-height 0.4s ease-in-out, opacity 0.3s ease-in-out;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const SettingItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ToggleSettingItem = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
`;

const SettingLabel = styled.label`
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ToggleSettingLabel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
`;

const ToggleSettingTitle = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
`;

const SettingDescription = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.4;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 56px;
  height: 28px;
  cursor: pointer;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #cbd5e1;
    border-radius: 28px;
    transition: all 0.3s ease;

    &::before {
      content: '';
      position: absolute;
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
  }

  input:checked + span {
    background-color: #3b82f6;
  }

  input:checked + span::before {
    transform: translateX(28px);
  }

  input:focus + span {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SelectInput = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1e293b;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #cbd5e1;
  }
`;

const TilesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const TileCheckbox = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  input:checked ~ & {
    background: #eff6ff;
    border-color: #3b82f6;
  }

  input {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #3b82f6;
    flex-shrink: 0;
    order: 2;
  }

  span {
    font-size: 0.9rem;
    font-weight: 500;
    color: #374151;
    flex: 1;
    order: 1;
  }
`;

const SaveButton = styled.button`
  align-self: flex-start;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  margin-top: 1rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// 🔔 Styled komponenty pro notifikační matici
const NotifMatrixCategory = styled.div`
  margin-bottom: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
`;

const NotifCategoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
  background: ${props => props.$expanded ? '#f1f5f9' : '#f8fafc'};
  cursor: pointer;
  user-select: none;
  border-bottom: ${props => props.$expanded ? '1px solid #e2e8f0' : 'none'};
  transition: background 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
  }
`;

const NotifCategoryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  color: #1e293b;
  
  svg:first-of-type {
    transition: transform 0.3s ease;
    transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const NotifCategoryHeaderCheckboxes = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const NotifHeaderCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  
  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #3b82f6;
  }
  
  &:hover {
    color: #3b82f6;
  }
`;

const NotifEventsContainer = styled.div`
  max-height: ${props => props.$expanded ? '2000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
`;

const NotifEventRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  align-items: center;
  padding: 0.45rem 1rem 0.45rem 2.25rem;
  border-bottom: 1px solid #f1f5f9;
  min-height: 36px;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #fafbfc;
  }
`;

const NotifEventLabel = styled.div`
  font-size: 0.88rem;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .notif-event-desc {
    font-size: 0.78rem;
    color: #94a3b8;
  }
`;

const NotifCheckboxCell = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? '0.4' : '1'};
  
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    accent-color: #3b82f6;
  }
`;

const NotifColumnHeaders = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  align-items: center;
  padding: 0.4rem 1rem 0.4rem 2.25rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const NotifInfoBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  margin-bottom: 1rem;
  
  svg {
    flex-shrink: 0;
    color: #3b82f6;
    margin-top: 1px;
  }
  
  p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #1e40af;
  }
`;

const RolesTable = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
`;

const RolesHeader = styled.div`
  display: grid;
  grid-template-columns: 28% 32% 1fr;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;
`;

const RolesHeaderCell = styled.div`
  padding: 1rem;
  border-right: 1px solid #e2e8f0;

  &:last-child {
    border-right: none;
  }
`;

const RolesRow = styled.div`
  display: grid;
  grid-template-columns: 28% 32% 1fr;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f9fafb;
  }
`;

const RolesCell = styled.div`
  padding: 0.75rem 1rem;
  border-right: 1px solid #f1f5f9;
  display: flex;
  align-items: center;

  &:last-child {
    border-right: none;
  }
`;

const RoleBadge = styled.span`
  background: #e3f2fd;
  color: #0d47a1;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #d5e7f9;
  display: inline-block;
`;

const PermissionBadge = styled.span`
  background: #f0f9ff;
  color: #0369a1;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #e0f2fe;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

const EmptyPermissions = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #64748b;
  font-style: italic;
  background: #f8fafc;
  border-radius: 12px;
`;

const RoleSeparator = styled.div`
  height: 1px;
  background: #e2e8f0;
`;

const DirectRightsHeader = styled.div`
  background: #1e293b;
  color: #ffffff;
  padding: 0.75rem 1rem;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.9;
`;

/* Tab Navigation Components */
const TabsContainer = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  animation: ${slideInUp} 0.6s ease-out 0.15s both;
`;

const TabNavigation = styled.div`
  display: flex;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  padding: 0.5rem;
  gap: 0.5rem;
`;

const TabButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#3b82f6' : '#64748b'};
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$active ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none'};

  &:hover {
    background: ${props => props.$active ? 'white' : '#f1f5f9'};
    color: ${props => props.$active ? '#3b82f6' : '#1e293b'};
  }

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;

    span {
      display: none;
    }
  }
`;

const TabContent = styled.div`
  display: ${props => props.$active ? 'block' : 'none'};
  padding: 2rem;
  animation: ${props => props.$active ? css`${slideInUp} 0.4s ease-out` : 'none'};
`;

const SettingsPlaceholder = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #64748b;
`;

const SettingsIcon = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #ddd6fe 0%, #c7d2fe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
`;

const SettingsTitle = styled.h3`
  margin: 0 0 0.75rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
`;

const SettingsDescription = styled.p`
  margin: 0;
  font-size: 1rem;
  color: #64748b;
  line-height: 1.6;
`;

// =============================================================================
// MULTISELECT KOMPONENTA (zkopírovaná z Orders25List)
// =============================================================================

const MultiSelectLocal = ({ field, value, onChange, options, placeholder, icon, selectStates, setSelectStates, searchStates, setSearchStates }) => {
  const isOpen = selectStates[field] || false;
  const searchTerm = searchStates[field] || '';
  const dropdownRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  // Zavři dropdown při kliku mimo
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSelectStates(prev => ({ ...prev, [field]: false }));
        setSearchStates(prev => ({ ...prev, [field]: '' }));
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, field, setSelectStates, setSearchStates]);

  // Focus na vyhledávací pole při otevření (bez setTimeout - podle OBECNA_pravidla.prompt.md)
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Memoizuj aktuální hodnoty pro rychlejší porovnávání
  const valueSet = React.useMemo(() => {
    const arr = Array.isArray(value) ? value : [];
    return new Set(arr.map(v => String(v)));
  }, [value]);

  // Filtrované options podle vyhledávání
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;

    const search = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return options.filter(opt => {
      const label = (opt.label || opt.nazev_stavu || opt.nazev || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return label.includes(search);
    });
  }, [options, searchTerm]);

  const getDisplayValue = React.useCallback(() => {
    if (!value || value.length === 0) return placeholder || 'Vyberte...';
    if (value.length === 1) {
      const opt = options?.find(o => String(o.value || o.kod) === String(value[0]));
      return opt ? (opt.label || opt.nazev_stavu || opt.nazev || value[0]) : value[0];
    }
    return `Vybráno: ${value.length}`;
  }, [value, options, placeholder]);

  const handleToggle = React.useCallback((optValue) => {
    const currentValue = Array.isArray(value) ? value : [];
    const newValue = currentValue.includes(optValue)
      ? currentValue.filter(v => v !== optValue)
      : [...currentValue, optValue];
    
    onChange(newValue);
  }, [value, onChange]);

  const handleMainClick = React.useCallback((e) => {
    e.stopPropagation();
    const willBeOpen = !isOpen;
    if (willBeOpen) {
      // Když otevíráme, zavřeme všechny ostatní selecty (používáme funkční formu - OBECNA_pravidla.prompt.md)
      setSelectStates(() => ({ [field]: true }));
    } else {
      // Když zavíráme, jen zavřeme tento
      setSelectStates(prev => ({ ...prev, [field]: false }));
    }
  }, [isOpen, field, setSelectStates]);

  const handleItemClick = React.useCallback((e, optValue) => {
    e.stopPropagation();
    handleToggle(optValue);
  }, [handleToggle]);

  if (!options || options.length === 0) {
    return (
      <div style={{
        padding: '0.75rem 2.5rem',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        color: '#9ca3af',
        fontSize: '0.875rem'
      }}>
        Načítání...
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={handleMainClick}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = '#3b82f6';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = '#e5e7eb';
        }}
        style={{
          width: '100%',
          padding: '0.75rem 2.5rem 0.75rem 2.5rem',
          border: isOpen ? '2px solid #3b82f6' : '2px solid #e5e7eb',
          borderRadius: '8px',
          fontSize: '0.875rem',
          background: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          color: (!value || value.length === 0) ? '#9ca3af' : '#1f2937',
          fontWeight: (value && value.length > 0) ? '600' : '400',
          transition: 'border-color 0.2s ease'
        }}
      >
        <span>{getDisplayValue()}</span>
        <svg
          style={{
            position: 'absolute',
            right: '0.5rem',
            width: '16px',
            height: '16px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#ffffff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          zIndex: 9999,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '400px'
        }}>
          {/* Vyhledávací pole */}
          <div style={{
            padding: '0.75rem',
            borderBottom: '2px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            background: '#ffffff',
            zIndex: 1
          }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <FontAwesomeIcon
                icon={faSearch}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  width: '12px',
                  height: '12px',
                  pointerEvents: 'none',
                  zIndex: 1
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchStates(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder="Hledat..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Seznam options */}
          <div style={{
            overflowY: 'auto',
            maxHeight: '300px'
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '1rem',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '0.875rem'
              }}>
                Žádné výsledky
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optValue = String(opt.value || opt.kod || '');
                const optLabel = opt.label || opt.nazev_stavu || opt.nazev || 'Bez názvu';
                const isSelected = valueSet.has(optValue);

                if (!optValue) {
                  return null;
                }

                return (
                  <div
                    key={`${field}-opt-${optValue}-${idx}`}
                    onClick={(e) => handleItemClick(e, optValue)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      borderBottom: '1px solid #f3f4f6',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px',
                        accentColor: '#3b82f6',
                        pointerEvents: 'none'
                      }}
                    />
                    <span style={{
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#1f2937' : '#4b5563'
                    }}>
                      {optLabel}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Ikona vlevo dole */}
      {icon && (
        <div style={{
          position: 'absolute',
          left: '0.75rem',
          bottom: '0.75rem',
          color: '#9ca3af',
          pointerEvents: 'none',
          fontSize: '14px'
        }}>
          {icon}
        </div>
      )}
    </div>
  );
};

// Options for settings selects
// MENU_TAB_OPTIONS je nyní dynamické - generuje se v komponentě podle oprávnění

const EXPORT_FORMAT_OPTIONS = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' }
];

// Helper funkce pro generování roků (od aktuálního roku sestupně až k 2016)
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [
    { value: 'current', label: 'Aktuální rok' },
    { value: 'all', label: 'Všechny roky' }
  ];
  
  // Přidáme roky od aktuálního roku sestupně až k 2016
  for (let year = currentYear; year >= 2016; year--) {
    years.push({ value: year.toString(), label: year.toString() });
  }
  
  return years;
};

const YEAR_OPTIONS = generateYearOptions();

// IDENTICKÉ s Orders25List - stejné pořadí a hodnoty
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Všechny měsíce' },
  { value: 'last-month', label: 'Poslední měsíc' },
  { value: 'last-quarter', label: 'Poslední kvartál' },
  { value: 'last-half', label: 'Poslední půlrok' },
  { value: '1', label: 'Leden' },
  { value: '2', label: 'Únor' },
  { value: '3', label: 'Březen' },
  { value: '4', label: 'Duben' },
  { value: '5', label: 'Květen' },
  { value: '6', label: 'Červen' },
  { value: '7', label: 'Červenec' },
  { value: '8', label: 'Srpen' },
  { value: '9', label: 'Září' },
  { value: '10', label: 'Říjen' },
  { value: '11', label: 'Listopad' },
  { value: '12', label: 'Prosinec' },
  { value: '1-3', label: 'Q1 (Leden-Březen)' },
  { value: '4-6', label: 'Q2 (Duben-Červen)' },
  { value: '7-9', label: 'Q3 (Červenec-Září)' },
  { value: '10-12', label: 'Q4 (Říjen-Prosinec)' }
];

// ============================================================================
// 🎯 USEREDUCER: Actions a Reducer pro userSettings
// ============================================================================

// Konfigurace typů notifikačních událostí — POUZE reálně triggerované v systému
// Audit 2026-03-23: Ověřeno oproti OrderForm25.js, invoiceHandlers.php, CashbookService.php, notificationHandlers.php
const NOTIFICATION_EVENT_TYPES_CONFIG = {
  // ── Objednávky (OrderForm25.js → triggerNotification) ──
  ORDER_PENDING_APPROVAL: { label: 'Ke schválení', category: 'objednavky', description: 'Objednávka odeslána ke schválení příkazcem' },
  ORDER_APPROVED: { label: 'Schválena', category: 'objednavky', description: 'Objednávka byla schválena příkazcem' },
  ORDER_REJECTED: { label: 'Zamítnuta', category: 'objednavky', description: 'Objednávka byla zamítnuta příkazcem' },
  ORDER_AWAITING_CHANGES: { label: 'Vrácena k doplnění', category: 'objednavky', description: 'Objednávka vrácena objednateli k přepracování' },
  ORDER_SENT_TO_SUPPLIER: { label: 'Odeslána dodavateli', category: 'objednavky', description: 'Objednávka odeslána dodavateli' },
  ORDER_CONFIRMED_BY_SUPPLIER: { label: 'Potvrzena dodavatelem', category: 'objednavky', description: 'Dodavatel potvrdil přijetí objednávky' },
  ORDER_REGISTRY_PENDING: { label: 'K uveřejnění v registru', category: 'objednavky', description: 'Objednávka čeká na uveřejnění v registru smluv' },
  ORDER_REGISTRY_PUBLISHED: { label: 'Uveřejněna v registru', category: 'objednavky', description: 'Objednávka uveřejněna v registru smluv' },
  ORDER_COMPLETED: { label: 'Dokončena', category: 'objednavky', description: 'Objednávka byla dokončena (věcná správnost potvrzena)' },
  ORDER_CANCELLED: { label: 'Zrušena', category: 'objednavky', description: 'Objednávka byla zrušena / stornována' },
  ORDER_COMMENT_ADDED: { label: 'Nový komentář', category: 'objednavky', description: 'K objednávce byl přidán komentář' },
  // ── Faktury (invoiceHandlers.php → notificationRouter) ──
  INVOICE_UPDATED: { label: 'Faktura upravena', category: 'faktury', description: 'Faktura byla aktualizována' },
  INVOICE_SUBMITTED: { label: 'Faktura předána', category: 'faktury', description: 'Faktura předána ke kontrole' },
  INVOICE_RETURNED: { label: 'Faktura vrácena', category: 'faktury', description: 'Faktura vrácena k přepracování' },
  INVOICE_REGISTRY_PUBLISHED: { label: 'Uveřejněna v registru', category: 'faktury', description: 'Faktura uveřejněna v registru' },
  INVOICE_MATERIAL_CHECK_REQUESTED: { label: 'Kontrola věcné správnosti', category: 'faktury', description: 'Vyžádána kontrola věcné správnosti faktury' },
  INVOICE_MATERIAL_CHECK_APPROVED: { label: 'Věcná správnost OK', category: 'faktury', description: 'Věcná správnost faktury potvrzena' },
  // ── Pokladna (CashbookService.php → notificationRouter) ──
  CASHBOOK_MONTH_CLOSED: { label: 'Měsíc uzavřen', category: 'pokladna', description: 'Pokladní měsíc uzavřen uživatelem' },
  CASHBOOK_MONTH_LOCKED: { label: 'Měsíc zamknut', category: 'pokladna', description: 'Pokladní měsíc zamknut správcem' }
};

// Konfigurace kategorií notifikací (pro UI matici)
// Smlouvy odstraněny — nemají žádný reálný trigger v systému
const NOTIFICATION_CATEGORIES_CONFIG = {
  objednavky: {
    label: 'Objednávky',
    icon: 'ShoppingCart',
    prefix: 'ORDER_',
    color: '#3b82f6',
    permissionCheck: (hasPermission) => hasPermission && (
      hasPermission('ORDER_MANAGE') || hasPermission('ORDER_2025') ||
      hasPermission('ORDER_READ_ALL') || hasPermission('ORDER_VIEW_ALL') ||
      hasPermission('ORDER_READ_OWN') || hasPermission('ORDER_VIEW_OWN')
    )
  },
  faktury: {
    label: 'Faktury',
    icon: 'FileText',
    prefix: 'INVOICE_',
    color: '#10b981',
    permissionCheck: (hasPermission) => hasPermission && (
      hasPermission('INVOICE_MANAGE') || hasPermission('INVOICE_VIEW')
    )
  },
  pokladna: {
    label: 'Pokladna',
    icon: 'Coins',
    prefix: 'CASHBOOK_',
    color: '#f59e0b',
    permissionCheck: (hasPermission) => hasPermission && (
      hasPermission('CASH_BOOK_MANAGE') || hasPermission('CASH_BOOK_READ_ALL') ||
      hasPermission('CASH_BOOK_READ_OWN')
    )
  }
};

// Akce pro reducer
const SETTINGS_ACTIONS = {
  LOAD_FROM_DB: 'load_from_db',
  UPDATE_FIELD: 'update_field',
  UPDATE_NESTED_FIELD: 'update_nested_field',
  UPDATE_NESTED_CATEGORY: 'update_nested_category',
  TOGGLE_TILE: 'toggle_tile',
  TOGGLE_ICON: 'toggle_icon',
  TOGGLE_NOTIFICATION: 'toggle_notification',
  UPDATE_CSV_COLUMN: 'update_csv_column',
  RESET_TO_DEFAULT: 'reset_to_default',
  UPDATE_WORKFLOW_DETAIL: 'update_workflow_detail',
  TOGGLE_ALL_WORKFLOW_CATEGORY: 'toggle_all_workflow_category'
};

// Výchozí nastavení (extrahováno do konstanty pro reuse)
const getDefaultSettings = (hasPermission, userDetail) => {
  const { getFirstAvailableSection } = require('../utils/availableSections');
  const defaultSection = getFirstAvailableSection(hasPermission, userDetail);
  
  return {
    // Chování aplikace (podle screenu z 28.12.2025)
    zapamatovat_filtry: true,
    vychozi_sekce_po_prihlaseni: defaultSection || 'orders',
    vychozi_filtry_stavu_objednavek: [],
    auto_sbalit_zamcene_sekce: true,
    
    // Předvolby pro OrderForm25
    vychozi_garant_id: '', // Výchozí garant pro nové objednávky (prázdný string místo null)
    vychozi_prikazce_id: '', // Výchozí příkazce pro nové objednávky (prázdný string místo null)
    
    // Výchozí rok a období
    vychozi_rok: 'current',
    vychozi_obdobi: 'last-quarter',
    
    // Viditelnost dlaždic
    viditelne_dlazdice: {
      nova: false,
      ke_schvaleni: false,
      schvalena: false,
      zamitnuta: false,
      rozpracovana: false,
      odeslana_dodavateli: false,
      potvrzena_dodavatelem: false,
      k_uverejneni_do_registru: false,
      uverejnena: false,
      ceka_na_potvrzeni: false,
      ceka_se: false,
      vecna_spravnost: false,
      dokoncena: false,
      zrusena: false,
      smazana: false,
      archivovano: false,
      s_fakturou: false,
      s_prilohami: false,
      mimoradne_udalosti: false,
      moje_objednavky: false
    },
    
    // Export nastavení
    export_pokladna_format: 'xlsx',
    
    // CSV Export nastavení - oddělovače
    exportCsvDelimiter: 'semicolon', // 'semicolon', 'tab', 'pipe', 'custom'
    exportCsvCustomDelimiter: '', // Vlastní oddělovač (max 3 znaky)
    exportCsvListDelimiter: 'pipe', // 'pipe', 'comma', 'semicolon', 'custom'
    exportCsvListCustomDelimiter: '', // Vlastní oddělovač pro seznamy (max 3 znaky)
    
    // Export CSV sloupce - optimalizovaná verze podle DB 25a_objednavky
    export_csv_sloupce: {
      // Základní identifikace
      id: true,
      cislo_objednavky: true,
      predmet: true,
      poznamka: false,
      
      // Stavy a workflow
      stav_objednavky: true,
      stav_workflow: false,
      stav_workflow_kod: false,
      stav_komentar: false,
      
      // Datumy
      dt_objednavky: true,
      dt_vytvoreni: true,
      dt_schvaleni: false,
      dt_odeslani: false,
      dt_akceptace: false,
      dt_zverejneni: false,
      dt_predpokladany_termin_dodani: false,
      dt_aktualizace: false,
      dt_dokonceni: false,
      
      // Finanční údaje
      max_cena_s_dph: true,

      financovani_lp_kody: true, // LP kódy z financovani JSON
      financovani_lp_nazvy: false, // LP názvy (pokud jsou dostupné)
      financovani_lp_cisla: false, // LP čísla (pokud jsou dostupné)
      financovani_typ: false, // typ z financovani JSON
      financovani_typ_nazev: false, // název typu
      pojistna_udalost_cislo: false, // číslo pojistné události
      pojistna_udalost_poznamka: false, // poznámka k pojisťovacím údajům
      cislo_smlouvy: false, // číslo smlouvy (pro individuální schválení)
      individualni_schvaleni: false, // individuální schválení
      individualni_poznamka: false, // poznámka k individuálnímu schválení
      financovani_raw: false, // raw JSON financovani pole z DB
      
      // Odpovědné osoby (enriched z JOINů)
      uzivatel: true, // objednatel (uzivatel_id)
      uzivatel_email: false,
      uzivatel_telefon: false,
      garant_uzivatel: false, // (garant_uzivatel_id)
      garant_uzivatel_email: false,
      garant_uzivatel_telefon: false,
      schvalovatel: false, // (schvalovatel_id)
      schvalovatel_email: false,
      schvalovatel_telefon: false,
      prikazce: false, // (prikazce_id)
      prikazce_email: false,
      prikazce_telefon: false,
      vytvoril_uzivatel: false, // CREATE audit
      odesilatel: false, // (odesilatel_id)
      dokoncil: false, // (dokoncil_id)
      fakturant: false, // (fakturant_id)
      
      // Dodavatel
      dodavatel_nazev: true,
      dodavatel_ico: false,
      dodavatel_dic: false,
      dodavatel_adresa: false,
      dodavatel_zastoupeny: false,
      dodavatel_kontakt_jmeno: false,
      dodavatel_kontakt_email: false,
      dodavatel_kontakt_telefon: false,
      
      // Střediska a struktura
      strediska_kod: true, // raw kódy z DB
      strediska_nazvy: false, // enriched názvy
      druh_objednavky_kod: false,
      mimoradna_udalost: false,
      
      // Položky objednávky (z 25a_objednavky_polozky)
      pocet_polozek: true,
      polozky_celkova_cena_s_dph: true,
      polozky_popis: false,
      polozky_cena_bez_dph: false,
      polozky_sazba_dph: false,
      polozky_cena_s_dph: false,
      polozky_usek_kod: false,
      polozky_budova_kod: false,
      polozky_mistnost_kod: false,
      polozky_poznamka: false,
      
      // Přílohy (z 25a_objednavky_prilohy)
      prilohy_count: false,
      prilohy_guid: false,
      prilohy_typ: false,
      prilohy_nazvy: false,
      prilohy_velikosti: false,
      prilohy_nahrano_uzivatel: false,
      prilohy_dt_vytvoreni: false,
      
      // Faktury (z 25a_objednavky_faktury)
      faktury_count: false,
      faktury_celkova_castka_s_dph: false,
      faktury_cisla_vema: false,
      faktury_stav: false,
      faktury_datum_vystaveni: false,
      faktury_datum_splatnosti: false,
      faktury_datum_doruceni: false,
      faktury_strediska_kod: false,
      faktury_poznamka: false,
      faktury_dorucena: false,
      faktury_zaplacena: false,
      
      // Registr smluv
      zverejnit: false, // DB: zverejnit (tinytext)
      registr_iddt: false,
      zverejnil_uzivatel: false, // (zverejnil_id)
      
      // Ostatní
      zaruka: false,
      misto_dodani: false,
      schvaleni_komentar: false,
      dokonceni_poznamka: false,
      potvrzeni_dokonceni_objednavky: false,
      potvrzeni_vecne_spravnosti: false,
      vecna_spravnost_poznamka: false
    },
    
    // Notifikace
    notifikace: {
      povoleny: true,
      email_povoleny: true,
      inapp_povoleny: true,
      kategorie: {
        objednavky: true,
        faktury: true,
        smlouvy: true,
        pokladna: true
      },
      // Granulní nastavení per workflow stav × kanál (vše zapnuto = backward compatible)
      workflow_detaily: Object.keys(NOTIFICATION_EVENT_TYPES_CONFIG).reduce((acc, key) => {
        acc[key] = { email: true, inapp: true };
        return acc;
      }, {})
    },
    
    // Profil
    profil: {
      zobrazit_email: true,
      zobrazit_telefon: true
    },
    
    // Viditelnost ikon nástrojů (podle screenu)
    zobrazit_ikony_nastroju: {
      notes: true,
      todo: true,
      chat: false,
      kalkulacka: true,
      helper: false
    }
  };
};

// Reducer funkce pro userSettings
const userSettingsReducer = (state, action) => {
  switch (action.type) {
    case SETTINGS_ACTIONS.LOAD_FROM_DB:
      // Načtení z DB - merge s existujícím state
      return mergeSettingsForReducer(state, action.payload);
      
    case SETTINGS_ACTIONS.UPDATE_FIELD:
      // Aktualizace jednoho pole (např. vychozi_rok)
      return {
        ...state,
        [action.payload.field]: action.payload.value
      };
      
    case SETTINGS_ACTIONS.UPDATE_NESTED_FIELD:
      // Aktualizace nested pole (např. notifikace.inapp_povoleny)
      return {
        ...state,
        [action.payload.parent]: {
          ...state[action.payload.parent],
          [action.payload.field]: action.payload.value
        }
      };
      
    case SETTINGS_ACTIONS.UPDATE_NESTED_CATEGORY:
      // Aktualizace kategorie notifikací (např. notifikace.kategorie.objednavky)
      return {
        ...state,
        notifikace: {
          ...state.notifikace,
          kategorie: {
            ...state.notifikace.kategorie,
            [action.payload.category]: action.payload.value
          }
        }
      };
      
    case SETTINGS_ACTIONS.TOGGLE_TILE:
      // Toggle viditelnosti dlaždice
      return {
        ...state,
        viditelne_dlazdice: {
          ...state.viditelne_dlazdice,
          [action.payload]: !state.viditelne_dlazdice[action.payload]
        }
      };
      
    case SETTINGS_ACTIONS.TOGGLE_ICON:
      // Toggle viditelnosti ikony nástroje
      return {
        ...state,
        zobrazit_ikony_nastroju: {
          ...state.zobrazit_ikony_nastroju,
          [action.payload]: !state.zobrazit_ikony_nastroju[action.payload]
        }
      };
      
    case SETTINGS_ACTIONS.TOGGLE_NOTIFICATION:
      // Toggle notifikace (kategorie nebo hlavní)
      if (action.payload.category) {
        return {
          ...state,
          notifikace: {
            ...state.notifikace,
            kategorie: {
              ...state.notifikace.kategorie,
              [action.payload.category]: !state.notifikace.kategorie[action.payload.category]
            }
          }
        };
      } else {
        return {
          ...state,
          notifikace: {
            ...state.notifikace,
            [action.payload.field]: !state.notifikace[action.payload.field]
          }
        };
      }
      
    case SETTINGS_ACTIONS.UPDATE_WORKFLOW_DETAIL:
      // Aktualizace jednoho workflow detailu (event_type + channel)
      return {
        ...state,
        notifikace: {
          ...state.notifikace,
          workflow_detaily: {
            ...(state.notifikace.workflow_detaily || {}),
            [action.payload.eventType]: {
              ...(state.notifikace.workflow_detaily?.[action.payload.eventType] || { email: true, inapp: true }),
              [action.payload.channel]: action.payload.value
            }
          }
        }
      };
      
    case SETTINGS_ACTIONS.TOGGLE_ALL_WORKFLOW_CATEGORY: {
      // Toggle všech událostí v kategorii (prefix) pro konkrétní kanál
      const { prefix: catPrefix, channel: catChannel, value: catValue } = action.payload;
      const updatedWorkflowDetaily = { ...(state.notifikace.workflow_detaily || {}) };
      Object.keys(NOTIFICATION_EVENT_TYPES_CONFIG).forEach(evtKey => {
        if (evtKey.startsWith(catPrefix)) {
          updatedWorkflowDetaily[evtKey] = {
            ...(updatedWorkflowDetaily[evtKey] || { email: true, inapp: true }),
            [catChannel]: catValue
          };
        }
      });
      return {
        ...state,
        notifikace: {
          ...state.notifikace,
          workflow_detaily: updatedWorkflowDetaily
        }
      };
    }
      
    case SETTINGS_ACTIONS.UPDATE_CSV_COLUMN:
      // Aktualizace CSV sloupce - pokud není hodnota zadaná, toggle aktuální hodnotu
      const currentValue = state.export_csv_sloupce[action.payload.column];
      const newValue = action.payload.value !== undefined ? action.payload.value : !currentValue;
      return {
        ...state,
        export_csv_sloupce: {
          ...state.export_csv_sloupce,
          [action.payload.column]: newValue
        }
      };
      
    case SETTINGS_ACTIONS.RESET_TO_DEFAULT:
      // Reset na výchozí hodnoty
      return action.payload;
      
    default:
      return state;
  }
};

// Helper pro merge nastavení (použije se v reduceru)
const mergeSettingsForReducer = (defaultSettings, loadedSettings) => {
  const merged = { ...defaultSettings };
  
  Object.keys(loadedSettings).forEach(key => {
    if (typeof loadedSettings[key] === 'object' && loadedSettings[key] !== null && !Array.isArray(loadedSettings[key])) {
      merged[key] = { ...defaultSettings[key], ...loadedSettings[key] };
    } else {
      merged[key] = loadedSettings[key];
    }
  });
  
  // 🔔 Deep merge pro notifikace (kategorie + workflow_detaily)
  if (loadedSettings.notifikace) {
    merged.notifikace = {
      ...defaultSettings.notifikace,
      ...loadedSettings.notifikace,
      kategorie: {
        ...(defaultSettings.notifikace?.kategorie || {}),
        ...(loadedSettings.notifikace?.kategorie || {})
      },
      workflow_detaily: {
        ...(defaultSettings.notifikace?.workflow_detaily || {}),
        ...(loadedSettings.notifikace?.workflow_detaily || {})
      }
    };
    // Deep merge každého workflow_detaily záznamu (email/inapp)
    if (loadedSettings.notifikace?.workflow_detaily) {
      Object.keys(loadedSettings.notifikace.workflow_detaily).forEach(eventType => {
        merged.notifikace.workflow_detaily[eventType] = {
          ...(defaultSettings.notifikace?.workflow_detaily?.[eventType] || { email: true, inapp: true }),
          ...loadedSettings.notifikace.workflow_detaily[eventType]
        };
      });
    }
  }
  
  // Extrakuj .value z objektů
  if (loadedSettings.vychozi_rok && typeof loadedSettings.vychozi_rok === 'object' && loadedSettings.vychozi_rok.value) {
    merged.vychozi_rok = loadedSettings.vychozi_rok.value;
  }
  if (loadedSettings.vychozi_obdobi && typeof loadedSettings.vychozi_obdobi === 'object' && loadedSettings.vychozi_obdobi.value) {
    merged.vychozi_obdobi = loadedSettings.vychozi_obdobi.value;
  }
  
  // Validace sekce (přesunuto do komponentní funkce - potřebuje hasPermission, userDetail)
  let targetSection = loadedSettings.vychozi_sekce_po_prihlaseni || 'orders';
  if (typeof targetSection === 'object' && targetSection.value) {
    targetSection = targetSection.value;
  }
  merged.vychozi_sekce_po_prihlaseni = targetSection;
  
  // Extrahuj values z filtrů
  if (loadedSettings.vychozi_filtry_stavu_objednavek && Array.isArray(loadedSettings.vychozi_filtry_stavu_objednavek)) {
    merged.vychozi_filtry_stavu_objednavek = loadedSettings.vychozi_filtry_stavu_objednavek.map(item => 
      (typeof item === 'object' && item !== null && item.value) ? item.value : item
    );
  }
  
  // Zajisti výchozí hodnoty pro ikony
  if (!loadedSettings.zobrazit_ikony_nastroju) {
    merged.zobrazit_ikony_nastroju = {
      notes: true,
      todo: true,
      chat: false,
      kalkulacka: true,
      helper: false
    };
  }
  
  return merged;
};

// ============================================================================

const ProfilePage = () => {
  const { userDetail, token, username, user_id, refreshUserDetail, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const loadingRef = React.useRef(false); // Prevent multiple simultaneous loads
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem(`profile_active_tab_${user_id || 'default'}`) || 'info';
      return savedTab === 'lp' ? 'info' : savedTab;
    } catch {
      return 'info';
    }
  }); // 'info', 'permissions', 'settings'

  // Legacy fallback: pokud je v URL/state ještě starý tab LP, přepni na Info
  useEffect(() => {
    if (activeTab === 'lp') {
      setActiveTab('info');
    }
  }, [activeTab]);

  // Uložit aktivní tab do localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`profile_active_tab_${user_id || 'default'}`, activeTab);
    } catch (e) {
      console.error('Chyba při ukládání aktivního tabu:', e);
    }
  }, [activeTab, user_id]);
  const [permissionsSearch, setPermissionsSearch] = useState('');
  const [orderStats, setOrderStats] = useState({
    total: 0,
    active: 0,
    zruseno_storno: 0,
    celkem_garant: 0,
    stavy: {}
  });

  // CustomSelect states
  const [selectStates, setSelectStates] = useState({});
  const [searchStates, setSearchStates] = useState({});
  const [touchedSelectFields, setTouchedSelectFields] = useState(new Set());

  // Helper functions for CustomSelect
  const toggleSelect = (field) => {
    setSelectStates(prev => {
      const isCurrentlyOpen = prev[field];
      // Když otevíráme select, zavřeme všechny ostatní
      if (!isCurrentlyOpen) {
        return { [field]: true };
      }
      // Když zavíráme, jen zavřeme tento
      return { ...prev, [field]: false };
    });
  };

  const filterOptions = (options, searchTerm, field) => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => {
      const label = opt.label || opt.nazev || opt.toString();
      return label.toLowerCase().includes(term);
    });
  };

  const getOptionLabel = (option, field) => {
    return option.label || option.nazev || option.toString();
  };

  // Stavy objednávek z číselníku API (načítáme stejně jako v Orders25List)
  const [orderStatesList, setOrderStatesList] = useState([]);
  
  // 🆕 Uživatelé pro výběr garanta a příkazce
  const [allUsers, setAllUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [approvers, setApprovers] = useState([]); // Pro příkazce (pouze ti s právem schvalovat)

  // 🎨 Dynamické menu options podle oprávnění uživatele
  const MENU_TAB_OPTIONS = useMemo(() => {
    return getAvailableSections(hasPermission, userDetail);
  }, [hasPermission, userDetail]);

  // 🔒 Admin role check (pro notifikační matici, chat ikonu, apod.)
  const isAdmin = useMemo(() => {
    return userDetail?.roles && userDetail.roles.some(role =>
      role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
    );
  }, [userDetail]);

  // 🎯 USEREDUCER: User Settings State Management
  // Místo useState používáme useReducer pro lepší správu komplexního state
  const [userSettings, dispatch] = useReducer(
    userSettingsReducer,
    null,
    () => getDefaultSettings(hasPermission, userDetail)
  );

  // 🆕 Načíst všechny uživatele (pro garanta a příkazce)
  useEffect(() => {
    const loadUsers = async () => {
      if (!token || !username) return;
      
      try {
        // Načíst všechny uživatele pro garanta
        const usersData = await fetchAllUsers({ token, username, show_inactive: true });
        if (usersData && Array.isArray(usersData)) {
          setAllUsers(usersData);
          // Filtrovat pouze aktivní uživatele
          const active = usersData.filter(u => u.aktivni === true || u.aktivni === 1);
          setActiveUsers(active);
        }
        
        // Načíst approvers pro příkazce (pouze uživatelé s právem schvalovat)
        const approversData = await fetchApprovers({ token, username });
        if (approversData && Array.isArray(approversData)) {
          setApprovers(approversData);
        }
      } catch (error) {
        console.error('Chyba při načítání uživatelů:', error);
      }
    };
    
    if (token && username) {
      loadUsers();
    }
  }, [token, username]);
  
  // Načíst stavy objednávek z API (stejně jako v Orders25List)
  useEffect(() => {
    const loadOrderStates = async () => {
      try {
        const statesData = await fetchCiselniky({ 
          token, 
          username, 
          typ: 'OBJEDNAVKA' 
        });
        // Seřaď stavy abecedně podle názvu
        const sortedStates = (statesData || []).sort((a, b) => {
          const nameA = (a.nazev_stavu || a.nazev || '').toLowerCase();
          const nameB = (b.nazev_stavu || b.nazev || '').toLowerCase();
          return nameA.localeCompare(nameB, 'cs');
        });
        setOrderStatesList(sortedStates);
      } catch (err) {
        console.error('Chyba při načítání stavů objednávek:', err);
      }
    };

    if (token && username) {
      loadOrderStates();
    }
  }, [token, username]);

  // Load order statistics from profileData (from backend API)
  useEffect(() => {
    if (!profileData) return;

    // Data z backend API
    if (profileData.statistiky_objednavek) {
      const stats = profileData.statistiky_objednavek;
      setOrderStats({
        total: stats.celkem || 0,
        active: stats.aktivni || 0,
        zruseno_storno: stats.zruseno_storno || 0,
        celkem_garant: stats.celkem_garant || 0,
        stavy: stats.stavy || {}
      });
    }
  }, [profileData]);

  // Load user settings from DB on mount (with localStorage cache)
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!user_id || !token || !username) {
        return;
      }

      try {
        const { fetchUserSettings, saveUserSettings, saveSettingsToLocalStorage } = await import('../services/userSettingsApi');
        
        // Načti z DB
        const settingsFromDB = await fetchUserSettings({ token, username, userId: parseInt(user_id, 10) });
        
        // 🆕 KONTROLA: Pokud uživatel NEMÁ nastavení v DB (prázdný objekt nebo null)
        const hasExistingSettings = settingsFromDB && Object.keys(settingsFromDB).length > 0;
        
        // Zkontroluj, zda je uživatel ADMIN
        const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
          role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
        );
        
        if (!hasExistingSettings) {
          
          // Připrav výchozí nastavení z current state (userSettings má výchozí hodnoty z useState)
          let defaultSettings = userSettings;
          
          // Pro non-admin vynuluj chat
          if (!isAdmin) {
            defaultSettings = {
              ...defaultSettings,
              zobrazit_ikony_nastroju: {
                ...defaultSettings.zobrazit_ikony_nastroju,
                chat: false
              }
            };
          }
          
          // Ulož výchozí nastavení do DB
          try {
            await saveUserSettings({ 
              token, 
              username, 
              userId: parseInt(user_id, 10), 
              nastaveni: defaultSettings 
            });
            
            // Ulož do localStorage
            saveSettingsToLocalStorage(parseInt(user_id, 10), defaultSettings);
            
            // Pokud jsme upravili chat, aktualizuj state
            if (!isAdmin) {
              dispatch({ type: SETTINGS_ACTIONS.LOAD_FROM_DB, payload: defaultSettings });
            }
            
          } catch (saveError) {
            console.error('⚠️ Chyba při ukládání výchozích nastavení:', saveError);
            // Pokračuj dál - použijeme výchozí hodnoty lokálně
          }
          
          // Nastavení už má výchozí hodnoty, nemusíme nic měnit
          return;
        }
        
        // 🎯 Uživatel MÁ nastavení v DB → Použij je (NEPŘEPISUJ)
        
        // Pro non-admin vždy vynuluj chat (i když je v DB)
        let finalSettings = settingsFromDB;
        if (!isAdmin) {
          finalSettings = {
            ...settingsFromDB,
            zobrazit_ikony_nastroju: {
              ...(settingsFromDB.zobrazit_ikony_nastroju || {}),
              chat: false
            }
          };
        }
        
        // Ulož do localStorage
        saveSettingsToLocalStorage(parseInt(user_id, 10), finalSettings);
        
        // Deep merge s výchozími hodnotami (zachová strukturu, přepíše hodnoty)
        dispatch({ type: SETTINGS_ACTIONS.LOAD_FROM_DB, payload: finalSettings });
        
      } catch (error) {
        console.error('Error loading user settings from DB:', error);
        // Pokud načtení z DB selže, používáme výchozí hodnoty (už v state)
      }
    };

    loadUserSettings();
  }, [user_id, token, username, hasPermission, userDetail]);
  
  // 🔧 Helper funkce pro merge nastavení (DRY - Don't Repeat Yourself)
  const mergeSettings = (defaultSettings, loadedSettings) => {
    const merged = { ...defaultSettings };
    
    Object.keys(loadedSettings).forEach(key => {
      if (typeof loadedSettings[key] === 'object' && loadedSettings[key] !== null && !Array.isArray(loadedSettings[key])) {
        // Deep merge pro vnořené objekty
        merged[key] = { ...defaultSettings[key], ...loadedSettings[key] };
      } else {
        // Direct assignment pro primitivy a pole
        merged[key] = loadedSettings[key];
      }
    });
    
    // Extrakuj .value z objektů (backend někdy vrací {value, label})
    if (loadedSettings.vychozi_rok && typeof loadedSettings.vychozi_rok === 'object' && loadedSettings.vychozi_rok.value) {
      merged.vychozi_rok = loadedSettings.vychozi_rok.value;
    }
    if (loadedSettings.vychozi_obdobi && typeof loadedSettings.vychozi_obdobi === 'object' && loadedSettings.vychozi_obdobi.value) {
      merged.vychozi_obdobi = loadedSettings.vychozi_obdobi.value;
    }
    
    // Validace a úprava vychozi_sekce_po_prihlaseni
    let targetSection = loadedSettings.vychozi_sekce_po_prihlaseni || 'orders';
    if (typeof targetSection === 'object' && targetSection.value) {
      targetSection = targetSection.value;
    }
    if (!isSectionAvailable(targetSection, hasPermission, userDetail)) {
      console.warn('⚠️ Uživatel nemá oprávnění k sekci:', targetSection, '→ Použije se první dostupná sekce');
      targetSection = getFirstAvailableSection(hasPermission, userDetail);
    }
    merged.vychozi_sekce_po_prihlaseni = targetSection;
    
    // Extrahuj values z vychozi_filtry_stavu_objednavek
    if (loadedSettings.vychozi_filtry_stavu_objednavek && Array.isArray(loadedSettings.vychozi_filtry_stavu_objednavek)) {
      merged.vychozi_filtry_stavu_objednavek = loadedSettings.vychozi_filtry_stavu_objednavek.map(item => 
        (typeof item === 'object' && item !== null && item.value) ? item.value : item
      );
    }
    
    // Zajisti výchozí hodnoty pro ikony nástrojů
    if (!loadedSettings.zobrazit_ikony_nastroju) {
      merged.zobrazit_ikony_nastroju = {
        notes: true,
        todo: true,
        chat: true,
        kalkulacka: true,
        helper: true
      };
    }
    
    return merged;
  };

  // Ref pro sledování, zda jsou nastavení již inicializována
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // Označit jako inicializované po načtení dat (bez setTimeout - podle OBECNA_pravidla.prompt.md)
  useEffect(() => {
    if (user_id && token && userSettings) {
      setSettingsInitialized(true);
    }
  }, [user_id, token, userSettings]);

  // Auto-save userSettings to localStorage on every change (protection against F5 refresh)
  // DB má přednost při načítání, ale localStorage chrání před ztrátou dat při refreshi
  useEffect(() => {
    // Ukládej pouze pokud jsou nastavení inicializována (ne při prvním renderu)
    if (!settingsInitialized || !user_id || !userSettings) return;
    
    try {
      const { saveSettingsToLocalStorage } = require('../services/userSettingsApi');
      saveSettingsToLocalStorage(parseInt(user_id, 10), userSettings);
    } catch (error) {
      console.error('Error auto-saving settings to localStorage:', error);
    }
  }, [userSettings, user_id, settingsInitialized]);

  // Save settings function - DEPRECATED (nyní se používá saveSettingsToDatabase a applySettings)
  const saveUserSettings = () => {
    try {
      localStorage.setItem('user_settings', JSON.stringify(userSettings));
      if (showToast) {
        showToast('Nastavení bylo úspěšně uloženo', 'success');
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      if (showToast) {
        showToast('Chyba při ukládání nastavení: ' + error.message, 'error');
      }
    }
  };

  // 🎨 State pro collapsed sekce v Settings (ukládá se do localStorage)
  const [collapsedSections, setCollapsedSections] = useState(() => {
    try {
      const saved = localStorage.getItem(`settings_collapsed_sections_${user_id || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Toggle collapsed sekce
  const toggleSection = (sectionKey) => {
    setCollapsedSections(prev => {
      const newState = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem(`settings_collapsed_sections_${user_id || 'default'}`, JSON.stringify(newState));
      } catch (e) {
        console.error('Chyba při ukládání collapsed state:', e);
      }
      return newState;
    });
  };

  // 🎨 Uložit a aplikovat nastavení (do DB + localStorage + reload)
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  const saveAndApplySettings = async () => {
    if (!user_id || !token || !username) {
      if (showToast) {
        showToast('Chyba: Není k dispozici uživatel nebo token', 'error');
      }
      return;
    }

    setIsSavingSettings(true);

    try {
      // 🔐 KROK 0: PRE-SAVE TOKEN CHECK - ověřit že token existuje PŘED uložením
      const preTokenCheck = await loadAuthData.token();
      if (!preTokenCheck) {
        console.error('❌ [ProfilePage] KRITICKÁ CHYBA: Token chybí PŘED uložením nastavení!');
        if (showToast) {
          showToast('Kritická chyba: Token chybí. Zůstáváte na stránce, zkuste se odhlásit a znovu přihlásit.', 'error');
        }
        setIsSavingSettings(false);
        return; // STOP - neukládat, nezreloadovat
      }

      const { saveUserSettings, saveSettingsToLocalStorage } = await import('../services/userSettingsApi');

      // Helper funkce pro extrakci hodnoty (pokud je to objekt s .value, vezmi .value, jinak celou hodnotu)
      const extractValue = (val) => {
        if (val && typeof val === 'object' && 'value' in val) {
          return val.value;
        }
        return val;
      };

      // Vyčistit data - ODSTRANIT staré struktury (verze, chovani_aplikace, zobrazeni_dlazic, export_csv, export_pokladna)
      const cleanSettings = {
        zapamatovat_filtry: userSettings.zapamatovat_filtry,
        vychozi_sekce_po_prihlaseni: extractValue(userSettings.vychozi_sekce_po_prihlaseni),
        vychozi_filtry_stavu_objednavek: Array.isArray(userSettings.vychozi_filtry_stavu_objednavek) 
          ? userSettings.vychozi_filtry_stavu_objednavek.map(extractValue)
          : [],
        auto_sbalit_zamcene_sekce: userSettings.auto_sbalit_zamcene_sekce,
        vychozi_rok: extractValue(userSettings.vychozi_rok),
        vychozi_obdobi: extractValue(userSettings.vychozi_obdobi),
        // 🔧 Zajistit že prázdný string se převede na null
        vychozi_garant_id: (() => {
          const val = extractValue(userSettings.vychozi_garant_id);
          return (val === '' || val === null || val === undefined) ? null : val;
        })(),
        vychozi_prikazce_id: (() => {
          const val = extractValue(userSettings.vychozi_prikazce_id);
          return (val === '' || val === null || val === undefined) ? null : val;
        })(),
        viditelne_dlazdice: userSettings.viditelne_dlazdice,
        export_pokladna_format: userSettings.export_pokladna_format,
        exportCsvDelimiter: userSettings.exportCsvDelimiter,
        exportCsvCustomDelimiter: userSettings.exportCsvCustomDelimiter,
        exportCsvListDelimiter: userSettings.exportCsvListDelimiter,
        exportCsvListCustomDelimiter: userSettings.exportCsvListCustomDelimiter,
        export_csv_sloupce: userSettings.export_csv_sloupce,
        notifikace: userSettings.notifikace,
        profil: userSettings.profil,
        zobrazit_ikony_nastroju: userSettings.zobrazit_ikony_nastroju
      };
      
      // 🔒 Pro non-admin uživatele vždy vynuluj chat
      const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
        role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
      );
      
      if (!isAdmin) {
        cleanSettings.zobrazit_ikony_nastroju = {
          ...(cleanSettings.zobrazit_ikony_nastroju || {}),
          chat: false
        };
      }

      // 🔐 KROK 1: Uložit do databáze (saveUserSettings automaticky uloží i do localStorage)
      const dbResponse = await saveUserSettings({
        token,
        username,
        userId: parseInt(user_id, 10),
        nastaveni: cleanSettings
      });

      // 🔐 KROK 1.5: POST-SAVE TOKEN CHECK - ověřit že token stále existuje PO uložení
      const postTokenCheck = await loadAuthData.token();
      if (!postTokenCheck) {
        console.error('❌ [ProfilePage] KRITICKÁ CHYBA: Token chybí PO uložení nastavení!');
        if (showToast) {
          showToast('Nastavení uloženo, ale token byl ztracen. Zkuste se odhlásit a znovu přihlásit.', 'warning');
        }
        setIsSavingSettings(false);
        return; // STOP - neukládat, nezreloadovat
      }

      // ℹ️ localStorage je automaticky aktualizován uvnitř saveUserSettings()

      if (showToast) {
        showToast('Ukládám a aplikuji nastavení...', 'success');
      }

      // Krok 2.5: Vyčistit localStorage cache pro Orders25List (aby se načetly nové hodnoty z DB)
      // DŮLEŽITÉ: Orders25List používá formát klíče: baseKey_user_userId (např. orders25List_statusFilter_user_123)
      try {
        localStorage.removeItem(`orders25List_selectedYear_user_${user_id}`);
        localStorage.removeItem(`orders25List_selectedMonth_user_${user_id}`);
        localStorage.removeItem(`orders25List_statusFilter_user_${user_id}`);
      } catch (e) {
        console.warn('Nelze vyčistit Orders25List cache:', e);
      }

      // Krok 2.7: Odeslat event pro aktualizaci toolsVisibility v Layout
      try {
        window.dispatchEvent(new CustomEvent('userSettingsChanged', { 
          detail: { zobrazit_ikony_nastroju: cleanSettings.zobrazit_ikony_nastroju }
        }));
      } catch (e) {
        console.warn('Nelze odeslat userSettingsChanged event:', e);
      }

      // Krok 3: Ujisti se, že zůstaneme na záložce Nastavení po reloadu
      try {
        localStorage.setItem(`profile_active_tab_${user_id || 'default'}`, 'settings');
      } catch (e) {
        console.warn('Nelze uložit aktivní tab před reloadem:', e);
      }

      // 🔐 KROK 3.5: DELAY 1000ms - Dát localStorage čas na synchronizaci
      // KRITICKÉ: Tento delay zabrání race condition mezi save a reload
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 🔐 KROK 4: FINAL TOKEN CHECK - triple check před reloadem (stejná metoda jako předchozí checky)
      const finalTokenCheck = await loadAuthData.token();
      if (!finalTokenCheck) {
        console.error('❌ [ProfilePage] KRITICKÁ CHYBA: Token chybí těsně PŘED reloadem!');
        if (showToast) {
          showToast('Kritická chyba: Token byl ztracen před reloadem. Zůstáváte na stránce.', 'error');
        }
        setIsSavingSettings(false);
        return; // STOP - NIKDY nezreloadovat bez tokenu!
      }

      // 🔐 KROK 5: Reload aplikace pro aplikování změn
      // Pouze pokud všechny kontroly prošly!
      console.log('✅ [ProfilePage] Všechny token kontroly prošly, provádím reload...');
      window.location.reload();

    } catch (error) {
      console.error('❌ [ProfilePage] Chyba při ukládání nastavení:', error);
      if (showToast) {
        showToast('Chyba při ukládání nastavení: ' + (error.message || 'Neznámá chyba'), 'error');
      }
      setIsSavingSettings(false);
    }
  };

  // Auto-refresh localStorage on component mount
  useEffect(() => {
    const lastRefresh = localStorage.getItem('profile_last_refresh');
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // If data is older than 5 minutes, clear cache
    // ⚠️ KRITICKÉ: NEPŘEPISOVAT autentizační klíče začínající na 'auth_'
    if (!lastRefresh || (now - parseInt(lastRefresh)) > fiveMinutes) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // POUZE mazat cache klíče, NE autentizační data
        if (key && (key.includes('user') || key.includes('profile') || key.includes('organizace'))) {
          // ⚠️ SKIP autentizační klíče - NIKDY je nemazat!
          // V DEV má auth klíč prefix (např. dev_auth_*), proto kontrolujeme i substring.
          const isAuthKey = key.startsWith('auth_') || key.includes('auth_');
          const isCriticalUserKey = key === 'current_user_id' || key === 'username';
          if (isAuthKey || isCriticalUserKey) {
            continue; // Přeskočit všechny auth_* klíče a kritické identifikátory
          }
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      localStorage.setItem('profile_last_refresh', now.toString());
    }
  }, []);

  // Initialize with userDetail from context
  useEffect(() => {
    if (userDetail) {
      setProfileData(userDetail);
    }
  }, [userDetail]);

  // Load enriched profile data from NEW /user/profile endpoint
  // Tento endpoint vrací kompletní organizaci a statistiky
  // POZOR: Pokud endpoint selže, NEMĚŇ data - nech původní z AuthContext
  useEffect(() => {
    const loadEnrichedProfile = async () => {
      if (!token || !username || !userDetail) {
        return;
      }

      // 🔒 Prevent multiple simultaneous loads
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      try {
        const apiUrl = `${process.env.REACT_APP_API2_BASE_URL || '/api.eeo/'}user/profile`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            token,
            user_id: userDetail?.uzivatel_id || userDetail?.id
          })
        });

        const data = await response.json();

        // Kontrola na chybu z backendu
        if (data.status === 'error') {
          loadingRef.current = false;
          return; // Použij data z AuthContext
        }

        if (data.status === 'ok' && data.data) {

          const apiData = data.data;

          // 🎯 KRITICKÉ: Použít současné profileData pro zachování organizace pokud API nevrací
          const currentData = profileData || userDetail;

          // Kompletní merge dat podle nové API struktury
          const enrichedData = {
            // Základní identifikace
            uzivatel_id: apiData.id || currentData?.uzivatel_id,
            id: apiData.id || currentData?.id,
            login: apiData.username || currentData?.login,
            username: apiData.username || currentData?.username,

            // Jméno a kontakt
            cely_jmeno: apiData.cely_jmeno || `${apiData.jmeno || ''} ${apiData.prijmeni || ''}`.trim(),
            jmeno: apiData.jmeno || currentData?.jmeno,
            prijmeni: apiData.prijmeni || currentData?.prijmeni,
            email: apiData.email || currentData?.email,
            telefon: apiData.telefon || currentData?.telefon,

            // Tituly
            titul_pred: apiData.titul_pred || currentData?.titul_pred || '',
            titul_za: apiData.titul_za || currentData?.titul_za || null,

            // Stav a časové značky
            aktivni: apiData.aktivni ?? currentData?.aktivni ?? 1,
            dt_vytvoreni: apiData.dt_vytvoreni || currentData?.dt_vytvoreni || '',
            dt_aktualizace: apiData.dt_aktualizace || currentData?.dt_aktualizace || '',
            dt_posledni_aktivita: apiData.dt_posledni_aktivita || currentData?.dt_posledni_aktivita || '',

            // Lokalita
            lokalita_id: apiData.lokalita?.id || currentData?.lokalita_id,
            lokalita_nazev: apiData.lokalita?.nazev || currentData?.lokalita_nazev || '',
            lokalita_typ: apiData.lokalita?.typ || currentData?.lokalita_typ || '',
            lokalita_parent_id: apiData.lokalita?.parent_id || currentData?.lokalita_parent_id || null,
            lokalita: apiData.lokalita || currentData?.lokalita,

            // Pozice (z původních dat, API to nevrací)
            pozice_id: currentData?.pozice_id,
            nazev_pozice: currentData?.nazev_pozice || '',
            pozice: currentData?.pozice,

            // Úsek (z původních dat, API to nevrací)
            usek_id: currentData?.usek_id,
            usek_nazev: currentData?.usek_nazev || '',
            usek_zkr: currentData?.usek_zkr || [],
            usek: currentData?.usek,

            // 🏢 ORGANIZACE - KRITICKÉ: Zachovat pokud API nevrací, ale preferovat API data
            organizace_id: apiData.organizace?.id || currentData?.organizace_id,
            organizace: apiData.organizace ? {
              id: apiData.organizace.id,
              nazev_organizace: apiData.organizace.nazev_organizace || '',
              nazev: apiData.organizace.nazev_organizace || '', // alias pro kompatibilitu
              zkratka: apiData.organizace.zkratka || '',
              ico: apiData.organizace.ico || '',
              dic: apiData.organizace.dic || '',
              ulice_cislo: apiData.organizace.ulice_cislo || '',
              mesto: apiData.organizace.mesto || '',
              psc: apiData.organizace.psc || '',
              adresa: apiData.organizace.adresa || '',
              zastoupeny: apiData.organizace.zastoupeny || '',
              datova_schranka: apiData.organizace.datova_schranka || '',
              email: apiData.organizace.email || '',
              telefon: apiData.organizace.telefon || '',
              web: apiData.organizace.web || ''
            } : currentData?.organizace, // ✅ Zachovat existující organizaci pokud API nevrací

            // Nadřízený
            nadrizeny_cely_jmeno: apiData.nadrizeny?.cely_jmeno || currentData?.nadrizeny_cely_jmeno || '',
            nadrizeny: apiData.nadrizeny || currentData?.nadrizeny,

            // Role a práva
            roles: apiData.roles || currentData?.roles || [],
            direct_rights: apiData.direct_rights || currentData?.direct_rights || [],

            // Statistiky objednávek
            statistiky_objednavek: apiData.statistiky_objednavek || currentData?.statistiky_objednavek || {
              celkem: 0,
              aktivni: 0,
              zruseno_storno: 0,
              stavy: {}
            }
          };

          setProfileData(enrichedData);
        }
      } catch (error) {
        // Fallback - použij data z AuthContext (silence error)
      } finally {
        loadingRef.current = false;
      }
    };

    loadEnrichedProfile();
  }, [token, username, userDetail]);

  const refreshProfile = async () => {
    if (!token || !username) {
      if (showToast) {
        showToast('Nejste přihlášen - nelze aktualizovat profil', 'error');
      }
      return;
    }

    setLoading(true);
    try {
      const user_id = userDetail?.uzivatel_id || userDetail?.id;

      // ✅ Načíst čerstvá data přímo - BEZ volání refreshUserDetail
      // fetchFreshUserDetail samo načte data z BE, není potřeba invalidovat token
      const freshData = await fetchFreshUserDetail({ token, username, user_id });
      if (freshData) {
        setProfileData(freshData);
        
        if (showToast) {
          showToast('Profil byl úspěšně aktualizován z databáze', 'success');
        }
      } else {
        if (showToast) {
          showToast('Nepodařilo se načíst aktuální data profilu', 'error');
        }
      }
    } catch (error) {
      if (showToast) {
        showToast('Chyba při aktualizaci profilu: ' + (error.message || 'Neznámá chyba'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    navigate('/change-password');
  };

  // Helper funkce pro bezpečné zobrazení hodnot
  const safeDisplayValue = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.nazev) return value.nazev;
    if (typeof value === 'object' && value.name) return value.name;
    return String(value);
  };

  if (!profileData) {
    return (
      <PageContainer>
        <ProfileCard>
          <LoadingOverlay>
            <LoadingSpinner />
          </LoadingOverlay>
        </ProfileCard>
      </PageContainer>
    );
  }

  // Get user initials for avatar
  const getInitials = (profileData) => {
    if (!profileData) return 'U';
    const firstName = profileData.jmeno || '';
    const lastName = profileData.prijmeni || '';
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (lastName) return lastName[0].toUpperCase();
    if (profileData.username) return profileData.username[0].toUpperCase();
    return 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      // Kontrola, zda je datum platné
      if (isNaN(date.getTime())) {
        return null; // Vrátit null místo "Invalid Date"
      }
      return date.toLocaleDateString('cs-CZ');
    } catch {
      return null; // Vrátit null při chybě
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      // Kontrola, zda je datum platné
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toLocaleString('cs-CZ', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  // Funkce pro zalomení textu na poslední čárce
  const formatOrgNameWithBreak = (name) => {
    if (!name) return null;
    const lastCommaIndex = name.lastIndexOf(',');
    if (lastCommaIndex !== -1) {
      return (
        <>
          {name.substring(0, lastCommaIndex + 1)}
          <br />
          {name.substring(lastCommaIndex + 1).trim()}
        </>
      );
    }
    return name;
  };

  // Render permissions table
  const renderPermissionsTable = () => {
    const raw = profileData.raw || profileData;

    // Extract roles
    const candidateRoleKeys = ['roles', 'roleList', 'role', 'user_roles', 'userRoles', 'roleItems', 'roles_assigned'];
    let rolesRaw = [];

    for (const key of candidateRoleKeys) {
      if (Array.isArray(raw[key]) && raw[key].length > 0) {
        rolesRaw = raw[key];
        break;
      }
    }

    // Extract direct rights/permissions
    const directRights = profileData.direct_rights || raw.direct_rights || raw.directRights || [];

    // Helper functions
    const extractRoleName = (r) => {
      if (!r) return '';
      if (typeof r === 'string') return r;

      const nameValue = r.nazev_role || r.nazev || r.role_name || r.roleName || r.name || r.role || r.code || r.kod_role;

      // Bezpečné extrahování názvu role
      if (typeof nameValue === 'string') {
        return nameValue;
      } else if (nameValue && typeof nameValue === 'object' && nameValue.nazev) {
        return nameValue.nazev;
      } else if (nameValue && typeof nameValue === 'object') {
        return String(nameValue);
      }

      return '';
    };

    const extractPermissionsFromRole = (r) => {
      if (!r || typeof r !== 'object') return [];
      const rights = r.rights || r.permissions || r.perms || r.prava || [];
      if (!Array.isArray(rights)) return [];

      // Collect all permissions (including duplicates)
      const allPerms = [];

      rights.forEach(right => {
        let code = '';
        let desc = '';

        if (typeof right === 'string') {
          code = right;
        } else if (right && typeof right === 'object') {
          // Bezpečné extrahování kódu - zajistí, že bude string
          const codeValue = right.kod_prava || right.code || right.name || right.key;
          if (typeof codeValue === 'string') {
            code = codeValue;
          } else if (codeValue && typeof codeValue === 'object' && codeValue.nazev) {
            code = codeValue.nazev;
          } else if (codeValue && typeof codeValue === 'object') {
            code = String(codeValue);
          }

          // Bezpečné extrahování popisu
          const descValue = right.popis || right.description || right.desc;
          if (typeof descValue === 'string') {
            desc = descValue;
          } else if (descValue && typeof descValue === 'object') {
            desc = String(descValue);
          }
        }

        // Add all valid codes (including duplicates)
        if (code && typeof code === 'string') {
          allPerms.push({ code, desc });
        }
      });

      // Sort alphabetically by code
      return allPerms.sort((a, b) => a.code.localeCompare(b.code, 'cs', { sensitivity: 'base' }));
    };

    const normalizeDirectRights = (rights) => {
      if (!Array.isArray(rights)) return [];

      // Collect all permissions (including duplicates)
      const allPerms = [];

      rights.forEach(right => {
        let code = '';
        let desc = '';

        if (typeof right === 'string') {
          code = right;
        } else if (right && typeof right === 'object') {
          // Bezpečné extrahování kódu - zajistí, že bude string
          const codeValue = right.kod_prava || right.code || right.name || right.key;
          if (typeof codeValue === 'string') {
            code = codeValue;
          } else if (codeValue && typeof codeValue === 'object' && codeValue.nazev) {
            code = codeValue.nazev;
          } else if (codeValue && typeof codeValue === 'object') {
            code = String(codeValue);
          }

          // Bezpečné extrahování popisu
          const descValue = right.popis || right.description || right.desc;
          if (typeof descValue === 'string') {
            desc = descValue;
          } else if (descValue && typeof descValue === 'object') {
            desc = String(descValue);
          }
        }

        // Add all valid codes (including duplicates)
        if (code && typeof code === 'string') {
          allPerms.push({ code, desc });
        }
      });

      // Sort alphabetically by code
      return allPerms.sort((a, b) => a.code.localeCompare(b.code, 'cs', { sensitivity: 'base' }));
    };

    // Process roles
    const roleObjects = [];
    const roleNameSeen = new Set();

    rolesRaw.forEach(r => {
      const name = extractRoleName(r).trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (roleNameSeen.has(key)) return;
      roleNameSeen.add(key);

      const permissions = extractPermissionsFromRole(r);
      const roleDesc = (r && typeof r === 'object') ? (r.popis || r.Popis || r.description || r.Description || r.desc || '') : '';

      roleObjects.push({
        name,
        desc: roleDesc,
        permissions: permissions.sort((a, b) => a.code.localeCompare(b.code, 'cs', { sensitivity: 'base' }))
      });
    });

    // Process direct rights - keep all, including duplicates
    const globalPerms = normalizeDirectRights(directRights);

    // Render as tiles
    if (!roleObjects.length && !globalPerms.length) {
      return (
        <EmptyPermissions>
          Žádné role ani oprávnění nejsou přiřazeny
        </EmptyPermissions>
      );
    }

    const palette = ['#1e88e5', '#00897b', '#8e24aa', '#6d4c41', '#3949ab', '#ad1457', '#00796b', '#5d4037'];

    // Count all permission codes to detect duplicates
    const permCodeCounts = {};
    
    // Count from roles
    roleObjects.forEach(ro => {
      ro.permissions.forEach(perm => {
        const code = typeof perm.code === 'string' ? perm.code : String(perm.code || '');
        permCodeCounts[code] = (permCodeCounts[code] || 0) + 1;
      });
    });
    
    // Count from direct rights
    globalPerms.forEach(perm => {
      const code = typeof perm.code === 'string' ? perm.code : String(perm.code || '');
      permCodeCounts[code] = (permCodeCounts[code] || 0) + 1;
    });

    // Helper to check if permission code is duplicate
    const isDuplicate = (code) => {
      return (permCodeCounts[code] || 0) > 1;
    };

    // Filter permissions based on search
    const searchLower = permissionsSearch.toLowerCase().trim();
    const filterPermissions = (perms) => {
      if (!searchLower) return perms;
      return perms.filter(p => {
        const code = (typeof p.code === 'string' ? p.code : String(p.code || '')).toLowerCase();
        const desc = (typeof p.desc === 'string' ? p.desc : String(p.desc || '')).toLowerCase();
        return code.includes(searchLower) || desc.includes(searchLower);
      });
    };

    return (
      <RolesContainer>
        {/* Render roles */}
        {roleObjects.map((ro, roleIdx) => {
          const baseColor = palette[roleIdx % palette.length];
          const roleName = typeof ro.name === 'string' ? ro.name : String(ro.name || '');
          const roleDesc = typeof ro.desc === 'string' ? ro.desc : String(ro.desc || '');
          
          const filteredPerms = filterPermissions(ro.permissions);
          
          // Skip role if no permissions match search
          if (searchLower && filteredPerms.length === 0) return null;

          return (
            <RoleBlock key={`role-${roleIdx}-${roleName}`}>
              <RoleHeader>
                <div style={{ 
                  width: '4px', 
                  height: '40px', 
                  background: baseColor,
                  borderRadius: '2px'
                }} />
                <div style={{ flex: 1 }}>
                  <RoleTitle style={{ color: baseColor }}>
                    {roleName}
                  </RoleTitle>
                  {roleDesc && (
                    <RoleDescription>{roleDesc}</RoleDescription>
                  )}
                </div>
                <div style={{
                  background: baseColor + '22',
                  color: baseColor,
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  {filteredPerms.length} {filteredPerms.length === 1 ? 'oprávnění' : 'oprávnění'}
                </div>
              </RoleHeader>

              {filteredPerms.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: '#94a3b8',
                  fontStyle: 'italic'
                }}>
                  Žádná oprávnění nejsou přiřazena
                </div>
              ) : (
                <PermissionsGrid>
                  {filteredPerms.map((perm, permIdx) => {
                    const permCode = typeof perm.code === 'string' ? perm.code : String(perm.code || '');
                    const permDesc = typeof perm.desc === 'string' ? perm.desc : String(perm.desc || '');
                    const isdup = isDuplicate(permCode);
                    const dupCount = permCodeCounts[permCode] || 1;

                    return (
                      <PermissionCard 
                        key={`role-${roleIdx}-perm-${permCode}-${permIdx}`}
                        $isDuplicate={isdup}
                      >
                        {isdup && (
                          <DuplicateBadge title={`Toto právo se opakuje ${dupCount}×`}>
                            ⚠ {dupCount}×
                          </DuplicateBadge>
                        )}
                        <PermissionCode>{permCode}</PermissionCode>
                        <PermissionDescription>
                          {permDesc || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Bez popisu</span>}
                        </PermissionDescription>
                      </PermissionCard>
                    );
                  })}
                </PermissionsGrid>
              )}
            </RoleBlock>
          );
        }).filter(Boolean)}

        {/* Render direct rights */}
        {globalPerms.length > 0 && (() => {
          const filteredDirectPerms = filterPermissions(globalPerms);
          if (searchLower && filteredDirectPerms.length === 0) return null;
          
          return (
            <DirectRightsSection>
              <DirectRightsTitle>
                Přímá oprávnění ({filteredDirectPerms.length})
              </DirectRightsTitle>
              <PermissionsGrid>
                {filteredDirectPerms.map((p, directIdx) => {
                  const permCode = typeof p.code === 'string' ? p.code : String(p.code || '');
                  const permDesc = typeof p.desc === 'string' ? p.desc : String(p.desc || '');
                  const isdup = isDuplicate(permCode);
                  const dupCount = permCodeCounts[permCode] || 1;

                  return (
                    <PermissionCard 
                      key={`direct-perm-${directIdx}-${permCode}`} 
                      style={{ borderColor: '#fbbf24' }}
                      $isDuplicate={isdup}
                    >
                      {isdup && (
                        <DuplicateBadge title={`Toto právo se opakuje ${dupCount}×`}>
                          ⚠ {dupCount}×
                        </DuplicateBadge>
                      )}
                      <PermissionCode style={{ color: '#d97706' }}>{permCode}</PermissionCode>
                      <PermissionDescription>
                        {permDesc || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Bez popisu</span>}
                      </PermissionDescription>
                    </PermissionCard>
                  );
                })}
              </PermissionsGrid>
            </DirectRightsSection>
          );
        })()}
      </RolesContainer>
    );
  };

  return (
    <>
    <PageContainer>
      <ContentWrapper>
        {/* Hlavní banner s informacemi o uživateli */}
        <ProfileCard>
          {loading && (
            <LoadingOverlay>
              <LoadingSpinner />
            </LoadingOverlay>
          )}

          <ProfileHeader>
            <HeaderTop>
              <HeaderTitle>
                <PageTitle style={{ margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    filter: 'brightness(0) invert(1) drop-shadow(0 0 3px rgba(255,255,255,0.9))',
                    marginRight: '0.25rem',
                    fontSize: '2.07rem',
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: '1'
                  }}>👤</span>
                  Profil uživatele
                  {profileData?.aktivni !== undefined && (
                    <StatusBadgeLarge active={profileData.aktivni} style={{ marginLeft: '1rem', fontSize: '0.875rem' }}>
                      {profileData.aktivni ? 'Aktivní účet' : 'Neaktivní účet'}
                    </StatusBadgeLarge>
                  )}
                </PageTitle>
                {profileData && (
                  <PageSubtitle style={{ marginTop: '0.5rem' }}>
                    <strong>
                      {profileData.titul_pred && `${safeDisplayValue(profileData.titul_pred)} `}
                      {safeDisplayValue(profileData.jmeno)} {safeDisplayValue(profileData.prijmeni)}
                      {profileData.titul_za && `, ${safeDisplayValue(profileData.titul_za)}`}
                    </strong>
                    {profileData.nazev_pozice && (
                      <span> • {safeDisplayValue(profileData.nazev_pozice)}</span>
                    )}
                    {(profileData.lokalita_nazev?.nazev || profileData.lokalita_nazev) && (
                      <span> • {safeDisplayValue(profileData.lokalita_nazev?.nazev || profileData.lokalita_nazev)}</span>
                    )}
                    {profileData.usek_nazev && (
                      <span> • {safeDisplayValue(profileData.usek_nazev)}</span>
                    )}
                    {profileData.email && (
                      <span> • 📧 {safeDisplayValue(profileData.email)}</span>
                    )}
                    {profileData.telefon && (
                      <span> • 📞 {safeDisplayValue(profileData.telefon)}</span>
                    )}
                    {profileData.dt_posledni_aktivita && (
                      <span> • Poslední aktivita: {formatDateTime(profileData.dt_posledni_aktivita)}</span>
                    )}
                  </PageSubtitle>
                )}
              </HeaderTitle>

              {profileData && (
                <ActionButtons>
                  <ActionButton
                    onClick={refreshProfile}
                    disabled={loading}
                    $loading={loading}
                    title="Obnovit údaje profilu a organizace"
                  >
                    <RefreshCw size={20} />
                  </ActionButton>
                  <ActionButton
                    onClick={handleChangePassword}
                    title="Změnit heslo"
                  >
                    <Key size={20} />
                  </ActionButton>
                </ActionButtons>
              )}
            </HeaderTop>
          </ProfileHeader>
        </ProfileCard>

        {/* Tabbed Navigation */}
        <TabsContainer>
          <TabNavigation>
            <TabButton 
              $active={activeTab === 'info'} 
              onClick={() => setActiveTab('info')}
            >
              <Info size={20} />
              <span>Info o uživateli</span>
            </TabButton>
            <TabButton 
              $active={activeTab === 'permissions'} 
              onClick={() => setActiveTab('permissions')}
            >
              <Shield size={20} />
              <span>Role a oprávnění</span>
            </TabButton>
            {hasPermission && (hasPermission('SUPPLIER_VIEW') || hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_MANAGE')) && (
              <TabButton 
                $active={activeTab === 'suppliers'} 
                onClick={() => setActiveTab('suppliers')}
              >
                <Building size={20} />
                <span>Adresář dodavatelů</span>
              </TabButton>
            )}
            <TabButton 
              $active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={20} />
              <span>Nastavení</span>
            </TabButton>
          </TabNavigation>

          {/* Tab Content - Info o uživateli */}
          <TabContent $active={activeTab === 'info'}>
            {/* První řádek: 3 sloupce - flexibilní layout */}
            <InfoSection style={{ gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr) minmax(400px, 1.5fr)' }}>
            {/* Sloupec 1: Základní + Pracovní údaje (27%) */}
            <InfoCard>
              <CardTitle>
                <User size={20} />
                Základní údaje
              </CardTitle>

              <InfoItem>
                <InfoIcon color="#3b82f6">
                  <IdCard size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Uživatelské jméno</InfoLabel>
                  <InfoValue>
                    {safeDisplayValue(profileData.username) || <EmptyValue>Neuvedeno</EmptyValue>}
                    {(profileData.uzivatel_id || profileData.id) && (
                      <sup style={{
                        fontSize: '0.7em',
                        marginLeft: '0.3rem',
                        color: '#94a3b8',
                        fontWeight: '500'
                      }}>
                        #{safeDisplayValue(profileData.uzivatel_id || profileData.id)}
                      </sup>
                    )}
                  </InfoValue>
                </InfoContent>
              </InfoItem>

              {profileData.titul_pred && (
                <InfoItem>
                  <InfoIcon color="#8b5cf6">
                    <User size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Titul před jménem</InfoLabel>
                    <InfoValue>{safeDisplayValue(profileData.titul_pred)}</InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              <InfoItem>
                <InfoIcon color="#10b981">
                  <User size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Jméno a Příjmení</InfoLabel>
                  <InfoValue>
                    {safeDisplayValue(profileData.jmeno) || ''} {safeDisplayValue(profileData.prijmeni) || ''}
                    {!profileData.jmeno && !profileData.prijmeni && <EmptyValue>Neuvedeno</EmptyValue>}
                  </InfoValue>
                </InfoContent>
              </InfoItem>

              {profileData.titul_za && (
                <InfoItem>
                  <InfoIcon color="#f97316">
                    <User size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Titul za jménem</InfoLabel>
                    <InfoValue>{safeDisplayValue(profileData.titul_za)}</InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              <InfoItem>
                <InfoIcon color="#f59e0b">
                  <Mail size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>E-mail</InfoLabel>
                  <InfoValue>{safeDisplayValue(profileData.email) || <EmptyValue>Neuvedeno</EmptyValue>}</InfoValue>
                </InfoContent>
              </InfoItem>

              <InfoItem>
                <InfoIcon color="#8b5cf6">
                  <Phone size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Telefon</InfoLabel>
                  <InfoValue>{safeDisplayValue(profileData.telefon) || <EmptyValue>Neuvedeno</EmptyValue>}</InfoValue>
                </InfoContent>
              </InfoItem>

              {/* Pracovní údaje - pokračování základních údajů */}
              {profileData.nazev_pozice && (
                <InfoItem>
                  <InfoIcon color="#3b82f6">
                    <IdCard size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Pozice</InfoLabel>
                    <InfoValue>{safeDisplayValue(profileData.nazev_pozice)}</InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              <InfoItem>
                <InfoIcon color="#f97316">
                  <Shield size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Role</InfoLabel>
                  <InfoValue>
                    {profileData.roles && Array.isArray(profileData.roles) && profileData.roles.length > 0
                      ? profileData.roles.map(role => role && role.nazev_role ? safeDisplayValue(role.nazev_role) : safeDisplayValue(role)).join(', ')
                      : <EmptyValue>Žádné role</EmptyValue>
                    }
                  </InfoValue>
                </InfoContent>
              </InfoItem>

              <InfoItem>
                <InfoIcon color="#06b6d4">
                  <Building size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Úsek</InfoLabel>
                  <InfoValue>
                    {profileData.usek_zkr && (
                      Array.isArray(profileData.usek_zkr) && profileData.usek_zkr.length > 0
                        ? profileData.usek_zkr.join(', ')
                        : typeof profileData.usek_zkr === 'string'
                        ? safeDisplayValue(profileData.usek_zkr)
                        : ''
                    )}
                    {!profileData.usek_zkr && <EmptyValue>Neuvedeno</EmptyValue>}
                  </InfoValue>
                  {(profileData.usek_nazev || profileData.usek_popis) && (
                    <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {safeDisplayValue(profileData.usek_nazev)}
                      {profileData.usek_nazev && profileData.usek_popis && ' - '}
                      {safeDisplayValue(profileData.usek_popis)}
                    </div>
                  )}
                </InfoContent>
              </InfoItem>

              <InfoItem>
                <InfoIcon color="#ef4444">
                  <MapPin size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Lokalita</InfoLabel>
                  <InfoValue>{safeDisplayValue(profileData.lokalita_nazev) || <EmptyValue>Neuvedeno</EmptyValue>}</InfoValue>
                </InfoContent>
              </InfoItem>

              {profileData.lokalita_typ && (
                <InfoItem>
                  <InfoIcon color="#14b8a6">
                    <Building size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Typ lokality</InfoLabel>
                    <InfoValue>{safeDisplayValue(profileData.lokalita_typ)}</InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              {/* Sekce "Přímá oprávnění" odstraněna dle požadavku uživatele */}

              {profileData.nadrizeny_cely_jmeno && (
                <InfoItem>
                  <InfoIcon color="#ec4899">
                    <User size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Nadřízený</InfoLabel>
                    <InfoValue>{safeDisplayValue(profileData.nadrizeny_cely_jmeno)}</InfoValue>
                  </InfoContent>
                </InfoItem>
              )}
              
            </InfoCard>

            {/* Sloupec 2: Aktivita účtu */}
            <CardWithChart>
              <CardContent>
                <CardTitle>
                  <TrendingUp size={20} />
                  Aktivita účtu
                </CardTitle>

              <InfoItem>
                <InfoIcon color="#6366f1">
                  <Calendar size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Datum vytvoření</InfoLabel>
                  <InfoValue>
                    {formatDate(profileData.dt_vytvoreni) || <EmptyValue>Neuvedeno</EmptyValue>}
                  </InfoValue>
                </InfoContent>
              </InfoItem>

              <InfoItem>
                <InfoIcon color="#ec4899">
                  <Calendar size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Poslední aktualizace</InfoLabel>
                  <InfoValue>
                    {formatDate(profileData.dt_aktualizace) || <EmptyValue>Neuvedeno</EmptyValue>}
                  </InfoValue>
                </InfoContent>
              </InfoItem>

              {profileData.dt_posledni_aktivita && (
                <InfoItem>
                  <InfoIcon color="#10b981">
                    <Calendar size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Poslední aktivita</InfoLabel>
                    <InfoValue>
                      {formatDateTime(profileData.dt_posledni_aktivita)}
                    </InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              <SectionDivider />

              <InfoItem>
                <InfoIcon color="#3b82f6">
                  <FileText size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Celkem objednávek (jako objednatel)</InfoLabel>
                  <InfoValue>
                    {orderStats.total}
                  </InfoValue>
                </InfoContent>
              </InfoItem>

              <InfoItem>
                <InfoIcon color="#10b981">
                  <TrendingUp size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Aktivních objednávek</InfoLabel>
                  <InfoValue>
                    {orderStats.active}
                  </InfoValue>
                </InfoContent>
              </InfoItem>

              {orderStats.stavy?.ke_schvaleni > 0 && (
                <InfoItem>
                  <InfoIcon color="#f59e0b">
                    <Clock size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Ke schválení</InfoLabel>
                    <InfoValue>
                      {orderStats.stavy.ke_schvaleni}
                    </InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              {orderStats.stavy?.schvalena > 0 && (
                <InfoItem>
                  <InfoIcon color="#10b981">
                    <CheckCircle size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Schválené</InfoLabel>
                    <InfoValue>
                      {orderStats.stavy.schvalena}
                    </InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              {orderStats.stavy?.odeslana > 0 && (
                <InfoItem>
                  <InfoIcon color="#3b82f6">
                    <Send size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Odesláno dodavateli</InfoLabel>
                    <InfoValue>
                      {orderStats.stavy.odeslana}
                    </InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              {(() => {
                const zamitnute = orderStats.stavy?.zamitnuta || 0;
                const zrusene = orderStats.stavy?.zrusena || 0;
                const celkem = zamitnute + zrusene;

                return celkem > 0 && (
                  <InfoItem>
                    <InfoIcon color="#ef4444">
                      <XCircle size={16} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Zamítnuté / Zrušené</InfoLabel>
                      <InfoValue>
                        {celkem}
                      </InfoValue>
                    </InfoContent>
                  </InfoItem>
                );
              })()}

              {orderStats.stavy?.archivovano > 0 && (
                <InfoItem>
                  <InfoIcon color="#64748b">
                    <Archive size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Archivováno</InfoLabel>
                    <InfoValue>
                      {orderStats.stavy.archivovano}
                    </InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              {orderStats.stavy?.dokoncena > 0 && (
                <InfoItem>
                  <InfoIcon color="#059669">
                    <CheckCircle size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Dokončené</InfoLabel>
                    <InfoValue>
                      {orderStats.stavy.dokoncena}
                    </InfoValue>
                  </InfoContent>
                </InfoItem>
              )}

              <InfoItem>
                <InfoIcon color="#8b5cf6">
                  <Shield size={16} />
                </InfoIcon>
                <InfoContent>
                  <InfoLabel>Objednávky jako garant</InfoLabel>
                  <InfoValue>
                    {orderStats.celkem_garant}
                  </InfoValue>
                </InfoContent>
              </InfoItem>
              </CardContent>

              {/* Koláčový graf v rohu */}
              <PieChartContainer>
                {(() => {
                  // Všechny možné stavy s rozlišenými barvami
                  const allStates = [
                    { label: 'Nová', value: orderStats.stavy?.nova || 0, color: '#06b6d4' },
                    { label: 'Ke schválení', value: orderStats.stavy?.ke_schvaleni || 0, color: '#f59e0b' },
                    { label: 'Schválené', value: orderStats.stavy?.schvalena || 0, color: '#10b981' },
                    { label: 'Rozpracovaná', value: orderStats.stavy?.rozpracovana || 0, color: '#f97316' },
                    { label: 'Odesláno', value: orderStats.stavy?.odeslana || 0, color: '#3b82f6' },
                    { label: 'Potvrzená', value: orderStats.stavy?.potvrzena || 0, color: '#14b8a6' },
                    { label: 'Uveřejněná', value: orderStats.stavy?.uverejnena || 0, color: '#6366f1' },
                    { label: 'Čeká potvrzení', value: orderStats.stavy?.ceka_potvrzeni || 0, color: '#eab308' },
                    { label: 'Dokončené', value: orderStats.stavy?.dokoncena || 0, color: '#059669' },
                    { label: 'Věcná správnost', value: orderStats.stavy?.vecna_spravnost || 0, color: '#8b5cf6' },
                    { label: 'Zkontrolovaná', value: orderStats.stavy?.zkontrolovana || 0, color: '#22c55e' },
                    { label: 'Zamítnuté', value: orderStats.stavy?.zamitnuta || 0, color: '#ef4444' },
                    { label: 'Zrušené', value: orderStats.stavy?.zrusena || 0, color: '#dc2626' },
                    { label: 'Archivováno', value: orderStats.stavy?.archivovano || 0, color: '#64748b' },
                    { label: 'Jako garant', value: orderStats.celkem_garant || 0, color: '#a855f7' }
                  ];
                  
                  const chartData = allStates.filter(item => item.value > 0);

                  // Použít celkový počet ze statistiky
                  const total = orderStats.total || 0;
                  const active = orderStats.active || 0;
                  const chartTotal = chartData.reduce((sum, item) => sum + item.value, 0);
                  
                  if (total === 0) return null;

                  let cumulativePercent = 0;
                  
                  const createArc = (startPercent, endPercent) => {
                    const startAngle = startPercent * 2 * Math.PI;
                    const endAngle = endPercent * 2 * Math.PI;
                    const largeArc = endPercent - startPercent > 0.5 ? 1 : 0;
                    
                    const x1 = 135 + 120 * Math.cos(startAngle - Math.PI / 2);
                    const y1 = 135 + 120 * Math.sin(startAngle - Math.PI / 2);
                    const x2 = 135 + 120 * Math.cos(endAngle - Math.PI / 2);
                    const y2 = 135 + 120 * Math.sin(endAngle - Math.PI / 2);
                    
                    return `M 135 135 L ${x1} ${y1} A 120 120 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  };

                  return (
                    <PieChartSvg viewBox="0 0 270 270">
                      {chartData.map((item, idx) => {
                        const percent = item.value / chartTotal;
                        const startPercent = cumulativePercent;
                        cumulativePercent += percent;
                        
                        // Vypočítat střed výseče pro popisek
                        const midPercent = (startPercent + cumulativePercent) / 2;
                        const midAngle = midPercent * 2 * Math.PI - Math.PI / 2;
                        const labelRadius = 95;
                        const labelX = 135 + labelRadius * Math.cos(midAngle);
                        const labelY = 135 + labelRadius * Math.sin(midAngle);
                        
                        return (
                          <g key={idx}>
                            <path
                              d={createArc(startPercent, cumulativePercent)}
                              fill={item.color}
                              stroke="white"
                              strokeWidth="2"
                              opacity="0.9"
                            >
                              <title>{`${item.label}: ${item.value}`}</title>
                            </path>
                            {/* Popisek stavu */}
                            <text
                              x={labelX}
                              y={labelY}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight="700"
                              fill="white"
                              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                            >
                              {item.value}
                            </text>
                          </g>
                        );
                      })}
                      <circle cx="135" cy="135" r="50" fill="white" opacity="0.95" />
                      {/* Celkem */}
                      <text
                        x="135"
                        y="130"
                        textAnchor="middle"
                        fontSize="32"
                        fontWeight="700"
                        fill="#1e293b"
                      >
                        {total}
                      </text>
                      {/* Aktivní */}
                      <text
                        x="135"
                        y="155"
                        textAnchor="middle"
                        fontSize="24"
                        fontWeight="600"
                        fill="#10b981"
                      >
                        {active}
                      </text>
                    </PieChartSvg>
                  );
                })()}
              </PieChartContainer>
            </CardWithChart>

            {/* Sloupec 3: Organizace */}
            <InfoCard>
              <CardTitle>
                <Building2 size={20} />
                Informace o organizaci
              </CardTitle>

              {profileData.organizace ? (
                <>
                  <InfoItem>
                    <InfoIcon color="#3b82f6">
                      <Building2 size={16} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Název organizace</InfoLabel>
                      <InfoValue>{formatOrgNameWithBreak(profileData.organizace?.nazev_organizace)}</InfoValue>
                    </InfoContent>
                  </InfoItem>

                  {profileData.organizace?.adresa && (
                    <InfoItem>
                      <InfoIcon color="#ef4444">
                        <MapPin size={16} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Adresa</InfoLabel>
                        <InfoValue>{safeDisplayValue(profileData.organizace.adresa)}</InfoValue>
                      </InfoContent>
                    </InfoItem>
                  )}

                  <InfoItem>
                    <InfoIcon color="#10b981">
                      <Hash size={16} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>IČO</InfoLabel>
                      <InfoValue>{safeDisplayValue(profileData.organizace?.ico)}</InfoValue>
                    </InfoContent>
                  </InfoItem>

                  {profileData.organizace?.dic && (
                    <InfoItem>
                      <InfoIcon color="#6366f1">
                        <Hash size={16} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>DIČ</InfoLabel>
                        <InfoValue>{safeDisplayValue(profileData.organizace.dic)}</InfoValue>
                      </InfoContent>
                    </InfoItem>
                  )}

                  {profileData.organizace.zastoupeny && (
                    <InfoItem>
                      <InfoIcon color="#8b5cf6">
                        <User size={16} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Zastoupena</InfoLabel>
                        <InfoValue>{safeDisplayValue(profileData.organizace?.zastoupeny)}</InfoValue>
                      </InfoContent>
                    </InfoItem>
                  )}

                  <InfoItem>
                    <InfoIcon color="#f59e0b">
                      <Mail size={16} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>E-mail</InfoLabel>
                      <InfoValue>{safeDisplayValue(profileData.organizace?.email) || <EmptyValue>-</EmptyValue>}</InfoValue>
                    </InfoContent>
                  </InfoItem>

                  <InfoItem>
                    <InfoIcon color="#8b5cf6">
                      <Phone size={16} />
                    </InfoIcon>
                    <InfoContent>
                      <InfoLabel>Telefon</InfoLabel>
                      <InfoValue>{safeDisplayValue(profileData.organizace?.telefon) || <EmptyValue>-</EmptyValue>}</InfoValue>
                    </InfoContent>
                  </InfoItem>

                  {profileData.organizace.datova_schranka && (
                    <InfoItem>
                      <InfoIcon color="#06b6d4">
                        <MessageSquare size={16} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Datová schránka</InfoLabel>
                        <InfoValue>{safeDisplayValue(profileData.organizace?.datova_schranka)}</InfoValue>
                      </InfoContent>
                    </InfoItem>
                  )}

                  {profileData.organizace.web && (
                    <InfoItem>
                      <InfoIcon color="#3b82f6">
                        <Hash size={16} />
                      </InfoIcon>
                      <InfoContent>
                        <InfoLabel>Web</InfoLabel>
                        <InfoValue>
                          <a href={profileData.organizace.web} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                            {safeDisplayValue(profileData.organizace.web)}
                          </a>
                        </InfoValue>
                      </InfoContent>
                    </InfoItem>
                  )}
                </>
              ) : (
                <InfoItem>
                  <InfoIcon color="#64748b">
                    <Building2 size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Organizace</InfoLabel>
                    <InfoValue><EmptyValue>Informace o organizaci nejsou dostupné</EmptyValue></InfoValue>
                  </InfoContent>
                </InfoItem>
              )}
            </InfoCard>
            </InfoSection>
          </TabContent>

          {/* Tab Content - Role a práva */}
          <TabContent $active={activeTab === 'permissions'}>
            <PermissionsHeader>
              <PermissionsTitle style={{ margin: 0 }}>
                <Shield size={20} />
                Oprávnění a role uživatele
              </PermissionsTitle>
              <SearchBoxWrapper>
                <SearchIcon>
                  <Search size={18} />
                </SearchIcon>
                <SearchBox
                  type="text"
                  placeholder="Vyhledat oprávnění..."
                  value={permissionsSearch}
                  onChange={(e) => setPermissionsSearch(e.target.value)}
                />
                {permissionsSearch && (
                  <ClearButton onClick={() => setPermissionsSearch('')} title="Vymazat">
                    <X size={16} />
                  </ClearButton>
                )}
              </SearchBoxWrapper>
            </PermissionsHeader>
            {renderPermissionsTable()}
          </TabContent>

          {/* Tab Content - Adresář dodavatelů */}
          {hasPermission && (hasPermission('SUPPLIER_VIEW') || hasPermission('SUPPLIER_EDIT') || hasPermission('SUPPLIER_MANAGE')) && (() => {
            // Admini mají automaticky plný přístup
            const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
              role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
            );
            
            let permLevel = 'READ'; // Default
            
            if (isAdmin || hasPermission('SUPPLIER_MANAGE')) {
              permLevel = 'MANAGE';
            } else if (hasPermission('SUPPLIER_EDIT')) {
              permLevel = 'EDIT';
            }
            
            return (
              <TabContent $active={activeTab === 'suppliers'}>
                <SuppliersContainer>
                  <ContactManagement 
                    contactType="suppliers"
                    permissionLevel={permLevel}
                    userDetail={userDetail}
                    showToast={showToast}
                  />
                </SuppliersContainer>
              </TabContent>
            );
          })()}

          {/* Tab Content - Nastavení */}
          <TabContent $active={activeTab === 'settings'}>
            <SettingsContainer>
              
              {/* Tlačítko pro uložení a aplikování nastavení */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end',
                marginBottom: '2rem'
              }}>
                <SaveButton 
                  onClick={saveAndApplySettings}
                  disabled={isSavingSettings}
                  style={{
                    minWidth: '280px',
                    maxWidth: '400px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    fontSize: '1.1rem',
                    padding: '1rem 2rem',
                    opacity: isSavingSettings ? 0.7 : 1,
                    cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 16px rgba(59, 130, 246, 0.4)',
                    border: 'none'
                  }}
                >
                  {isSavingSettings ? (
                    <>
                      <SpinningIcon><RefreshCw size={20} style={{ marginRight: '0.75rem' }} /></SpinningIcon>
                      Ukládám a aplikuji...
                    </>
                  ) : (
                    <>
                      <Save size={20} style={{ marginRight: '0.75rem' }} />
                      Uložit a aplikovat nastavení
                    </>
                  )}
                </SaveButton>
              </div>

              {/* Sekce 1: Chování aplikace */}
              <SettingsSection>
                <SettingsSectionTitle>
                  <SettingsSectionTitleContent>
                    <Sliders size={22} />
                    Chování a předvolby aplikace
                  </SettingsSectionTitleContent>
                  <CollapseIconButton onClick={() => toggleSection('chovani')} $collapsed={collapsedSections.chovani}>
                    <ChevronDown size={20} />
                  </CollapseIconButton>
                </SettingsSectionTitle>

                <CollapsibleContent $collapsed={collapsedSections.chovani}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
                  
                  {/* LEVÝ SLOUPEC - CHECKBOXY */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '2rem', borderRight: '1px solid #e5e7eb' }}>
                    {/* Pamatovat filtry */}
                    <ToggleSettingItem>
                      <ToggleSettingLabel>
                        <ToggleSettingTitle>Zapamatovat si nastavené filtry</ToggleSettingTitle>
                        <SettingDescription>
                          Po odhlášení zůstanou zachovány všechny nastavené filtry v seznamech
                        </SettingDescription>
                      </ToggleSettingLabel>
                      <ToggleSwitch>
                        <input
                          type="checkbox"
                          checked={userSettings.zapamatovat_filtry}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'zapamatovat_filtry', value: e.target.checked } })}
                        />
                        <span></span>
                      </ToggleSwitch>
                    </ToggleSettingItem>

                    {/* Automaticky sbalit zamčené sekce */}
                    <ToggleSettingItem>
                      <ToggleSettingLabel>
                        <ToggleSettingTitle>Automaticky sbalit zamčené sekce v objednávkách</ToggleSettingTitle>
                        <SettingDescription>
                          Při načtení objednávky se automaticky sbalí sekce, které jsou v dané fázi zamčené/neaktivní a formulář se posune na aktivní sekci. Platí pro rozpracované objednávky (ne pro Dokončené, Zamítnuté či Stornované).
                        </SettingDescription>
                      </ToggleSettingLabel>
                      <ToggleSwitch>
                        <input
                          type="checkbox"
                          checked={userSettings.auto_sbalit_zamcene_sekce}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'auto_sbalit_zamcene_sekce', value: e.target.checked } })}
                        />
                        <span></span>
                      </ToggleSwitch>
                    </ToggleSettingItem>

                    {/* Oddělovač */}
                    <div style={{ height: '1px', background: '#e5e7eb', margin: '1rem 0' }}></div>

                    {/* Tenký oddělovač místo nadpisu */}
                    <div style={{ height: '1px', background: '#e5e7eb', margin: '1rem 0' }}></div>

                    {/* Grid 2 sloupce pro checkboxy nástrojů */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '1rem',
                      marginBottom: '1rem' 
                    }}>
                      {/* Notes */}
                      <ToggleSettingItem>
                        <ToggleSettingLabel>
                          <ToggleSettingTitle>📝 Poznámky (Notes)</ToggleSettingTitle>
                          <SettingDescription>
                            Zobrazit ikonu pro rychlé poznámky
                          </SettingDescription>
                        </ToggleSettingLabel>
                        <ToggleSwitch>
                          <input
                            type="checkbox"
                            checked={userSettings.zobrazit_ikony_nastroju.notes}
                            onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_NESTED_FIELD, payload: { parent: 'zobrazit_ikony_nastroju', field: 'notes', value: e.target.checked } })}
                          />
                          <span></span>
                        </ToggleSwitch>
                      </ToggleSettingItem>

                      {/* TODO */}
                      <ToggleSettingItem>
                        <ToggleSettingLabel>
                          <ToggleSettingTitle>✅ TODO seznam</ToggleSettingTitle>
                          <SettingDescription>
                            Zobrazit ikonu pro seznam úkolů
                          </SettingDescription>
                        </ToggleSettingLabel>
                        <ToggleSwitch>
                          <input
                            type="checkbox"
                            checked={userSettings.zobrazit_ikony_nastroju.todo}
                            onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_NESTED_FIELD, payload: { parent: 'zobrazit_ikony_nastroju', field: 'todo', value: e.target.checked } })}
                          />
                          <span></span>
                        </ToggleSwitch>
                      </ToggleSettingItem>

                      {/* Chat - pouze pro ADMIN role editovatelné */}
                      {(() => {
                        const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
                          role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
                        );
                        
                        return (
                          <ToggleSettingItem>
                            <ToggleSettingLabel>
                              <ToggleSettingTitle>💬 Chat</ToggleSettingTitle>
                              <SettingDescription>
                                {isAdmin 
                                  ? 'Zobrazit ikonu pro chat' 
                                  : 'Chat je dostupný pouze pro administrátory'}
                              </SettingDescription>
                            </ToggleSettingLabel>
                            <ToggleSwitch>
                              <input
                                type="checkbox"
                                checked={isAdmin ? userSettings.zobrazit_ikony_nastroju.chat : false}
                                disabled={!isAdmin}
                                onChange={(e) => {
                                  if (isAdmin) {
                                    dispatch({ type: SETTINGS_ACTIONS.UPDATE_NESTED_FIELD, payload: { parent: 'zobrazit_ikony_nastroju', field: 'chat', value: e.target.checked } });
                                  }
                                }}
                              />
                              <span></span>
                            </ToggleSwitch>
                          </ToggleSettingItem>
                        );
                      })()}

                      {/* Kalkulačka */}
                      <ToggleSettingItem>
                        <ToggleSettingLabel>
                          <ToggleSettingTitle>🧮 Kalkulačka</ToggleSettingTitle>
                          <SettingDescription>
                            Zobrazit ikonu pro kalkulačku
                          </SettingDescription>
                        </ToggleSettingLabel>
                        <ToggleSwitch>
                          <input
                            type="checkbox"
                            checked={userSettings.zobrazit_ikony_nastroju.kalkulacka}
                            onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_NESTED_FIELD, payload: { parent: 'zobrazit_ikony_nastroju', field: 'kalkulacka', value: e.target.checked } })}
                          />
                          <span></span>
                        </ToggleSwitch>
                      </ToggleSettingItem>

                      {/* Helper avatar - pouze pro uživatele s oprávněním HELPER_VIEW */}
                      {hasPermission('HELPER_VIEW') && (
                        <ToggleSettingItem>
                          <ToggleSettingLabel>
                            <ToggleSettingTitle>🤖 Helper avatar</ToggleSettingTitle>
                            <SettingDescription>
                              Zobrazit pomocníka s tipy
                            </SettingDescription>
                          </ToggleSettingLabel>
                          <ToggleSwitch>
                            <input
                              type="checkbox"
                              checked={userSettings.zobrazit_ikony_nastroju.helper ?? true}
                              onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_NESTED_FIELD, payload: { parent: 'zobrazit_ikony_nastroju', field: 'helper', value: e.target.checked } })}
                            />
                            <span></span>
                          </ToggleSwitch>
                        </ToggleSettingItem>
                      )}
                    </div>
                  </div>

                  {/* PRAVÝ SLOUPEC - SELECTY */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Výchozí garant */}
                    <SettingItem>
                      <SettingLabel>
                        Výchozí garant
                      </SettingLabel>
                      <CustomSelect
                        icon={<User size={16} />}
                        value={userSettings.vychozi_garant_id || ''}
                        onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'vychozi_garant_id', value: e.target.value || '' } })}
                        options={[
                          { value: '', label: '-- Žádný (nevybírat automaticky) --' },
                          ...activeUsers.map(u => ({
                            value: u.id || u.user_id,
                            label: `${u.titul_pred ? u.titul_pred + ' ' : ''}${u.jmeno || ''} ${u.prijmeni || ''}${u.titul_za ? ', ' + u.titul_za : ''}`.trim() || u.username || u.login
                          }))
                        ]}
                        placeholder="Vyberte garanta..."
                        field="vychozi_garant_id"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                      <SettingDescription>
                        Automaticky předvybrán při vytvoření nové objednávky
                      </SettingDescription>
                    </SettingItem>

                    {/* Výchozí příkazce */}
                    <SettingItem>
                      <SettingLabel>
                        Výchozí schvalovatel/příkazce
                      </SettingLabel>
                      <CustomSelect
                        icon={<User size={16} />}
                        value={userSettings.vychozi_prikazce_id || ''}
                        onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'vychozi_prikazce_id', value: e.target.value || '' } })}
                        options={[
                          { value: '', label: '-- Žádný (nevybírat automaticky) --' },
                          ...approvers.map(u => ({
                            value: u.id || u.user_id,
                            label: `${u.titul_pred ? u.titul_pred + ' ' : ''}${u.jmeno || ''} ${u.prijmeni || ''}${u.titul_za ? ', ' + u.titul_za : ''}`.trim() || u.username || u.login
                          }))
                        ]}
                        placeholder="Vyberte příkazce..."
                        field="vychozi_prikazce_id"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                      <SettingDescription>
                        Automaticky předvybrán při vytvoření nové objednávky (jen schvalovatelé)
                      </SettingDescription>
                    </SettingItem>

                    {/* Oddělovač */}
                    <div style={{ height: '1px', background: '#e5e7eb', margin: '1.5rem 0' }}></div>

                    {/* Výchozí menu záložka */}
                    <SettingItem>
                      <SettingLabel>
                        Výchozí sekce po přihlášení
                      </SettingLabel>
                      <CustomSelect
                        icon={<Layout size={16} />}
                        value={userSettings.vychozi_sekce_po_prihlaseni || 'orders'}
                        onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'vychozi_sekce_po_prihlaseni', value: e.target.value } })}
                        options={MENU_TAB_OPTIONS}
                        placeholder="Vyberte sekci..."
                        field="vychozi_sekce_po_prihlaseni"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                      <SettingDescription>
                        Určete, která sekce se zobrazí automaticky po přihlášení
                      </SettingDescription>
                    </SettingItem>

                    {/* Výchozí filtr stavu objednávek - MULTISELECT */}
                    <SettingItem>
                      <SettingLabel>
                        Výchozí filtry stavů objednávek (můžete vybrat více)
                      </SettingLabel>
                      <MultiSelectLocal
                        field="vychozi_filtry_stavu_objednavek"
                        value={userSettings.vychozi_filtry_stavu_objednavek || []}
                        onChange={(newValue) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'vychozi_filtry_stavu_objednavek', value: newValue } })}
                        options={orderStatesList.map(status => ({
                          value: status.nazev_stavu || status.nazev || status.kod_stavu,
                          kod: status.kod_stavu || status.id,
                          kod_stavu: status.kod_stavu || status.id,
                          label: status.nazev_stavu || status.nazev || status.kod_stavu,
                          nazev: status.nazev_stavu || status.nazev,
                          nazev_stavu: status.nazev_stavu || status.nazev,
                          id: status.id
                        }))}
                        placeholder="Vyberte stavy..."
                        icon={<FontAwesomeIcon icon={faList} />}
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                      />
                      <SettingDescription>
                        Při otevření Seznamu objednávek budou automaticky nastaveny tyto filtry (můžete vybrat více stavů)
                      </SettingDescription>
                    </SettingItem>

                    {/* Výchozí rok */}
                    <SettingItem>
                      <SettingLabel>
                        Výchozí rok
                      </SettingLabel>
                      <CustomSelect
                        icon={<Calendar size={16} />}
                        value={userSettings.vychozi_rok || 'current'}
                        onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'vychozi_rok', value: e.target.value } })}
                        options={YEAR_OPTIONS}
                        placeholder="Vyberte rok..."
                        field="vychozi_rok"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                      <SettingDescription>
                        Výchozí rok pro filtrování dat (použije se aktuální rok systému nebo konkrétní rok)
                      </SettingDescription>
                    </SettingItem>

                    {/* Výchozí období */}
                    <SettingItem>
                      <SettingLabel>
                        Výchozí období (měsíc)
                      </SettingLabel>
                      <CustomSelect
                        icon={<Calendar size={16} />}
                        value={userSettings.vychozi_obdobi || 'last-quarter'}
                        onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'vychozi_obdobi', value: e.target.value } })}
                        options={PERIOD_OPTIONS}
                        placeholder="Vyberte období..."
                        field="vychozi_obdobi"
                        selectStates={selectStates}
                        setSelectStates={setSelectStates}
                        searchStates={searchStates}
                        setSearchStates={setSearchStates}
                        touchedSelectFields={touchedSelectFields}
                        setTouchedSelectFields={setTouchedSelectFields}
                        toggleSelect={toggleSelect}
                        filterOptions={filterOptions}
                        getOptionLabel={getOptionLabel}
                      />
                      <SettingDescription>
                        Výchozí měsíc pro filtrování dat (všechny měsíce nebo konkrétní měsíc v roce)
                      </SettingDescription>
                    </SettingItem>
                  </div>

                </div>
                </CollapsibleContent>
              </SettingsSection>

              {/* Sekce 2: Notifikace - granulární matice per workflow stav × kanál */}
              <SettingsSection>
                <SettingsSectionTitle>
                  <SettingsSectionTitleContent>
                    <Bell size={22} />
                    Nastavení notifikací
                  </SettingsSectionTitleContent>
                  <CollapseIconButton onClick={() => toggleSection('notifikace')} $collapsed={collapsedSections.notifikace}>
                    <ChevronDown size={20} />
                  </CollapseIconButton>
                </SettingsSectionTitle>
                <CollapsibleContent $collapsed={collapsedSections.notifikace}>

                  {/* 🚧 VÝRAZNÉ INFO - NEIMPLEMENTOVÁNO */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '10px',
                    marginBottom: '1.25rem',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
                  }}>
                    <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚧</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#92400e', marginBottom: '0.25rem' }}>
                        Tato sekce je zatím pouze vizuální náhled
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#a16207', lineHeight: 1.4 }}>
                        Granulární nastavení notifikací podle typu události <strong>není dosud propojeno s backendem</strong>.
                        Změny se uloží do vašeho profilu, ale zatím neovlivní doručování notifikací.
                        Plná implementace bude nasazena v příští verzi.
                      </div>
                    </div>
                  </div>

                  <SettingDescription style={{ marginBottom: '1rem' }}>
                    Nastavte si, jaké notifikace chcete dostávat. Vaše preference mohou pouze omezit notifikace,
                    které vám systém odesílá na základě organizační hierarchie — nemohou přidat nové.
                  </SettingDescription>

                  <NotifInfoBanner>
                    <Info size={18} />
                    <p>
                      Notifikace jsou primárně řízeny <strong>organizační hierarchií</strong> vaší organizace.
                      Tato nastavení vám umožňují ztišit konkrétní typy událostí nebo kanály.
                      Pokud vám systém neposílá notifikace pro určitý modul, zapnutí zde nic nezmění.
                    </p>
                  </NotifInfoBanner>

                  {/* Hlavní přepínače kanálů */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                    
                    {/* In-app notifikace */}
                    <ToggleSettingItem>
                      <ToggleSettingLabel>
                        <ToggleSettingTitle>Notifikace v aplikaci</ToggleSettingTitle>
                        <SettingDescription>
                          Zobrazovat v aplikaci (ikona zvonečku vpravo nahoře).
                        </SettingDescription>
                      </ToggleSettingLabel>
                      <ToggleSwitch>
                        <input
                          type="checkbox"
                          checked={userSettings.notifikace.inapp_povoleny}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_NESTED_FIELD, payload: { parent: 'notifikace', field: 'inapp_povoleny', value: e.target.checked } })}
                        />
                        <span></span>
                      </ToggleSwitch>
                    </ToggleSettingItem>

                    {/* Email notifikace */}
                    <ToggleSettingItem>
                      <ToggleSettingLabel>
                        <ToggleSettingTitle>Notifikace emailem</ToggleSettingTitle>
                        <SettingDescription>
                          Zasílat na: <strong>{userDetail?.email || 'není k dispozici'}</strong>
                        </SettingDescription>
                      </ToggleSettingLabel>
                      <ToggleSwitch>
                        <input
                          type="checkbox"
                          checked={userSettings.notifikace.email_povoleny}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_NESTED_FIELD, payload: { parent: 'notifikace', field: 'email_povoleny', value: e.target.checked } })}
                        />
                        <span></span>
                      </ToggleSwitch>
                    </ToggleSettingItem>

                  </div>

                  {/* Detailní matice per workflow stav × kanál */}
                  <div style={{ borderTop: '2px solid #e9ecef', paddingTop: '1.5rem' }}>
                    <SettingDescription style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>
                      Detailní nastavení podle typu události
                    </SettingDescription>
                    <SettingDescription style={{ marginBottom: '1rem' }}>
                      Rozbalte kategorii a zvolte, které konkrétní události chcete sledovat.
                      Vypnutý hlavní kanál (výše) automaticky zablokuje všechny události v daném kanálu.
                    </SettingDescription>

                    {Object.entries(NOTIFICATION_CATEGORIES_CONFIG).map(([catKey, catConfig]) => {
                      // Filtruj podle oprávnění uživatele (admin vidí vše)
                      const hasAccess = catConfig.permissionCheck(hasPermission);
                      if (!hasAccess && !isAdmin) return null;

                      const isCatExpanded = !collapsedSections[`notif_${catKey}`];
                      const categoryEvents = Object.entries(NOTIFICATION_EVENT_TYPES_CONFIG)
                        .filter(([, evt]) => evt.category === catKey);

                      // Stav "toggle all" pro každý kanál v kategorii
                      const allEmailChecked = categoryEvents.every(([evtKey]) =>
                        userSettings.notifikace.workflow_detaily?.[evtKey]?.email !== false
                      );
                      const allInappChecked = categoryEvents.every(([evtKey]) =>
                        userSettings.notifikace.workflow_detaily?.[evtKey]?.inapp !== false
                      );
                      const someEmailChecked = categoryEvents.some(([evtKey]) =>
                        userSettings.notifikace.workflow_detaily?.[evtKey]?.email !== false
                      );
                      const someInappChecked = categoryEvents.some(([evtKey]) =>
                        userSettings.notifikace.workflow_detaily?.[evtKey]?.inapp !== false
                      );

                      const categoryIcon =
                        catConfig.icon === 'ShoppingCart' ? <ShoppingCart size={16} style={{ color: catConfig.color }} /> :
                        catConfig.icon === 'FileText' ? <FileText size={16} style={{ color: catConfig.color }} /> :
                        catConfig.icon === 'Shield' ? <Shield size={16} style={{ color: catConfig.color }} /> :
                        catConfig.icon === 'Coins' ? <Coins size={16} style={{ color: catConfig.color }} /> :
                        null;

                      return (
                        <NotifMatrixCategory key={catKey}>
                          <NotifCategoryHeader
                            $expanded={isCatExpanded}
                            onClick={() => toggleSection(`notif_${catKey}`)}
                          >
                            <NotifCategoryTitle $expanded={isCatExpanded}>
                              <ChevronDown size={14} />
                              {categoryIcon}
                              {catConfig.label}
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 400 }}>
                                ({categoryEvents.length})
                              </span>
                            </NotifCategoryTitle>
                            <NotifCategoryHeaderCheckboxes onClick={(e) => e.stopPropagation()}>
                              <NotifHeaderCheckbox>
                                <input
                                  type="checkbox"
                                  checked={allEmailChecked}
                                  ref={(el) => { if (el) el.indeterminate = !allEmailChecked && someEmailChecked; }}
                                  disabled={!userSettings.notifikace.email_povoleny}
                                  onChange={(e) => dispatch({
                                    type: SETTINGS_ACTIONS.TOGGLE_ALL_WORKFLOW_CATEGORY,
                                    payload: { prefix: catConfig.prefix, channel: 'email', value: e.target.checked }
                                  })}
                                />
                                Email
                              </NotifHeaderCheckbox>
                              <NotifHeaderCheckbox>
                                <input
                                  type="checkbox"
                                  checked={allInappChecked}
                                  ref={(el) => { if (el) el.indeterminate = !allInappChecked && someInappChecked; }}
                                  disabled={!userSettings.notifikace.inapp_povoleny}
                                  onChange={(e) => dispatch({
                                    type: SETTINGS_ACTIONS.TOGGLE_ALL_WORKFLOW_CATEGORY,
                                    payload: { prefix: catConfig.prefix, channel: 'inapp', value: e.target.checked }
                                  })}
                                />
                                V app
                              </NotifHeaderCheckbox>
                            </NotifCategoryHeaderCheckboxes>
                          </NotifCategoryHeader>

                          <NotifEventsContainer $expanded={isCatExpanded}>
                            <NotifColumnHeaders>
                              <div>Událost</div>
                              <div style={{ textAlign: 'center' }}>Email</div>
                              <div style={{ textAlign: 'center' }}>V app</div>
                            </NotifColumnHeaders>
                            {categoryEvents.map(([evtKey, evtConfig]) => {
                              const detail = userSettings.notifikace.workflow_detaily?.[evtKey] || { email: true, inapp: true };
                              return (
                                <NotifEventRow key={evtKey}>
                                  <NotifEventLabel title={evtConfig.description}>
                                    {evtConfig.label}
                                  </NotifEventLabel>
                                  <NotifCheckboxCell $disabled={!userSettings.notifikace.email_povoleny}>
                                    <input
                                      type="checkbox"
                                      checked={detail.email !== false}
                                      disabled={!userSettings.notifikace.email_povoleny}
                                      onChange={(e) => dispatch({
                                        type: SETTINGS_ACTIONS.UPDATE_WORKFLOW_DETAIL,
                                        payload: { eventType: evtKey, channel: 'email', value: e.target.checked }
                                      })}
                                    />
                                  </NotifCheckboxCell>
                                  <NotifCheckboxCell $disabled={!userSettings.notifikace.inapp_povoleny}>
                                    <input
                                      type="checkbox"
                                      checked={detail.inapp !== false}
                                      disabled={!userSettings.notifikace.inapp_povoleny}
                                      onChange={(e) => dispatch({
                                        type: SETTINGS_ACTIONS.UPDATE_WORKFLOW_DETAIL,
                                        payload: { eventType: evtKey, channel: 'inapp', value: e.target.checked }
                                      })}
                                    />
                                  </NotifCheckboxCell>
                                </NotifEventRow>
                              );
                            })}
                          </NotifEventsContainer>
                        </NotifMatrixCategory>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </SettingsSection>

              {/* Sekce 3: Viditelnost dlaždic */}
              <SettingsSection>
                <SettingsSectionTitle>
                  <SettingsSectionTitleContent>
                    <Layout size={22} />
                    Zobrazení stavových dlaždic
                  </SettingsSectionTitleContent>
                  <CollapseIconButton onClick={() => toggleSection('dlazice')} $collapsed={collapsedSections.dlazice}>
                    <ChevronDown size={20} />
                  </CollapseIconButton>
                </SettingsSectionTitle>
                <CollapsibleContent $collapsed={collapsedSections.dlazice}>
                <SettingDescription style={{ marginBottom: '1rem' }}>
                  Vyberte, které stavové dlaždice se budou zobrazovat na Seznamu objednávek. Nezaškrtnuté dlaždice budou skryty.
                </SettingDescription>

                <TilesGrid>
                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.nova}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'nova' })}
                    />
                    <span>📝 Nová / Koncept</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.ke_schvaleni}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'ke_schvaleni' })}
                    />
                    <span>📋 Ke schválení</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.schvalena}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'schvalena' })}
                    />
                    <span>👍 Schválená</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.zamitnuta}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'zamitnuta' })}
                    />
                    <span>❌ Zamítnutá</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.rozpracovana}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'rozpracovana' })}
                    />
                    <span>⬇️ Rozpracovaná</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.odeslana_dodavateli}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'odeslana_dodavateli' })}
                    />
                    <span>📤 Odeslaná dodavateli</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.potvrzena_dodavatelem}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'potvrzena_dodavatelem' })}
                    />
                    <span>✔️ Potvrzená dodavatelem</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.k_uverejneni_do_registru}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'k_uverejneni_do_registru' })}
                    />
                    <span>📊 Má být zveřejněna</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.uverejnena}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'uverejnena' })}
                    />
                    <span>📢 Uveřejněná</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.ceka_na_potvrzeni}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'ceka_na_potvrzeni' })}
                    />
                    <span>⏸️ Čeká na potvrzení</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.ceka_se}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'ceka_se' })}
                    />
                    <span>⏸️ Čeká se</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.vecna_spravnost}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'vecna_spravnost' })}
                    />
                    <span>✅ Věcná správnost</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.dokoncena}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'dokoncena' })}
                    />
                    <span>🎯 Dokončená</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.zrusena}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'zrusena' })}
                    />
                    <span>🚫 Zrušená</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.smazana}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'smazana' })}
                    />
                    <span>🗑️ Smazaná</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.archivovano}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'archivovano' })}
                    />
                    <span>📦 Archivováno / Import</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.s_fakturou}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 's_fakturou' })}
                    />
                    <span>📄 S fakturou</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.s_prilohami}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 's_prilohami' })}
                    />
                    <span>📎 S přílohami</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.mimoradne_udalosti}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'mimoradne_udalosti' })}
                    />
                    <span><FontAwesomeIcon icon={faBoltLightning} style={{ color: '#dc2626' }} /> Mimořádné události</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.moje_objednavky}
                      onChange={() => dispatch({ type: SETTINGS_ACTIONS.TOGGLE_TILE, payload: 'moje_objednavky' })}
                    />
                    <span>👤 Moje objednávky</span>
                  </TileCheckbox>
                </TilesGrid>
                </CollapsibleContent>
              </SettingsSection>

              {/* Sekce 4: Export a data */}
              <SettingsSection>
                <SettingsSectionTitle>
                  <SettingsSectionTitleContent>
                    <Download size={22} />
                    Export a formáty dat
                  </SettingsSectionTitleContent>
                  <CollapseIconButton onClick={() => toggleSection('export')} $collapsed={collapsedSections.export}>
                    <ChevronDown size={20} />
                  </CollapseIconButton>
                </SettingsSectionTitle>

                <CollapsibleContent $collapsed={collapsedSections.export}>
                <div style={{ marginBottom: '2rem' }}>
                  <SettingLabel style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '600' }}>
                    📊 Struktura CSV exportu objednávek
                  </SettingLabel>
                  <SettingDescription style={{ marginBottom: '1.5rem' }}>
                    Vyberte sloupce, které budou zahrnuty do CSV exportu ze Seznamu objednávek. Data se exportují z enriched API endpointu s kompletními informacemi.
                  </SettingDescription>

                  {/* Základní identifikace */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #3b82f6' }}>
                      🔖 Základní identifikace
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.id} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'id' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>ID objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} id {'}'} = 11308</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.cislo_objednavky} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'cislo_objednavky' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Číslo objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} cislo_objednavky {'}'} = "O-1767/75030926/2025/IT"</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Předmět a popis */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #10b981' }}>
                      📝 Předmět a popis
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.predmet} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'predmet' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Předmět objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} predmet {'}'} = "Test timezony"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.poznamka} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'poznamka' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámka</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} poznamka {'}'}</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Stavy a workflow */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #f59e0b' }}>
                      ⚡ Stavy a workflow
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_objednavky} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'stav_objednavky' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Stav objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} stav_objednavky {'}'} = "Dokončená"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_workflow} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'stav_workflow' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Workflow stavy (enriched)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.stav_workflow[].nazev_stavu {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_komentar} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'stav_komentar' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Komentář ke stavu</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} stav_komentar {'}'}</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Datumy */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #8b5cf6' }}>
                      📅 Datumy a termíny
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_objednavky} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_objednavky' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_objednavky {'}'} = "2025-11-16 19:23:44"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_vytvoreni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_vytvoreni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum vytvoření</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_vytvoreni {'}'} = "2025-11-14 19:41:59"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_schvaleni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_schvaleni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum schválení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_schvaleni {'}'} = "2025-11-14 19:42:24"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_odeslani} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_odeslani' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum odeslání</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_odeslani {'}'} = "2025-11-14 19:50:57"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_akceptace} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_akceptace' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum akceptace</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_akceptace {'}'} = "2025-11-16 18:13:10"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_zverejneni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_zverejneni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum zveřejnění</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_zverejneni {'}'} = "2025-11-30 17:42:59"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_predpokladany_termin_dodani} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_predpokladany_termin_dodani' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Předpokl. termín dodání</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_predpokladany_termin_dodani {'}'} = "2025-11-16"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_aktualizace} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_aktualizace' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum poslední aktualizace</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_aktualizace {'}'} = "2025-11-16 19:23:44"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_dokonceni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dt_dokonceni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum dokončení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_dokonceni {'}'} = "2026-01-15 10:30:00"</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Finanční údaje */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #ef4444' }}>
                      💰 Finanční údaje
                    </div>
                    <SettingDescription style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      DB pole: max_cena_s_dph, financovani (JSON), pojistna_udalost_cislo, cislo_smlouvy. Zahrnuje LP kódy, pojisťovací údaje a smlouvy.
                    </SettingDescription>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.max_cena_s_dph} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'max_cena_s_dph' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Max. cena s DPH</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} max_cena_s_dph {'}'} = 75000.00</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_lp_kody} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'financovani_lp_kody' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>LP kódy</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Kódy limitovaných příslibů z JSON</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_lp_nazvy} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'financovani_lp_nazvy' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>LP názvy</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Názvy limitovaných příslibů</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_lp_cisla} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'financovani_lp_cisla' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>LP čísla</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Čísla limitovaných příslibů</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_typ} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'financovani_typ' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Typ financování</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Typ z financovani JSON (LP, IT, atd.)</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_typ_nazev} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'financovani_typ_nazev' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Název typu financování</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Lidsky čitelný název typu</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.pojistna_udalost_cislo} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'pojistna_udalost_cislo' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Číslo pojistné události</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Číslo pojistné události - PU-456</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.pojistna_udalost_poznamka} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'pojistna_udalost_poznamka' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámka k pojisťovacím údajům</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Poznámka k pojistné události</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.cislo_smlouvy} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'cislo_smlouvy' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Číslo smlouvy</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Číslo smlouvy pro individuální schválení</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.individualni_schvaleni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'individualni_schvaleni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Individuální schválení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Ano/Ne - individuální schválení</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.individualni_poznamka} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'individualni_poznamka' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámka k individuálnímu schválení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>Poznámka k individualizovanému schválení</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_raw} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'financovani_raw' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Financování (raw JSON)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} financovani {'}'} - původní JSON z DB</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Odpovědné osoby - podle DB foreign keys */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #06b6d4' }}>
                      👥 Odpovědné osoby (enriched z JOINů na 25_uzivatele)
                    </div>
                    <SettingDescription style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      DB foreign keys: uzivatel_id, garant_uzivatel_id, schvalovatel_id, prikazce_id, odesilatel_id, dokoncil_id, fakturant_id, zverejnil_id
                    </SettingDescription>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.uzivatel} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'uzivatel' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Objednatel (hlavní uživatel)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} uzivatel_id → 25_uzivatele {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.uzivatel_email} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'uzivatel_email' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Objednatel email</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.uzivatel.email {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.uzivatel_telefon} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'uzivatel_telefon' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Objednatel telefon</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.uzivatel.telefon {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.garant_uzivatel} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'garant_uzivatel' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Garant</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} garant_uzivatel_id → 25_uzivatele {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.garant_uzivatel_email} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'garant_uzivatel_email' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Garant email</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.garant_uzivatel.email {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.garant_uzivatel_telefon} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'garant_uzivatel_telefon' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Garant telefon</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.garant_uzivatel.telefon {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.schvalovatel} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'schvalovatel' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Schvalovatel</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} schvalovatel_id → 25_uzivatele {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.schvalovatel_email} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'schvalovatel_email' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Schvalovatel email</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.schvalovatel.email {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.schvalovatel_telefon} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'schvalovatel_telefon' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Schvalovatel telefon</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.schvalovatel.telefon {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prikazce} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prikazce' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Příkazce</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prikazce_id → 25_uzivatele {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prikazce_email} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prikazce_email' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Příkazce email</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.prikazce.email {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prikazce_telefon} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prikazce_telefon' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Příkazce telefon</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.prikazce.telefon {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.vytvoril_uzivatel} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'vytvoril_uzivatel' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Vytvořil uživatel</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} enriched.vytvoril_uzivatel.jmeno {'}'} (CREATE audit)</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.odesilatel} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'odesilatel' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Odesílatel</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} odesilatel_id → 25_uzivatele {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dokoncil} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dokoncil' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Dokončil</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dokoncil_id → 25_uzivatele {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.fakturant} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'fakturant' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Fakturant</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} fakturant_id → 25_uzivatele {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zverejnil_uzivatel} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'zverejnil_uzivatel' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Zveřejnil</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} zverejnil_id → 25_uzivatele {'}'}</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Dodavatel */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #ec4899' }}>
                      🏢 Dodavatel (enriched data)
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_nazev} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dodavatel_nazev' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Název dodavatele</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.nazev {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_ico} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dodavatel_ico' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>IČO dodavatele</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.ico {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_dic} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dodavatel_dic' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>DIČ dodavatele</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.dic {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_adresa} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dodavatel_adresa' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Adresa dodavatele</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.adresa {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_zastoupeny} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dodavatel_zastoupeny' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Zastoupen kým</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.zastoupeny {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_kontakt_jmeno} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dodavatel_kontakt_jmeno' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kontaktní osoba</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.kontakt_jmeno {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_kontakt_email} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dodavatel_kontakt_email' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kontaktní email</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.kontakt_email {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_kontakt_telefon} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dodavatel_kontakt_telefon' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kontaktní telefon</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.kontakt_telefon {'}'}</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Střediska a struktura */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #84cc16' }}>
                      🏛️ Střediska a struktura
                    </div>
                    <SettingDescription style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      DB pole: strediska_kod (text), druh_objednavky_kod, stav_workflow_kod, mimoradna_udalost
                    </SettingDescription>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.strediska_kod} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'strediska_kod' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Střediska (kódy z DB)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} strediska_kod {'}'} = "[100,400]"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.strediska_nazvy} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'strediska_nazvy' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Střediska (enriched názvy)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>JOIN s 25_useky pro lidsky čitelné názvy</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.druh_objednavky_kod} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'druh_objednavky_kod' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Druh objednávky kód</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} druh_objednavky_kod {'}'} = "DODAVKA_ZBOZI"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_workflow_kod} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'stav_workflow_kod' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Workflow stav kód</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} stav_workflow_kod {'}'} = "SCHVALENA"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.mimoradna_udalost} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'mimoradna_udalost' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Mimořádná událost</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} mimoradna_udalost {'}'} (tinyint) = Ano/Ne</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Položky objednávky */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #f97316' }}>
                      📦 Položky objednávky
                    </div>
                    <SettingDescription style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      Příklad položky: <code style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>"Dodání síťových prvků a natžení infrastrukry", bez DPH: 60537.19 Kč, DPH 21%, s DPH: 73250.00 Kč, úsek: 100, budova: 200, místnost: 300</code>
                    </SettingDescription>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.pocet_polozek} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'pocet_polozek' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Počet položek</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky_count {'}'} = 1</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_celkova_cena_s_dph} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_celkova_cena_s_dph' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Celková cena položek s DPH</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky_celkova_cena_s_dph {'}'} = 73250</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_popis} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_popis' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Popisy položek (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].popis {'}'} = ["Dodání síťových prvků..."]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_cena_bez_dph} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_cena_bez_dph' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Ceny bez DPH (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].cena_bez_dph {'}'} = ["60537.19"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_sazba_dph} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_sazba_dph' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Sazby DPH % (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].sazba_dph {'}'} = ["21"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_cena_s_dph} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_cena_s_dph' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Ceny s DPH (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].cena_s_dph {'}'} = ["73250.00"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_usek_kod} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_usek_kod' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kódy úseků (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].usek_kod {'}'} = ["100"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_budova_kod} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_budova_kod' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kódy budov (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].budova_kod {'}'} = ["200"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_mistnost_kod} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_mistnost_kod' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kódy místností (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].mistnost_kod {'}'} = ["300"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_poznamka} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_poznamka' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámky k položkám (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].poznamka {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_poznamka_umisteni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'polozky_poznamka_umisteni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámky k umístění (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].poznamka_umisteni {'}'}</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Přílohy */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #6366f1' }}>
                      📎 Přílohy objednávky
                    </div>
                    <SettingDescription style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      Příklad přílohy: <code style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>GUID: "2025-11-16_bf5231392f...", Typ: "DOKLAD", Název: "ReportData-2025-11-06-21-23-15.xlsx", Velikost: 2664 B, Nahrál: "Super ADMIN"</code>
                    </SettingDescription>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_count} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prilohy_count' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Počet příloh</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy_count {'}'} = 3</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_guid} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prilohy_guid' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>GUID příloh (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].guid {'}'} = ["2025-11-16_bf523139...", ...]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_typ} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prilohy_typ' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Typy příloh (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].typ_prilohy {'}'} = ["DOKLAD", "POTVRZENA_OBJEDNAVKA", "JINE"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_nazvy} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prilohy_nazvy' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Názvy souborů (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].originalni_nazev_souboru {'}'} = ["ReportData-2025-11-06...", ...]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_velikosti} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prilohy_velikosti' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Velikosti souborů v B (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].velikost_souboru_b {'}'} = ["2664", "2645", "83682"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_nahrano_uzivatel} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prilohy_nahrano_uzivatel' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Nahráli uživatelé (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].nahrano_uzivatel_celne_jmeno {'}'} = ["Super ADMIN", ...]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_dt_vytvoreni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'prilohy_dt_vytvoreni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Data vytvoření příloh (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].dt_vytvoreni {'}'} = ["2025-11-16 18:02:31", ...]</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Faktury */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #8b5cf6' }}>
                      🧾 Faktury
                    </div>
                    <SettingDescription style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                      Příklad faktury: <code style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Číslo VEMA: "250100528", Částka: 39480.00 Kč, Vystavení: 2025-09-08, Splatnost: 2025-09-23, Doručení: 2025-11-16, Střediska: ["100", "400"], Příloh: 1</code>
                    </SettingDescription>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_count} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_count' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Počet faktur</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury_count {'}'} = 1</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_celkova_castka_s_dph} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_celkova_castka_s_dph' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Celková částka faktur s DPH</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury_celkova_castka_s_dph {'}'} = 39480</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_cisla_vema} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_cisla_vema' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Čísla faktur VEMA (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_cislo_vema {'}'} = ["250100528"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_castky} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_castky' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Částky faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_castka {'}'} = ["39480.00"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_datum_vystaveni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_datum_vystaveni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Data vystavení faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_datum_vystaveni {'}'} = ["2025-09-08"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_datum_splatnosti} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_datum_splatnosti' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Data splatnosti faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_datum_splatnosti {'}'} = ["2025-09-23"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_datum_doruceni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_datum_doruceni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Data doručení faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_datum_doruceni {'}'} = ["2025-11-16"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_strediska} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_strediska' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Střediska faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_strediska_kod {'}'} = [["100", "400"]]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_poznamka} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_poznamka' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámky faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_poznamka {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_pocet_priloh} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_pocet_priloh' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Počty příloh k fakturám (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].prilohy.length {'}'} = [1]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_dorucena} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'faktury_dorucena' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Faktury doručeny (ANO/NE)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_dorucena {'}'} = ["1"]</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Potvrzení a odeslání */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #14b8a6' }}>
                      ✅ Potvrzení a odeslání
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_odeslano} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'stav_odeslano' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Stav odeslání</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} stav_odeslano {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.potvrzeno_dodavatelem} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'potvrzeno_dodavatelem' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Potvrzeno dodavatelem</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} potvrzeno_dodavatelem {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zpusob_potvrzeni} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'zpusob_potvrzeni' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Způsob potvrzení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} zpusob_potvrzeni {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zpusob_platby} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'zpusob_platby' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Způsob platby</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} zpusob_platby {'}'}</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Registr smluv */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #a855f7' }}>
                      📜 Registr smluv
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zverejnit_registr_smluv} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'zverejnit_registr_smluv' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Zveřejnit v registru</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} zverejnit_registr_smluv {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.registr_iddt} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'registr_iddt' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>ID registru smluv</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} registr_iddt {'}'}</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Ostatní */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #64748b' }}>
                      📋 Ostatní informace
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zaruka} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'zaruka' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Záruka</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} zaruka {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.misto_dodani} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'misto_dodani' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Místo dodání</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} misto_dodani {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.schvaleni_komentar} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'schvaleni_komentar' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Komentář ke schválení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} schvaleni_komentar {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dokonceni_poznamka} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'dokonceni_poznamka' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámka k dokončení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dokonceni_poznamka {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.potvrzeni_dokonceni_objednavky} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'potvrzeni_dokonceni_objednavky' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Potvrzení dokončení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} potvrzeni_dokonceni_objednavky {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.potvrzeni_vecne_spravnosti} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'potvrzeni_vecne_spravnosti' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Potvrzení věcné správnosti</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} potvrzeni_vecne_spravnosti {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.vecna_spravnost_poznamka} onChange={() => dispatch({ type: SETTINGS_ACTIONS.UPDATE_CSV_COLUMN, payload: { column: 'vecna_spravnost_poznamka' } })} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámka k věcné správnosti</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} vecna_spravnost_poznamka {'}'}</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* CSV Oddělovače - grid 2 sloupce */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', marginTop: '2rem' }}>
                    
                    {/* CSV Oddělovač sloupců */}
                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
                        ⚙️ CSV Oddělovač sloupců
                      </div>
                      <SettingDescription style={{ marginBottom: '1rem' }}>
                        Vyberte znak, který bude oddělovat sloupce v exportovaném CSV souboru. Středník (;) je doporučený pro Excel.
                      </SettingDescription>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '6px', background: userSettings.exportCsvDelimiter === 'semicolon' ? '#eff6ff' : 'transparent', border: userSettings.exportCsvDelimiter === 'semicolon' ? '2px solid #3b82f6' : '2px solid transparent' }}>
                        <input
                          type="radio"
                          name="csvDelimiter"
                          value="semicolon"
                          checked={userSettings.exportCsvDelimiter === 'semicolon'}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvDelimiter', value: e.target.value } })}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvDelimiter === 'semicolon' ? '600' : '400' }}>
                          <strong>Středník (;)</strong> - doporučeno pro Excel
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '6px', background: userSettings.exportCsvDelimiter === 'tab' ? '#eff6ff' : 'transparent', border: userSettings.exportCsvDelimiter === 'tab' ? '2px solid #3b82f6' : '2px solid transparent' }}>
                        <input
                          type="radio"
                          name="csvDelimiter"
                          value="tab"
                          checked={userSettings.exportCsvDelimiter === 'tab'}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvDelimiter', value: e.target.value } })}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvDelimiter === 'tab' ? '600' : '400' }}>
                          <strong>Tabulátor (→)</strong> - TSV formát
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '6px', background: userSettings.exportCsvDelimiter === 'pipe' ? '#eff6ff' : 'transparent', border: userSettings.exportCsvDelimiter === 'pipe' ? '2px solid #3b82f6' : '2px solid transparent' }}>
                        <input
                          type="radio"
                          name="csvDelimiter"
                          value="pipe"
                          checked={userSettings.exportCsvDelimiter === 'pipe'}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvDelimiter', value: e.target.value } })}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvDelimiter === 'pipe' ? '600' : '400' }}>
                          <strong>Svislá čára (|)</strong> - alternativa pro složitá data
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '6px', background: userSettings.exportCsvDelimiter === 'custom' ? '#eff6ff' : 'transparent', border: userSettings.exportCsvDelimiter === 'custom' ? '2px solid #3b82f6' : '2px solid transparent' }}>
                        <input
                          type="radio"
                          name="csvDelimiter"
                          value="custom"
                          checked={userSettings.exportCsvDelimiter === 'custom'}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvDelimiter', value: e.target.value } })}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvDelimiter === 'custom' ? '600' : '400' }}>
                          <strong>Vlastní znak:</strong>
                        </span>
                        <input
                          type="text"
                          value={userSettings.exportCsvCustomDelimiter || ''}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvCustomDelimiter', value: e.target.value.slice(0, 3) } })}
                          disabled={userSettings.exportCsvDelimiter !== 'custom'}
                          placeholder="Zadejte znak..."
                          maxLength={3}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            width: '100px',
                            background: userSettings.exportCsvDelimiter === 'custom' ? '#ffffff' : '#f3f4f6',
                            color: userSettings.exportCsvDelimiter === 'custom' ? '#1f2937' : '#9ca3af'
                          }}
                        />
                      </label>
                      </div>

                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', fontSize: '0.85rem', color: '#92400e' }}>
                        ⚠️ <strong>Poznámka:</strong> Čárka (,) se nedoporučuje, protože je běžně součástí dat (desetinná místa, adresy).
                      </div>
                    </div>

                    {/* CSV Oddělovač seznamů */}
                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem' }}>
                        📋 CSV Oddělovač pro seznamy (multi-value fields)
                      </div>
                      <SettingDescription style={{ marginBottom: '1rem' }}>
                        Vyberte znak pro oddělení položek v rámci jedné buňky (např. seznam položek, středisek, příloh). 
                        <br />
                        <strong>Příklad:</strong> <code style={{ background: '#e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                          ev.cislo-0001;Jan Novák;Položka 1{userSettings.exportCsvListDelimiter === 'pipe' ? '|' : userSettings.exportCsvListDelimiter === 'comma' ? ',' : userSettings.exportCsvListDelimiter === 'semicolon' ? ';' : userSettings.exportCsvListCustomDelimiter || '|'}Položka 2;25000
                        </code>
                      </SettingDescription>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.5rem', 
                        cursor: 'pointer', 
                        borderRadius: '6px', 
                        background: userSettings.exportCsvListDelimiter === 'pipe' ? '#eff6ff' : 'transparent', 
                        border: userSettings.exportCsvListDelimiter === 'pipe' ? '2px solid #3b82f6' : '2px solid transparent',
                        opacity: userSettings.exportCsvDelimiter === 'pipe' ? 0.5 : 1,
                        pointerEvents: userSettings.exportCsvDelimiter === 'pipe' ? 'none' : 'auto'
                      }}>
                        <input
                          type="radio"
                          name="csvListDelimiter"
                          value="pipe"
                          checked={userSettings.exportCsvListDelimiter === 'pipe'}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvListDelimiter', value: e.target.value } })}
                          disabled={userSettings.exportCsvDelimiter === 'pipe'}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvListDelimiter === 'pipe' ? '600' : '400' }}>
                          <strong>Svislá čára (|)</strong> - doporučeno {userSettings.exportCsvDelimiter === 'pipe' && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>(použito jako hlavní oddělovač!)</span>}
                        </span>
                      </label>

                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.5rem', 
                        cursor: 'pointer', 
                        borderRadius: '6px', 
                        background: userSettings.exportCsvListDelimiter === 'comma' ? '#eff6ff' : 'transparent', 
                        border: userSettings.exportCsvListDelimiter === 'comma' ? '2px solid #3b82f6' : '2px solid transparent'
                      }}>
                        <input
                          type="radio"
                          name="csvListDelimiter"
                          value="comma"
                          checked={userSettings.exportCsvListDelimiter === 'comma'}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvListDelimiter', value: e.target.value } })}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvListDelimiter === 'comma' ? '600' : '400' }}>
                          <strong>Čárka (,)</strong> - běžné pro seznamy
                        </span>
                      </label>

                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.5rem', 
                        cursor: 'pointer', 
                        borderRadius: '6px', 
                        background: userSettings.exportCsvListDelimiter === 'semicolon' ? '#eff6ff' : 'transparent', 
                        border: userSettings.exportCsvListDelimiter === 'semicolon' ? '2px solid #3b82f6' : '2px solid transparent',
                        opacity: userSettings.exportCsvDelimiter === 'semicolon' ? 0.5 : 1,
                        pointerEvents: userSettings.exportCsvDelimiter === 'semicolon' ? 'none' : 'auto'
                      }}>
                        <input
                          type="radio"
                          name="csvListDelimiter"
                          value="semicolon"
                          checked={userSettings.exportCsvListDelimiter === 'semicolon'}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvListDelimiter', value: e.target.value } })}
                          disabled={userSettings.exportCsvDelimiter === 'semicolon'}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvListDelimiter === 'semicolon' ? '600' : '400' }}>
                          <strong>Středník (;)</strong> {userSettings.exportCsvDelimiter === 'semicolon' && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>(použito jako hlavní oddělovač!)</span>}
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '6px', background: userSettings.exportCsvListDelimiter === 'custom' ? '#eff6ff' : 'transparent', border: userSettings.exportCsvListDelimiter === 'custom' ? '2px solid #3b82f6' : '2px solid transparent' }}>
                        <input
                          type="radio"
                          name="csvListDelimiter"
                          value="custom"
                          checked={userSettings.exportCsvListDelimiter === 'custom'}
                          onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvListDelimiter', value: e.target.value } })}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvListDelimiter === 'custom' ? '600' : '400' }}>
                          <strong>Vlastní znak:</strong>
                        </span>
                        <input
                          type="text"
                          value={userSettings.exportCsvListCustomDelimiter || ''}
                          onChange={(e) => {
                            const newValue = e.target.value.slice(0, 3);
                            // Kontrola kolize s hlavním oddělovačem
                            const mainDelimiter = userSettings.exportCsvDelimiter === 'semicolon' ? ';' : 
                                                 userSettings.exportCsvDelimiter === 'tab' ? '\t' : 
                                                 userSettings.exportCsvDelimiter === 'pipe' ? '|' : 
                                                 userSettings.exportCsvCustomDelimiter;
                            if (newValue && newValue === mainDelimiter) {
                              return; // Zabránit nastavení stejného znaku
                            }
                            dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'exportCsvListCustomDelimiter', value: newValue } });
                          }}
                          disabled={userSettings.exportCsvListDelimiter !== 'custom'}
                          placeholder="Zadejte znak..."
                          maxLength={3}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            width: '100px',
                            background: userSettings.exportCsvListDelimiter === 'custom' ? '#ffffff' : '#f3f4f6',
                            color: userSettings.exportCsvListDelimiter === 'custom' ? '#1f2937' : '#9ca3af'
                          }}
                        />
                      </label>
                    </div>

                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#dcfce7', borderRadius: '6px', fontSize: '0.85rem', color: '#166534' }}>
                        ✓ <strong>Automatická ochrana:</strong> Nelze použít stejný znak jako hlavní oddělovač sloupců. Systém automaticky blokuje konfliktní volby.
                      </div>
                    </div>

                  </div>
                </div>

                <SettingsGrid>
                  <SettingItem>
                    <SettingLabel>
                      Formát exportu pokladní knihy
                    </SettingLabel>
                    <CustomSelect
                      icon={<Download size={16} />}
                      value={userSettings.export_pokladna_format || 'xlsx'}
                      onChange={(e) => dispatch({ type: SETTINGS_ACTIONS.UPDATE_FIELD, payload: { field: 'export_pokladna_format', value: e.target.value } })}
                      options={EXPORT_FORMAT_OPTIONS}
                      placeholder="Vyberte formát..."
                      field="export_pokladna_format"
                      selectStates={selectStates}
                      setSelectStates={setSelectStates}
                      searchStates={searchStates}
                      setSearchStates={setSearchStates}
                      touchedSelectFields={touchedSelectFields}
                      setTouchedSelectFields={setTouchedSelectFields}
                      toggleSelect={toggleSelect}
                      filterOptions={filterOptions}
                      getOptionLabel={getOptionLabel}
                    />
                    <SettingDescription>
                      Preferovaný formát při exportu dat z pokladní knihy
                    </SettingDescription>
                  </SettingItem>
                </SettingsGrid>
                </CollapsibleContent>
              </SettingsSection>

            </SettingsContainer>
          </TabContent>
        </TabsContainer>

      </ContentWrapper>
    </PageContainer>

    {/* Moderní Sponka helper - kontextová nápověda pro profil */}
    {hasPermission('HELPER_VIEW') && userSettings.zobrazit_ikony_nastroju?.helper !== false && <ModernHelper pageContext="profile" />}
    </>
  );
};

export default ProfilePage;