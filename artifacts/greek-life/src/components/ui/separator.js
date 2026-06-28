import React from 'react';
import { cn } from '../../lib/utils';

export const Separator = ({ className = '', orientation = 'horizontal', decorative = true, ...props }) => {
  const orientationClass = orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]';
  return (
    <div
      role={decorative ? "none" : "separator"}
      className={cn("shrink-0 bg-border", orientationClass, className)}
      {...props}
    />
  );
};