import React from 'react';

export function Watermark() {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4 z-20">
      <div className="flex flex-col justify-end items-start w-full opacity-90 mt-auto">
        <svg viewBox="0 0 300 30" className="h-4 sm:h-5 w-auto fill-white" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}>
          <text x="0" y="24" fontFamily="serif" fontSize="26" fontWeight="bold" letterSpacing="2">ASPEN FASHION</text>
        </svg>
        <svg viewBox="0 0 450 20" className="h-2 sm:h-2.5 w-auto fill-white mt-1" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}>
          <text x="0" y="16" fontFamily="sans-serif" fontSize="16" letterSpacing="2">by PATRICK HENRY SWEENEY</text>
        </svg>
      </div>
    </div>
  );
}
