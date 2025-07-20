// components/GameWrapper.js
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Game component ONLY when needed
const Game = dynamic(() => import('@/components/Game'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-xl text-white">Loading 3D Game...</p>
      </div>
    </div>
  )
});

export default function GameWrapper({ onReturnToMenu }) {
  const [gameState, setGameState] = useState('playing'); // Start directly in playing state
  
  console.log(`🎮 GameWrapper received onReturnToMenu:`, !!onReturnToMenu, typeof onReturnToMenu);

  // Easy positioning parameters - Position game INSIDE the video frame
  const gameWindowPosition = {
    top: 60,     // pixels from top of video where the "screen" starts
    left: 435,    // pixels from left of video where the "screen" starts  
    width: 2540,   // width of the "screen" area in the video
    height: 1320   // height of the "screen" area in the video
  };


  // UI Element positioning (numbers + PNG)
  const uiElements = [
    { 
      number: 100, 
      png: "/health-icon.png", 
      x: 50, 
      y: 20 
    },
    { 
      number: 75, 
      png: "/ammo-icon.png", 
      x: 200, 
      y: 20 
    },
    { 
      number: 250, 
      png: "/score-icon.png", 
      x: 350, 
      y: 20 
    }
  ];

  const pauseGame = () => {
    setGameState('paused');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Video Background Frame */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      >
        <source src="/GAME.mp4" type="video/mp4" />
        <source src="/GAME.webm" type="video/webm" />
      </video>
      
      {/* Fallback gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 -z-10"></div>

      {/* Content */}
      <div className="relative z-10 w-full h-full">

        {gameState === 'playing' && (
          <div className="relative w-full h-full">
              {/* Game Controls Overlay - PNG Buttons */}
              <div className="absolute top-8 left-8 z-20 flex gap-4">
                <button
                  onClick={pauseGame}
                  className="w-12 h-12 hover:scale-110 transition-transform"
                  style={{ imageRendering: 'pixelated' }}
                >
                  <img 
                    src="/pause-button.png" 
                    alt="Pause" 
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </button>
                <button
                  onClick={onReturnToMenu}
                  className="w-12 h-12 hover:scale-110 transition-transform"
                  style={{ imageRendering: 'pixelated' }}
                >
                  <img 
                    src="/menu-button.png" 
                    alt="Menu" 
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </button>
              </div>
              
              {/* Game Container - positioned absolutely at exact coordinates */}
              <div 
                className="absolute"
                style={{
                  top: `${gameWindowPosition.top}px`,
                  left: `${gameWindowPosition.left}px`,
                  width: `${gameWindowPosition.width}px`,
                  height: `${gameWindowPosition.height}px`,
                  overflow: 'hidden',
                  zIndex: 10
                }}
              >
                <Game 
                  containerSize={gameWindowPosition} 
                  onReturnToMenu={onReturnToMenu}
                />
              </div>

              {/* UI Elements - Numbers with PNGs at exact pixel positions */}
              {uiElements.map((element, index) => (
                <div 
                  key={index}
                  className="absolute flex items-center gap-2 z-30"
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`
                  }}
                >
                  <img 
                    src={element.png} 
                    alt={`UI Element ${index}`}
                    className="w-8 h-8"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span 
                    className="text-white text-2xl font-bold"
                    style={{ 
                      fontFamily: 'monospace',
                      textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
                    }}
                  >
                    {element.number}
                  </span>
                </div>
              ))}
            </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
            <div className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-white mb-8">Game Paused</h2>
              <div className="space-y-4">
                <button
                  onClick={() => setGameState('playing')}
                  className="block w-48 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold mx-auto"
                >
                  Resume Game
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}