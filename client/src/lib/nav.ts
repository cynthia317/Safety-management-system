import {
  LayoutDashboard,
  AlertTriangle,
  ClipboardCheck,
  FileSearch,
  ListTodo,
  Wrench,
  ShieldAlert,
  Building2,
  FileBarChart2,
  Settings,
  Siren,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Actions', path: '/my-actions', icon: ListTodo },
  { label: 'Hazard Reports', path: '/hazards', icon: AlertTriangle },
  { label: 'Incidents', path: '/incidents', icon: Siren },
  { label: 'Inspections', path: '/inspections', icon: ClipboardCheck },
  { label: 'Findings', path: '/findings', icon: FileSearch },
  { label: 'Corrective Actions', path: '/corrective-actions', icon: Wrench },
  { label: 'Risk Assessments', path: '/risk-assessments', icon: ShieldAlert },
  { label: 'Workplaces', path: '/workplaces', icon: Building2 },
  { label: 'Reports', path: '/reports', icon: FileBarChart2 },
  { label: 'Settings', path: '/settings', icon: Settings },
];
