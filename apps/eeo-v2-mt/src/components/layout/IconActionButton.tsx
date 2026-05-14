import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface IconActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  danger?: boolean;
}

export default function IconActionButton({ className, danger = false, ...props }: IconActionButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors active:scale-95',
        danger ? 'hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-300' : 'hover:bg-white/10',
        className
      )}
      {...props}
    />
  );
}
