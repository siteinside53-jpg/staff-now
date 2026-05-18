'use client';

import { type ReactNode } from 'react';

/**
 * HeroGradient — premium animated dark background.
 * Deep blue base + 3 slow-moving blurred blobs (Stripe/Linear style).
 * No switcher — single polished look.
 */
export function HeroGradient({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden text-white">
      {/* Base: deep dark blue */}
      <div className="absolute inset-0 bg-[#060B1F]" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060B1F] via-[#0C1333] to-[#111839]" />

      {/* Animated blobs — slow smooth movement */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]"
        style={{ animation: 'heroBlob1 12s ease-in-out infinite' }}
      />
      <div
        className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full bg-indigo-500/15 blur-[100px]"
        style={{ animation: 'heroBlob2 15s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-20 left-1/3 w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[110px]"
        style={{ animation: 'heroBlob3 18s ease-in-out infinite' }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top fade for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

      {/* CSS animations — injected inline to avoid needing tailwind config */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes heroBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, 40px) scale(1.1); }
          66% { transform: translate(-30px, 60px) scale(0.95); }
        }
        @keyframes heroBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, -30px) scale(1.05); }
          66% { transform: translate(40px, -50px) scale(0.9); }
        }
        @keyframes heroBlob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -40px) scale(1.08); }
          66% { transform: translate(-60px, 20px) scale(0.92); }
        }
      `}} />

      {/* Content */}
      {children}
    </section>
  );
}
