import { useEffect, useRef } from 'react';

type VoiceAudioRendererProps = {
  stream: MediaStream;
};

export function VoiceAudioRenderer({ stream }: VoiceAudioRendererProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const element = audioRef.current;

    if (!element) {
      return;
    }

    element.srcObject = stream;
    element.muted = false;
    element.volume = 1;

    const playAudio = () => {
      void element.play().catch((error) => {
        console.warn('voice audio autoplay warning', error);
      });
    };

    playAudio();
    element.addEventListener('canplay', playAudio);

    return () => {
      element.removeEventListener('canplay', playAudio);
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline />;
}
