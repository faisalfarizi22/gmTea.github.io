import React from "react";
import { getProfileBackground } from "@/utils/socialBenefitsUtils";

interface BannerProps {
  badgeTier: number;
}

const Banner: React.FC<BannerProps> = ({ badgeTier }) => {
  const backgroundImage = getProfileBackground(badgeTier);
  
  return (
    <div 
      className="relative h-40 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 dark:from-emerald-900/40 dark:to-teal-900/40"
      style={backgroundImage ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
      {!backgroundImage && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-emerald-400/60 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${3 + Math.random() * 10}s`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            ></div>
          ))}
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>
    </div>
  );
};

export default Banner;