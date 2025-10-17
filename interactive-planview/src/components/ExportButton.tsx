import React, { useState } from 'react';
import ExportDialog from './ExportDialog';

interface ExportButtonProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  svgRef,
  className = '',
  variant = 'secondary',
  size = 'md',
  disabled = false,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    if (!disabled) {
      setIsDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  // Base button styles
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Variant styles
  const variantStyles = {
    primary: 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
    icon: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-blue-500',
  };

  // Size styles
  const sizeStyles = {
    sm: variant === 'icon' ? 'p-1.5' : 'px-3 py-1.5 text-sm',
    md: variant === 'icon' ? 'p-2' : 'px-4 py-2 text-sm',
    lg: variant === 'icon' ? 'p-3' : 'px-6 py-3 text-base',
  };

  const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <>
      <button
        onClick={handleOpenDialog}
        disabled={disabled}
        className={buttonClasses}
        title="Export planview"
        data-testid="export-button"
      >
        {/* Export icon */}
        <svg
          className={variant === 'icon' ? 'w-5 h-5' : 'w-4 h-4 mr-2'}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {variant !== 'icon' && 'Export'}
      </button>

      <ExportDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        svgRef={svgRef}
      />
    </>
  );
};

export default ExportButton;