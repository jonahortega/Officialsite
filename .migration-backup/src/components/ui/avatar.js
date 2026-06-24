import React from 'react';
import { cn } from '../../lib/utils';

export const Avatar = ({ className = '', children, ...props }) => (
  <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props}>
    {children}
  </div>
);

export const AvatarImage = ({ className = '', src, alt, ...props }) => (
  <img 
    src={src} 
    alt={alt}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
);

export const AvatarFallback = ({ className = '', children, ...props }) => (
  <div className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props}>
    {children}
  </div>
);