import React from 'react';
import { FaHeart, FaRegHeart, FaTrash } from 'react-icons/fa';
import { formatDistance } from 'date-fns';
import { formatAddress } from '@/utils/web3';

interface MessageItemProps {
  message: {
    id: number;
    sender: string;
    content: string;
    timestamp: number;
    likes: number;
    hasLiked: boolean;
    isDeleted?: boolean;
  };
  onLike: () => void;
  currentAddress: string | null;
  creatorAddress: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onLike, currentAddress, creatorAddress }) => {
  const isOwner = currentAddress?.toLowerCase() === message.sender.toLowerCase();
  const canModerate = isOwner || currentAddress?.toLowerCase() === creatorAddress.toLowerCase();
  const isDeleted = message.content === '[Message deleted]';
  
  return (
    <div className={`p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${isDeleted ? 'opacity-70' : ''}`}>
      <div className="flex justify-between mb-2">
        <span className="font-medium text-gray-900 dark:text-white">{formatAddress(message.sender)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatDistance(new Date(message.timestamp * 1000), new Date(), { addSuffix: true })}
        </span>
      </div>
      
      <p className="text-gray-800 dark:text-gray-200 mb-3">{message.content}</p>
      
      {!isDeleted && (
        <div className="flex items-center mt-2">
          <button
            onClick={onLike}
            disabled={message.hasLiked}
            className={`inline-flex items-center mr-2 ${
              message.hasLiked 
                ? 'text-red-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
            }`}
          >
            {message.hasLiked ? <FaHeart /> : <FaRegHeart />}
            <span className="ml-1 text-sm">{message.likes}</span>
          </button>
          
          {canModerate && (
            <button
              className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 ml-3"
            >
              <FaTrash />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem;