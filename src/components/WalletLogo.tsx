import React from 'react';
import Image from 'next/image';

interface WalletLogoProps {
  logoUrl: string;
  altText: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackIcon?: React.ReactNode;
}

const WalletLogo: React.FC<WalletLogoProps> = ({ 
  logoUrl, 
  altText, 
  size = 'md', 
  className = '',
  fallbackIcon = '💳'
}) => {
  const sizeConfig = {
    sm: { width: 20, height: 20 },
    md: { width: 24, height: 24 },
    lg: { width: 32, height: 32 },
    xl: { width: 40, height: 40 }
  };

  const { width, height } = sizeConfig[size];

  const [error, setError] = React.useState(false);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center w-${width/4} h-${height/4} bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400 ${className}`}
        title={altText}
      >
        {typeof fallbackIcon === 'string' ? (
          <span className="text-lg">{fallbackIcon}</span>
        ) : (
          fallbackIcon
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        src={logoUrl}
        alt={altText}
        width={width}
        height={height}
        className="object-contain rounded"
        onError={() => setError(true)}
      />
    </div>
  );
};

export default WalletLogo;