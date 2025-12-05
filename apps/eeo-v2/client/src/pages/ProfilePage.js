/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { User, Mail, Building, Building2, MapPin, Phone, IdCard, Calendar, Shield, RefreshCw, Lock, Hash, MessageSquare, FileText, TrendingUp, XCircle, Archive, CheckCircle, Settings, Info, UserCog, Search, X, Sliders, Eye, Download, Filter, Layout, Save, ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faList } from '@fortawesome/free-solid-svg-icons';
import { fetchFreshUserDetail, fetchCiselniky } from '../services/api2auth';
import { getOrganizaceDetail } from '../services/apiv2Dictionaries';
import { CustomSelect } from '../components/CustomSelect';
import { getAvailableSections, isSectionAvailable, getFirstAvailableSection } from '../utils/availableSections';
import ModernHelper from '../components/ModernHelper';
import LimitovanePrislibyManager from '../components/LimitovanePrislibyManager';
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

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
  }
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

  // Focus na vyhledávací pole při otevření
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
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
      // Když otevíráme, zavřeme všechny ostatní selecty
      setSelectStates({ [field]: true });
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

const ProfilePage = () => {
  const { userDetail, token, username, user_id, refreshUserDetail, hasPermission } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem(`profile_active_tab_${user_id || 'default'}`) || 'info';
    } catch {
      return 'info';
    }
  }); // 'info', 'permissions', 'settings'

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

  // 🎨 Dynamické menu options podle oprávnění uživatele
  const MENU_TAB_OPTIONS = useMemo(() => {
    return getAvailableSections(hasPermission, userDetail);
  }, [hasPermission, userDetail]);

  // User Settings State - ČESKÉ KLÍČE (bez diakritiky, snake_case)
  const [userSettings, setUserSettings] = useState(() => {
    // Dynamická výchozí hodnota - první dostupná sekce pro uživatele
    const { getFirstAvailableSection } = require('../utils/availableSections');
    const defaultSection = getFirstAvailableSection(hasPermission, userDetail);
    
    return {
      // Chování aplikace
      zapamatovat_filtry: true,
      vychozi_sekce_po_prihlaseni: defaultSection,
      vychozi_filtry_stavu_objednavek: [], // Changed to array for multiselect
      auto_sbalit_zamcene_sekce: true, // Automaticky sbalit zamčené sekce v objednávkách
    
    // Výchozí rok a období
    vychozi_rok: 'current', // 'current' nebo konkrétní rok (např. '2025')
    vychozi_obdobi: 'all', // 'all' nebo číslo měsíce ('1'-'12')
    
    // Viditelnost dlaždic - výchozí hodnoty FALSE (načte se z DB)
    viditelne_dlazdice: {
      nova: false,                           // Nová / Koncept
      ke_schvaleni: false,                   // Ke schválení
      schvalena: false,                      // Schválená
      zamitnuta: false,                      // Zamítnutá
      rozpracovana: false,                   // Rozpracovaná
      odeslana_dodavateli: false,            // Odeslaná dodavateli
      potvrzena_dodavatelem: false,          // Potvrzená dodavatelem
      k_uverejneni_do_registru: false,       // Má být zveřejněna
      uverejnena: false,                     // Uveřejněná
      ceka_na_potvrzeni: false,              // Čeká na potvrzení
      ceka_se: false,                        // Čeká se
      vecna_spravnost: false,                // Věcná správnost
      dokoncena: false,                      // Dokončená
      zrusena: false,                        // Zrušená
      smazana: false,                        // Smazaná
      archivovano: false,                    // Archivováno / Import
      s_fakturou: false,                     // S fakturou
      s_prilohami: false,                    // S přílohami
      moje_objednavky: false                 // Moje objednávky
    },

    // Export nastavení
    export_pokladna_format: 'xlsx', // 'xlsx' nebo 'csv'
    
    // Export CSV sloupce - kompletní seznam všech dostupných sloupců z enriched dat
    export_csv_sloupce: {
      // Základní identifikace
      id: true,
      cislo_objednavky: true,
      
      // Předmět a popis
      predmet: true,
      poznamka: false,
      
      // Stavy a workflow
      stav_objednavky: true,
      stav_workflow: false,
      stav_komentar: false,
      
      // Datumy (skutečné názvy z API)
      dt_objednavky: true,
      dt_vytvoreni: true,
      dt_schvaleni: false,
      dt_odeslani: false,
      dt_akceptace: false,
      dt_zverejneni: false,
      dt_predpokladany_termin_dodani: false,
      dt_aktualizace: false,
      
      // Finanční údaje
      max_cena_s_dph: true,
      celkova_cena_bez_dph: false,
      celkova_cena_s_dph: true,
      financovani_typ: false,
      financovani_typ_nazev: false,
      financovani_lp_kody: false,
      financovani_lp_nazvy: false,
      financovani_lp_cisla: false,
      
      // Lidé (enriched data)
      objednatel: true,
      objednatel_email: false,
      objednatel_telefon: false,
      garant: false,
      garant_email: false,
      garant_telefon: false,
      prikazce: false,
      schvalovatel: false,
      vytvoril_uzivatel: false,
      
      // Dodavatel (enriched data)
      dodavatel_nazev: true,
      dodavatel_ico: false,
      dodavatel_dic: false,
      dodavatel_adresa: false,
      dodavatel_zastoupeny: false,
      dodavatel_kontakt_jmeno: false,
      dodavatel_kontakt_email: false,
      dodavatel_kontakt_telefon: false,
      
      // Střediska a struktura
      strediska: true,
      strediska_nazvy: false,
      druh_objednavky_kod: false,
      stav_workflow_kod: false,
      
      // Položky objednávky (z API)
      pocet_polozek: true,
      polozky_celkova_cena_s_dph: true, // Celková cena všech položek s DPH
      polozky_popis: false,             // Seznam popisů položek
      polozky_cena_bez_dph: false,      // Seznam cen bez DPH
      polozky_sazba_dph: false,         // Seznam sazeb DPH (%)
      polozky_cena_s_dph: false,        // Seznam cen s DPH
      polozky_usek_kod: false,          // Seznam kódů úseků
      polozky_budova_kod: false,        // Seznam kódů budov
      polozky_mistnost_kod: false,      // Seznam kódů místností
      polozky_poznamka: false,          // Seznam poznámek k položkám
      polozky_poznamka_umisteni: false, // Seznam poznámek k umístění
      
      // Přílohy
      prilohy_count: false,
      prilohy_guid: false,              // Seznam GUID příloh
      prilohy_typ: false,               // Seznam typů příloh
      prilohy_nazvy: false,             // Seznam názvů souborů
      prilohy_velikosti: false,         // Seznam velikostí v B
      prilohy_nahrano_uzivatel: false,  // Seznam uživatelů kteří nahráli
      prilohy_dt_vytvoreni: false,      // Seznam datumů vytvoření příloh
      
      // Faktury (z API)
      faktury_count: false,
      faktury_celkova_castka_s_dph: false, // Celková částka všech faktur
      faktury_cisla_vema: false,        // Čísla faktur VEMA
      faktury_castky: false,            // Částky jednotlivých faktur
      faktury_datum_vystaveni: false,   // Data vystavení faktur
      faktury_datum_splatnosti: false,  // Data splatnosti faktur
      faktury_datum_doruceni: false,    // Data doručení faktur
      faktury_strediska: false,         // Střediska faktur
      faktury_poznamka: false,          // Poznámky k fakturám
      faktury_pocet_priloh: false,      // Počet příloh ke všem fakturám
      faktury_dorucena: false,          // Faktury doručeny (ANO/NE)
      
      // Potvrzení a odeslání
      stav_odeslano: false,
      potvrzeno_dodavatelem: false,
      zpusob_potvrzeni: false,
      zpusob_platby: false,
      
      // Registr smluv
      zverejnit_registr_smluv: false,
      registr_iddt: false,
      
      // Ostatní
      zaruka: false,
      misto_dodani: false
    },
    
    // Notifikace
    notifikace: {
      email: true,
      system: true
    },
    
    // Profil
    profil: {
      zobrazit_email: true,
      zobrazit_telefon: true
    },
    
    // Viditelnost ikon nástrojů
    zobrazit_ikony_nastroju: {
      notes: true,           // Poznámky
      todo: true,            // TODO seznam
      chat: true,            // Chat
      kalkulacka: true,      // Kalkulačka
      helper: true           // Helper avatar
    }
    };
  });

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
        const { fetchUserSettings, saveSettingsToLocalStorage } = await import('../services/userSettingsApi');
        
        // Načti z DB
        const settingsFromDB = await fetchUserSettings({ token, username, userId: parseInt(user_id, 10) });
        
        if (settingsFromDB && Object.keys(settingsFromDB).length > 0) {
          // Ulož do localStorage
          saveSettingsToLocalStorage(parseInt(user_id, 10), settingsFromDB);
          
          // Deep merge s výchozími hodnotami (zachová strukturu, přepíše hodnoty)
          setUserSettings(prev => {
            const merged = { ...prev };
            
            Object.keys(settingsFromDB).forEach(key => {
              if (typeof settingsFromDB[key] === 'object' && settingsFromDB[key] !== null && !Array.isArray(settingsFromDB[key])) {
                // Deep merge pro vnořené objekty (viditelne_dlazdice, notifikace, profil, export_csv_sloupce)
                merged[key] = { ...prev[key], ...settingsFromDB[key] };
              } else {
                // Direct assignment pro primitivy a pole
                merged[key] = settingsFromDB[key];
              }
            });
            
            // Zajisti výchozí hodnoty pro rok a období, pokud nejsou v DB
            if (!settingsFromDB.vychozi_rok) {
              merged.vychozi_rok = 'current';
            } else if (typeof settingsFromDB.vychozi_rok === 'object' && settingsFromDB.vychozi_rok.value) {
              // Backend vrátil objekt {value, label}, extrahuj jen value
              merged.vychozi_rok = settingsFromDB.vychozi_rok.value;
            }
            
            if (!settingsFromDB.vychozi_obdobi) {
              merged.vychozi_obdobi = 'all';
            } else if (typeof settingsFromDB.vychozi_obdobi === 'object' && settingsFromDB.vychozi_obdobi.value) {
              // Backend vrátil objekt {value, label}, extrahuj jen value
              merged.vychozi_obdobi = settingsFromDB.vychozi_obdobi.value;
            }
            
            // Podobně pro vychozi_sekce_po_prihlaseni - VÝCHOZÍ HODNOTA: 'orders' (Seznam objednávek)
            // ⚠️ VALIDACE: Zkontroluj, zda má uživatel stále oprávnění k této sekci
            let targetSection = '';
            
            if (!settingsFromDB.vychozi_sekce_po_prihlaseni || settingsFromDB.vychozi_sekce_po_prihlaseni === '') {
              targetSection = 'orders';
            } else if (typeof settingsFromDB.vychozi_sekce_po_prihlaseni === 'object' && settingsFromDB.vychozi_sekce_po_prihlaseni !== null && settingsFromDB.vychozi_sekce_po_prihlaseni.value) {
              targetSection = settingsFromDB.vychozi_sekce_po_prihlaseni.value;
            } else {
              // Pokud je string, použij ho přímo
              targetSection = settingsFromDB.vychozi_sekce_po_prihlaseni;
            }
            
            // Validace oprávnění - pokud uživatel nemá oprávnění, použij první dostupnou sekci
            if (!isSectionAvailable(targetSection, hasPermission, userDetail)) {
              console.warn('⚠️ Uživatel nemá oprávnění k sekci:', targetSection, '→ Použije se první dostupná sekce');
              targetSection = getFirstAvailableSection(hasPermission, userDetail);
            }
            
            merged.vychozi_sekce_po_prihlaseni = targetSection;
            
            // Pro vychozi_filtry_stavu_objednavek - PONECHAT PRÁZDNÉ pokud není v DB
            if (settingsFromDB.vychozi_filtry_stavu_objednavek && Array.isArray(settingsFromDB.vychozi_filtry_stavu_objednavek)) {
              // Extrahuj values pokud jsou objekty
              merged.vychozi_filtry_stavu_objednavek = settingsFromDB.vychozi_filtry_stavu_objednavek.map(item => {
                if (typeof item === 'object' && item !== null && item.value) {
                  return item.value;
                }
                return item;
              });
            } else if (!settingsFromDB.vychozi_filtry_stavu_objednavek) {
              // Pokud není v DB, ponechat prázdné pole
              merged.vychozi_filtry_stavu_objednavek = [];
            }
            
            // Zajisti výchozí hodnoty pro ikony nástrojů, pokud nejsou v DB
            if (!settingsFromDB.zobrazit_ikony_nastroju) {
              merged.zobrazit_ikony_nastroju = {
                notes: true,
                todo: true,
                chat: true,
                kalkulacka: true,
                helper: true
              };
            }
            
            return merged;
          });
        } else {
          // Fallback: načti z localStorage (pokud DB nemá data)
          const { loadSettingsFromLocalStorage } = await import('../services/userSettingsApi');
          const cachedSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
          
          if (cachedSettings && Object.keys(cachedSettings).length > 0) {
            setUserSettings(prev => {
              const merged = { ...prev };
              
              Object.keys(cachedSettings).forEach(key => {
                if (typeof cachedSettings[key] === 'object' && cachedSettings[key] !== null && !Array.isArray(cachedSettings[key])) {
                  merged[key] = { ...prev[key], ...cachedSettings[key] };
                } else {
                  merged[key] = cachedSettings[key];
                }
              });
              
              // Zajisti výchozí hodnoty pro rok a období, pokud nejsou v localStorage
              if (!cachedSettings.vychozi_rok) {
                merged.vychozi_rok = 'current';
              } else if (typeof cachedSettings.vychozi_rok === 'object' && cachedSettings.vychozi_rok.value) {
                merged.vychozi_rok = cachedSettings.vychozi_rok.value;
              }
              
              if (!cachedSettings.vychozi_obdobi) {
                merged.vychozi_obdobi = 'all';
              } else if (typeof cachedSettings.vychozi_obdobi === 'object' && cachedSettings.vychozi_obdobi.value) {
                merged.vychozi_obdobi = cachedSettings.vychozi_obdobi.value;
              }
              
              // ⚠️ VALIDACE: Zkontroluj, zda má uživatel stále oprávnění k této sekci (localStorage cache - fallback větev)
              let cachedTargetSection = '';
              
              if (!cachedSettings.vychozi_sekce_po_prihlaseni || cachedSettings.vychozi_sekce_po_prihlaseni === '') {
                cachedTargetSection = 'orders';
              } else if (typeof cachedSettings.vychozi_sekce_po_prihlaseni === 'object' && cachedSettings.vychozi_sekce_po_prihlaseni !== null && cachedSettings.vychozi_sekce_po_prihlaseni.value) {
                cachedTargetSection = cachedSettings.vychozi_sekce_po_prihlaseni.value;
              } else {
                cachedTargetSection = cachedSettings.vychozi_sekce_po_prihlaseni;
              }
              
              // Validace oprávnění - pokud uživatel nemá oprávnění, použij první dostupnou sekci
              if (!isSectionAvailable(cachedTargetSection, hasPermission, userDetail)) {
                console.warn('⚠️ Uživatel nemá oprávnění k sekci (cache fallback):', cachedTargetSection, '→ Použije se první dostupná sekce');
                cachedTargetSection = getFirstAvailableSection(hasPermission, userDetail);
              }
              
              merged.vychozi_sekce_po_prihlaseni = cachedTargetSection;
              
              // Pro vychozi_filtry_stavu_objednavek - extrahuj values z objektů
              if (cachedSettings.vychozi_filtry_stavu_objednavek && Array.isArray(cachedSettings.vychozi_filtry_stavu_objednavek)) {
                merged.vychozi_filtry_stavu_objednavek = cachedSettings.vychozi_filtry_stavu_objednavek.map(item => {
                  if (typeof item === 'object' && item !== null && item.value) {
                    return item.value;
                  }
                  return item;
                });
              } else if (!cachedSettings.vychozi_filtry_stavu_objednavek) {
                merged.vychozi_filtry_stavu_objednavek = [];
              }
              
              // Zajisti výchozí hodnoty pro ikony nástrojů, pokud nejsou v localStorage
              if (!cachedSettings.zobrazit_ikony_nastroju) {
                merged.zobrazit_ikony_nastroju = {
                  notes: true,
                  todo: true,
                  chat: true,
                  kalkulacka: true,
                  helper: true
                };
              }
              
              return merged;
            });
          }
        }
      } catch (error) {
        console.error('Error loading user settings from DB:', error);
        
        // Fallback: načti z localStorage
        try {
          const { loadSettingsFromLocalStorage } = await import('../services/userSettingsApi');
          const cachedSettings = loadSettingsFromLocalStorage(parseInt(user_id, 10));
          
          if (cachedSettings && Object.keys(cachedSettings).length > 0) {
            setUserSettings(prev => {
              const merged = { ...prev };
              
              Object.keys(cachedSettings).forEach(key => {
                if (typeof cachedSettings[key] === 'object' && cachedSettings[key] !== null && !Array.isArray(cachedSettings[key])) {
                  merged[key] = { ...prev[key], ...cachedSettings[key] };
                } else {
                  merged[key] = cachedSettings[key];
                }
              });
              
              // Zajisti výchozí hodnoty pro rok a období, pokud nejsou v localStorage
              if (!cachedSettings.vychozi_rok) {
                merged.vychozi_rok = 'current';
              } else if (typeof cachedSettings.vychozi_rok === 'object' && cachedSettings.vychozi_rok.value) {
                merged.vychozi_rok = cachedSettings.vychozi_rok.value;
              }
              
              if (!cachedSettings.vychozi_obdobi) {
                merged.vychozi_obdobi = 'all';
              } else if (typeof cachedSettings.vychozi_obdobi === 'object' && cachedSettings.vychozi_obdobi.value) {
                merged.vychozi_obdobi = cachedSettings.vychozi_obdobi.value;
              }
              
              // ⚠️ VALIDACE: Zkontroluj, zda má uživatel stále oprávnění k této sekci (localStorage cache - error fallback větev)
              let cachedTargetSection2 = '';
              
              if (!cachedSettings.vychozi_sekce_po_prihlaseni || cachedSettings.vychozi_sekce_po_prihlaseni === '') {
                cachedTargetSection2 = 'orders';
              } else if (typeof cachedSettings.vychozi_sekce_po_prihlaseni === 'object' && cachedSettings.vychozi_sekce_po_prihlaseni !== null && cachedSettings.vychozi_sekce_po_prihlaseni.value) {
                cachedTargetSection2 = cachedSettings.vychozi_sekce_po_prihlaseni.value;
              } else {
                cachedTargetSection2 = cachedSettings.vychozi_sekce_po_prihlaseni;
              }
              
              // Validace oprávnění - pokud uživatel nemá oprávnění, použij první dostupnou sekci
              if (!isSectionAvailable(cachedTargetSection2, hasPermission, userDetail)) {
                console.warn('⚠️ Uživatel nemá oprávnění k sekci (cache error fallback):', cachedTargetSection2, '→ Použije se první dostupná sekce');
                cachedTargetSection2 = getFirstAvailableSection(hasPermission, userDetail);
              }
              
              merged.vychozi_sekce_po_prihlaseni = cachedTargetSection2;
              
              // Pro vychozi_filtry_stavu_objednavek - extrahuj values z objektů
              if (cachedSettings.vychozi_filtry_stavu_objednavek && Array.isArray(cachedSettings.vychozi_filtry_stavu_objednavek)) {
                merged.vychozi_filtry_stavu_objednavek = cachedSettings.vychozi_filtry_stavu_objednavek.map(item => {
                  if (typeof item === 'object' && item !== null && item.value) {
                    return item.value;
                  }
                  return item;
                });
              } else if (!cachedSettings.vychozi_filtry_stavu_objednavek) {
                merged.vychozi_filtry_stavu_objednavek = [];
              }
              
              // Zajisti výchozí hodnoty pro ikony nástrojů, pokud nejsou v localStorage
              if (!cachedSettings.zobrazit_ikony_nastroju) {
                merged.zobrazit_ikony_nastroju = {
                  notes: true,
                  todo: true,
                  chat: true,
                  kalkulacka: true,
                  helper: true
                };
              }
              
              return merged;
            });
          }
        } catch (fallbackError) {
          console.error('Error loading cached settings:', fallbackError);
        }
      }
    };

    loadUserSettings();
  }, [user_id, token, username]);

  // Ref pro sledování, zda jsou nastavení již inicializována
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // Označit jako inicializované po prvním načtení
  useEffect(() => {
    if (user_id && token) {
      // Krátké zpoždění, aby se načetla data z DB/localStorage
      const timer = setTimeout(() => {
        setSettingsInitialized(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user_id, token]);

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
        viditelne_dlazdice: userSettings.viditelne_dlazdice,
        export_pokladna_format: userSettings.export_pokladna_format,
        export_csv_sloupce: userSettings.export_csv_sloupce,
        notifikace: userSettings.notifikace,
        profil: userSettings.profil,
        zobrazit_ikony_nastroju: userSettings.zobrazit_ikony_nastroju
      };

      console.log('💾 SAVING TO DB - cleanSettings:', cleanSettings);
      console.log('💾 vychozi_rok being saved:', cleanSettings.vychozi_rok);
      console.log('💾 vychozi_obdobi being saved:', cleanSettings.vychozi_obdobi);
      console.log('💾 zobrazit_ikony_nastroju being saved:', cleanSettings.zobrazit_ikony_nastroju);
      console.log('💾 vychozi_filtry_stavu_objednavek being saved:', cleanSettings.vychozi_filtry_stavu_objednavek);
      console.log('💾 Full userSettings before save:', userSettings);

      // Krok 1: Uložit do databáze (saveUserSettings automaticky uloží i do localStorage)
      const dbResponse = await saveUserSettings({
        token,
        username,
        userId: parseInt(user_id, 10),
        nastaveni: cleanSettings
      });

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

      // Krok 4: Reload aplikace pro aplikování změn
      setTimeout(() => {
        window.location.reload();
      }, 800);

    } catch (error) {
      console.error('Chyba při ukládání nastavení:', error);
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
          if (key.startsWith('auth_')) {
            continue; // Přeskočit všechny auth_ klíče
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
      // DŮLEŽITÉ: Pokud nemáme profileData (ještě se neinicializovala z AuthContext), NEPOKRAČUJ
      if (!profileData) {
        return;
      }

      if (!token || !username) {
        return;
      }

      try {
        const apiUrl = `${process.env.REACT_APP_API2_BASE_URL || 'https://eeo.zachranka.cz/api.eeo/'}user/profile`;

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
          return; // Použij data z AuthContext
        }

        if (data.status === 'ok' && data.data) {

          const apiData = data.data;

          // Kompletní merge dat podle nové API struktury
          const enrichedData = {
            // Základní identifikace
            uzivatel_id: apiData.id || profileData?.uzivatel_id,
            id: apiData.id || profileData?.id,
            login: apiData.username || profileData?.login,
            username: apiData.username || profileData?.username,

            // Jméno a kontakt
            cely_jmeno: apiData.cely_jmeno || `${apiData.jmeno || ''} ${apiData.prijmeni || ''}`.trim(),
            jmeno: apiData.jmeno || profileData?.jmeno,
            prijmeni: apiData.prijmeni || profileData?.prijmeni,
            email: apiData.email || profileData?.email,
            telefon: apiData.telefon || profileData?.telefon,

            // Tituly
            titul_pred: apiData.titul_pred || profileData?.titul_pred || '',
            titul_za: apiData.titul_za || profileData?.titul_za || null,

            // Stav a časové značky
            aktivni: apiData.aktivni ?? profileData?.aktivni ?? 1,
            dt_vytvoreni: apiData.dt_vytvoreni || profileData?.dt_vytvoreni || '',
            dt_aktualizace: apiData.dt_aktualizace || profileData?.dt_aktualizace || '',
            dt_posledni_aktivita: apiData.dt_posledni_aktivita || profileData?.dt_posledni_aktivita || '',

            // Lokalita
            lokalita_id: apiData.lokalita?.id || profileData?.lokalita_id,
            lokalita_nazev: apiData.lokalita?.nazev || profileData?.lokalita_nazev || '',
            lokalita_typ: apiData.lokalita?.typ || profileData?.lokalita_typ || '',
            lokalita_parent_id: apiData.lokalita?.parent_id || profileData?.lokalita_parent_id || null,
            lokalita: apiData.lokalita || profileData?.lokalita,

            // Pozice (z původních dat, API to nevrací)
            pozice_id: profileData?.pozice_id,
            nazev_pozice: profileData?.nazev_pozice || '',
            pozice: profileData?.pozice,

            // Úsek (z původních dat, API to nevrací)
            usek_id: profileData?.usek_id,
            usek_nazev: profileData?.usek_nazev || '',
            usek_zkr: profileData?.usek_zkr || [],
            usek: profileData?.usek,

            // Organizace - kompletní mapování
            organizace_id: apiData.organizace?.id || profileData?.organizace_id,
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
            } : profileData?.organizace,

            // Nadřízený
            nadrizeny_cely_jmeno: apiData.nadrizeny?.cely_jmeno || profileData?.nadrizeny_cely_jmeno || '',
            nadrizeny: apiData.nadrizeny || profileData?.nadrizeny,

            // Role a práva
            roles: apiData.roles || profileData?.roles || [],
            direct_rights: apiData.direct_rights || profileData?.direct_rights || [],

            // Statistiky objednávek
            statistiky_objednavek: apiData.statistiky_objednavek || profileData?.statistiky_objednavek || {
              celkem: 0,
              aktivni: 0,
              zruseno_storno: 0,
              stavy: {}
            }
          };

          setProfileData(enrichedData);
        }
      } catch (error) {
        // Fallback - použij data z AuthContext (už jsou v profileData)
      }
    };

    // Načti pouze pokud máme všechna data a profileData je už inicializované
    if (token && username && userDetail && profileData) {
      loadEnrichedProfile();
    }
  }, [token, username, userDetail?.uzivatel_id, profileData?.uzivatel_id]);

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

      // Načíst čerstvá data přímo
      const freshData = await fetchFreshUserDetail({ token, username, user_id });
      if (freshData) {
        setProfileData(freshData);

        // Také aktualizovat AuthContext
        try {
          const result = await refreshUserDetail?.();
          if (result === null) {
            // refreshUserDetail vrátilo null, pravděpodobně došlo k odhlášení
            if (showToast) {
              showToast('Profil aktualizován, ale došlo k neočekávané změně stavu účtu.', 'warning');
            }
          } else {
            if (showToast) {
              showToast('Profil byl úspěšně aktualizován z databáze', 'success');
            }
          }
        } catch (authError) {
          if (showToast) {
            showToast('Profil aktualizován, ale došlo k problému s autentizací: ' + authError.message, 'warning');
          }
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
                    <Lock size={20} />
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
            <TabButton 
              $active={activeTab === 'lp'} 
              onClick={() => setActiveTab('lp')}
            >
              <Coins size={20} />
              <span>Limitované přísliby</span>
            </TabButton>
            {hasPermission && (hasPermission('SUPPLIER_READ') || hasPermission('SUPPLIER_EDIT') || hasPermission('CONTACT_MANAGE')) && (
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
            <InfoCard>
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
                  <InfoLabel>Celkem vytvořených objednávek</InfoLabel>
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
                  <InfoIcon color="#94a3b8">
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
                  <InfoIcon color="#10b981">
                    <CheckCircle size={16} />
                  </InfoIcon>
                  <InfoContent>
                    <InfoLabel>Dokončena</InfoLabel>
                    <InfoValue>
                      {orderStats.stavy.dokoncena}
                    </InfoValue>
                  </InfoContent>
                </InfoItem>
              )}
            </InfoCard>

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

          {/* Tab Content - Limitované přísliby */}
          <TabContent $active={activeTab === 'lp'}>
            <LimitovanePrislibyManager />
          </TabContent>

          {/* Tab Content - Adresář dodavatelů */}
          {hasPermission && (hasPermission('SUPPLIER_READ') || hasPermission('SUPPLIER_EDIT') || hasPermission('CONTACT_MANAGE')) && (() => {
            // Admini mají automaticky plný přístup
            const isAdmin = userDetail?.roles && userDetail.roles.some(role => 
              role.kod_role === 'SUPERADMIN' || role.kod_role === 'ADMINISTRATOR'
            );
            
            let permLevel = 'READ'; // Default
            
            if (isAdmin || hasPermission('CONTACT_MANAGE')) {
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, zapamatovat_filtry: e.target.checked }))}
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, auto_sbalit_zamcene_sekce: e.target.checked }))}
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
                            onChange={(e) => setUserSettings(prev => ({
                              ...prev,
                              zobrazit_ikony_nastroju: { ...prev.zobrazit_ikony_nastroju, notes: e.target.checked }
                            }))}
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
                            onChange={(e) => setUserSettings(prev => ({
                              ...prev,
                              zobrazit_ikony_nastroju: { ...prev.zobrazit_ikony_nastroju, todo: e.target.checked }
                            }))}
                          />
                          <span></span>
                        </ToggleSwitch>
                      </ToggleSettingItem>

                      {/* Chat */}
                      <ToggleSettingItem>
                        <ToggleSettingLabel>
                          <ToggleSettingTitle>💬 Chat</ToggleSettingTitle>
                          <SettingDescription>
                            Zobrazit ikonu pro chat
                          </SettingDescription>
                        </ToggleSettingLabel>
                        <ToggleSwitch>
                          <input
                            type="checkbox"
                            checked={userSettings.zobrazit_ikony_nastroju.chat}
                            onChange={(e) => setUserSettings(prev => ({
                              ...prev,
                              zobrazit_ikony_nastroju: { ...prev.zobrazit_ikony_nastroju, chat: e.target.checked }
                            }))}
                          />
                          <span></span>
                        </ToggleSwitch>
                      </ToggleSettingItem>

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
                            onChange={(e) => setUserSettings(prev => ({
                              ...prev,
                              zobrazit_ikony_nastroju: { ...prev.zobrazit_ikony_nastroju, kalkulacka: e.target.checked }
                            }))}
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
                              onChange={(e) => setUserSettings(prev => ({
                                ...prev,
                                zobrazit_ikony_nastroju: { ...prev.zobrazit_ikony_nastroju, helper: e.target.checked }
                              }))}
                            />
                            <span></span>
                          </ToggleSwitch>
                        </ToggleSettingItem>
                      )}
                    </div>
                  </div>

                  {/* PRAVÝ SLOUPEC - SELECTY */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Výchozí menu záložka */}
                    <SettingItem>
                      <SettingLabel>
                        Výchozí sekce po přihlášení
                      </SettingLabel>
                      <CustomSelect
                        icon={<Layout size={16} />}
                        value={userSettings.vychozi_sekce_po_prihlaseni}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, vychozi_sekce_po_prihlaseni: e.target.value }))}
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
                        value={userSettings.vychozi_filtry_stavu_objednavek}
                        onChange={(newValue) => setUserSettings(prev => ({ ...prev, vychozi_filtry_stavu_objednavek: newValue }))}
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
                        value={userSettings.vychozi_rok}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, vychozi_rok: e.target.value }))}
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
                        value={userSettings.vychozi_obdobi}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, vychozi_obdobi: e.target.value }))}
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

              {/* Sekce 2: Notifikace */}
              <SettingsSection>
                <SettingsSectionTitle>
                  <SettingsSectionTitleContent>
                    <MessageSquare size={22} />
                    Nastavení notifikací
                  </SettingsSectionTitleContent>
                  <CollapseIconButton onClick={() => toggleSection('notifikace')} $collapsed={collapsedSections.notifikace}>
                    <ChevronDown size={20} />
                  </CollapseIconButton>
                </SettingsSectionTitle>
                <CollapsibleContent $collapsed={collapsedSections.notifikace}>
                  <SettingDescription style={{ marginBottom: '1.5rem' }}>
                    Vyberte, jakým způsobem chcete dostávat oznámení o důležitých událostech v aplikaci.
                  </SettingDescription>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    
                    {/* Systémové notifikace (v aplikaci) */}
                    <ToggleSettingItem>
                      <ToggleSettingLabel>
                        <ToggleSettingTitle>Zobrazovat notifikace v aplikaci</ToggleSettingTitle>
                        <SettingDescription>
                          Notifikace se zobrazí v aplikaci v horním pravém rohu s ikonou zvonečku. 
                          Informují o změnách stavů objednávek, nových komentářích a dalších událostech.
                        </SettingDescription>
                      </ToggleSettingLabel>
                      <ToggleSwitch>
                        <input
                          type="checkbox"
                          checked={userSettings.notifikace.system}
                          onChange={(e) => setUserSettings(prev => ({
                            ...prev,
                            notifikace: { ...prev.notifikace, system: e.target.checked }
                          }))}
                        />
                        <span></span>
                      </ToggleSwitch>
                    </ToggleSettingItem>

                    {/* Email notifikace */}
                    <ToggleSettingItem>
                      <ToggleSettingLabel>
                        <ToggleSettingTitle>Zasílat notifikace emailem</ToggleSettingTitle>
                        <SettingDescription>
                          Důležité události budou zasílány také na váš registrovaný email: <strong>{userDetail?.email || 'není k dispozici'}</strong>. Můžete vybrat obě možnosti, pouze jednu, nebo žádnou.
                        </SettingDescription>
                      </ToggleSettingLabel>
                      <ToggleSwitch>
                        <input
                          type="checkbox"
                          checked={userSettings.notifikace.email}
                          onChange={(e) => setUserSettings(prev => ({
                            ...prev,
                            notifikace: { ...prev.notifikace, email: e.target.checked }
                          }))}
                        />
                        <span></span>
                      </ToggleSwitch>
                    </ToggleSettingItem>

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
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, nova: e.target.checked }
                      }))}
                    />
                    <span>📝 Nová / Koncept</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.ke_schvaleni}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, ke_schvaleni: e.target.checked }
                      }))}
                    />
                    <span>📋 Ke schválení</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.schvalena}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, schvalena: e.target.checked }
                      }))}
                    />
                    <span>👍 Schválená</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.zamitnuta}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, zamitnuta: e.target.checked }
                      }))}
                    />
                    <span>❌ Zamítnutá</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.rozpracovana}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, rozpracovana: e.target.checked }
                      }))}
                    />
                    <span>⬇️ Rozpracovaná</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.odeslana_dodavateli}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, odeslana_dodavateli: e.target.checked }
                      }))}
                    />
                    <span>📤 Odeslaná dodavateli</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.potvrzena_dodavatelem}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, potvrzena_dodavatelem: e.target.checked }
                      }))}
                    />
                    <span>✔️ Potvrzená dodavatelem</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.k_uverejneni_do_registru}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, k_uverejneni_do_registru: e.target.checked }
                      }))}
                    />
                    <span>📊 Má být zveřejněna</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.uverejnena}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, uverejnena: e.target.checked }
                      }))}
                    />
                    <span>📢 Uveřejněná</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.ceka_na_potvrzeni}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, ceka_na_potvrzeni: e.target.checked }
                      }))}
                    />
                    <span>⏸️ Čeká na potvrzení</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.ceka_se}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, ceka_se: e.target.checked }
                      }))}
                    />
                    <span>⏸️ Čeká se</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.vecna_spravnost}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, vecna_spravnost: e.target.checked }
                      }))}
                    />
                    <span>✅ Věcná správnost</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.dokoncena}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, dokoncena: e.target.checked }
                      }))}
                    />
                    <span>🎯 Dokončená</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.zrusena}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, zrusena: e.target.checked }
                      }))}
                    />
                    <span>🚫 Zrušená</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.smazana}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, smazana: e.target.checked }
                      }))}
                    />
                    <span>🗑️ Smazaná</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.archivovano}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, archivovano: e.target.checked }
                      }))}
                    />
                    <span>📦 Archivováno / Import</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.s_fakturou}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, s_fakturou: e.target.checked }
                      }))}
                    />
                    <span>📄 S fakturou</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.s_prilohami}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, s_prilohami: e.target.checked }
                      }))}
                    />
                    <span>📎 S přílohami</span>
                  </TileCheckbox>

                  <TileCheckbox>
                    <input
                      type="checkbox"
                      checked={userSettings.viditelne_dlazdice.moje_objednavky}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        viditelne_dlazdice: { ...prev.viditelne_dlazdice, moje_objednavky: e.target.checked }
                      }))}
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.id} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, id: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>ID objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} id {'}'} = 11308</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.cislo_objednavky} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, cislo_objednavky: e.target.checked } }))} />
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.predmet} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, predmet: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Předmět objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} predmet {'}'} = "Test timezony"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.poznamka} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, poznamka: e.target.checked } }))} />
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_objednavky} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, stav_objednavky: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Stav objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} stav_objednavky {'}'} = "Dokončená"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_workflow} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, stav_workflow: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Workflow stavy (enriched)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.stav_workflow[].nazev_stavu {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_komentar} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, stav_komentar: e.target.checked } }))} />
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_objednavky} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dt_objednavky: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum objednávky</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_objednavky {'}'} = "2025-11-16 19:23:44"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_vytvoreni} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dt_vytvoreni: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum vytvoření</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_vytvoreni {'}'} = "2025-11-14 19:41:59"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_schvaleni} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dt_schvaleni: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum schválení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_schvaleni {'}'} = "2025-11-14 19:42:24"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_odeslani} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dt_odeslani: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum odeslání</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_odeslani {'}'} = "2025-11-14 19:50:57"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_akceptace} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dt_akceptace: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum akceptace</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_akceptace {'}'} = "2025-11-16 18:13:10"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_zverejneni} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dt_zverejneni: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum zveřejnění</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_zverejneni {'}'} = "2025-11-30 17:42:59"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_predpokladany_termin_dodani} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dt_predpokladany_termin_dodani: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Předpokl. termín dodání</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_predpokladany_termin_dodani {'}'} = "2025-11-16"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dt_aktualizace} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dt_aktualizace: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Datum poslední aktualizace</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dt_aktualizace {'}'} = "2025-11-16 19:23:44"</span>
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
                      Příklad financování: <code style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>Typ: LP (Limitovaný příslib), Kódy: 1, 4, Názvy: "LPIT1 - Spotreba materialu", "LPIT4 - Zakonne socialni naklady"</code>
                    </SettingDescription>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.max_cena_s_dph} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, max_cena_s_dph: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Max. cena s DPH</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} max_cena_s_dph {'}'} = 75000.00</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.celkova_cena_bez_dph} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, celkova_cena_bez_dph: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Celková cena bez DPH</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} celkova_cena_bez_dph {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.celkova_cena_s_dph} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, celkova_cena_s_dph: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Celková cena s DPH</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} celkova_cena_s_dph {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_typ} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, financovani_typ: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Typ financování</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} financovani.typ {'}'} = "LP"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_typ_nazev} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, financovani_typ_nazev: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Název typu financování</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} financovani.typ_nazev {'}'} = "Limitovaný příslib"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_lp_kody} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, financovani_lp_kody: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kódy LP (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} financovani.lp_kody[] {'}'} = ["1", "4"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_lp_nazvy} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, financovani_lp_nazvy: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Názvy LP (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} financovani.lp_nazvy[].nazev {'}'} = ["Spotreba materialu", "Zakonne socialni naklady"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.financovani_lp_cisla} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, financovani_lp_cisla: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Čísla LP (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} financovani.lp_nazvy[].cislo_lp {'}'} = ["LPIT1", "LPIT4"]</span>
                        </span>
                      </TileCheckbox>
                    </TilesGrid>
                  </div>

                  {/* Lidé */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.75rem', paddingLeft: '0.5rem', borderLeft: '3px solid #06b6d4' }}>
                      👥 Lidé (enriched data)
                    </div>
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.objednatel} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, objednatel: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Objednatel (jméno)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.objednatel.jmeno {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.objednatel_email} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, objednatel_email: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Objednatel (email)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.objednatel.email {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.objednatel_telefon} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, objednatel_telefon: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Objednatel (telefon)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.objednatel.telefon {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.garant} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, garant: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Garant (jméno)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.garant_uzivatel.jmeno {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.garant_email} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, garant_email: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Garant (email)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.garant_uzivatel.email {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.garant_telefon} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, garant_telefon: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Garant (telefon)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.garant_uzivatel.telefon {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prikazce} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, prikazce: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Příkazce</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.prikazce.jmeno {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.schvalovatel} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, schvalovatel: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Schvalovatel</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.schvalovatel.jmeno {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.vytvoril_uzivatel} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, vytvoril_uzivatel: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Vytvořil uživatel</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.uzivatel.jmeno {'}'}</span>
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_nazev} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dodavatel_nazev: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Název dodavatele</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.nazev {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_ico} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dodavatel_ico: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>IČO dodavatele</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.ico {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_dic} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dodavatel_dic: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>DIČ dodavatele</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.dic {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_adresa} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dodavatel_adresa: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Adresa dodavatele</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.adresa {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_zastoupeny} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dodavatel_zastoupeny: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Zastoupen kým</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.zastoupeny {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_kontakt_jmeno} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dodavatel_kontakt_jmeno: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kontaktní osoba</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.kontakt_jmeno {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_kontakt_email} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dodavatel_kontakt_email: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kontaktní email</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} dodavatel.kontakt_email {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.dodavatel_kontakt_telefon} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, dodavatel_kontakt_telefon: e.target.checked } }))} />
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
                    <TilesGrid>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.strediska} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, strediska: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Střediska (kódy)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} strediska_kod[] {'}'} = ["100", "400"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.strediska_nazvy} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, strediska_nazvy: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Střediska (názvy)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} _enriched.strediska[].nazev {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.druh_objednavky_kod} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, druh_objednavky_kod: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Druh objednávky (kód)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} druh_objednavky_kod {'}'} = "DODAVKA_ZBOZI"</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_workflow_kod} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, stav_workflow_kod: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Workflow stavy (kódy)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} stav_workflow_kod[] {'}'} = ["SCHVALENA", "ODESLANA", "POTVRZENA", ...]</span>
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.pocet_polozek} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, pocet_polozek: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Počet položek</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky_count {'}'} = 1</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_celkova_cena_s_dph} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_celkova_cena_s_dph: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Celková cena položek s DPH</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky_celkova_cena_s_dph {'}'} = 73250</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_popis} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_popis: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Popisy položek (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].popis {'}'} = ["Dodání síťových prvků..."]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_cena_bez_dph} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_cena_bez_dph: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Ceny bez DPH (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].cena_bez_dph {'}'} = ["60537.19"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_sazba_dph} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_sazba_dph: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Sazby DPH % (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].sazba_dph {'}'} = ["21"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_cena_s_dph} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_cena_s_dph: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Ceny s DPH (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].cena_s_dph {'}'} = ["73250.00"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_usek_kod} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_usek_kod: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kódy úseků (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].usek_kod {'}'} = ["100"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_budova_kod} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_budova_kod: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kódy budov (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].budova_kod {'}'} = ["200"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_mistnost_kod} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_mistnost_kod: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Kódy místností (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].mistnost_kod {'}'} = ["300"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_poznamka} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_poznamka: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámky k položkám (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} polozky[].poznamka {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.polozky_poznamka_umisteni} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, polozky_poznamka_umisteni: e.target.checked } }))} />
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_count} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, prilohy_count: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Počet příloh</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy_count {'}'} = 3</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_guid} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, prilohy_guid: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>GUID příloh (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].guid {'}'} = ["2025-11-16_bf523139...", ...]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_typ} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, prilohy_typ: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Typy příloh (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].typ_prilohy {'}'} = ["DOKLAD", "POTVRZENA_OBJEDNAVKA", "JINE"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_nazvy} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, prilohy_nazvy: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Názvy souborů (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].originalni_nazev_souboru {'}'} = ["ReportData-2025-11-06...", ...]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_velikosti} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, prilohy_velikosti: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Velikosti souborů v B (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].velikost_souboru_b {'}'} = ["2664", "2645", "83682"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_nahrano_uzivatel} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, prilohy_nahrano_uzivatel: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Nahráli uživatelé (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} prilohy[].nahrano_uzivatel_celne_jmeno {'}'} = ["Super ADMIN", ...]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.prilohy_dt_vytvoreni} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, prilohy_dt_vytvoreni: e.target.checked } }))} />
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_count} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_count: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Počet faktur</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury_count {'}'} = 1</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_celkova_castka_s_dph} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_celkova_castka_s_dph: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Celková částka faktur s DPH</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury_celkova_castka_s_dph {'}'} = 39480</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_cisla_vema} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_cisla_vema: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Čísla faktur VEMA (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_cislo_vema {'}'} = ["250100528"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_castky} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_castky: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Částky faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_castka {'}'} = ["39480.00"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_datum_vystaveni} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_datum_vystaveni: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Data vystavení faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_datum_vystaveni {'}'} = ["2025-09-08"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_datum_splatnosti} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_datum_splatnosti: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Data splatnosti faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_datum_splatnosti {'}'} = ["2025-09-23"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_datum_doruceni} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_datum_doruceni: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Data doručení faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_datum_doruceni {'}'} = ["2025-11-16"]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_strediska} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_strediska: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Střediska faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_strediska_kod {'}'} = [["100", "400"]]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_poznamka} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_poznamka: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Poznámky faktur (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].fa_poznamka {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_pocet_priloh} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_pocet_priloh: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Počty příloh k fakturám (seznam)</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} faktury[].prilohy.length {'}'} = [1]</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.faktury_dorucena} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, faktury_dorucena: e.target.checked } }))} />
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.stav_odeslano} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, stav_odeslano: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Stav odeslání</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} stav_odeslano {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.potvrzeno_dodavatelem} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, potvrzeno_dodavatelem: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Potvrzeno dodavatelem</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} potvrzeno_dodavatelem {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zpusob_potvrzeni} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, zpusob_potvrzeni: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Způsob potvrzení</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} zpusob_potvrzeni {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zpusob_platby} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, zpusob_platby: e.target.checked } }))} />
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zverejnit_registr_smluv} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, zverejnit_registr_smluv: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Zveřejnit v registru</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} zverejnit_registr_smluv {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.registr_iddt} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, registr_iddt: e.target.checked } }))} />
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
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.zaruka} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, zaruka: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Záruka</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} zaruka {'}'}</span>
                        </span>
                      </TileCheckbox>
                      <TileCheckbox>
                        <input type="checkbox" checked={userSettings.export_csv_sloupce.misto_dodani} onChange={(e) => setUserSettings(prev => ({ ...prev, export_csv_sloupce: { ...prev.export_csv_sloupce, misto_dodani: e.target.checked } }))} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500' }}>Místo dodání</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', wordBreak: 'break-all' }}>{'{'} misto_dodani {'}'}</span>
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvDelimiter: e.target.value }))}
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvDelimiter: e.target.value }))}
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvDelimiter: e.target.value }))}
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvDelimiter: e.target.value }))}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvDelimiter === 'custom' ? '600' : '400' }}>
                          <strong>Vlastní znak:</strong>
                        </span>
                        <input
                          type="text"
                          value={userSettings.exportCsvCustomDelimiter}
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvCustomDelimiter: e.target.value.slice(0, 3) }))}
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvListDelimiter: e.target.value }))}
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvListDelimiter: e.target.value }))}
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvListDelimiter: e.target.value }))}
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
                          onChange={(e) => setUserSettings(prev => ({ ...prev, exportCsvListDelimiter: e.target.value }))}
                          style={{ accentColor: '#3b82f6', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: userSettings.exportCsvListDelimiter === 'custom' ? '600' : '400' }}>
                          <strong>Vlastní znak:</strong>
                        </span>
                        <input
                          type="text"
                          value={userSettings.exportCsvListCustomDelimiter}
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
                            setUserSettings(prev => ({ ...prev, exportCsvListCustomDelimiter: newValue }));
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
                      value={userSettings.export_pokladna_format}
                      onChange={(e) => setUserSettings(prev => ({ ...prev, export_pokladna_format: e.target.value }))}
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