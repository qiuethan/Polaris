import { useState, useEffect } from 'react';

// Simple stats hook - calories, distance, cadence, and movement history per player
export const useSimpleStats = (playerId = 'player1') => {
  const [calories, setCalories] = useState(0);
  const [distance, setDistance] = useState(0);
  const [cadence, setCadence] = useState(0);
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
        
        const playerStats = allStats[playerId] || { calories: 0, distance: 0, cadence: 0, movements: [] };
        console.log(`📊 [${playerId}] Player specific stats:`, playerStats);
        
        setCalories(playerStats.calories);
        setDistance(playerStats.distance);
        setCadence(playerStats.cadence);
        setMovementHistory(playerStats.movements || []);
        
        console.log(`📊 [${playerId}] Stats loaded - Calories: ${playerStats.calories}, Distance: ${playerStats.distance}, Cadence: ${playerStats.cadence}, Movements: ${playerStats.movements?.length || 0}`);
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
    
    allStats[playerId] = { calories, distance, cadence, movements: movementHistory };
    const dataToSave = JSON.stringify(allStats);
    localStorage.setItem('gameStats', dataToSave);
    
    console.log(`💾 [${playerId}] Stats saved - Calories: ${calories}, Distance: ${distance}, Cadence: ${cadence}, Movements: ${movementHistory.length}`);
  }, [calories, distance, cadence, movementHistory, playerId, isLoaded]);

  // Add movement with calories, distance, and cadence
  const addMovement = (movementType) => {
    let caloriesGained = 0;
    let distanceGained = 0;

    switch (movementType) {
      case 'jump':
        caloriesGained = 0.5;
        distanceGained = 1.5; // meters forward + upward
        break;
      case 'crouch':
        caloriesGained = 0.25;
        distanceGained = 0.5; // slight forward movement
        break;
      case 'run':
        caloriesGained = 0.35;
        distanceGained = 2.0; // meters per step
        break;
      default:
        caloriesGained = 0.1;
        distanceGained = 0.8; // default movement
    }

    const timestamp = Date.now();
    const newCalories = calories + caloriesGained;
    const newDistance = distance + distanceGained;

    // Calculate cadence (movements per minute) based on recent activity
    const oneMinuteAgo = timestamp - 60000;
    const recentMovements = [...movementHistory, { timestamp }].filter(m => m.timestamp > oneMinuteAgo);
    const newCadence = recentMovements.length;

    // Add to movement history for line chart
    const movementEntry = {
      timestamp,
      movementType,
      caloriesGained,
      distanceGained,
      totalCalories: newCalories,
      totalDistance: newDistance,
      totalCadence: newCadence
    };

    setCalories(newCalories);
    setDistance(newDistance);
    setCadence(newCadence);
    setMovementHistory(prev => [...prev, movementEntry]);
    
    console.log(`🔥 [${playerId}] Movement added: ${movementType} (+${caloriesGained} cal, +${distanceGained}m) - Total: ${newCalories} cal, ${newDistance.toFixed(1)}m, ${newCadence} cadence`);
  };

  // Reset stats for this player
  const resetStats = () => {
    setCalories(0);
    setDistance(0);
    setCadence(0);
    setMovementHistory([]);
    setIsLoaded(true); // Keep loaded state to allow saving
  };

  // Reset all stats for all players
  const resetAllStats = () => {
    setCalories(0);
    setDistance(0);
    setCadence(0);
    setMovementHistory([]);
    setIsLoaded(true); // Keep loaded state to allow saving
    localStorage.removeItem('gameStats');
  };

  return {
    calories,
    distance,
    cadence,
    movementHistory,
    isLoaded,
    addMovement,
    resetStats,
    resetAllStats
  };
};

export default useSimpleStats; 