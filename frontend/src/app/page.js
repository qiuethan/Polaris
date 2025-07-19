// app/page.js
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the Game component to avoid SSR issues
const Game = dynamic(() => import('@/components/Game'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-xl text-gray-600">Loading 3D Game...</p>
      </div>
    </div>
  )
});

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <Suspense fallback={<div>Loading...</div>}>
        <Game />
      </Suspense>
    </main>
  );
}