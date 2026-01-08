import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded-full";
  
  const variants = {
    // Apple style: Black bg, white text for primary
    primary: "bg-black text-white hover:bg-gray-800 focus:ring-gray-500 shadow-sm",
    // Secondary: Light gray bg, dark text
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300",
    // Outline: Border, clean look
    outline: "border border-gray-300 bg-transparent text-gray-900 hover:bg-white focus:ring-gray-500",
    // Danger: Keep red but muted or minimalist? Let's use a soft red or just black/white with warning context. 
    // Sticking to standard red for clarity but softer.
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  const sizes = {
    sm: "px-4 py-1 text-sm", // Was text-xs
    md: "px-6 py-2 text-base", // Was text-sm
    lg: "px-8 py-3 text-lg", // Was text-base
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;