import React from "react";
import { getUsernameColor, processMessageEmotes, getChatPrivileges } from "@/utils/socialBenefitsUtils";
import AvatarWithFrame from "@/components/user/AvatarWithFrame";
import ColoredUsername from "@/components/user/ColoredUsername";
import { formatAddress, formatTimestamp } from "@/utils/web3";

interface ChatMessageProps {
  message: string;
  username: string | null;
  userAddress: string;
  avatarUrl: string;
  badgeTier: number;
  timestamp: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
    message, 
    username,
    userAddress,
    avatarUrl,
    badgeTier,
    timestamp 
  }) => {
    try {
      const chatPrivileges = getChatPrivileges(badgeTier);
      const usernameColor = getUsernameColor(badgeTier);
      
      let processedMessage = message || 'GM!';
      try {
        processedMessage = processMessageEmotes(message, badgeTier);
      } catch (error) {
        console.error("Error processing emotes:", error);
      }
      
      let formattedTime = '';
      try {
        formattedTime = formatTimestamp(timestamp);
      } catch (error) {
        console.error("Error formatting timestamp:", error);
        formattedTime = new Date(timestamp * 1000).toLocaleString();
      }
      
      return (
        <div className={`p-4 rounded-xl ${
          badgeTier >= 3 
            ? 'bg-white/90 dark:bg-gray-800/40 border border-emerald-50 dark:border-emerald-800/40 shadow-sm' 
            : 'bg-white dark:bg-gray-800/30 border border-emerald-50 dark:border-emerald-800/30 shadow-sm'
        } hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-all duration-200 group`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <div className="mr-2 h-6 w-6">
                {(() => {
                  try {
                    return (
                      <AvatarWithFrame 
                        avatarUrl={avatarUrl}
                        badgeTier={badgeTier}
                        size="xs"
                      />
                    );
                  } catch (e) {
                    return (
                      <div className="rounded-full overflow-hidden h-6 w-6">
                        <img 
                          src={avatarUrl}
                          alt="User avatar" 
                          className="rounded-full w-full h-full object-cover"
                        />
                      </div>
                    );
                  }
                })()}
              </div>
              
              {/* Username with color - dengan error boundary */}
              {(() => {
                try {
                  return username ? (
                    <ColoredUsername username={username} badgeTier={badgeTier} />
                  ) : (
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {formatAddress(userAddress)}
                    </span>
                  );
                } catch (e) {
                  return (
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {formatAddress(userAddress)}
                    </span>
                  );
                }
              })()}
              
              {/* Badge tier badge for tier 1+ - dengan error boundary */}
              {(() => {
                try {
                  return badgeTier >= 0 ? (
                    <span 
                      className="ml-2 text-xs px-1.5 py-0.5 rounded-full hidden sm:inline-block"
                      style={{ 
                        backgroundColor: usernameColor ? `${usernameColor}20` : undefined,
                        color: usernameColor || undefined 
                      }}
                    >
                      {badgeTier === 0 ? "Common" : 
                       badgeTier === 1 ? "Uncommon" : 
                       badgeTier === 2 ? "Rare" : 
                       badgeTier === 3 ? "Epic" : "Legendary"}
                    </span>
                  ) : null;
                } catch (e) {
                  return null; // Jika gagal menampilkan badge, jangan tampilkan apa-apa
                }
              })()}
            </div>
            
            <span className="text-xs text-gray-500 dark:text-emerald-400/50">
              {formattedTime}
            </span>
          </div>
          
          {/* Message content dengan error handling */}
          <p 
            className={`mt-2 ${
              chatPrivileges.messageEffects 
                ? "group-hover:text-gray-900 dark:group-hover:text-emerald-100 transition-colors"
                : "text-gray-700 dark:text-emerald-200/80"
            }`}
            style={{ 
              color: chatPrivileges.coloredText && usernameColor ? usernameColor : undefined
            }}
          >
            {processedMessage}
          </p>
          
          {/* Animated underline untuk tier 4+ */}
          {chatPrivileges.messageEffects && (
            <div className="h-0.5 w-0 bg-emerald-500 mt-2 group-hover:w-full transition-all duration-500"></div>
          )}
        </div>
      );
    } catch (error) {
      // Fallback view jika semua rendering gagal
      console.error("Error rendering ChatMessage:", error);
      return (
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800/30 border border-emerald-50 dark:border-emerald-800/30 shadow-sm">
          <div className="flex justify-between">
            <span className="text-sm text-emerald-700 dark:text-emerald-300">
              {formatAddress(userAddress)}
            </span>
            <span className="text-xs text-gray-500 dark:text-emerald-400/50">
              {new Date(timestamp * 1000).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-gray-700 dark:text-emerald-200/80">
            {message || 'GM!'}
          </p>
        </div>
      );
    }
  };

export default ChatMessage;