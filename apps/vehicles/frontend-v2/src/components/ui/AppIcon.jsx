import {
  Ambulance,
  ArrowsClockwise,
  Car,
  ClockCounterClockwise,
  Database,
  Eye,
  House,
  List,
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
  legacy: ClockCounterClockwise,
  menu: List,
  logout: SignOut,
  themeLight: Sun,
  themeDark: Moon,
  db: Database,
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
