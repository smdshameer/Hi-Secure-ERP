import React, { useRef, useState, useEffect } from 'react';
import { 
  IconZoomIn, 
  IconZoomOut, 
  IconMaximize, 
  IconArrowsMaximize, 
  IconPrinter 
} from '@tabler/icons-react';

interface PrintPreviewWrapperProps {
  children: React.ReactNode;
  onPrint: () => void;
  title: string;
  size: string;
  theme: string;
}

const paperSizes: Record<string, { w: number; h: number }> = {
  a4: { w: 794, h: 1123 },
  a5: { w: 559, h: 794 },
  letter: { w: 816, h: 1056 },
  legal: { w: 816, h: 1344 },
  'thermal-80mm': { w: 302, h: 0 },
  'thermal-58mm': { w: 219, h: 0 }
};

export default function PrintPreviewWrapper({ children, onPrint, title, size, theme }: PrintPreviewWrapperProps) {
  const [scale, setScale] = useState<number>(1);
  const [contentHeight, setContentHeight] = useState<number>(1123);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const paper = paperSizes[size] || paperSizes.a4;
  const paperWidth = paper.w;
  const pageHeight = paper.h;

  // Track height of actual content
  useEffect(() => {
    if (contentRef.current) {
      const observer = new ResizeObserver(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      });
      observer.observe(contentRef.current);
      
      const timer = setTimeout(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      }, 500);

      return () => {
        observer.disconnect();
        clearTimeout(timer);
      };
    }
  }, [children]);

  // Fit Width calculation
  const fitWidth = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 48; // padding margin
    setScale(Math.min(containerWidth / paperWidth, 2));
  };

  // Fit Page calculation
  const fitPage = () => {
    if (!containerRef.current || pageHeight === 0) return;
    const containerHeight = containerRef.current.clientHeight - 48;
    setScale(Math.min(containerHeight / pageHeight, 2));
  };

  // Zoom handlers
  const zoomIn = () => setScale(s => Math.min(s + 0.1, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.1, 0.2));
  const resetZoom = () => setScale(1);

  // Wheel listener for Ctrl + Scroll Zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setScale(s => Math.min(s + 0.05, 3));
        } else {
          setScale(s => Math.max(s - 0.05, 0.2));
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Touch gesture state for pinch zoom on mobile
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDist = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        const factor = dist / initialDist;
        setScale(s => Math.min(Math.max(s * factor, 0.2), 3));
        initialDist = dist;
      }
    };

    const handleTouchEnd = () => {
      initialDist = 0;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Calculate page break positions for indicator overlay lines (only for non-tally themes)
  const numPages = pageHeight > 0 ? Math.max(1, Math.ceil(contentHeight / pageHeight)) : 1;
  const breakPositions: number[] = [];
  if (theme !== 'tally' && pageHeight > 0 && numPages > 1) {
    for (let i = 1; i < numPages; i++) {
      breakPositions.push(i * pageHeight);
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-gray-100 relative">
      {/* Sticky controls bar */}
      <div className="no-print bg-white px-4 py-2 border-b border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-gray-700">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={zoomOut}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="Zoom Out"
          >
            <IconZoomOut size={16} />
          </button>
          <span className="text-[11px] md:text-[12px] font-medium text-gray-600 min-w-[36px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors"
            title="Zoom In"
          >
            <IconZoomIn size={16} />
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-[10px] font-semibold border border-gray-200 rounded hover:bg-gray-50 text-gray-700 transition-colors"
          >
            100%
          </button>
          <span className="h-4 w-[1px] bg-gray-200 mx-1" />
          <button
            onClick={fitWidth}
            className="px-2 py-1 text-[10px] font-semibold border border-gray-200 rounded hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-1"
          >
            <IconArrowsMaximize size={12} /> Fit Width
          </button>
          {pageHeight > 0 && (
            <button
              onClick={fitPage}
              className="px-2 py-1 text-[10px] font-semibold border border-gray-200 rounded hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-1"
            >
              <IconMaximize size={12} /> Fit Page
            </button>
          )}
        </div>

        <div>
          <button
            onClick={onPrint}
            className="bg-[#1a3480] hover:bg-blue-800 text-white text-[12px] font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
          >
            <IconPrinter size={14} /> Print
          </button>
        </div>
      </div>

      {/* Screen Preview Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 md:p-6 flex justify-center items-start min-h-0 select-none print-preview-scroll"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {/* Scale Container - Wraps content so scroll height is correct */}
        <div
          style={{
            width: `${paperWidth * scale}px`,
            height: `${contentHeight * scale}px`,
            position: 'relative',
            boxSizing: 'border-box'
          }}
        >
          {/* Unscaled Content Wrapper */}
          <div
            ref={contentRef}
            style={{
              width: `${paperWidth}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
              backgroundColor: '#ffffff',
              boxShadow: theme === 'tally' ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: theme === 'tally' ? 'none' : '1px solid #e2e8f0',
              boxSizing: 'border-box'
            }}
            className="print-preview-content"
          >
            {children}

            {/* Visual Page Break Indicators */}
            {breakPositions.map((pos, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: `${pos}px`,
                  left: 0,
                  right: 0,
                  height: '0px',
                  borderTop: '2px dashed #ff4d4d',
                  zIndex: 40,
                  pointerEvents: 'none'
                }}
                className="no-print"
              >
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '-10px',
                    backgroundColor: '#ff4d4d',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  PAGE BREAK {idx + 2}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
