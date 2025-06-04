import React from "react";
import { getAvatarFrame } from "@/utils/socialBenefitsUtils";

interface AvatarWithFrameProps {
  avatarUrl: string;
  badgeTier: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

interface FrameStyle {
  borderColor: string;
  shadowColor: string;
  gradientColor: string;
}

const getFramePaths = (tier: number): string[] => [
  `/assets/frames/Tier-${tier}.png`,
  `/assets/frames/tier-${tier}.png`, 
  `/frames/Tier-${tier}.png`,
  `/frames/tier-${tier}.png`
];

const getFrameStyle = (tier: number): FrameStyle => {
  const styles: Record<number, FrameStyle> = {
    2: {
      borderColor: '#3b82f6',
      shadowColor: '#3b82f640', 
      gradientColor: '#3b82f610'
    },
    3: {
      borderColor: '#8b5cf6',
      shadowColor: '#8b5cf640',
      gradientColor: '#8b5cf610'
    },
    4: {
      borderColor: '#fbbf24', 
      shadowColor: '#fbbf2440',
      gradientColor: '#fbbf2410'
    }
  };
  
  return styles[tier] || styles[4];
};

const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({ 
  avatarUrl, 
  badgeTier,
  size = "md",
  className = ""
}) => {
  const sizeClasses = {
    xs: "w-5 h-5",
    sm: "w-8 h-8", 
    md: "w-12 h-12",
    lg: "w-24 h-24",
    xl: "w-32 h-32"
  }[size];

  const avatarFrame = getAvatarFrame(badgeTier);
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldShowFrame = badgeTier >= 2;
  const shouldAnimate = badgeTier >= 3;

  if (!shouldShowFrame) {
    return (
      <div className={`relative ${sizeClasses} ${className}`}>
        <div className="rounded-full overflow-hidden w-full h-full">
          <img 
            src={avatarUrl}
            alt="User avatar" 
            className="rounded-full w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  const frameStyle = getFrameStyle(badgeTier);
  const framePaths = getFramePaths(badgeTier);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const parent = e.currentTarget.parentElement;
    const cssFrame = parent?.querySelector('[data-css-frame]') as HTMLElement;
    if (cssFrame) cssFrame.style.opacity = '0';
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const currentSrc = e.currentTarget.src;
    const currentIndex = framePaths.indexOf(currentSrc);
    
    if (currentIndex < framePaths.length - 1) {
      e.currentTarget.src = framePaths[currentIndex + 1];
    } else {
      e.currentTarget.style.display = 'none';
    }
  };

  return (
    <div className={`relative ${sizeClasses} ${className}`}>
      <div className="rounded-full overflow-hidden w-full h-full">
        <img 
          src={avatarUrl}
          alt="User avatar" 
          className="rounded-full w-full h-full object-cover"
        />
      </div>

      <div 
        data-css-frame
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: '3px solid',
          borderColor: frameStyle.borderColor,
          borderRadius: '50%',
          pointerEvents: 'none',
          boxShadow: `0 0 12px ${frameStyle.shadowColor}`,
          background: `linear-gradient(45deg, ${frameStyle.gradientColor}, transparent)`,
          animation: shouldAnimate ? 'pulse 2s infinite' : 'none'
        }}
      />

      <img 
        src={framePaths[0]}
        alt="Avatar frame" 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          opacity: 0.9
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {avatarFrame && !isProduction && (
        <div className={`absolute inset-0 pointer-events-none opacity-30 ${avatarFrame.isAnimated ? "animate-pulse" : ""}`}>
          <img 
            src={avatarFrame.url}
            alt="Dev frame reference" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default AvatarWithFrame;