import { cn } from '@/lib/utils';

const tones: Record<string, string> = {
  safe:    'bg-emerald-50  text-emerald-700  border border-emerald-100',
  warning: 'bg-amber-50    text-amber-700    border border-amber-100',
  alert:   'bg-red-50      text-red-700      border border-red-100',
  neutral: 'bg-gray-50     text-gray-600     border border-gray-100',
  blue:    'bg-blue-50     text-blue-700     border border-blue-100',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      tones[tone], className
    )}>
      {children}
    </span>
  );
}
