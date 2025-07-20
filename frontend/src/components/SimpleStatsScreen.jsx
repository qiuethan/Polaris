import React from 'react';
import { useSimpleStats } from '../hooks/useSimpleStats';

// Combined Line Chart Component with Legend
const CombinedLineChart = ({ datasets, title }) => {
  // Check if we have any data
  const hasData = datasets.some(dataset => dataset.data && dataset.data.length > 0);
  
  if (!hasData) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <h4 className="text-lg font-bold mb-2">{title}</h4>
        <div className="text-gray-500 text-center py-8">No data to display</div>
      </div>
    );
  }

  // Calculate global min/max across all datasets
  const allValues = datasets.flatMap(dataset => 
    dataset.data ? dataset.data.map(d => d.value) : []
  );
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const range = maxValue - minValue || 1;

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg">
      <h4 className="text-lg font-bold mb-2">{title}</h4>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mb-3 flex-wrap">
        {datasets.map((dataset, index) => (
          <div key={index} className="flex items-center gap-2">
            <svg width="20" height="6" className="flex-shrink-0">
              <line
                x1="0"
                y1="3"
                x2="20"
                y2="3"
                stroke={dataset.color}
                strokeWidth="2"
                strokeDasharray={dataset.dashPattern || "none"}
                strokeLinecap="round"
              />
            </svg>
            <span className="text-sm font-medium">{dataset.label}</span>
          </div>
        ))}
      </div>
      
      <div className="relative h-40 bg-gray-50 rounded">
        <svg width="100%" height="100%" className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <line
              key={ratio}
              x1="0"
              y1={`${ratio * 100}%`}
              x2="100%"
              y2={`${ratio * 100}%`}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Data lines for each dataset */}
          {datasets.map((dataset, datasetIndex) => {
            if (!dataset.data || dataset.data.length === 0) return null;
            
            return (
              <g key={datasetIndex}>
                {/* Data line */}
                {dataset.data.length > 1 && (
                  <polyline
                    points={dataset.data.map((point, index) => {
                      const x = (index / (dataset.data.length - 1)) * 100;
                      const y = (1 - (point.value - minValue) / range) * 100;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke={dataset.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={dataset.dashPattern || "none"}
                  />
                )}
                
                {/* Data points */}
                {dataset.data.map((point, index) => {
                  const x = (index / Math.max(dataset.data.length - 1, 1)) * 100;
                  const y = (1 - (point.value - minValue) / range) * 100;
                  return (
                    <circle
                      key={index}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="3"
                      fill={dataset.color}
                      stroke="white"
                      strokeWidth="1"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 -ml-8">
          <span>{maxValue.toFixed(1)}</span>
          <span>{minValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

export const SimpleStatsScreen = ({ winner }) => {
  const player1Stats = useSimpleStats('player1');
  const player2Stats = useSimpleStats('player2');
  
  // Debug: Log stats when component mounts or when data loads
  React.useEffect(() => {
    if (player1Stats.isLoaded && player2Stats.isLoaded) {
      console.log('🏆 Stats Screen - Data loaded:', {
        player1: { 
          calories: player1Stats.calories, 
          distance: player1Stats.distance, 
          cadence: player1Stats.cadence,
          movements: player1Stats.movementHistory?.length || 0 
        },
        player2: { 
          calories: player2Stats.calories, 
          distance: player2Stats.distance, 
          cadence: player2Stats.cadence,
          movements: player2Stats.movementHistory?.length || 0 
        }
      });
    }
  }, [player1Stats.isLoaded, player2Stats.isLoaded, player1Stats.calories, player2Stats.calories]);

  // Prepare chart data for calories, distance, and cadence
  const player1CaloriesData = player1Stats.movementHistory.map((movement, index) => ({
    index,
    value: movement.totalCalories,
    timestamp: movement.timestamp
  }));

  const player2CaloriesData = player2Stats.movementHistory.map((movement, index) => ({
    index,
    value: movement.totalCalories,
    timestamp: movement.timestamp
  }));

  const player1DistanceData = player1Stats.movementHistory.map((movement, index) => ({
    index,
    value: movement.totalDistance || 0,
    timestamp: movement.timestamp
  }));

  const player2DistanceData = player2Stats.movementHistory.map((movement, index) => ({
    index,
    value: movement.totalDistance || 0,
    timestamp: movement.timestamp
  }));

  const player1CadenceData = player1Stats.movementHistory.map((movement, index) => ({
    index,
    value: movement.totalCadence || 0,
    timestamp: movement.timestamp
  }));

  const player2CadenceData = player2Stats.movementHistory.map((movement, index) => ({
    index,
    value: movement.totalCadence || 0,
    timestamp: movement.timestamp
  }));

  const handleBackToHome = () => {
    window.location.reload(); // Simple page refresh to go back to main menu
  };

  const handleResetStats = () => {
    player1Stats.resetAllStats();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-6">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-6xl mx-auto text-center">
        {/* Winner */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          🏆 Race Complete!
        </h1>
        
        {winner && (
          <p className="text-xl text-blue-600 font-semibold mb-6">
            Winner: {winner}
          </p>
        )}

        {/* Stats for Both Players */}
        <div className="space-y-6 mb-8">
          {/* Player 1 Stats */}
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <h3 className="text-lg font-bold text-blue-800 mb-3">🔵 Player 1</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xl font-bold text-red-600">
                  {player1Stats.calories.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Calories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">📏</div>
                <div className="text-xl font-bold text-blue-600">
                  {(player1Stats.distance || 0).toFixed(1)}m
                </div>
                <div className="text-sm text-gray-600">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">⏱️</div>
                <div className="text-xl font-bold text-green-600">
                  {player1Stats.cadence || 0}/min
                </div>
                <div className="text-sm text-gray-600">Cadence</div>
              </div>
            </div>
          </div>

          {/* Player 2 Stats */}
          <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
            <h3 className="text-lg font-bold text-red-800 mb-3">🔴 Player 2</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xl font-bold text-red-600">
                  {player2Stats.calories.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Calories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">📏</div>
                <div className="text-xl font-bold text-blue-600">
                  {(player2Stats.distance || 0).toFixed(1)}m
                </div>
                <div className="text-sm text-gray-600">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">⏱️</div>
                <div className="text-xl font-bold text-green-600">
                  {player2Stats.cadence || 0}/min
                </div>
                <div className="text-sm text-gray-600">Cadence</div>
              </div>
            </div>
          </div>

          {/* Total Stats */}
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📊 Combined Total</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xl font-bold text-red-600">
                  {(player1Stats.calories + player2Stats.calories).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Total Calories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">📏</div>
                <div className="text-xl font-bold text-blue-600">
                  {((player1Stats.distance || 0) + (player2Stats.distance || 0)).toFixed(1)}m
                </div>
                <div className="text-sm text-gray-600">Total Distance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">⏱️</div>
                <div className="text-xl font-bold text-green-600">
                  {Math.round(((player1Stats.cadence || 0) + (player2Stats.cadence || 0)) / 2)}/min
                </div>
                <div className="text-sm text-gray-600">Avg Cadence</div>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Chart with All Metrics for Both Players */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <CombinedLineChart 
            title="📈 Player Performance Comparison"
            datasets={[
              {
                data: player1CaloriesData,
                color: "#3b82f6",
                label: "🔵 Player 1 - Calories",
                dashPattern: "none"
              },
              {
                data: player2CaloriesData,
                color: "#ef4444",
                label: "🔴 Player 2 - Calories",
                dashPattern: "none"
              },
              {
                data: player1DistanceData,
                color: "#3b82f6", 
                label: "🔵 Player 1 - Distance",
                dashPattern: "8,4"
              },
              {
                data: player2DistanceData,
                color: "#ef4444",
                label: "🔴 Player 2 - Distance",
                dashPattern: "8,4"
              },
              {
                data: player1CadenceData,
                color: "#3b82f6",
                label: "🔵 Player 1 - Cadence",
                dashPattern: "4,2"
              },
              {
                data: player2CadenceData,
                color: "#ef4444",
                label: "🔴 Player 2 - Cadence",
                dashPattern: "4,2"
              }
            ]}
          />
        </div>

        {/* Back to Main Menu Button */}
        <div className="flex justify-center">
          <button
            onClick={handleBackToHome}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            🏠 Back to Main Menu
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-4">
          Stats saved in localStorage
        </div>
      </div>
    </div>
  );
};

export default SimpleStatsScreen; 