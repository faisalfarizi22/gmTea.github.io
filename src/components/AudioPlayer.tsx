import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { FaVolumeUp, FaVolumeMute, FaMusic } from 'react-icons/fa';

const DEFAULT_MUSIC = '/music/dashboard-ambient.mp3';
const PROFILE_MUSIC = '/music/profile-ambient.mp3';

interface AudioPlayerProps {
  initialVolume?: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ initialVolume = 0.3 }) => {

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [currentMusic, setCurrentMusic] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [fadeTimeout, setFadeTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isProfileTab, setIsProfileTab] = useState(false); 

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = 0; 
      audioRef.current = audio;

      const musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
      setIsPlaying(musicEnabled);

      const savedTheme = localStorage.getItem('theme');
      setIsDarkMode(savedTheme !== 'light');

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }
        
        if (fadeTimeout) {
          clearTimeout(fadeTimeout);
        }
      };
    }
  }, []);

  useEffect(() => {
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('theme');
      setIsDarkMode(savedTheme !== 'light');
    };
    
    window.addEventListener('storage', handleThemeChange);
    document.addEventListener('themeChanged', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleThemeChange);
      document.removeEventListener('themeChanged', handleThemeChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      if (event.detail && event.detail.tab) {
        setIsProfileTab(event.detail.tab === 'profile');
      }
    };

    window.addEventListener('tabChanged', handleTabChange as EventListener);
    
    return () => {
      window.removeEventListener('tabChanged', handleTabChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    const musicPath = isProfileTab ? PROFILE_MUSIC : DEFAULT_MUSIC;
    
    if (currentMusic !== musicPath || (isPlaying && audioRef.current.paused)) {
      setCurrentMusic(musicPath);
      
      if (audioRef.current.paused === false) {
        fadeOutCurrentMusic().then(() => {
          if (!audioRef.current) return; 
          
          audioRef.current.src = musicPath;
          if (isPlaying) {
            audioRef.current.play().catch(error => {
              console.warn('Audio autoplay was prevented:', error);
            });
            fadeInMusic();
          }
        });
      } else if (isPlaying) {
        audioRef.current.src = musicPath;
        audioRef.current.play().catch(error => {
          console.warn('Audio autoplay was prevented:', error);
        });
        fadeInMusic();
      } else {
        audioRef.current.src = musicPath;
      }
    } else if (!isPlaying && audioRef.current.paused === false) {
      fadeOutCurrentMusic().then(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      });
    }
  }, [isPlaying, currentMusic, isProfileTab]);

  useEffect(() => {
    const handleMusicToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      const newPlayingState = customEvent.detail.enabled;
      
      setIsPlaying(newPlayingState);
      
      if (newPlayingState) {
        if (audioRef.current) {
          const musicPath = isProfileTab ? PROFILE_MUSIC : DEFAULT_MUSIC;
          
          if (currentMusic !== musicPath) {
            setCurrentMusic(musicPath);
            audioRef.current.src = musicPath;
          }
          
          audioRef.current.play().catch(error => {
            console.warn('Audio autoplay was prevented:', error);
          });
          fadeInMusic();
        }
      } else {
        if (audioRef.current && !audioRef.current.paused) {
          fadeOutCurrentMusic().then(() => {
            if (audioRef.current) {
              audioRef.current.pause();
            }
          });
        }
      }
    };

    window.addEventListener('toggle-music', handleMusicToggle as EventListener);
    return () => {
      window.removeEventListener('toggle-music', handleMusicToggle as EventListener);
    };
  }, [currentMusic, isProfileTab]);

  const fadeOutCurrentMusic = async (): Promise<void> => {
    if (!audioRef.current || audioRef.current.paused) return Promise.resolve();
    
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const currentVolume = audioRef.current.volume;
    if (currentVolume <= 0.01) return Promise.resolve();
    
    const steps = 20;
    const interval = 50; 
    const decrementAmount = currentVolume / steps;
    
    return new Promise<void>((resolve) => {
      let step = 0;
      
      fadeIntervalRef.current = setInterval(() => {
        step++;
        
        if (!audioRef.current || step >= steps) {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          
          if (audioRef.current) {
            audioRef.current.volume = 0;
          }
          
          resolve();
          return;
        }
        
        const newVolume = Math.max(0, currentVolume - (decrementAmount * step));
        audioRef.current.volume = newVolume;
      }, interval);
    });
  };

  const fadeInMusic = (): void => {
    if (!audioRef.current) return;
    
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    
    audioRef.current.volume = 0;
    if (isMuted) return; 
    
    const targetVolume = volume;
    const steps = 20;
    const interval = 50; 
    const incrementAmount = targetVolume / steps;
    
    let step = 0;
    
    fadeIntervalRef.current = setInterval(() => {
      step++;
      
      if (!audioRef.current || step >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        
        if (audioRef.current) {
          audioRef.current.volume = isMuted ? 0 : targetVolume;
        }
        
        return;
      }
      
      const newVolume = incrementAmount * step;
      audioRef.current.volume = newVolume;
    }, interval);
  };

  const togglePlay = (): void => {
    if (!audioRef.current) return;
    
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    if (newPlayingState) {
      const musicPath = isProfileTab ? PROFILE_MUSIC : DEFAULT_MUSIC;
      
      if (currentMusic !== musicPath) {
        setCurrentMusic(musicPath);
        audioRef.current.src = musicPath;
      }
      
      audioRef.current.play().catch(error => {
        console.warn('Audio autoplay was prevented:', error);
        setIsPlaying(false);
      });
      
      fadeInMusic();
    } else {
      fadeOutCurrentMusic().then(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      });
    }
    
    localStorage.setItem('musicEnabled', newPlayingState.toString());
  };

  const toggleMute = (): void => {
    if (!audioRef.current) return;
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState) {
      fadeOutCurrentMusic();
    } else {
      fadeInMusic();
    }
  };

  useEffect(() => {
    setIsVisible(true);
    
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
    }
    
    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
    
    setFadeTimeout(timeout);
    
    return () => {
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
    };
  }, [isPlaying, isMuted]);

  const handleMouseEnter = (): void => {
    setIsVisible(true);
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
      setFadeTimeout(null);
    }
  };

  const handleMouseLeave = (): void => {
    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
    setFadeTimeout(timeout);
  };

  return (
    <div 
      className={`fixed bottom-8 right-8 z-40 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${
        isDarkMode 
          ? 'bg-gray-900/80 border-emerald-500/20' 
          : 'bg-white/80 border-emerald-600/20'
        } backdrop-blur-md rounded-full shadow-lg border p-2 flex items-center`}>
        <button
          onClick={togglePlay}
          className={`h-8 w-8 rounded-full flex items-center justify-center ${
            isPlaying 
              ? isDarkMode
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
              : isDarkMode
                ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
          } transition-all`}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          title={isPlaying ? 'Pause music' : 'Play music'}
        >
          {isPlaying ? (
            <div className="flex space-x-0.5">
              <div className={`w-0.5 h-4 ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-600'} animate-music-bar1`}></div>
              <div className={`w-0.5 h-3 ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-600'} animate-music-bar2`}></div>
              <div className={`w-0.5 h-2 ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-600'} animate-music-bar3`}></div>
            </div>
          ) : (
            <FaMusic className="h-4 w-4" />
          )}
        </button>
        
        {isPlaying && (
          <button
            onClick={toggleMute}
            className={`ml-2 h-8 w-8 rounded-full flex items-center justify-center ${
              isMuted 
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                : isDarkMode
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
            } transition-all`}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <FaVolumeMute className="h-4 w-4" /> : <FaVolumeUp className="h-4 w-4" />}
          </button>
        )}
        
        {isPlaying && !isMuted && (
          <div className={`text-xs ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;