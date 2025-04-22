import React, { useState } from 'react';
import { FaLeaf, FaSpinner, FaDice, FaArrowRight } from 'react-icons/fa';
import { DEFAULT_MESSAGES, CHECKIN_FEE } from '@/utils/constants';

interface CheckinButtonProps {
  canCheckin: boolean;
  onCheckin: (message: string) => Promise<void>;
  isLoading: boolean;
}

const CheckinButton: React.FC<CheckinButtonProps> = ({
  canCheckin,
  onCheckin,
  isLoading
}) => {
  const [message, setMessage] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const handleCheckin = async () => {
    if (!canCheckin || isLoading) return;
    await onCheckin(message);
    setMessage('');
    setIsExpanded(false);
  };

  const selectSuggestion = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
  };

  const getRandomMessage = () => {
    const randomIndex = Math.floor(Math.random() * DEFAULT_MESSAGES.length);
    setMessage(DEFAULT_MESSAGES[randomIndex]);
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-emerald-700">
        <FaLeaf className="mr-2 text-emerald-500" />
        Daily GM Check-in
      </h3>
      
      {isExpanded ? (
        <div className="space-y-4">
          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your GM message (optional)"
                className="input pr-10"
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              <button
                type="button"
                onClick={getRandomMessage}
                className="p-3 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                title="Get random greeting"
              >
                <FaDice />
              </button>
            </div>
            
            {showSuggestions && (
              <div className="absolute z-10 mt-2 w-full bg-white rounded-xl shadow-lg border border-emerald-100 py-2 overflow-hidden">
                <p className="px-3 py-1 text-sm text-gray-500 bg-emerald-50 font-medium">Suggested Greetings:</p>
                <div className="max-h-40 overflow-y-auto">
                  {DEFAULT_MESSAGES.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors text-sm text-gray-700"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center text-xs text-gray-500 mt-1.5 ml-1">
              <span className="flex items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1"></div>
                Check-in Fee: {CHECKIN_FEE} TEA
              </span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              className="btn-secondary flex-1"
              onClick={() => setIsExpanded(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
            
            <button
              className={`flex-1 flex items-center justify-center gap-2 ${
                canCheckin ? 'btn-primary' : 'btn-disabled'
              }`}
              onClick={handleCheckin}
              disabled={!canCheckin || isLoading}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin h-4 w-4" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaLeaf className="h-4 w-4" />
                  <span>Check-in</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4 text-sm">
            Start your day by checking in on the Tea blockchain. Share a greeting, thought, or just say GM!
          </p>
          
          <button
            className={`w-full ${
              canCheckin ? 'btn-primary' : 'btn-disabled'
            } flex items-center justify-center gap-2 group`}
            onClick={() => setIsExpanded(true)}
            disabled={!canCheckin || isLoading}
          >
            <FaLeaf className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
            <span>{canCheckin ? 'Say GM' : 'Wait for next check-in'}</span>
            {canCheckin && (
              <FaArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
            )}
          </button>
          
          {!canCheckin && (
            <p className="text-xs text-center text-gray-500 mt-2">You need to wait until your next check-in time</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CheckinButton;