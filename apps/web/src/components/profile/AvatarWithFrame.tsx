import { useState, useEffect } from 'react';
import defaultProfile from '../../assets/default_profile.png';
import profileFrame from '../../assets/profile-frame.png';
import { getPrimaryAvatar } from '../../lib/avatar';

type AvatarWithFrameProps = {
  avatarUrl?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  className?: string;
  fallback?: React.ReactNode;
};

export function AvatarWithFrame({
  avatarUrl,
  alt = 'Profile',
  size = 'md',
  onClick,
  className = '',
  fallback,
}: AvatarWithFrameProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [avatarUrl]);

  const sizeClasses = {
    sm: 'h-11 w-11',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
    xl: 'h-24 w-24',
  };

  const imagePaddingClasses = {
    sm: 'rounded-[13px] p-1',
    md: 'rounded-[16px] p-1.5',
    lg: 'rounded-[16px] p-1.5',
    xl: 'rounded-2xl p-1.5',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative flex items-center justify-center transition active:scale-95 ${sizeClasses[size]} ${className}`}
    >
      {avatarUrl ? (
        <>
          {!isLoaded && (
            <img
              src={defaultProfile}
              alt="loading placeholder"
              className={`absolute inset-0 z-0 h-full w-full object-cover ${imagePaddingClasses[size]}`}
            />
          )}
          <img
            src={getPrimaryAvatar(avatarUrl) || defaultProfile}
            alt={alt}
            className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-300 ${imagePaddingClasses[size]} ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = defaultProfile;
              setIsLoaded(true);
            }}
          />
        </>
      ) : (
        <img
          src={defaultProfile}
          alt={alt}
          className={`absolute inset-0 z-0 h-full w-full object-cover ${imagePaddingClasses[size]}`}
        />
      )}
      <img
        src={profileFrame}
        alt="Profile Frame"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
      />
    </Wrapper>
  );
}
