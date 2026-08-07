'use client';

import React, { useState } from 'react';

export default function ChessAdvancedModule({ participants = [], sportState = {}, onUpdateSportState }) {
  // Standard categories + dynamic categories extracted from participants
  const defaultCategories = ['Open', 'Under 12 Kids', '12 - 17 years Teens', '18 - 55 years Adults', '55+ years Seniors', 'Kids', 'Male', 'Female', 'Under 16', 'Veterans'];
  const dynamicCategories = Array.from(new Set(
    (participants || []).flatMap(p => [
      p.category, p.Category, p.ageGroup, p.AgeGroup, p.gender, p.Gender
    ].filter(Boolean))
  ));
  const categories = Array.from(new Set([...(sportState?.categories || []), ...defaultCategories, ...dynamicCategories]));

  const [selectedCategory, setSelectedCategory] = useState('Open');
  
  // Per-category rounds and round indices stored in sportState.categoryRounds
  const categoryRoundsMap = sportState?.categoryRounds || {};
  const currentCategoryData = categoryRoundsMap[selectedCategory] || { rounds: [], currentRoundIndex: 0 };
  const rounds = currentCategoryData.rounds;
  const currentRoundIndex = currentCategoryData.currentRoundIndex;

  const [advancementCount, setAdvancementCount] = useState(2);
  const [groupSize, setGroupSize] = useState(4);
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // --------------------------------------------------------------------------
  // AUTO-SCHEDULING ENGINE CONFIGURATION STATE
  // --------------------------------------------------------------------------
  const [scheduleConfig, setScheduleConfig] = useState({
    startDate: '2026-08-15',
    startTime: '11:00',
    allottedHours: 4,     // e.g., 11 AM to 3 PM
    matchDuration: 1,      // 1 hour per match
    parallelCapacity: 3,   // 3 parallel matches per slot
  });
  const [showScheduleConfig, setShowScheduleConfig] = useState(false);

  // Helper to format Date to '15Aug26' style
  const formatDateShort = (dateObj) => {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' });
    const year = String(dateObj.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  };

  // Helper to format Hour (24h to 12h AM/PM string)
  const formatHour12 = (hour24) => {
    const h = hour24 % 12 || 12;
    const ampm = hour24 >= 12 && hour24 < 24 ? 'PM' : 'AM';
    return `${h} ${ampm}`.replace(' ', '');
  };

  // Auto-Scheduling Logic: Calculates Date & Time slot for each match index
  const calculateMatchSchedule = (matchIndex, config = scheduleConfig) => {
    const startD = new Date(config.startDate || '2026-08-15');
    const startHour = parseInt((config.startTime || '11:00').split(':')[0], 10);
    const slotsPerDay = Math.floor(config.allottedHours / config.matchDuration) || 1;
    const totalCapacityPerDay = slotsPerDay * config.parallelCapacity;

    const dayOffset = Math.floor(matchIndex / totalCapacityPerDay);
    const matchIndexWithinDay = matchIndex % totalCapacityPerDay;

    const slotIndex = Math.floor(matchIndexWithinDay / config.parallelCapacity);

    // Compute actual date
    const currentDate = new Date(startD);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateStr = formatDateShort(currentDate);

    // Compute start and end times for this slot
    const slotStartHour = startHour + (slotIndex * config.matchDuration);
    const slotEndHour = slotStartHour + config.matchDuration;

    const startFormatted = formatHour12(slotStartHour);
    const endFormatted = formatHour12(slotEndHour);

    const timeSlotStr = `${startFormatted} to ${endFormatted}`;
    const fullText = `Date:${dateStr} ${timeSlotStr}`;

    return {
      scheduledDate: dateStr,
      scheduledTimeSlot: timeSlotStr,
      fullScheduleText: fullText,
    };
  };

  // Sync player schedules to sportState.playerSchedules for Tile Display sync
  const buildPlayerSchedulesMap = (updatedRoundsMap) => {
    const schedulesMap = { ...(sportState.playerSchedules || {}) };

    Object.entries(updatedRoundsMap).forEach(([catKey, catData]) => {
      const catRounds = catData?.rounds || [];
      catRounds.forEach(r => {
        (r.groups || []).forEach(g => {
          (g.matches || []).forEach(m => {
            if (m.playerA?.id) {
              schedulesMap[m.playerA.id] = {
                scheduledText: m.fullScheduleText || `Date:${m.scheduledDate} ${m.scheduledTimeSlot}`,
                roundName: r.roundName,
                category: catKey,
              };
            }
            if (m.playerB?.id) {
              schedulesMap[m.playerB.id] = {
                scheduledText: m.fullScheduleText || `Date:${m.scheduledDate} ${m.scheduledTimeSlot}`,
                roundName: r.roundName,
                category: catKey,
              };
            }
          });
        });
      });
    });

    return schedulesMap;
  };

  // Filter participants for current category
  const rawFiltered = (participants || []).filter(p => {
    if (!selectedCategory || selectedCategory === 'Open' || selectedCategory === 'All') return true;

    const catStr = selectedCategory.toLowerCase();
    const pCat = (p.category || p.Category || '').toString().toLowerCase();
    const pAgeGroup = (p.ageGroup || p.AgeGroup || p['Age Group'] || '').toString().toLowerCase();
    const pGender = (p.gender || p.Gender || '').toString().toLowerCase();
    const pAge = (p.age || p.Age || '').toString();

    if (pCat === catStr || pAgeGroup === catStr || pGender === catStr) return true;
    if (catStr.includes('under 12') || catStr.includes('kids')) {
      const num = parseInt(pAge.match(/\d+/)?.[0] || '99', 10);
      return num < 12 || pCat.includes('kid') || pAgeGroup.includes('kid');
    }
    if (catStr.includes('12 - 17') || catStr.includes('teens') || catStr.includes('under 16')) {
      const num = parseInt(pAge.match(/\d+/)?.[0] || '99', 10);
      return (num >= 12 && num <= 17) || num < 16 || pCat.includes('teen') || pAgeGroup.includes('teen');
    }
    if (catStr.includes('18 - 55') || catStr.includes('adults')) {
      const num = parseInt(pAge.match(/\d+/)?.[0] || '0', 10);
      return (num >= 18 && num <= 55) || pCat.includes('adult') || pAgeGroup.includes('adult');
    }
    if (catStr.includes('55+') || catStr.includes('seniors') || catStr.includes('veterans')) {
      const num = parseInt(pAge.match(/\d+/)?.[0] || '0', 10);
      return num >= 55 || pCat.includes('senior') || pCat.includes('veteran');
    }

    return pCat.includes(catStr) || pAgeGroup.includes(catStr);
  });

  // Strict deduplication by ID and normalized Name
  const seenIds = new Set();
  const seenNames = new Set();
  const filteredParticipants = rawFiltered.filter(p => {
    const normName = p.name?.trim().toLowerCase();
    if (seenIds.has(p.id) || (normName && seenNames.has(normName))) {
      return false;
    }
    seenIds.add(p.id);
    if (normName) seenNames.add(normName);
    return true;
  });

  const updateCurrentCategoryState = (newRounds, newRoundIndex) => {
    const updatedMap = {
      ...categoryRoundsMap,
      [selectedCategory]: {
        rounds: newRounds !== undefined ? newRounds : rounds,
        currentRoundIndex: newRoundIndex !== undefined ? newRoundIndex : currentRoundIndex,
      }
    };
    
    const updatedPlayerSchedules = buildPlayerSchedulesMap(updatedMap);
    onUpdateSportState({ categoryRounds: updatedMap, playerSchedules: updatedPlayerSchedules });
  };

  const handleInitializeRound1 = () => {
    if (filteredParticipants.length < 2) {
      alert(`Not enough available participants in category "${selectedCategory}" to start Round 1.`);
      return;
    }

    const shuffled = [...filteredParticipants].sort(() => 0.5 - Math.random());
    const initialGroups = [];
    let groupCharCode = 65;
    let globalMatchCounter = 0;

    for (let i = 0; i < shuffled.length; i += groupSize) {
      const groupPlayers = shuffled.slice(i, i + groupSize);
      const groupName = `Group ${String.fromCharCode(groupCharCode++)}`;
      
      const standings = groupPlayers.map(p => ({
        id: p.id,
        name: p.name,
        flat: p.flat,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      }));

      const matches = [];
      for (let x = 0; x < standings.length; x++) {
        for (let y = x + 1; y < standings.length; y++) {
          const sched = calculateMatchSchedule(globalMatchCounter++);

          matches.push({
            id: `MATCH_${selectedCategory}_${groupName}_${x}_${y}_${Date.now()}`,
            playerA: standings[x],
            playerB: standings[y],
            scoreA: null,
            scoreB: null,
            isLocked: false,
            scheduledDate: sched.scheduledDate,
            scheduledTimeSlot: sched.scheduledTimeSlot,
            fullScheduleText: sched.fullScheduleText,
          });
        }
      }

      initialGroups.push({ groupName, standings, matches });
    }

    const newRounds = [{ roundName: 'Round 1', groups: initialGroups }];
    updateCurrentCategoryState(newRounds, 0);
    alert(`Round 1 initialized & auto-scheduled for ${selectedCategory}! Matches scheduled starting ${scheduleConfig.startDate}.`);
  };

  const handleRescheduleActiveRound = () => {
    if (!rounds || rounds.length === 0) return;

    let globalMatchCounter = 0;
    const updatedRounds = rounds.map((r, rIdx) => {
      if (rIdx !== currentRoundIndex) return r;

      const updatedGroups = r.groups.map(grp => {
        const updatedMatches = grp.matches.map(m => {
          const sched = calculateMatchSchedule(globalMatchCounter++);
          return {
            ...m,
            scheduledDate: sched.scheduledDate,
            scheduledTimeSlot: sched.scheduledTimeSlot,
            fullScheduleText: sched.fullScheduleText,
          };
        });
        return { ...grp, matches: updatedMatches };
      });

      return { ...r, groups: updatedGroups };
    });

    updateCurrentCategoryState(updatedRounds, currentRoundIndex);
    alert(`Successfully rescheduled current round matches with updated date and time slots!`);
  };

  const updateMatchScore = (groupIndex, matchId, scoreA, scoreB) => {
    const currentRound = rounds[currentRoundIndex];
    if (!currentRound) return;

    const numA = Number(scoreA);
    const numB = Number(scoreB);

    const updatedGroups = currentRound.groups.map((grp, gIdx) => {
      if (gIdx !== groupIndex) return grp;

      const updatedMatches = grp.matches.map(m => {
        if (m.id === matchId) {
          return { ...m, scoreA: numA, scoreB: numB, isLocked: true };
        }
        return m;
      });

      const newStandings = grp.standings.map(s => ({
        ...s,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      }));

      updatedMatches.forEach(m => {
        if (m.isLocked && m.scoreA !== null && m.scoreB !== null) {
          const pA = newStandings.find(s => s.id === m.playerA.id);
          const pB = newStandings.find(s => s.id === m.playerB.id);
          if (pA && pB) {
            const sA = Number(m.scoreA);
            const sB = Number(m.scoreB);
            pA.played += 1;
            pB.played += 1;
            if (sA > sB) {
              pA.won += 1; pA.points += 1;
              pB.lost += 1;
            } else if (sB > sA) {
              pB.won += 1; pB.points += 1;
              pA.lost += 1;
            } else {
              pA.drawn += 1; pA.points += 0.5;
              pB.drawn += 1; pB.points += 0.5;
            }
          }
        }
      });

      return { ...grp, standings: newStandings, matches: updatedMatches };
    });

    const updatedRounds = [...rounds];
    updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
    updateCurrentCategoryState(updatedRounds, currentRoundIndex);
  };

  const handleAdvanceToNextRound = () => {
    const currentRound = rounds[currentRoundIndex];
    if (!currentRound) return;

    // Strict validation: Ensure all matches in current round are completed
    const hasUncompletedMatches = currentRound.groups.some(grp =>
      grp.matches.some(m => !m.isLocked || m.scoreA === null || m.scoreB === null)
    );

    if (hasUncompletedMatches) {
      alert('❌ Cannot advance to the next round until ALL matches in the current ongoing round are completed!');
      return;
    }

    let qualifiedPlayers = [];
    currentRound.groups.forEach(grp => {
      const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
      const topN = sorted.slice(0, advancementCount);
      qualifiedPlayers.push(...topN);
    });

    // Deduplicate qualified players
    const qSeenIds = new Set();
    const qSeenNames = new Set();
    const uniqueQualified = qualifiedPlayers.filter(p => {
      const normName = p.name?.trim().toLowerCase();
      if (qSeenIds.has(p.id) || (normName && qSeenNames.has(normName))) return false;
      qSeenIds.add(p.id);
      if (normName) qSeenNames.add(normName);
      return true;
    });

    if (uniqueQualified.length < 2) {
      alert('Not enough qualified players to form the next round.');
      return;
    }

    let nextRoundName = `Round ${rounds.length + 1}`;
    if (uniqueQualified.length === 8) nextRoundName = 'Quarter Finals';
    else if (uniqueQualified.length === 4) nextRoundName = 'Semi Finals';
    else if (uniqueQualified.length <= 2) nextRoundName = 'Grand Finals 🏆';

    const shuffled = [...uniqueQualified].sort(() => 0.5 - Math.random());
    const nextGroups = [];
    let groupCharCode = 65;
    const currentGroupSize = uniqueQualified.length <= 4 ? uniqueQualified.length : groupSize;
    let globalMatchCounter = 0;

    for (let i = 0; i < shuffled.length; i += currentGroupSize) {
      const groupPlayers = shuffled.slice(i, i + currentGroupSize);
      const groupName = uniqueQualified.length <= 4 ? nextRoundName : `Group ${String.fromCharCode(groupCharCode++)}`;
      
      const standings = groupPlayers.map(p => ({
        id: p.id,
        name: p.name,
        flat: p.flat,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      }));

      const matches = [];
      for (let x = 0; x < standings.length; x++) {
        for (let y = x + 1; y < standings.length; y++) {
          const sched = calculateMatchSchedule(globalMatchCounter++);

          matches.push({
            id: `MATCH_${selectedCategory}_${groupName}_${x}_${y}_${Date.now()}`,
            playerA: standings[x],
            playerB: standings[y],
            scoreA: null,
            scoreB: null,
            isLocked: false,
            scheduledDate: sched.scheduledDate,
            scheduledTimeSlot: sched.scheduledTimeSlot,
            fullScheduleText: sched.fullScheduleText,
          });
        }
      }

      nextGroups.push({ groupName, standings, matches });
    }

    const updatedRounds = [...rounds, { roundName: nextRoundName, groups: nextGroups }];
    updateCurrentCategoryState(updatedRounds, rounds.length);
    alert(`Successfully advanced ${uniqueQualified.length} unique players to ${nextRoundName} for category ${selectedCategory}!`);
  };

  const verifyAdminPassword = (e) => {
    e.preventDefault();
    if (adminPasswordInput === 'admin123' || adminPasswordInput === 'chess2026') {
      setIsAdminUnlocked(true);
      setAdminPasswordInput('');
      alert('Admin unlocked! You can now edit locked match results.');
    } else {
      alert('Incorrect admin password.');
    }
  };

  const currentRound = rounds[currentRoundIndex];
  const isGrandFinale = currentRound?.roundName?.toLowerCase().includes('grand finals');

  let grandChampion = null;
  if (isGrandFinale && currentRound.groups.length > 0) {
    const allStandings = currentRound.groups.flatMap(g => g.standings);
    allStandings.sort((a, b) => b.points - a.points || b.won - a.won);
    grandChampion = allStandings[0];
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Category Selector */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">♟️ Chess Master Championship Suite</h3>
          <p className="text-xs text-slate-400">Independent category tournaments, player exclusivity mutex, zero-duplication grouping, multi-round progression & grid scorekeeping.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Category:</span>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)} 
              className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Top N Advance:</span>
            <select value={advancementCount} onChange={(e) => setAdvancementCount(Number(e.target.value))} className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none">
              <option value={2}>Top 2</option>
              <option value={3}>Top 3</option>
              <option value={1}>Top 1</option>
            </select>
          </div>

          <button 
            onClick={() => setShowScheduleConfig(!showScheduleConfig)}
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3 py-2 rounded-xl text-xs border border-slate-700"
          >
            ⚙️ Schedule Settings
          </button>

          {rounds.length === 0 && (
            <button onClick={handleInitializeRound1} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
              🚀 Start Round 1 ({selectedCategory})
            </button>
          )}
        </div>
      </div>

      {/* AUTO-SCHEDULING CONFIGURATION PANEL */}
      {showScheduleConfig && (
        <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 text-xs space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="font-black text-amber-400 uppercase tracking-wider">📅 Auto-Scheduling & Time-Slot Configuration</h4>
            <span className="text-slate-400 text-[10px]">Applies date/time slots to matches & participant cards</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Start Date:</label>
              <input
                type="date"
                value={scheduleConfig.startDate}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, startDate: e.target.value })}
                className="w-full bg-slate-900 text-amber-300 font-bold p-2 rounded-lg border border-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Start Time:</label>
              <input
                type="time"
                value={scheduleConfig.startTime}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, startTime: e.target.value })}
                className="w-full bg-slate-900 text-amber-300 font-bold p-2 rounded-lg border border-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Daily Hours Window:</label>
              <select
                value={scheduleConfig.allottedHours}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, allottedHours: Number(e.target.value) })}
                className="w-full bg-slate-900 text-amber-300 font-bold p-2 rounded-lg border border-slate-800 outline-none"
              >
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours</option>
                <option value={4}>4 Hours (e.g. 11 AM - 3 PM)</option>
                <option value={6}>6 Hours</option>
                <option value={8}>8 Hours</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Match Duration:</label>
              <select
                value={scheduleConfig.matchDuration}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, matchDuration: Number(e.target.value) })}
                className="w-full bg-slate-900 text-amber-300 font-bold p-2 rounded-lg border border-slate-800 outline-none"
              >
                <option value={0.5}>30 Mins</option>
                <option value={1}>1 Hour per match</option>
                <option value={1.5}>1.5 Hours</option>
                <option value={2}>2 Hours</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1">Parallel Matches:</label>
              <select
                value={scheduleConfig.parallelCapacity}
                onChange={(e) => setScheduleConfig({ ...scheduleConfig, parallelCapacity: Number(e.target.value) })}
                className="w-full bg-slate-900 text-amber-300 font-bold p-2 rounded-lg border border-slate-800 outline-none"
              >
                <option value={1}>1 Match at a time</option>
                <option value={2}>2 Matches in parallel</option>
                <option value={3}>3 Matches in parallel</option>
                <option value={4}>4 Matches in parallel</option>
              </select>
            </div>
          </div>

          {rounds.length > 0 && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleRescheduleActiveRound}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow"
              >
                🔄 Apply Schedule Settings to Active Round Matches
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin Security Bar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Admin Override Security:</span>
          {isAdminUnlocked ? (
            <span className="bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-black border border-emerald-500/20">Unlocked 🔓</span>
          ) : (
            <span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded font-black border border-amber-500/20">Locked 🔒</span>
          )}
        </div>
        {!isAdminUnlocked && (
          <form onSubmit={verifyAdminPassword} className="flex gap-2">
            <input type="password" placeholder="Admin Password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} className="bg-slate-900 text-slate-200 px-3 py-1 rounded border border-slate-800 text-xs outline-none" />
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1 rounded border border-slate-800">Unlock</button>
          </form>
        )}
      </div>

      {/* Round Tabs for Current Category */}
      {rounds.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 items-center">
          <span className="text-xs font-bold text-amber-300 mr-2">[{selectedCategory} Rounds]:</span>
          {rounds.map((r, idx) => (
            <button
              key={idx}
              onClick={() => updateCurrentCategoryState(undefined, idx)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition ${currentRoundIndex === idx ? 'bg-amber-500 text-slate-950 border-amber-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
            >
              {r.roundName}
            </button>
          ))}
        </div>
      )}

      {/* CURRENT ROUND LEADERBOARDS & GRID SCOREKEEPING */}
      {currentRound ? (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">{selectedCategory} — {currentRound.roundName} Leaderboards & Groups</h4>
            
            {!isGrandFinale ? (
              <button onClick={handleAdvanceToNextRound} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs shadow">
                ⚡ Regroup & Advance Top {advancementCount} to Next Round
              </button>
            ) : (
              <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl font-black border border-amber-500/20">
                🏆 Grand Finale Stage ({selectedCategory}) — Tournament Conclusion
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {currentRound.groups.map((grp, gIdx) => (
              <div key={grp.groupName} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h5 className="font-black text-amber-400 text-xs">{grp.groupName}</h5>
                  <span className="text-[10px] text-slate-400">Leaderboard & Standings</span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">Rank & Player</th>
                      <th className="pb-2">Flat</th>
                      <th className="pb-2">P</th>
                      <th className="pb-2">W</th>
                      <th className="pb-2">D</th>
                      <th className="pb-2">L</th>
                      <th className="pb-2 text-amber-400 font-black">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {grp.standings.sort((a, b) => b.points - a.points || b.won - a.won).map((s, rank) => (
                      <tr key={s.id} className={rank < advancementCount ? 'bg-emerald-950/20' : ''}>
                        <td className="py-2.5 font-bold text-slate-100 flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${rank < advancementCount ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                            {rank + 1}
                          </span>
                          {s.name}
                        </td>
                        <td className="py-2.5 text-slate-400">{s.flat}</td>
                        <td className="py-2.5 text-slate-300">{s.played}</td>
                        <td className="py-2.5 text-emerald-400">{s.won}</td>
                        <td className="py-2.5 text-yellow-400">{s.drawn}</td>
                        <td className="py-2.5 text-rose-400">{s.lost}</td>
                        <td className="py-2.5 font-black text-amber-300">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Grid Scorekeeping Matrix with Auto-Scheduled Date/Time Badges */}
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Match Score Grid & Schedule</span>
                  {grp.matches.map((m) => (
                    <div key={m.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-200">
                          {m.playerA.name} <span className="text-amber-400 font-normal">vs</span> {m.playerB.name}
                        </div>
                        
                        {/* Red Rectangle Schedule Badge Sync matching tile requirement */}
                        <div className="inline-block bg-rose-950/50 border border-rose-500/60 px-2 py-0.5 rounded text-[10px] font-bold text-rose-300">
                          Date:{m.scheduledDate} {m.scheduledTimeSlot} ({currentRound.roundName})
                        </div>
                      </div>

                      {m.isLocked && !isAdminUnlocked ? (
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-black border border-emerald-500/20">
                            Result: {m.scoreA} - {m.scoreB}
                          </span>
                          <span className="text-[10px] text-slate-500">Locked 🔒</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={m.scoreA !== null ? m.scoreA : ''}
                            onChange={(e) => {
                              const valA = Number(e.target.value);
                              const valB = valA === 0.5 ? 0.5 : (valA === 1 ? 0 : 1);
                              updateMatchScore(gIdx, m.id, valA, valB);
                            }}
                            className="bg-slate-900 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 outline-none"
                          >
                            <option value="" disabled>{m.playerA.name} Score</option>
                            <option value={1}>1 (Win)</option>
                            <option value={0.5}>0.5 (Draw)</option>
                            <option value={0}>0 (Loss)</option>
                          </select>

                          <span className="text-slate-500 font-bold">-</span>

                          <select
                            value={m.scoreB !== null ? m.scoreB : ''}
                            onChange={(e) => {
                              const valB = Number(e.target.value);
                              const valA = valB === 0.5 ? 0.5 : (valB === 1 ? 0 : 1);
                              updateMatchScore(gIdx, m.id, valA, valB);
                            }}
                            className="bg-slate-900 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 outline-none"
                          >
                            <option value="" disabled>{m.playerB.name} Score</option>
                            <option value={1}>1 (Win)</option>
                            <option value={0.5}>0.5 (Draw)</option>
                            <option value={0}>0 (Loss)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* GRAND FINALE WINNER CELEBRATION BOX */}
            {isGrandFinale && (
              <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-yellow-950/30 p-8 rounded-2xl border-2 border-amber-500/50 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl"></div>

                <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 rounded-full flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-500/40 mb-4 animate-bounce">
                  👑
                </div>

                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 shadow">
                  Grand Champion ({selectedCategory}) 🎆
                </span>

                <h3 className="text-2xl font-black text-amber-300 mt-2">
                  {grandChampion ? grandChampion.name : 'Waiting for Final Result...'}
                </h3>

                <p className="text-xs text-slate-300 mt-1 font-bold">
                  {grandChampion ? `Flat: ${grandChampion.flat} • Total Points: ${grandChampion.points} Pts` : 'Complete the Grand Finale match grid to reveal the champion.'}
                </p>

                <div className="mt-6 flex items-center gap-2 text-xs text-amber-400/80 bg-slate-950/60 px-4 py-2 rounded-xl border border-amber-500/20">
                  <span>✨ Congratulations to the {selectedCategory} Champion! ✨</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
          <p>No active tournament round for category: <strong className="text-amber-400">{selectedCategory}</strong>.</p>
          <button onClick={handleInitializeRound1} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
            🚀 Start Round 1 for {selectedCategory} ({filteredParticipants.length} unique available players)
          </button>
        </div>
      )}
    </div>
  );
}