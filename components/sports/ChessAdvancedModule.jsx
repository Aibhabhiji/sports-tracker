'use client';

import React, { useState, useEffect } from 'react';

export default function ChessAdvancedModule({ participants = [], sportState = {}, onUpdateSportState }) {
  // Merged allowed categories strictly for chess module
  const categories = [
    'Under 8 Years Kids',
    'Under 12 Years Kids',
    '12 - 17 Years Teens',
    '18+ Years Adults'
  ];

  const [selectedCategory, setSelectedCategory] = useState('Under 12 Years Kids');
  const [chessTab, setChessTab] = useState('participants'); // Default to participants view so schedules are visible
  
  // Per-category rounds and round indices stored in sportState.categoryRounds
  const categoryRoundsMap = sportState?.categoryRounds || {};
  const currentCategoryData = categoryRoundsMap[selectedCategory] || { rounds: [], currentRoundIndex: 0 };
  const rounds = currentCategoryData.rounds;
  const currentRoundIndex = currentCategoryData.currentRoundIndex;

  const [advancementCount, setAdvancementCount] = useState(3);
  const [groupSize, setGroupSize] = useState(4);
  
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Track match schedule editing
  const [editingMatchScheduleId, setEditingMatchScheduleId] = useState(null);
  const [tempScheduleDate, setTempScheduleDate] = useState('');
  const [tempScheduleTime, setTempScheduleTime] = useState('');

  // Update defaults based on selected category
  useEffect(() => {
    if (selectedCategory === 'Under 12 Years Kids') {
      setAdvancementCount(3);
      setGroupSize(5);
    } else {
      setAdvancementCount(2);
      setGroupSize(4);
    }
  }, [selectedCategory]);

  // Helper to format Date object or Date string to '15Aug26' style
  const formatDateShort = (dateObj) => {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    if (isNaN(d.getTime())) return '15Aug26';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  };

  // Helper to convert '15Aug26' to ISO date string 'YYYY-MM-DD' for <input type="date">
  const parseShortDateToISO = (dateStr) => {
    if (!dateStr) return '2026-08-15';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    const match = dateStr.match(/^(\d{1,2})\s*([A-Za-z]{3})\s*(\d{2,4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const monthStr = match[2];
      const yearStr = match[3].length === 2 ? `20${match[3]}` : match[3];
      const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      const month = months[monthStr.toLowerCase()] || '08';
      return `${yearStr}-${month}-${day}`;
    }
    return '2026-08-15';
  };

  // Helper to convert ISO date string 'YYYY-MM-DD' to short date format '15Aug26'
  const formatDateShortFromISO = (isoStr) => {
    if (!isoStr) return '15Aug26';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[monthIndex] || 'Aug';
      return `${day}${month}${year}`;
    }
    return '15Aug26';
  };

  // Helper to format Hour (24h to 12h AM/PM string)
  const formatHour12 = (hour24) => {
    const h = hour24 % 12 || 12;
    const ampm = hour24 >= 12 && hour24 < 24 ? 'PM' : 'AM';
    return `${h} ${ampm}`.replace(' ', '');
  };

  // Centralized effective advancement count calculation
  const getEffectiveAdv = (grp, isGrand) => {
    if (isGrand) return 1;
    if (grp.standings.length === 5) return 3;
    if (grp.standings.length === 3) return 2; // Top 2 advance from 3-player groups
    if (selectedCategory === 'Under 12 Years Kids') return 3;
    if (grp.standings.length < 4) return 1;
    return advancementCount;
  };

  // Find the latest scheduled match date in a given round
  const getLatestDateFromRound = (round) => {
    let maxTimestamp = 0;
    let maxDateObj = new Date('2026-08-23');

    if (!round || !round.groups) return maxDateObj;

    round.groups.forEach(grp => {
      (grp.matches || []).forEach(m => {
        if (m.scheduledDate) {
          const iso = parseShortDateToISO(m.scheduledDate);
          const [y, mMonth, dDay] = iso.split('-').map(Number);
          const d = new Date(y, mMonth - 1, dDay);
          if (!isNaN(d.getTime()) && d.getTime() > maxTimestamp) {
            maxTimestamp = d.getTime();
            maxDateObj = d;
          }
        }
      });
    });

    return maxDateObj;
  };

  // Calculate the Saturday of the next weekend following a given date
  const getNextWeekendSaturday = (fromDate) => {
    const d = new Date(fromDate);
    const day = d.getDay();
    
    let daysToAdd = 0;
    if (day === 6) {
      daysToAdd = 7;
    } else if (day === 0) {
      daysToAdd = 6;
    } else {
      daysToAdd = 6 - day;
    }

    d.setDate(d.getDate() + daysToAdd);
    return d;
  };

  // Standard conflict-free match schedule generator
  const buildConflictFreeSchedule = (allMatches, startD = new Date('2026-08-15'), isRound1 = false) => {
    let slotsPerDay = 6;
    let parallelCapacity = 3;
    const startHour = 11;
    const matchDuration = 1;

    const slotTracker = {};

    return allMatches.map((m) => {
      let dayIdx = 0;
      let slotIdx = 0;
      let assigned = false;

      const playerAId = m.playerA?.id || m.playerA?.regId || m.playerA?.Registration_ID || m.playerA?.name;
      const playerBId = m.playerB?.id || m.playerB?.regId || m.playerB?.Registration_ID || m.playerB?.name;

      while (!assigned) {
        if (isRound1 && dayIdx > 8) {
          parallelCapacity += 2;
          dayIdx = 0;
          slotIdx = 0;
        }

        const key = `${dayIdx}_${slotIdx}`;
        if (!slotTracker[key]) {
          slotTracker[key] = { count: 0, players: new Set() };
        }

        const currentSlot = slotTracker[key];
        const hasConflict = (playerAId && currentSlot.players.has(playerAId)) || (playerBId && currentSlot.players.has(playerBId));

        if (currentSlot.count < parallelCapacity && !hasConflict) {
          currentSlot.count += 1;
          if (playerAId) currentSlot.players.add(playerAId);
          if (playerBId) currentSlot.players.add(playerBId);

          const currentDate = new Date(startD);
          currentDate.setDate(currentDate.getDate() + dayIdx);
          const dateStr = formatDateShort(currentDate);

          const slotStartHour = startHour + (slotIdx * matchDuration);
          const slotEndHour = slotStartHour + matchDuration;
          const timeSlotStr = `${formatHour12(slotStartHour)} to ${formatHour12(slotEndHour)}`;

          assigned = true;
          return {
            ...m,
            scheduledDate: dateStr,
            scheduledTimeSlot: timeSlotStr,
            fullScheduleText: `Date:${dateStr} ${timeSlotStr}`,
          };
        }

        slotIdx += 1;
        if (slotIdx >= slotsPerDay) {
          slotIdx = 0;
          dayIdx += 1;
        }
      }
    });
  };

  // Weekend-by-weekend match schedule generator for 18+ Years Adults
  const buildAdultsWeekendSchedule = (allMatches, baseStart = new Date('2026-08-15'), isRound1 = false) => {
    let parallelCapacity = 3;
    let slotsPerDay = 6;
    const startHour = 11;

    const weekendTracker = {};

    return allMatches.map((m) => {
      const playerAId = m.playerA?.id || m.playerA?.regId || m.playerA?.Registration_ID || m.playerA?.name;
      const playerBId = m.playerB?.id || m.playerB?.regId || m.playerB?.Registration_ID || m.playerB?.name;

      let weekendIdx = 0;
      let assigned = false;
      let finalDateStr = '';
      let finalSlotStr = '';

      while (!assigned) {
        if (isRound1 && weekendIdx > 1) {
          parallelCapacity += 2;
          weekendIdx = 0;
        }

        if (!weekendTracker[weekendIdx]) {
          weekendTracker[weekendIdx] = {
            playerCounts: {},
            slots: {}
          };
        }

        const wData = weekendTracker[weekendIdx];
        const countA = wData.playerCounts[playerAId] || 0;
        const countB = wData.playerCounts[playerBId] || 0;

        if (countA < 2 && countB < 2) {
          for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
            for (let slotIdx = 0; slotIdx < slotsPerDay; slotIdx++) {
              const slotKey = `${dayOffset}_${slotIdx}`;
              if (!wData.slots[slotKey]) {
                wData.slots[slotKey] = { count: 0, players: new Set() };
              }
              const currentSlot = wData.slots[slotKey];

              const hasTimeSlotConflict = 
                (playerAId && currentSlot.players.has(playerAId)) || 
                (playerBId && currentSlot.players.has(playerBId));

              if (currentSlot.count < parallelCapacity && !hasTimeSlotConflict) {
                currentSlot.count += 1;
                if (playerAId) {
                  currentSlot.players.add(playerAId);
                  wData.playerCounts[playerAId] = countA + 1;
                }
                if (playerBId) {
                  currentSlot.players.add(playerBId);
                  wData.playerCounts[playerBId] = countB + 1;
                }

                const matchDate = new Date(baseStart);
                matchDate.setDate(matchDate.getDate() + (weekendIdx * 7) + dayOffset);
                finalDateStr = formatDateShort(matchDate);

                const slotStartHour = startHour + slotIdx;
                const slotEndHour = slotStartHour + 1;
                finalSlotStr = `${formatHour12(slotStartHour)} to ${formatHour12(slotEndHour)}`;

                assigned = true;
                break;
              }
            }
            if (assigned) break;
          }
        }

        if (!assigned) {
          weekendIdx++;
        }
      }

      return {
        ...m,
        scheduledDate: finalDateStr,
        scheduledTimeSlot: finalSlotStr,
        fullScheduleText: `Date:${finalDateStr} ${finalSlotStr}`,
      };
    });
  };

  // Initial Auto-Schedule Fallback
  const calculateInitialMatchSchedule = (matchIndex) => {
    const startD = new Date('2026-08-15');
    const startHour = 11;
    const matchesPerDay = 6;
    const parallelCapacity = 3;
    const matchDuration = 1;

    const dayOffset = Math.floor(matchIndex / matchesPerDay);
    const matchIndexOnDay = matchIndex % matchesPerDay;
    const slotIndex = Math.floor(matchIndexOnDay / parallelCapacity);

    const currentDate = new Date(startD);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateStr = formatDateShort(currentDate);

    const slotStartHour = startHour + (slotIndex * matchDuration);
    const slotEndHour = slotStartHour + matchDuration;

    const timeSlotStr = `${formatHour12(slotStartHour)} to ${formatHour12(slotEndHour)}`;
    return {
      scheduledDate: dateStr,
      scheduledTimeSlot: timeSlotStr,
      fullScheduleText: `Date:${dateStr} ${timeSlotStr}`,
    };
  };

  // Robust group structure generator: preserves targetGroupSize and puts remainder into a separate group
  const createGroupStructures = (shuffledPlayers, targetGroupSize, roundNamePrefix) => {
    const totalQ = shuffledPlayers.length;
    let groupSizes = [];

    if (totalQ <= 5) {
      groupSizes = [totalQ];
    } else {
      let numGroups = Math.floor(totalQ / targetGroupSize);
      let remainder = totalQ % targetGroupSize;

      for (let g = 0; g < numGroups; g++) {
        groupSizes.push(targetGroupSize);
      }

      if (remainder > 0) {
        if (remainder === 1 && numGroups > 0) {
          groupSizes[groupSizes.length - 1] += 1;
        } else {
          groupSizes.push(remainder);
        }
      }
    }

    const rawMatchesList = [];
    const groupStructures = [];
    let groupCharCode = 65;
    let currentIndex = 0;

    groupSizes.forEach((gSize, gIdx) => {
      const groupPlayers = shuffledPlayers.slice(currentIndex, currentIndex + gSize);
      currentIndex += gSize;

      const groupName = totalQ <= 5 && roundNamePrefix.toLowerCase().includes('grand finals') ? roundNamePrefix : `Group ${String.fromCharCode(groupCharCode++)}`;

      const standings = groupPlayers.map(p => ({
        id: p.id || p.regId || p.Registration_ID || `p_${Math.random()}`,
        regId: p.regId,
        Registration_ID: p.Registration_ID,
        name: p.name,
        flat: p.flat,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
      }));

      const groupMatches = [];
      for (let x = 0; x < standings.length; x++) {
        for (let y = x + 1; y < standings.length; y++) {
          const matchObj = {
            id: `MATCH_${selectedCategory}_${groupName}_${x}_${y}_${Date.now()}`,
            groupName,
            playerA: standings[x],
            playerB: standings[y],
            scoreA: null,
            scoreB: null,
            isLocked: false,
          };
          groupMatches.push(matchObj);
          rawMatchesList.push(matchObj);
        }
      }

      groupStructures.push({ groupName, standings, matchIds: groupMatches.map(m => m.id) });
    });

    return { groupStructures, rawMatchesList };
  };

  // Sync player schedules strictly for Chess participants to sportState.playerSchedules
  const buildPlayerSchedulesMap = (updatedRoundsMap) => {
    const schedulesMap = { ...(sportState.playerSchedules || {}) };

    Object.entries(updatedRoundsMap).forEach(([catKey, catData]) => {
      const catRounds = catData?.rounds || [];
      catRounds.forEach(r => {
        (r.groups || []).forEach(g => {
          (g.matches || []).forEach(m => {
            const assignScheduleToPlayer = (player) => {
              if (!player) return;
              const textVal = m.fullScheduleText || `Date:${m.scheduledDate} ${m.scheduledTimeSlot}`;
              const scheduleEntry = {
                scheduledText: textVal,
                text: textVal,
                date: m.scheduledDate,
                time: m.scheduledTimeSlot,
                roundName: r.roundName,
                category: catKey,
                toString: () => textVal
              };

              if (player.id) schedulesMap[player.id] = scheduleEntry;
              if (player.regId) schedulesMap[player.regId] = scheduleEntry;
              if (player.Registration_ID) schedulesMap[player.Registration_ID] = scheduleEntry;
              if (player.name) schedulesMap[player.name.trim().toLowerCase()] = scheduleEntry;

              const origP = (participants || []).find(p => p.name?.trim().toLowerCase() === player.name?.trim().toLowerCase());
              if (origP) {
                if (origP.id) schedulesMap[origP.id] = scheduleEntry;
                if (origP.regId) schedulesMap[origP.regId] = scheduleEntry;
                if (origP.Registration_ID) schedulesMap[origP.Registration_ID] = scheduleEntry;
              }
            };

            assignScheduleToPlayer(m.playerA);
            assignScheduleToPlayer(m.playerB);
          });
        });
      });
    });

    return schedulesMap;
  };

  // Filter participants specifically for selected category
  const rawFiltered = (participants || []).filter(p => {
    if (!selectedCategory || selectedCategory === 'All') return true;

    const catStr = selectedCategory.toLowerCase();
    const pCat = (p.category || p.Category || '').toString().toLowerCase();
    const pAgeGroup = (p.ageGroup || p.AgeGroup || p['Age Group'] || '').toString().toLowerCase();
    const pAge = (p.age || p.Age || '').toString();
    const numAge = parseInt(pAge.match(/\d+/)?.[0] || '0', 10);

    if (pCat === catStr || pAgeGroup === catStr) return true;

    if (catStr.includes('under 8')) {
      return (numAge > 0 && numAge < 8) || pCat.includes('under 8') || pAgeGroup.includes('under 8');
    }
    if (catStr.includes('under 12')) {
      return (numAge >= 8 && numAge < 12) || pCat.includes('under 12') || pAgeGroup.includes('under 12');
    }
    if (catStr.includes('12 - 17') || catStr.includes('teens')) {
      return (numAge >= 12 && numAge <= 17) || pCat.includes('12 - 17') || pCat.includes('teen') || pAgeGroup.includes('teen');
    }
    if (catStr.includes('18+') || catStr.includes('adult')) {
      return numAge >= 18 || pCat.includes('adult') || pCat.includes('senior') || pCat.includes('18+') || pAgeGroup.includes('adult') || pAgeGroup.includes('senior') || numAge === 0;
    }

    return pCat.includes(catStr) || pAgeGroup.includes(catStr);
  });

  // Deduplication by ID and normalized Name
  const seenIds = new Set();
  const seenNames = new Set();
  const filteredParticipants = rawFiltered.filter(p => {
    const normName = p.name?.trim().toLowerCase();
    const pid = p.id || p.regId || p.Registration_ID;
    if ((pid && seenIds.has(pid)) || (normName && seenNames.has(normName))) {
      return false;
    }
    if (pid) seenIds.add(pid);
    if (normName) seenNames.add(normName);
    return true;
  });

  // Helper to fetch participant schedule
  const getParticipantSchedule = (p, idx = 0) => {
    const pid = p.id || p.regId || p.Registration_ID;
    const normName = p.name?.trim().toLowerCase();

    if (pid && sportState?.playerSchedules?.[pid]) {
      return sportState.playerSchedules[pid];
    }
    if (normName && sportState?.playerSchedules?.[normName]) {
      return sportState.playerSchedules[normName];
    }

    for (const r of rounds) {
      for (const g of r.groups) {
        for (const m of g.matches) {
          const aName = m.playerA?.name?.trim().toLowerCase();
          const bName = m.playerB?.name?.trim().toLowerCase();
          if ((pid && (m.playerA?.id === pid || m.playerB?.id === pid)) || (normName && (aName === normName || bName === normName))) {
            return {
              text: m.fullScheduleText || `Date:${m.scheduledDate} ${m.scheduledTimeSlot}`,
              date: m.scheduledDate,
              time: m.scheduledTimeSlot,
              roundName: r.roundName
            };
          }
        }
      }
    }

    const previewSched = calculateInitialMatchSchedule(idx);
    return {
      text: previewSched.fullScheduleText,
      date: previewSched.scheduledDate,
      time: previewSched.scheduledTimeSlot,
      roundName: 'Round 1 (Tentative)'
    };
  };

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

  const handleDeleteTournament = () => {
    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to DELETE the active tournament for category "${selectedCategory}"?\n\nThis will completely clear all rounds, group fixtures, match results, and scheduled times for this category so you can regenerate fresh schedules.`
    );
    if (!confirmDelete) return;

    const updatedMap = {
      ...categoryRoundsMap,
      [selectedCategory]: {
        rounds: [],
        currentRoundIndex: 0,
      }
    };

    const updatedPlayerSchedules = buildPlayerSchedulesMap(updatedMap);
    Object.keys(updatedPlayerSchedules).forEach(key => {
      if (updatedPlayerSchedules[key]?.category === selectedCategory) {
        delete updatedPlayerSchedules[key];
      }
    });

    onUpdateSportState({
      categoryRounds: updatedMap,
      playerSchedules: updatedPlayerSchedules,
    });

    alert(`Tournament for "${selectedCategory}" has been deleted successfully! You can now click "Start Round 1" to create a fresh tournament schedule.`);
  };

  const handleInitializeRound1 = () => {
    if (filteredParticipants.length < 2) {
      alert(`Not enough available participants in category "${selectedCategory}" to start Round 1.`);
      return;
    }

    const shuffled = [...filteredParticipants].sort(() => 0.5 - Math.random());
    const effectiveGroupSize = selectedCategory === 'Under 12 Years Kids' ? 5 : groupSize;

    const { groupStructures, rawMatchesList } = createGroupStructures(shuffled, effectiveGroupSize, 'Round 1');

    const round1StartDate = new Date('2026-08-15');
    let scheduledMatches;
    if (selectedCategory === '18+ Years Adults') {
      scheduledMatches = buildAdultsWeekendSchedule(rawMatchesList, round1StartDate, true);
    } else {
      scheduledMatches = buildConflictFreeSchedule(rawMatchesList, round1StartDate, true);
    }

    const initialGroups = groupStructures.map(grp => ({
      groupName: grp.groupName,
      standings: grp.standings,
      matches: scheduledMatches.filter(m => grp.matchIds.includes(m.id))
    }));

    const newRounds = [{ roundName: 'Round 1', groups: initialGroups }];
    updateCurrentCategoryState(newRounds, 0);
    alert(`Round 1 initialized for ${selectedCategory}! (${initialGroups.length} group formed with schedules completing within 23 Aug weekend)`);
  };

  const handleSaveIndividualSchedule = (groupIndex, matchId) => {
    if (!tempScheduleDate || !tempScheduleTime) {
      alert('Please provide both a valid date and time slot.');
      return;
    }

    const formattedDate = formatDateShortFromISO(tempScheduleDate);
    const fullText = `Date:${formattedDate} ${tempScheduleTime}`;

    const updatedRounds = rounds.map((r, rIdx) => {
      if (rIdx !== currentRoundIndex) return r;

      const updatedGroups = r.groups.map((grp, gIdx) => {
        if (gIdx !== groupIndex) return grp;

        const updatedMatches = grp.matches.map(m => {
          if (m.id === matchId) {
            return {
              ...m,
              scheduledDate: formattedDate,
              scheduledTimeSlot: tempScheduleTime,
              fullScheduleText: fullText,
            };
          }
          return m;
        });

        return { ...grp, matches: updatedMatches };
      });

      return { ...r, groups: updatedGroups };
    });

    updateCurrentCategoryState(updatedRounds, currentRoundIndex);
    setEditingMatchScheduleId(null);
    setTempScheduleDate('');
    setTempScheduleTime('');
    alert(`Match schedule updated successfully to ${fullText}!`);
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

  // Helper to schedule tiebreaker matches among all tied players (supports multi-way ties like 3-way ties)
  const handleScheduleTiebreaker = (groupIndex) => {
    const currentRound = rounds[currentRoundIndex];
    if (!currentRound) return;

    const grp = currentRound.groups[groupIndex];
    const isGrandFinaleGroup = currentRound?.roundName?.toLowerCase().includes('grand finals');
    const effectiveAdv = getEffectiveAdv(grp, isGrandFinaleGroup);

    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);

    let tiedPlayers = [];
    if (isGrandFinaleGroup) {
      const topPoints = sorted[0]?.points;
      const topWins = sorted[0]?.won;
      tiedPlayers = sorted.filter(s => s.points === topPoints && s.won === topWins);
    } else {
      const cutoffPlayer = sorted[effectiveAdv - 1];
      if (cutoffPlayer) {
        const boundaryScore = cutoffPlayer.points;
        tiedPlayers = sorted.filter(s => s.points === boundaryScore);
      }
    }

    const uniqueTiedMap = new Map();
    tiedPlayers.forEach(p => uniqueTiedMap.set(p.id, p));
    const tiedList = Array.from(uniqueTiedMap.values());

    if (tiedList.length < 2) {
      if (sorted.length >= effectiveAdv + 1) {
        tiedList.push(sorted[effectiveAdv - 1], sorted[effectiveAdv]);
      } else if (sorted.length >= 2) {
        tiedList.push(sorted[0], sorted[1]);
      }
    }

    if (tiedList.length < 2) {
      alert('Could not determine tied players for tiebreaker match.');
      return;
    }

    // Generate round-robin match fixtures for all pairs of tied players
    const newTiebreakerMatches = [];
    for (let x = 0; x < tiedList.length; x++) {
      for (let y = x + 1; y < tiedList.length; y++) {
        const sched = calculateInitialMatchSchedule(grp.matches.length + newTiebreakerMatches.length + 10);
        const matchObj = {
          id: `MATCH_TIEBREAK_${selectedCategory}_${grp.groupName}_${x}_${y}_${Date.now()}`,
          groupName: grp.groupName,
          playerA: tiedList[x],
          playerB: tiedList[y],
          scoreA: null,
          scoreB: null,
          isLocked: false,
          isTiebreaker: true,
          scheduledDate: sched.scheduledDate,
          scheduledTimeSlot: sched.scheduledTimeSlot,
          fullScheduleText: sched.fullScheduleText,
        };
        newTiebreakerMatches.push(matchObj);
      }
    }

    const updatedGroups = currentRound.groups.map((g, gIdx) => {
      if (gIdx !== groupIndex) return g;
      return {
        ...g,
        matches: [...g.matches, ...newTiebreakerMatches]
      };
    });

    const updatedRounds = [...rounds];
    updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
    updateCurrentCategoryState(updatedRounds, currentRoundIndex);
    alert(`⚖️ ${newTiebreakerMatches.length} tiebreaker playoff match(es) successfully scheduled among ${tiedList.map(p => p.name).join(', ')}! Play these matches to resolve the tie.`);
  };

  const handleAdvanceToNextRound = () => {
    const currentRound = rounds[currentRoundIndex];
    if (!currentRound) return;

    const hasUncompletedMatches = currentRound.groups.some(grp =>
      grp.matches.length === 0 || grp.matches.some(m => !m.isLocked || m.scoreA === null || m.scoreB === null)
    );

    if (hasUncompletedMatches) {
      alert('❌ Cannot advance to the next round until ALL matches in the current ongoing round are completed!');
      return;
    }

    let qualifiedPlayers = [];
    currentRound.groups.forEach(grp => {
      const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
      const effectiveAdv = getEffectiveAdv(grp, isGrandFinale);
      const topN = sorted.slice(0, effectiveAdv);
      qualifiedPlayers.push(...topN);
    });

    const qSeenIds = new Set();
    const qSeenNames = new Set();
    const uniqueQualified = qualifiedPlayers.filter(p => {
      const normName = p.name?.trim().toLowerCase();
      if ((p.id && qSeenIds.has(p.id)) || (normName && qSeenNames.has(normName))) return false;
      if (p.id) qSeenIds.add(p.id);
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
    const currentGroupSize = uniqueQualified.length <= 5 ? uniqueQualified.length : groupSize;
    const { groupStructures, rawMatchesList } = createGroupStructures(shuffled, currentGroupSize, nextRoundName);

    const latestDateInCurrentRound = getLatestDateFromRound(currentRound);
    const nextRoundStartDate = getNextWeekendSaturday(latestDateInCurrentRound);

    let scheduledMatches;
    if (selectedCategory === '18+ Years Adults') {
      scheduledMatches = buildAdultsWeekendSchedule(rawMatchesList, nextRoundStartDate, false);
    } else {
      scheduledMatches = buildConflictFreeSchedule(rawMatchesList, nextRoundStartDate, false);
    }

    const nextGroups = groupStructures.map(grp => ({
      groupName: grp.groupName,
      standings: grp.standings,
      matches: scheduledMatches.filter(m => grp.matchIds.includes(m.id))
    }));

    const updatedRounds = [...rounds, { roundName: nextRoundName, groups: nextGroups }];
    updateCurrentCategoryState(updatedRounds, rounds.length);
    alert(`Successfully advanced ${uniqueQualified.length} unique players to ${nextRoundName} for category ${selectedCategory}! Matches start on next weekend (${formatDateShort(nextRoundStartDate)}).`);
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

  // Check group completion & tie status for current round
  const hasUncompletedMatches = currentRound ? currentRound.groups.some(grp =>
    grp.matches.length === 0 || grp.matches.some(m => !m.isLocked || m.scoreA === null || m.scoreB === null)
  ) : false;

  const hasUnresolvedTies = currentRound ? currentRound.groups.some(grp => {
    const allDone = grp.matches.length > 0 && grp.matches.every(m => m.isLocked && m.scoreA !== null && m.scoreB !== null);
    if (!allDone) return false;
    const isGrandGroup = currentRound?.roundName?.toLowerCase().includes('grand finals');
    const effectiveAdv = getEffectiveAdv(grp, isGrandGroup);
    if (effectiveAdv >= grp.standings.length) return false;
    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
    const cutoffP = sorted[effectiveAdv - 1]?.points;
    const nextP = sorted[effectiveAdv]?.points;
    return cutoffP === nextP;
  }) : false;

  const canAdvance = currentRound && !hasUncompletedMatches && !hasUnresolvedTies;

  // Grand Champion calculation ensuring scoring is fully complete & no ties in finals
  let grandChampion = null;
  let grandFinalsCompleted = false;
  let grandFinalsTie = false;

  if (isGrandFinale && currentRound.groups.length > 0) {
    const g = currentRound.groups[0];
    const allMatchesDone = g.matches.length > 0 && g.matches.every(m => m.isLocked && m.scoreA !== null && m.scoreB !== null);
    const sorted = [...g.standings].sort((a, b) => b.points - a.points || b.won - a.won);

    if (allMatchesDone && sorted.length >= 2) {
      if (sorted[0].points > sorted[1].points || (sorted[0].points === sorted[1].points && sorted[0].won > sorted[1].won)) {
        grandChampion = sorted[0];
        grandFinalsCompleted = true;
      } else if (sorted[0].points === sorted[1].points && sorted[0].won === sorted[1].won) {
        grandFinalsTie = true;
      }
    } else if (allMatchesDone && sorted.length === 1) {
      grandChampion = sorted[0];
      grandFinalsCompleted = true;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header, Category Selector & View Toggle */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">♟️ Chess Master Championship Suite</h3>
          <p className="text-xs text-slate-400">Independent category tournaments, group rules, sequential weekend scheduling & adhoc overrides.</p>
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
              <option value={3}>Top 3</option>
              <option value={2}>Top 2</option>
              <option value={1}>Top 1</option>
            </select>
          </div>

          {/* Module View Mode Toggle */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setChessTab('participants')}
              className={`px-3 py-1.5 rounded-lg transition ${chessTab === 'participants' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              📍 Participants ({filteredParticipants.length})
            </button>
            <button
              onClick={() => setChessTab('hub')}
              className={`px-3 py-1.5 rounded-lg transition ${chessTab === 'hub' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              ⚔️ Tournament & Scoring Hub
            </button>
          </div>

          {rounds.length === 0 ? (
            <button onClick={handleInitializeRound1} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
              🚀 Start Round 1 ({selectedCategory})
            </button>
          ) : (
            <button
              onClick={handleDeleteTournament}
              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 font-black px-3.5 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5"
              title="Delete active tournament and reset schedules for this category"
            >
              🗑️ Delete Tournament
            </button>
          )}
        </div>
      </div>

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

      {/* VIEW TAB 1: PARTICIPANTS & SCHEDULE TILES */}
      {chessTab === 'participants' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Chess Participants & Assigned Schedules ({selectedCategory})</h4>
              <p className="text-[11px] text-slate-400">Each registered player's match date and time slot are displayed below in real-time.</p>
            </div>
            {rounds.length === 0 ? (
              <button onClick={handleInitializeRound1} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs shadow">
                🚀 Start Round 1
              </button>
            ) : (
              <button onClick={handleDeleteTournament} className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 font-black px-3 py-2 rounded-xl text-xs shadow">
                🗑️ Delete Tournament
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredParticipants.map((p, idx) => {
              const sched = getParticipantSchedule(p, idx);
              const pid = p.id || p.regId || p.Registration_ID || `p_${idx}`;
              return (
                <div key={pid} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <h5 className="font-bold text-slate-100 text-sm">{p.name}</h5>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-black">
                        ID: {p.id || p.regId || p.Registration_ID || 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Flat: <strong className="text-slate-200">{p.flat || 'N/A'}</strong></p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-800">
                    <span className="text-[11px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                      Age: {p.age || p.Age || 'N/A'}
                    </span>
                    <span className="text-[11px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                      {selectedCategory}
                    </span>
                  </div>

                  {/* Player Schedule Badge */}
                  <div className="pt-1">
                    {sched && (
                      <div className="bg-rose-950/70 border border-rose-500/60 p-2 rounded-xl text-[11px] font-bold text-rose-200 space-y-0.5 shadow">
                        <div className="text-[9px] uppercase tracking-wider text-rose-300 font-black">{sched.roundName || 'Match Schedule'}</div>
                        <div>📅 {sched.text || sched.scheduledText}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW TAB 2: TOURNAMENT HUB (ROUNDS, GROUPS & SCOREKEEPING) */}
      {chessTab === 'hub' && (
        <>
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

          {currentRound ? (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">{selectedCategory} — {currentRound.roundName} Leaderboards & Groups</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click directly on any schedule badge below to customize its date and time slot.</p>
                </div>
                
                <div className="flex gap-2 items-center">
                  <button onClick={handleDeleteTournament} className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 font-black px-3 py-2 rounded-xl text-xs shadow">
                    🗑️ Delete Tournament
                  </button>

                  {!isGrandFinale ? (
                    <button 
                      onClick={handleAdvanceToNextRound} 
                      disabled={!canAdvance}
                      className={`font-black px-4 py-2 rounded-xl text-xs shadow transition ${
                        canAdvance 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-500/20' 
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                      }`}
                      title={!canAdvance ? "Complete all matches and resolve any group ties with tiebreaker matches first" : "Advance qualified players to next round"}
                    >
                      ⚡ Regroup & Advance Qualified Players to Next Round
                    </button>
                  ) : (
                    <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl font-black border border-amber-500/20">
                      🏆 Grand Finale Stage ({selectedCategory}) — Tournament Conclusion
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {currentRound.groups.map((grp, gIdx) => {
                  const effectiveAdv = getEffectiveAdv(grp, isGrandFinale);
                  const allGroupMatchesDone = grp.matches.length > 0 && grp.matches.every(m => m.isLocked && m.scoreA !== null && m.scoreB !== null);
                  
                  // Check if there is a tie at the cutoff or in finals
                  let groupHasTie = false;
                  if (allGroupMatchesDone && effectiveAdv < grp.standings.length) {
                    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
                    const cutoffP = sorted[effectiveAdv - 1]?.points;
                    const nextP = sorted[effectiveAdv]?.points;
                    if (cutoffP === nextP) {
                      groupHasTie = true;
                    }
                  } else if (allGroupMatchesDone && isGrandFinale) {
                    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
                    if (sorted.length >= 2 && sorted[0].points === sorted[1].points && sorted[0].won === sorted[1].won) {
                      groupHasTie = true;
                    }
                  }

                  return (
                    <div key={grp.groupName} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h5 className="font-black text-amber-400 text-xs">{grp.groupName} ({grp.standings.length} Players)</h5>
                        <span className="text-[10px] text-slate-400">
                          {isGrandFinale ? 'Grand Final Match' : (grp.standings.length === 5 ? 'Top 3 Advance (5-Player Group)' : (grp.standings.length === 3 ? 'Top 2 Advance (3-Player Group)' : (selectedCategory === 'Under 12 Years Kids' ? 'Top 3 Advance' : (grp.standings.length < 4 ? 'Top 1 Advances (Group < 4)' : `Top ${advancementCount} Advance`))))}
                        </span>
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
                            <tr key={s.id} className={rank < effectiveAdv ? 'bg-emerald-950/20' : ''}>
                              <td className="py-2.5 font-bold text-slate-100 flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${rank < effectiveAdv ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
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

                      {/* Tiebreaker Alert & Schedule Button */}
                      {groupHasTie && (
                        <div className="bg-amber-950/60 border border-amber-500/50 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                          <span className="text-amber-300 font-bold">⚠️ Tie detected at qualifying cutoff! Round-robin playoff required.</span>
                          <button
                            onClick={() => handleScheduleTiebreaker(gIdx)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs shadow transition whitespace-nowrap"
                          >
                            ⚖️ Schedule Tiebreaker Matches
                          </button>
                        </div>
                      )}

                      {/* Match Score Matrix */}
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Match Score Grid & Schedule</span>
                        {grp.matches.map((m) => (
                          <div key={m.id} className={`bg-slate-950 p-3 rounded-xl border ${m.isTiebreaker ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'} space-y-3`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                  {m.isTiebreaker && <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black border border-amber-500/30">Tiebreaker</span>}
                                  <span>{m.playerA.name} <span className="text-amber-400 font-normal">vs</span> {m.playerB.name}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div 
                                    onClick={() => {
                                      setEditingMatchScheduleId(editingMatchScheduleId === m.id ? null : m.id);
                                      setTempScheduleDate(parseShortDateToISO(m.scheduledDate));
                                      setTempScheduleTime(m.scheduledTimeSlot || '11 AM to 12 PM');
                                    }}
                                    className="inline-flex items-center gap-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/70 px-2.5 py-1 rounded text-[10px] font-bold text-rose-200 cursor-pointer shadow transition"
                                    title="Click to edit schedule"
                                  >
                                    <span>📅 Date:{m.scheduledDate} {m.scheduledTimeSlot} ({currentRound.roundName})</span>
                                    <span className="bg-rose-500/30 px-1.5 py-0.5 rounded text-[9px] text-amber-300 font-black">✏️ Edit</span>
                                  </div>
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

                            {/* Inline Individual Schedule Editor */}
                            {editingMatchScheduleId === m.id && (
                              <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/40 space-y-3 shadow-xl">
                                <div className="flex justify-between items-center">
                                  <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider">✏️ Custom Schedule Override for Match</div>
                                  <button onClick={() => setEditingMatchScheduleId(null)} className="text-slate-400 hover:text-white text-xs font-bold">✕ Close</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-slate-400 text-[10px] block mb-1">Select Date:</label>
                                    <input
                                      type="date"
                                      value={tempScheduleDate}
                                      onChange={(e) => setTempScheduleDate(e.target.value)}
                                      className="w-full bg-slate-950 text-amber-300 font-bold p-1.5 rounded border border-slate-800 text-xs outline-none [color-scheme:dark] cursor-pointer"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-slate-400 text-[10px] block mb-1">Time Slot (e.g. 11 AM to 12 PM):</label>
                                    <input
                                      type="text"
                                      value={tempScheduleTime}
                                      onChange={(e) => setTempScheduleTime(e.target.value)}
                                      placeholder="11 AM to 12 PM"
                                      className="w-full bg-slate-950 text-amber-300 font-bold p-1.5 rounded border border-slate-800 text-xs outline-none"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      onClick={() => handleSaveIndividualSchedule(gIdx, m.id)}
                                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-1.5 rounded text-xs shadow"
                                    >
                                      Save Schedule
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

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
                      {grandFinalsCompleted && grandChampion ? grandChampion.name : (grandFinalsTie ? '⚠️ Tie in Grand Finals (Playoff Required)' : 'Waiting for Final Match Completion & Scoring...')}
                    </h3>

                    <p className="text-xs text-slate-300 mt-1 font-bold">
                      {grandFinalsCompleted && grandChampion ? `Flat: ${grandChampion.flat} • Total Points: ${grandChampion.points} Pts` : (grandFinalsTie ? 'Both finalists have tied. Please use the tiebreaker button to determine the sole champion.' : 'Complete and score the Grand Finale match grid to reveal the champion.')}
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-xs text-amber-400/80 bg-slate-950/60 px-4 py-2 rounded-xl border border-amber-500/20">
                      <span>✨ {grandFinalsCompleted && grandChampion ? `Congratulations to the ${selectedCategory} Champion!` : 'Tournament Conclusion Pending'} ✨</span>
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
        </>
      )}
    </div>
  );
}