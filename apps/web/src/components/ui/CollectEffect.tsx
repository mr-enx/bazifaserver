import { useEffect, useState, useRef } from 'react';
import iconGem from '../../assets/icon-gem.png';
import iconLevel from '../../assets/icon-level.png';

type CollectEffectProps = {
  type: 'xp' | 'gem';
  amount: number;
  onComplete?: () => void;
  className?: string;
};

export function CollectEffect({ type, amount, onComplete, className = '' }: CollectEffectProps) {
  const [visible, setVisible] = useState(true);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 100,
      y: -50 - Math.random() * 100,
      size: 8 + Math.random() * 12,
      delay: Math.random() * 0.2,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute z-50 ${className}`}
    >
      <div
        className="flex items-center gap-1 text-xl font-bold drop-shadow-lg"
        style={{
          animation: 'floatUp 1.5s ease-out forwards',
        }}
      >
        <span className={type === 'gem' ? 'text-green-400' : 'text-blue-400'}>+{amount}</span>
        <img
          src={type === 'gem' ? iconGem : iconLevel}
          alt=""
          className="h-6 w-6 object-contain select-none"
          draggable="false"
        />
      </div>

      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute rounded-full ${
            type === 'gem' ? 'bg-green-400' : 'bg-blue-400'
          }`}
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: '50%',
            top: '50%',
            boxShadow: type === 'gem'
              ? '0 0 10px rgba(74, 222, 128, 0.8)'
              : '0 0 10px rgba(96, 165, 250, 0.8)',
            animation: `particleFloat-${particle.id} 1s ease-out ${particle.delay}s forwards`,
          }}
        />
      ))}

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translate(-50%, -150%) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -300%) scale(1);
          }
        }

        ${particles.map(particle => `
          @keyframes particleFloat-${particle.id} {
            0% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(calc(-50% + ${particle.x}px), calc(-50% + ${particle.y}px)) scale(0);
            }
          }
        `).join('')}
      `}</style>
    </div>
  );
}
