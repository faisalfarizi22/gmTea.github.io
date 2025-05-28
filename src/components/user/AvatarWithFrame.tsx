// components/user/AvatarWithFrame.tsx
import React from "react";
import { getAvatarFrame } from "@/utils/socialBenefitsUtils";

interface AvatarWithFrameProps {
  avatarUrl: string;
  badgeTier: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({ 
  avatarUrl, 
  badgeTier,
  size = "md",
  className = ""
}) => {
  // Gunakan try-catch untuk menangani error
  try {
    const avatarFrame = getAvatarFrame(badgeTier);
    
    const dimensions = {
      xs: { width: 24, height: 24 },
      sm: { width: 32, height: 32 },
      md: { width: 48, height: 48 },
      lg: { width: 96, height: 96 }
    }[size];
    
    return (
      <div className={`relative ${className}`}>
        {/* Avatar image */}
        <div className="rounded-full overflow-hidden w-full h-full">
          <img 
            src={avatarUrl}
            alt="User avatar" 
            className="rounded-full w-full h-full object-cover"
          />
        </div>
        
        {/* Frame overlay - only shown for Rare tier and above */}
        {avatarFrame && (
          <div className={`absolute inset-0 pointer-events-none ${avatarFrame.isAnimated ? "animate-none" : ""}`}>
            <img 
              src={avatarFrame.url}
              alt="Avatar frame" 
              className="w-100px h-100px"
              onError={(e) => {
                // Jika gambar frame gagal dimuat, sembunyikan elemen
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error rendering AvatarWithFrame:", error);
    // Fallback rendering jika terjadi error
    return (
      <div className={`relative ${className}`}>
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