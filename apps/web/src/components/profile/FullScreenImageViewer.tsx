import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getThumbnailUrl } from '../../lib/avatar';
import { useToastStore } from '../../stores/toastStore';

type FullScreenImageViewerProps = {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  onDelete?: (index: number) => void;
  canDelete?: boolean;
};

export function FullScreenImageViewer({
  images,
  initialIndex = 0,
  onClose,
  onDelete,
  canDelete = false,
}: FullScreenImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { showToast } = useToastStore();
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });
  
  // Touch zoom state
  const initialPinchDistance = useRef<number | null>(null);
  const lastScale = useRef(1);
  
  // Image Loading State
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);

  // Sync index if initialIndex changes or images change
  useEffect(() => {
    if (initialIndex < images.length) {
      setCurrentIndex(initialIndex);
    } else if (images.length > 0) {
      setCurrentIndex(0);
    }
  }, [initialIndex, images.length]);

  // Reset zoom on index change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    lastScale.current = 1;
    lastPosition.current = { x: 0, y: 0 };
    setIsHighResLoaded(false);
  }, [currentIndex]);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use toast for custom confirmation or direct delete with toast feedback
    // Since we can't easily do a blocking confirm with toast, we'll use a direct approach
    // or keep confirm for safety but use toast for the success/error
    if (window.confirm('آیا از حذف این تصویر اطمینان دارید؟')) {
      onDelete?.(currentIndex);
      showToast('تصویر با موفقیت حذف شد', 'success');
    }
  };

  // Drag and Pan handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && scale > 1) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: lastPosition.current.x + dx,
        y: lastPosition.current.y + dy,
      });
    }
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      lastPosition.current = position;
    }
  };

  // Pinch to zoom handlers
  const getDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialPinchDistance.current = getDistance(e.touches);
      lastScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current) {
      const distance = getDistance(e.touches);
      const newScale = lastScale.current * (distance / initialPinchDistance.current);
      setScale(Math.min(Math.max(1, newScale), 4)); // clamp between 1x and 4x
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistance.current = null;
    }
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      lastPosition.current = { x: 0, y: 0 };
    } else {
      setScale(2);
    }
  };

  const portalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top Bar - Moved lower with pt-10 */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-10 z-10 bg-gradient-to-b from-black/60 to-transparent text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="p-2 text-white hover:text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div className="text-sm font-bold dir-ltr">
          {currentIndex + 1} / {images.length}
        </div>

        {canDelete && onDelete ? (
          <button onClick={handleDelete} className="p-2 text-ember hover:text-red-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        ) : (
          <div className="w-10"></div> /* Placeholder for balance */
        )}
      </div>

      {/* Navigation Left/Right */}
      {currentIndex > 0 && (
        <button 
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 rounded-full text-white hover:bg-black/60"
          onClick={handlePrev}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button 
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 rounded-full text-white hover:bg-black/60"
          onClick={handleNext}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      )}

      {/* Image Container */}
      <div 
        className="w-full h-[calc(100%-80px)] flex items-center justify-center overflow-hidden touch-none relative"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        {/* Low-res placeholder */}
        <img
          key={`low-${currentImage}`}
          src={getThumbnailUrl(currentImage, 50, 50, 40)}
          alt="Loading..."
          className={`absolute w-full h-auto transition-opacity duration-300 ${isHighResLoaded ? 'opacity-0' : 'opacity-100'} blur-sm`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          draggable={false}
        />
        
        {/* High-res image */}
        <img
          key={`high-${currentImage}`}
          src={currentImage}
          alt={`Profile ${currentIndex + 1}`}
          className={`absolute w-full h-auto ${isHighResLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onLoad={() => setIsHighResLoaded(true)}
        />
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div 
          className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((imgUrl, idx) => (
            <button
              key={imgUrl + idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${
                currentIndex === idx ? 'border-moss scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img 
                src={getThumbnailUrl(imgUrl, 50, 50, 40)} 
                alt={`Thumb ${idx + 1}`} 
                className="w-full h-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(portalContent, document.body);
}
