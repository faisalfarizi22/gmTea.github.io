import React, { useState } from 'react';
import { FaSpinner, FaPaperPlane, FaInfo } from 'react-icons/fa';

interface PostMessageProps {
  onPost: (content: string) => Promise<void>;
  isReplying?: boolean;
  error?: string | null;
}

const PostMessage: React.FC<PostMessageProps> = ({ 
  onPost, 
  isReplying = false,
  error = null 
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isReplying) return;
    
    try {
      await onPost(message);
      setMessage('');
    } catch (error) {
      console.error('Error posting message:', error);
    }
  };

  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Free reply indicator */}
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30">
        <FaInfo className="text-emerald-500 dark:text-emerald-400 h-4 w-4 flex-shrink-0" />
        <p className="text-xs text-emerald-700 dark:text-emerald-300">
          Replying to threads is free. You only need to have checked in at least once.
        </p>
      </div>
      
      {/* Error message if any */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-3">
        <div className={`relative border ${isFocused ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-300 dark:border-gray-600'} rounded-lg transition-all duration-200`}>
          <textarea
            className="w-full p-3 focus:outline-none bg-transparent resize-none text-gray-700 dark:text-gray-200 min-h-[100px]"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isReplying}
            rows={4}
          />
          
          <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {message.length} / 1000 characters
            </div>
            
            <button
              type="submit"
              disabled={!message.trim() || isReplying}
              className="inline-flex items-center bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-md px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isReplying ? (
                <>
                  <FaSpinner className="animate-spin mr-2 h-4 w-4" />
                  Posting...
                </>
              ) : (
                <>
                  <FaPaperPlane className="mr-2 h-4 w-4" />
                  Post Reply
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PostMessage;