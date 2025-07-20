// app/page.js
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Minecraft-style pixelated HomeMenu with space for your banner
function HomeMenu({ onStartGame, onShowStats }) {
  return (
    <div className="w-full h-screen relative overflow-hidden" style={{ imageRendering: 'pixelated' }}>
      {/* Background Video Loop Container */}
      <div className="absolute inset-0">
        {/* Your background video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        >
          <source src="/START.mp4" type="video/mp4" />
          <source src="/background-video.webm" type="video/webm" />
          {/* Fallback to image if video doesn't load */}
          Your browser does not support the video tag.
        </video>
        
        {/* Fallback image in case video fails to load */}
        <img 
          src="/POLARIS.png" 
          className="absolute inset-0 w-full h-full object-cover -z-10"
          style={{ imageRendering: 'pixelated' }}
          alt="Background"
        />
      </div>

      {/* Main Menu Content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-end pb-32">
        {/* PNG Image Buttons - positioned lower */}
        <div className="space-y-8">
          <button
            onClick={onStartGame}
            className="w-[600px] h-32 hover:scale-105 transition-transform"
            style={{ imageRendering: 'pixelated' }}
          >
            <img 
              src="/play-button.png" 
              alt="Play" 
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </button>
          
          <button
            onClick={onShowStats}
            className="w-[600px] h-32 hover:scale-105 transition-transform"
            style={{ imageRendering: 'pixelated' }}
          >
            <img 
              src="/stats-button.png" 
              alt="Stats" 
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </button>
        </div>
        
        {/* Version info - Minecraft style */}
        <div className="absolute bottom-8 left-8">
          <p 
            className="text-white text-sm"
            style={{ 
              fontFamily: 'monospace',
              textShadow: '1px 1px 0px rgba(0,0,0,0.8)'
            }}
          >
            Version 1.0.0
          </p>
        </div>

        {/* Copyright info - Minecraft style */}
        <div className="absolute bottom-8 right-8">
          <p 
            className="text-white text-sm"
            style={{ 
              fontFamily: 'monospace',
              textShadow: '1px 1px 0px rgba(0,0,0,0.8)'
            }}
          >
            Your Game Studio
          </p>
        </div>
      </div>
    </div>
  );
}

// Dynamically import the GameWrapper component (which contains the game)
const GameWrapper = dynamic(() => import('../components/GameWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen relative overflow-hidden">
      {/* Loading Screen Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      >
        <source src="/LOADING.mp4" type="video/mp4" />
        <source src="/loading-video.webm" type="video/webm" />
      </video>
      
      {/* Loading Content */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p 
            className="text-2xl text-white font-bold"
            style={{ 
              fontFamily: 'monospace',
              textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
            }}
          >
            Loading Game...
          </p>
        </div>
      </div>
    </div>
  )
});

export default function Home() {
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'loading' | 'playing'

  const startGame = () => {
    console.log('Starting game...');
    setGameState('loading');
    // Force 2 second loading delay
    setTimeout(() => {
      setGameState('playing');
    }, 2000);
  };

  const returnToMenu = () => {
    console.log('Returning to menu...');
    setGameState('loading');
    // Force 2 second loading delay
    setTimeout(() => {
      setGameState('menu');
    }, 2000);
  };

  const showStats = () => {
    console.log('Loading stats...');
    setGameState('loading');
    // Force 2 second loading delay
    setTimeout(() => {
      alert('Stats page coming soon!');
      setGameState('menu'); // Return to menu after stats
    }, 2000);
  };

  return (
    <main className="w-full h-screen overflow-hidden">
      {gameState === 'menu' && (
        <HomeMenu onStartGame={startGame} onShowStats={showStats} />
      )}

      {gameState === 'loading' && (
        <div className="w-full h-screen relative overflow-hidden">
          {/* Loading Screen Video Background */}
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          >
            <source src="/LOADING.mp4" type="video/mp4" />
            <source src="/loading-video.webm" type="video/webm" />
          </video>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="relative w-full h-full">
          <GameWrapper onReturnToMenu={returnToMenu} />
        </div>
      )}
    </main>
  );
}