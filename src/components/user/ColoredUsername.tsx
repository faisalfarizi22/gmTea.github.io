import React from "react";
import { getUsernameColor } from "@/utils/socialBenefitsUtils";

interface ColoredUsernameProps {
  username: string | null;
  badgeTier: number;
  className?: string;
  fallbackColor?: string;
}

const ColoredUsername: React.FC<ColoredUsernameProps> = ({ 
  username, 
  badgeTier,
  className = "",
  fallbackColor = "inherit"
}) => {
  if (!username) return null;
  
  try {
    const color = getUsernameColor(badgeTier);
    
    return (
      <span 
        style={{ color: color || fallbackColor }}
        className={`${badgeTier >= 3 ? "font-semibold" : "font-medium"} ${className}`}
      >
        {username}
      </span>
    );
  } catch (error) {
    console.error("Error rendering ColoredUsername:", error);
    return (
      <span className={`font-medium ${className}`}>
        {username}
      </span>
    );
  }
};

export default ColoredUsername;