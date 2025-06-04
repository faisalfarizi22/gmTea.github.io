import React from "react";
import { getAvatarFrame } from "@/utils/socialBenefitsUtils";

interface AvatarWithFrameProps {
  avatarUrl: string;
  badgeTier: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

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
  
  try {
    const avatarFrame = getAvatarFrame(badgeTier);
    
    return (
      <div className={`relative ${sizeClasses} ${className}`}>
        <div className="rounded-full overflow-hidden w-full h-full">
          <img 
            src={avatarUrl}
            alt="User avatar" 
            className="rounded-full w-full h-full object-cover"
          />
        </div>
        
        {avatarFrame && (
          <div className={`absolute inset-0 pointer-events-none ${avatarFrame.isAnimated ? "animate-none" : ""}`}>
            <img 
              src={avatarFrame.url}
              alt="Avatar frame" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error rendering AvatarWithFrame:", error);
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
};

export default AvatarWithFrame;