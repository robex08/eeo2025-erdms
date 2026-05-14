import type { PropsWithChildren } from 'react';
import { cn } from '../../utils/cn';

interface SurfaceCardProps extends PropsWithChildren {
  className?: string;
}

export default function SurfaceCard({ className, children }: SurfaceCardProps) {
  return <div className={cn('surface-card rounded-2xl border p-5 shadow-lg', className)}>{children}</div>;
}
