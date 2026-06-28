import React from 'react';
import { cn } from '../../lib/utils';

export const Switch = ({
  className = '',
  checked = false,
  onCheckedChange,
  defaultChecked = false,
  ...props
}) => {
  const isChecked = checked !== undefined ? checked : defaultChecked;

  return (
    <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
        className="sr-only peer"
        {...props}
      />
      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-500"></div>
    </label>
  );
};