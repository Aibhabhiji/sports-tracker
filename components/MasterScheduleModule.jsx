'use client';

import React, { useState, useMemo, useCallback } from 'react';

const SPORT_NAMES_MAP = {
  cricket: 'Cricket',
  football: 'Football',
  badminton: 'Badminton',
  table_tennis: 'Table Tennis',
  tug_of_war: 'Tug of War',
  chess: 'Chess',
  carrom: 'Carrom',
  marathon: 'Marathon',
  walking: 'Walking',
  swimming: 'Swimming',
  quiz: 'Quiz',
};

// Categories that should be ignored/hidden from master schedules if they are junk/legacy tags
const IGNORED_CATEGORIES = ['open', 'male', 'female', 'kids', 'n/a', 'all categories'];

function MasterScheduleModule({ sportsData = {}, categories = [], onUpdateSportsData }) {
  const [showManager, setShowManager] = useState(false);

  // 1. Memoized aggregation and cleanup of valid scheduled matches
  const allMasterMatches = useMemo(() => {
    let allMatches = [];
    
    Object.entries(sportsData).forEach(([sportKey, sportObj]) => {
      const sportName = SPORT_NAMES_MAP[sportKey] || sportKey.replace(/_/g, ' ').toUpperCase();
      const categoryRoundsMap = sportObj?.categoryRounds || {};

      Object.entries(categoryRoundsMap).forEach(([catKey, catData]) => {
        if (IGNORED_CATEGORIES.includes(catKey.trim().toLowerCase())) {
          return;
        }

        const roundsList = catData?.rounds || [];
        roundsList.forEach(r => {
          (r.groups || []).forEach(g => {
            (g.matches || []).forEach(m => {
              const hasValidPlayers = m?.playerA?.name && m?.playerB?.name && 
                                     m.playerA.name.trim() !== '' && m.playerB.name.trim() !== '' &&
                                     m.playerA.name !== 'Player A' && m.playerB.name !== 'Player B';
              const hasValidDate = m?.scheduledDate && m.scheduledDate.trim() !== '';

              if (hasValidPlayers && hasValidDate) {
                allMatches.push({
                  ...m,
                  sportKey,
                  sportName,
                  category: catKey,
                  roundName: r.roundName,
                  groupName: g.groupName
                });
              }
            });
          });
        });
      });
    });

    return allMatches;
  }, [sportsData]);

  // 2. Memoized list of active tournaments across sports for the management panel
  const activeTournaments = useMemo(() => {
    let list = [];
    Object.entries(sportsData).forEach(([sportKey, sportObj]) => {
      const sportName = SPORT_NAMES_MAP[sportKey] || sportKey.replace(/_/g, ' ').toUpperCase();
      const categoryRoundsMap = sportObj?.categoryRounds || {};

      Object.entries(categoryRoundsMap).forEach(([catKey, catData]) => {
        const roundsList = catData?.rounds || [];
        if (roundsList.length > 0) {
          let matchCount = 0;
          roundsList.forEach(r => {
            (r.groups || []).forEach(g => {
              matchCount += (g.matches || []).length;
            });
          });

          list.push({
            sportKey,
            sportName,
            categoryKey: catKey,
            roundsCount: roundsList.length,
            matchCount,
            isJunk: IGNORED_CATEGORIES.includes(catKey.trim().toLowerCase())
          });
        }
      });
    });
    return list;
  }, [sportsData]);

  // 3. Optimized & immutable delete handler to prevent unintended state mutation reference issues
  const handleDeleteTournamentCategory = useCallback((sportKey, categoryKey) => {
    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to DELETE the tournament for sport "${sportKey.toUpperCase()}" under category "${categoryKey}"?\n\nThis will remove all its rounds, matches, and schedule data permanently.`
    );
    if (!confirmDelete) return;

    // Deep-clone the modified path safely to maintain strict immutability
    const updatedSportsData = {
      ...sportsData,
      [sportKey]: {
        ...sportsData[sportKey],
        categoryRounds: { ...sportsData[sportKey]?.categoryRounds }
      }
    };

    if (updatedSportsData[sportKey]?.categoryRounds) {
      delete updatedSportsData[sportKey].categoryRounds[categoryKey];
    }

    if (onUpdateSportsData) {
      onUpdateSportsData(updatedSportsData);
    }
    alert(`Tournament for "${categoryKey}" under ${sportKey} has been deleted successfully!`);
  }, [sportsData, onUpdateSportsData]);

  // 4. Memoized Matrix mapping (Date -> Time Slot) and Chronological Sort
  const { masterScheduleMatrix, sortedDates } = useMemo(() => {
    const matrix = {};
    allMasterMatches.forEach(m => {
      const dKey = m.scheduledDate;
      const tKey = m.scheduledTimeSlot || '11 AM to 12 PM';
      if (!matrix[dKey]) matrix[dKey] = {};
      if (!matrix[dKey][tKey]) matrix[dKey][tKey] = [];
      matrix[dKey][tKey].push(m);
    });

    const dates = Object.keys(matrix).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return dateA - dateB;
      }
      return a.localeCompare(b);
    });

    return { masterScheduleMatrix: matrix, sortedDates: dates };
  }, [allMasterMatches]);

  return (
    <div className="space-y-6 text-sm">
      {/* Header with Summary Metrics & Management Button */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h3 className="text-base font-black text-amber-600 uppercase tracking-wider">📅 Master Schedule Matrix (All Sports & Categories)</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">One-glance timeline view organized by date and time slot across all active tournament categories.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowManager(!showManager)}
            className="bg-slate-100 hover:bg-slate-200 text-amber-700 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-200 shadow-sm transition flex items-center gap-1.5"
          >
            <span>⚙️ Manage / Delete Tournaments ({activeTournaments.length})</span>
          </button>

          <span className="text-xs sm:text-sm bg-amber-50 text-amber-800 font-bold px-3.5 py-2.5 rounded-xl border border-amber-200 shadow-sm">
            Total Matches: <strong className="text-amber-900">{allMasterMatches.length}</strong>
          </span>
        </div>
      </div>

      {/* TOURNAMENT MANAGER & CLEANUP DRAWER */}
      {showManager && (
        <div className="bg-amber-50/60 p-6 rounded-2xl border-2 border-amber-400 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-amber-200 pb-3">
            <div>
              <h4 className="text-sm sm:text-base font-black text-amber-800 uppercase tracking-wider">🛠️ Active Tournaments Cleanup Hub</h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">View all active tournament categories across your sports and delete any legacy or unneeded ones (such as accidental 'Open' or 'Male' categories).</p>
            </div>
            <button onClick={() => setShowManager(false)} className="text-slate-500 hover:text-slate-800 text-sm font-bold">✕ Close</button>
          </div>

          {activeTournaments.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-500 py-6 text-center">No active tournaments found in the database.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTournaments.map((t) => (
                <div key={`${t.sportKey}_${t.categoryKey}`} className={`p-4 sm:p-5 rounded-xl border flex flex-col justify-between space-y-4 shadow-sm ${t.isJunk ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs bg-amber-100 text-amber-800 font-black px-2.5 py-1 rounded border border-amber-200">
                        {t.sportName}
                      </span>
                      {t.isJunk && (
                        <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                          Unwanted Tag
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-slate-900 text-base pt-1">Category: <span className="text-amber-600">{t.categoryKey}</span></h5>
                    <p className="text-xs sm:text-sm text-slate-500">Rounds: <strong className="text-slate-800">{t.roundsCount}</strong> • Matches: <strong className="text-slate-800">{t.matchCount}</strong></p>
                  </div>

                  <button
                    onClick={() => handleDeleteTournamentCategory(t.sportKey, t.categoryKey)}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black py-2.5 rounded-lg text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-1.5"
                  >
                    <span>🗑️ Delete Tournament</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Matrix Content */}
      {sortedDates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3 shadow-sm">
          <p className="text-base font-bold text-slate-700">No valid matches scheduled yet across any sport or category.</p>
          <p className="text-xs sm:text-sm text-slate-400">Initialize and start rounds in your valid tournament categories to populate the timeline matrix.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const timeSlots = masterScheduleMatrix[dateKey];
            return (
              <div key={dateKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
                  <span className="text-lg">📅</span>
                  <h4 className="font-black text-amber-600 text-base sm:text-lg">Date: {dateKey}</h4>
                </div>

                <div className="space-y-5">
                  {Object.entries(timeSlots).map(([timeKey, matchesList]) => (
                    <div key={timeKey} className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
                      {/* Prominent Time Slot & Match Count Header */}
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-rose-700 bg-rose-50 px-3.5 py-2 rounded-lg border border-rose-200 text-sm sm:text-base">
                            ⏰ {timeKey}
                          </span>
                          <span className="bg-amber-100 text-amber-800 font-black px-3 py-1.5 rounded-md border border-amber-200 text-xs sm:text-sm">
                            {matchesList.length} Match{matchesList.length > 1 ? 'es' : ''} in this slot
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {matchesList.map((m) => (
                          <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                            <div className="flex flex-wrap justify-between items-start gap-1.5">
                              <span className="text-xs bg-amber-50 text-amber-700 font-black px-2.5 py-1 rounded border border-amber-200">
                                🏅 {m.sportName}
                              </span>
                              <span className="text-xs bg-emerald-50 text-emerald-700 font-black px-2.5 py-1 rounded border border-emerald-200">
                                {m.category}
                              </span>
                            </div>

                            <div className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-bold inline-block border border-slate-200">
                              {m.roundName} • {m.groupName}
                            </div>

                            <div className="text-sm sm:text-base font-bold text-slate-900 flex items-center justify-between pt-1">
                              <span>{m.playerA.name} <span className="text-amber-600 font-normal">vs</span> {m.playerB.name}</span>
                            </div>

                            {m.isLocked && m.scoreA !== null && m.scoreB !== null && (
                              <div className="text-xs text-emerald-700 font-bold pt-2 border-t border-slate-100">
                                Result: {m.scoreA} - {m.scoreB} 🔒
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(MasterScheduleModule);