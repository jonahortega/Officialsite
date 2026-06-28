import React from 'react';
import { cn } from '../../lib/utils';

export const Input = ({ className = '', type = 'text', ...props }) => (
  <input
    type={type}
    className={cn("flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50", className)}
    {...props}
  />
);
