'use client';

import React, { useState } from 'react';

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

export default function MasterScheduleModule({ sportsData = {}, categories = [], onUpdateSportsData }) {
  const [showManager, setShowManager] = useState(false);

  // Helper to aggregate and clean up ALL valid scheduled matches
  const getAllScheduledMatches = () => {
    let allMatches = [];
    
    Object.entries(sportsData).forEach(([sportKey, sportObj]) => {
      const sportName = SPORT_NAMES_MAP[sportKey] || sportKey.replace(/_/g, ' ').toUpperCase();
      const categoryRoundsMap = sportObj?.categoryRounds || {};

      Object.entries(categoryRoundsMap).forEach(([catKey, catData]) => {
        // Skip junk/legacy category keys like 'Open', 'Male', 'Female'
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
  };

  const allMasterMatches = getAllScheduledMatches();

  // Gather list of ALL active tournaments across sports for the management panel
  const getActiveTournamentsList = () => {
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
  };

  const activeTournaments = getActiveTournamentsList();

  // Handler to delete an unwanted tournament category
  const handleDeleteTournamentCategory = (sportKey, categoryKey) => {
    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to DELETE the tournament for sport "${sportKey.toUpperCase()}" under category "${categoryKey}"?\n\nThis will remove all its rounds, matches, and schedule data permanently.`
    );
    if (!confirmDelete) return;

    const updatedSportsData = { ...sportsData };
    if (updatedSportsData[sportKey]?.categoryRounds) {
      delete updatedSportsData[sportKey].categoryRounds[categoryKey];
    }

    if (onUpdateSportsData) {
      onUpdateSportsData(updatedSportsData);
    }
    alert(`Tournament for "${categoryKey}" under ${sportKey} has been deleted successfully!`);
  };

  // Calculate match counts per valid category
  const categoryMatchCounts = {};
  categories.forEach(c => {
    categoryMatchCounts[c] = allMasterMatches.filter(m => m.category.toLowerCase() === c.toLowerCase()).length;
  });

  // Group master matches by Date -> Time Slot
  const masterScheduleMatrix = {};
  allMasterMatches.forEach(m => {
    const dKey = m.scheduledDate;
    const tKey = m.scheduledTimeSlot || '11 AM to 12 PM';
    if (!masterScheduleMatrix[dKey]) masterScheduleMatrix[dKey] = {};
    if (!masterScheduleMatrix[dKey][tKey]) masterScheduleMatrix[dKey][tKey] = [];
    masterScheduleMatrix[dKey][tKey].push(m);
  });

  // Sort dates in ascending chronological order
  const sortedDates = Object.keys(masterScheduleMatrix).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    if (!isNaN(dateA) && !isNaN(dateB)) {
      return dateA - dateB;
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {/* Header with Summary Metrics & Management Button */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">📅 Master Schedule Matrix (All Sports & Categories)</h3>
          <p className="text-xs text-slate-400 mt-0.5">One-glance timeline view organized by date and time slot across all active tournament categories.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowManager(!showManager)}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-black px-3.5 py-2 rounded-xl text-xs border border-slate-700 shadow transition flex items-center gap-1.5"
          >
            <span>⚙️ Manage / Delete Tournaments ({activeTournaments.length})</span>
          </button>

          <span className="text-[11px] bg-slate-950 text-amber-400 font-bold px-3 py-2 rounded-xl border border-slate-800 shadow">
            Total Matches: <strong className="text-white">{allMasterMatches.length}</strong>
          </span>
        </div>
      </div>

      {/* TOURNAMENT MANAGER & CLEANUP DRAWER */}
      {showManager && (
        <div className="bg-slate-950 p-5 rounded-2xl border-2 border-amber-500/40 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">🛠️ Active Tournaments Cleanup Hub</h4>
              <p className="text-[11px] text-slate-400">View all active tournament categories across your sports and delete any legacy or unneeded ones (such as accidental 'Open' or 'Male' categories).</p>
            </div>
            <button onClick={() => setShowManager(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕ Close</button>
          </div>

          {activeTournaments.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No active tournaments found in the database.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeTournaments.map((t) => (
                <div key={`${t.sportKey}_${t.categoryKey}`} className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 shadow ${t.isJunk ? 'bg-rose-950/20 border-rose-500/50' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded border border-amber-500/30">
                        {t.sportName}
                      </span>
                      {t.isJunk && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/30">
                          Unwanted Tag
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-slate-100 text-sm pt-1">Category: <span className="text-amber-400">{t.categoryKey}</span></h5>
                    <p className="text-[11px] text-slate-400">Rounds: <strong className="text-slate-200">{t.roundsCount}</strong> • Matches: <strong className="text-slate-200">{t.matchCount}</strong></p>
                  </div>

                  <button
                    onClick={() => handleDeleteTournamentCategory(t.sportKey, t.categoryKey)}
                    className="w-full bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 font-black py-2 rounded-lg text-xs shadow transition flex items-center justify-center gap-1.5"
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
        <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
          <p className="text-sm">No valid matches scheduled yet across any sport or category.</p>
          <p className="text-xs text-slate-500">Initialize and start rounds in your valid tournament categories to populate the timeline matrix.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const timeSlots = masterScheduleMatrix[dateKey];
            return (
              <div key={dateKey} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <span className="text-base">📅</span>
                  <h4 className="font-black text-amber-400 text-sm">Date: {dateKey}</h4>
                </div>

                <div className="space-y-4">
                  {Object.entries(timeSlots).map(([timeKey, matchesList]) => (
                    <div key={timeKey} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-rose-300 bg-rose-950/70 px-3 py-1 rounded-lg border border-rose-500/40">
                          ⏰ {timeKey}
                        </span>
                        <span className="text-[11px] text-slate-400 font-bold">
                          {matchesList.length} match(es) scheduled in this slot
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {matchesList.map((m) => (
                          <div key={m.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 shadow">
                            <div className="flex flex-wrap justify-between items-start gap-1">
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded border border-amber-500/30">
                                🏅 {m.sportName}
                              </span>
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-black px-2 py-0.5 rounded border border-emerald-500/20">
                                {m.category}
                              </span>
                            </div>

                            <div className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold inline-block">
                              {m.roundName} • {m.groupName}
                            </div>

                            <div className="text-xs font-bold text-slate-100 flex items-center justify-between pt-1">
                              <span>{m.playerA.name} <span className="text-amber-400 font-normal">vs</span> {m.playerB.name}</span>
                            </div>

                            {m.isLocked && m.scoreA !== null && m.scoreB !== null && (
                              <div className="text-[10px] text-emerald-400 font-bold pt-1 border-t border-slate-800/60">
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