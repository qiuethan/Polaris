import { useState, useEffect } from 'react';

// Simple stats hook - calories, power, and movement history per player
export const useSimpleStats = (playerId = 'player1') => {
  const [calories, setCalories] = useState(0);
  const [power, setPower] = useState(0);
  const [movementHistory, setMovementHistory] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false); // Track if data has been loaded from localStorage

  // Load from localStorage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('gameStats');
    console.log(`📊 [${playerId}] Loading stats from localStorage:`, savedStats);
    
    if (savedStats) {
      try {
        const allStats = JSON.parse(savedStats);
        console.log(`📊 [${playerId}] Parsed stats:`, allStats);
        
        const playerStats = allStats[playerId] || { calories: 0, power: 0, movements: [] };
        console.log(`📊 [${playerId}] Player specific stats:`, playerStats);
        
        setCalories(playerStats.calories);
        setPower(playerStats.power);
        setMovementHistory(playerStats.movements || []);
        
        console.log(`📊 [${playerId}] Stats loaded - Calories: ${playerStats.calories}, Power: ${playerStats.power}, Movements: ${playerStats.movements?.length || 0}`);
      } catch (error) {
        console.error(`❌ [${playerId}] Error loading stats:`, error);
      }
    } else {
      console.log(`📊 [${playerId}] No saved stats found in localStorage`);
    }
    
    // Mark as loaded after attempting to load from localStorage
    setIsLoaded(true);
  }, [playerId]);

  // Save to localStorage whenever stats change (but only after initial load)
  useEffect(() => {
    // Only save if data has been loaded from localStorage first
    if (!isLoaded) {
      console.log(`⏳ [${playerId}] Skipping save - data not loaded yet`);
      return;
    }
    
    // Always save the current state (even if zeros) after initial load
    const savedStats = localStorage.getItem('gameStats');
    let allStats = {};
    try {
      allStats = savedStats ? JSON.parse(savedStats) : {};
    } catch (error) {
      console.error(`❌ [${playerId}] Error parsing existing stats:`, error);
      allStats = {};
    }
    
    allStats[playerId] = { calories, power, movements: movementHistory };
    const dataToSave = JSON.stringify(allStats);
    localStorage.setItem('gameStats', dataToSave);
    
    console.log(`💾 [${playerId}] Stats saved - Calories: ${calories}, Power: ${power}, Movements: ${movementHistory.length}`);
  }, [calories, power, movementHistory, playerId, isLoaded]);

  // Add movement with calories and power values
  const addMovement = (movementType) => {
    let caloriesGained = 0;
    let powerGained = 0;

    switch (movementType) {
      case 'jump':
        caloriesGained = 0.5;
        powerGained = 200;
        break;
      case 'crouch':
        caloriesGained = 0.25;
        powerGained = 100;
        break;
      case 'run':
        caloriesGained = 0.35;
        powerGained = 150;
        break;
      default:
        caloriesGained = 0.1;
        powerGained = 50;
    }

    const timestamp = Date.now();
    const newCalories = calories + caloriesGained;
    const newPower = power + powerGained;

    // Add to movement history for line chart
    const movementEntry = {
      timestamp,
      movementType,
      caloriesGained,
      powerGained,
      totalCalories: newCalories,
      totalPower: newPower
    };

    setCalories(newCalories);
    setPower(newPower);
    setMovementHistory(prev => [...prev, movementEntry]);
    
    console.log(`🔥 [${playerId}] Movement added: ${movementType} (+${caloriesGained} cal, +${powerGained} power) - Total: ${newCalories} cal, ${newPower} power`);
  };

  // Reset stats for this player
  const resetStats = () => {
    setCalories(0);
    setPower(0);
    setMovementHistory([]);
    setIsLoaded(true); // Keep loaded state to allow saving
  };

  // Reset all stats for all players
  const resetAllStats = () => {
    setCalories(0);
    setPower(0);
    setMovementHistory([]);
    setIsLoaded(true); // Keep loaded state to allow saving
    localStorage.removeItem('gameStats');
  };

  return {
    calories,
    power,
    movementHistory,
    isLoaded,
    addMovement,
    resetStats,
    resetAllStats
  };
};

export default useSimpleStats; 