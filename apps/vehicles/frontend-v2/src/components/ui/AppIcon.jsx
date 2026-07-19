import {
  Ambulance,
  ArrowsClockwise,
  Car,
  ClockCounterClockwise,
  Database,
  Eye,
  FunnelX,
  House,
  List,
  MapTrifold,
  Moon,
  PencilSimple,
  SignOut,
  Sun,
  ArrowsDownUp,
  ArrowUp,
  ArrowDown,
  Warning,
} from '@phosphor-icons/react';

const ICONS = {
  dashboard: House,
  vehicles: Ambulance,
  map: MapTrifold,
  legacy: ClockCounterClockwise,
  menu: List,
  logout: SignOut,
  themeLight: Sun,
  themeDark: Moon,
  db: Database,
  resetFilters: FunnelX,
  sync: ArrowsClockwise,
  car: Car,
  detail: Eye,
  edit: PencilSimple,
  sort: ArrowsDownUp,
  sortAsc: ArrowUp,
  sortDesc: ArrowDown,
  warning: Warning,
};

export default function AppIcon({ name, size = 18, weight = 'regular', className = '', ...rest }) {
  const Icon = ICONS[name] || Car;
  return <Icon className={`app-icon ${className}`.trim()} size={size} weight={weight} aria-hidden="true" {...rest} />;
}
