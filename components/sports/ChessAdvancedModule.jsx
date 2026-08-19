'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export default function ChessAdvancedModule({ participants = [], sportState = {}, onUpdateSportState }) {
  const categories = [
    'Under 8 Years Kids',
    'Under 12 Years Kids',
    '12 - 17 Years Teens',
    '18+ Years Adults'
  ];

  const [selectedCategory, setSelectedCategory] = useState('Under 12 Years Kids');
  const [chessTab, setChessTab] = useState('participants'); // 'participants' | 'hub' | 'duplicates'
  
  const categoryRoundsMap = sportState?.categoryRounds || {};
  const currentCategoryData = categoryRoundsMap[selectedCategory] || { rounds: [], currentRoundIndex: 0 };
  
  const [advancementCount, setAdvancementCount] = useState(2);
  const [groupSize, setGroupSize] = useState(4);
  
  // Dedicated Chess Module Security State (Password: admin123)
  const [isChessUnlocked, setIsChessUnlocked] = useState(false);

  // Track match schedule editing
  const [editingMatchScheduleId, setEditingMatchScheduleId] = useState(null);
  const [tempScheduleDate, setTempScheduleDate] = useState('');
  const [tempScheduleTime, setTempScheduleTime] = useState('');

  // New Player Addition Modal State
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerFlat, setNewPlayerFlat] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');

  // Local override for participants list to support merging/removing duplicates dynamically
  const [localParticipants, setLocalParticipants] = useState(participants);

  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  useEffect(() => {
    if (selectedCategory === 'Under 12 Years Kids') {
      setAdvancementCount(2);
      setGroupSize(4);
    } else {
      setAdvancementCount(2);
      setGroupSize(4);
    }
  }, [selectedCategory]);

  // Carrom-style Action Wrapper for all data manipulations
  const verifyAdminAndExecute = (actionCallback) => {
    if (isChessUnlocked) {
      actionCallback();
      return;
    }

    const enteredPwd = window.prompt("🔒 Enter Chess Admin Password to execute this action (admin123):");
    if (enteredPwd === '45756' || enteredPwd === 'admin123') {
      setIsChessUnlocked(true);
      actionCallback();
    } else if (enteredPwd !== null) {
      alert("❌ Incorrect password. Action cancelled.");
    }
  };

  function formatDateShort(dateObj) {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    if (isNaN(d.getTime())) return '15Aug26';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = String(d.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
  }

  function parseShortDateToISO(dateStr) {
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
  }

  function formatDateShortFromISO(isoStr) {
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
  }

  function formatHour12(hour24) {
    const h = hour24 % 12 || 12;
    const ampm = hour24 >= 12 && hour24 < 24 ? 'PM' : 'AM';
    return `${h} ${ampm}`.replace(' ', '');
  }

  function getEffectiveAdv(grp, isGrand) {
    if (isGrand) return 1;
    if (grp.standings.length === 5) return 3;
    if (grp.standings.length === 4) return 2;
    if (grp.standings.length === 3) return 2;
    if (grp.standings.length < 4) return 1;
    return advancementCount;
  }

  function getLatestDateFromRound(round) {
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
  }

  function getNextWeekendSaturday(fromDate) {
    const d = new Date(fromDate);
    const day = d.getDay();
    let daysToAdd = day === 6 ? 7 : (day === 0 ? 6 : 6 - day);
    d.setDate(d.getDate() + daysToAdd);
    return d;
  }

  function buildConflictFreeSchedule(allMatches, startD = new Date('2026-08-15'), isRound1 = false) {
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

      let safetyCounter = 0;
      while (!assigned && safetyCounter < 500) {
        safetyCounter++;
        if (isRound1 && dayIdx > 12) {
          parallelCapacity += 2;
          dayIdx = 0;
          slotIdx = 0;
        }

        const key = `${dayIdx}_${slotIdx}`;
        if (!slotTracker[key]) slotTracker[key] = { count: 0, players: new Set() };

        const currentSlot = slotTracker[key];
        const hasConflict = (playerAId && currentSlot.players.has(playerAId)) || (playerBId && currentSlot.players.has(playerBId));

        if (currentSlot.count < parallelCapacity + Math.floor(safetyCounter / 100) && !hasConflict) {
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

      const currentDate = new Date(startD);
      const dateStr = formatDateShort(currentDate);
      return {
        ...m,
        scheduledDate: dateStr,
        scheduledTimeSlot: '11 AM to 12 PM',
        fullScheduleText: `Date:${dateStr} 11 AM to 12 PM`,
      };
    });
  }

  function buildAdultsWeekendSchedule(allMatches, baseStart = new Date('2026-08-15'), isRound1 = false) {
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
      let safetyCounter = 0;

      while (!assigned && safetyCounter < 100) {
        safetyCounter++;
        if (!weekendTracker[weekendIdx]) weekendTracker[weekendIdx] = { playerCounts: {}, slots: {} };
        const wData = weekendTracker[weekendIdx];
        const countA = wData.playerCounts[playerAId] || 0;
        const countB = wData.playerCounts[playerBId] || 0;
        const maxPerWeekend = safetyCounter > 25 ? 10 : 2;

        if (countA < maxPerWeekend && countB < maxPerWeekend) {
          for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
            for (let slotIdx = 0; slotIdx < slotsPerDay; slotIdx++) {
              const slotKey = `${dayOffset}_${slotIdx}`;
              if (!wData.slots[slotKey]) wData.slots[slotKey] = { count: 0, players: new Set() };
              const currentSlot = wData.slots[slotKey];
              const hasTimeSlotConflict = (playerAId && currentSlot.players.has(playerAId)) || (playerBId && currentSlot.players.has(playerBId));

              if (currentSlot.count < parallelCapacity + Math.floor(safetyCounter / 10) && !hasTimeSlotConflict) {
                currentSlot.count += 1;
                if (playerAId) { currentSlot.players.add(playerAId); wData.playerCounts[playerAId] = countA + 1; }
                if (playerBId) { currentSlot.players.add(playerBId); wData.playerCounts[playerBId] = countB + 1; }

                const matchDate = new Date(baseStart);
                matchDate.setDate(matchDate.getDate() + (weekendIdx * 7) + dayOffset);
                finalDateStr = formatDateShort(matchDate);
                const slotStartHour = startHour + slotIdx;
                finalSlotStr = `${formatHour12(slotStartHour)} to ${formatHour12(slotStartHour + 1)}`;
                assigned = true;
                break;
              }
            }
            if (assigned) break;
          }
        }
        if (!assigned) weekendIdx++;
      }

      if (!assigned) {
        finalDateStr = formatDateShort(baseStart);
        finalSlotStr = '11 AM to 12 PM';
      }

      return {
        ...m,
        scheduledDate: finalDateStr,
        scheduledTimeSlot: finalSlotStr,
        fullScheduleText: `Date:${finalDateStr} ${finalSlotStr}`,
      };
    });
  }

  function calculateInitialMatchSchedule(matchIndex) {
    const startD = new Date('2026-08-15');
    const startHour = 11;
    const matchesPerDay = 6;
    const parallelCapacity = 3;
    const dayOffset = Math.floor(matchIndex / matchesPerDay);
    const matchIndexOnDay = matchIndex % matchesPerDay;
    const slotIndex = Math.floor(matchIndexOnDay / parallelCapacity);

    const currentDate = new Date(startD);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateStr = formatDateShort(currentDate);
    const slotStartHour = startHour + slotIndex;
    const timeSlotStr = `${formatHour12(slotStartHour)} to ${formatHour12(slotStartHour + 1)}`;
    return {
      scheduledDate: dateStr,
      scheduledTimeSlot: timeSlotStr,
      fullScheduleText: `Date:${dateStr} ${timeSlotStr}`,
    };
  }

  // --- ROBUST STANDINGS RECALCULATION HELPER ---
  function recalculateGroupStandings(standings, matches) {
    const newStandings = standings.map(s => ({
      ...s,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      points: 0
    }));

    matches.forEach(m => {
      if (m.isLocked && m.scoreA !== null && m.scoreB !== null) {
        const pA = newStandings.find(s => s.id === m.playerA?.id || s.regId === m.playerA?.regId || s.name === m.playerA?.name);
        const pB = newStandings.find(s => s.id === m.playerB?.id || s.regId === m.playerB?.regId || s.name === m.playerB?.name);
        if (pA && pB) {
          const sA = Number(m.scoreA);
          const sB = Number(m.scoreB);
          pA.played += 1;
          pB.played += 1;
          if (sA > sB) {
            pA.won += 1;
            pA.points += 1;
            pB.lost += 1;
          } else if (sB > sA) {
            pB.won += 1;
            pB.points += 1;
            pA.lost += 1;
          } else {
            pA.drawn += 1;
            pA.points += 0.5;
            pB.drawn += 1;
            pB.points += 0.5;
          }
        }
      }
    });
    return newStandings;
  }

  // --- FUNCTION 1 & MERGING: OPTIMIZE & MERGE SINGLE-PLAYER GROUPS (Pure/Immutable) ---
  function optimizePlayerGroups(groups) {
    if (!groups || !Array.isArray(groups)) return [];
    let optimized = groups.map(g => ({
      ...g,
      standings: [...g.standings],
      matches: [...g.matches]
    }));

    while (optimized.length > 1 && optimized[optimized.length - 1].standings.length === 1) {
      const singlePlayerGroup = optimized.pop();
      const singlePlayer = singlePlayerGroup.standings[0];
      
      const lastIdx = optimized.length - 1;
      const targetGroup = {
        ...optimized[lastIdx],
        standings: [...optimized[lastIdx].standings],
        matches: [...optimized[lastIdx].matches]
      };

      const exists = targetGroup.standings.some(s => s.id === singlePlayer.id || s.name === singlePlayer.name);
      if (!exists) {
        targetGroup.standings.push(singlePlayer);
      }

      const newMatchesToAdd = [];
      targetGroup.standings.forEach(existingPlayer => {
        if (existingPlayer.id !== singlePlayer.id && existingPlayer.name !== singlePlayer.name) {
          const matchExists = targetGroup.matches.some(m => 
            (m.playerA?.id === existingPlayer.id && m.playerB?.id === singlePlayer.id) ||
            (m.playerA?.id === singlePlayer.id && m.playerB?.id === existingPlayer.id) ||
            (m.playerA?.name === existingPlayer.name && m.playerB?.name === singlePlayer.name) ||
            (m.playerA?.name === singlePlayer.name && m.playerB?.name === existingPlayer.name)
          );
          if (!matchExists) {
            const sched = calculateInitialMatchSchedule(targetGroup.matches.length + newMatchesToAdd.length + 5);
            newMatchesToAdd.push({
              id: `MATCH_${selectedCategory}_${targetGroup.groupName}_${existingPlayer.id || existingPlayer.name}_${singlePlayer.id || singlePlayer.name}_${Date.now()}`,
              groupName: targetGroup.groupName,
              playerA: existingPlayer,
              playerB: singlePlayer,
              scoreA: null,
              scoreB: null,
              isLocked: false,
              scheduledDate: sched.scheduledDate,
              scheduledTimeSlot: sched.scheduledTimeSlot,
              fullScheduleText: sched.fullScheduleText
            });
          }
        }
      });

      targetGroup.matches = [...targetGroup.matches, ...newMatchesToAdd];
      targetGroup.standings = recalculateGroupStandings(targetGroup.standings, targetGroup.matches);
      optimized[lastIdx] = targetGroup;
    }
    return optimized;
  }

  // Group Structures creation for initial tournament start
  const createGroupStructures = (shuffledPlayers, targetGroupSize, roundNamePrefix) => {
    const totalQ = shuffledPlayers.length;
    let groupSizes = [];

    if (totalQ <= targetGroupSize) {
      groupSizes = [totalQ];
    } else {
      let numGroups = Math.floor(totalQ / targetGroupSize);
      let remainder = totalQ % targetGroupSize;
      for (let g = 0; g < numGroups; g++) {
        groupSizes.push(targetGroupSize);
      }
      if (remainder > 0) {
        for (let i = 0; i < remainder; i++) {
          groupSizes[i % numGroups] += 1;
        }
      }
    }

    const rawMatchesList = [];
    const groupStructures = [];
    let groupCharCode = 65;
    let currentIndex = 0;

    groupSizes.forEach((gSize) => {
      const groupPlayers = shuffledPlayers.slice(currentIndex, currentIndex + gSize);
      currentIndex += gSize;
      const groupName = totalQ <= 5 && roundNamePrefix.toLowerCase().includes('grand finals') ? roundNamePrefix : `Group ${String.fromCharCode(groupCharCode++)}`;

      const standings = groupPlayers.map(p => ({
        id: p.id || p.regId || p.Registration_ID || `p_${Math.random()}`,
        regId: p.regId,
        Registration_ID: p.Registration_ID,
        name: p.name,
        flat: p.flat || p.flatNo || p.apartment || 'N/A',
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

    const optimizedStructures = optimizePlayerGroups(groupStructures);
    return { groupStructures: optimizedStructures, rawMatchesList };
  };

  const buildPlayerSchedulesMap = useCallback((updatedRoundsMap) => {
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
            };
            assignScheduleToPlayer(m.playerA);
            assignScheduleToPlayer(m.playerB);
          });
        });
      });
    });
    return schedulesMap;
  }, [sportState.playerSchedules]);

  // --- MEMOIZED FILTERED PARTICIPANTS ---
  const filteredParticipants = useMemo(() => {
    const rawFiltered = (localParticipants || []).filter(p => {
      if (!selectedCategory || selectedCategory === 'All') return true;
      const catStr = selectedCategory.toLowerCase();
      const pCat = (p.category || p.Category || '').toString().toLowerCase();
      const pAgeGroup = (p.ageGroup || p.AgeGroup || p['Age Group'] || '').toString().toLowerCase();
      const pAge = (p.age || p.Age || '').toString();
      const numAge = parseInt(pAge.match(/\d+/)?.[0] || '0', 10);

      if (pCat === catStr || pAgeGroup === catStr) return true;
      if (catStr.includes('under 8')) return (numAge > 0 && numAge < 8) || pCat.includes('under 8');
      if (catStr.includes('under 12')) return (numAge >= 8 && numAge < 12) || pCat.includes('under 12');
      if (catStr.includes('12 - 17') || catStr.includes('teens')) return (numAge >= 12 && numAge <= 17) || pCat.includes('12 - 17');
      if (catStr.includes('18+') || catStr.includes('adult')) return numAge >= 18 || pCat.includes('adult') || numAge === 0;
      return pCat.includes(catStr) || pAgeGroup.includes(catStr);
    });

    const seenIds = new Set();
    return rawFiltered.filter(p => {
      const pid = p.id || p.regId || p.Registration_ID;
      if (pid) {
        if (seenIds.has(pid)) return false;
        seenIds.add(pid);
        return true;
      }
      return true;
    });
  }, [localParticipants, selectedCategory]);

  // --- MEMOIZED DUPLICATE DETECTION LOGIC ---
  const duplicateGroups = useMemo(() => {
    const rawFiltered = (localParticipants || []).filter(p => {
      if (!selectedCategory || selectedCategory === 'All') return true;
      const catStr = selectedCategory.toLowerCase();
      const pCat = (p.category || p.Category || '').toString().toLowerCase();
      const pAgeGroup = (p.ageGroup || p.AgeGroup || p['Age Group'] || '').toString().toLowerCase();
      const pAge = (p.age || p.Age || '').toString();
      const numAge = parseInt(pAge.match(/\d+/)?.[0] || '0', 10);

      if (pCat === catStr || pAgeGroup === catStr) return true;
      if (catStr.includes('under 8')) return (numAge > 0 && numAge < 8) || pCat.includes('under 8');
      if (catStr.includes('under 12')) return (numAge >= 8 && numAge < 12) || pCat.includes('under 12');
      if (catStr.includes('12 - 17') || catStr.includes('teens')) return (numAge >= 12 && numAge <= 17) || pCat.includes('12 - 17');
      if (catStr.includes('18+') || catStr.includes('adult')) return numAge >= 18 || pCat.includes('adult') || numAge === 0;
      return pCat.includes(catStr) || pAgeGroup.includes(catStr);
    });

    const map = new Map();
    const duplicatesList = [];

    rawFiltered.forEach(p => {
      const key = (p.id || p.regId || p.Registration_ID || p.name || '').toString().trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, [p]);
      } else {
        map.get(key).push(p);
      }
    });

    map.forEach((entries, key) => {
      if (entries.length > 1) {
        duplicatesList.push({ key, entries });
      }
    });

    return duplicatesList;
  }, [localParticipants, selectedCategory]);

  // --- MEMOIZED ROUNDS DERIVATION ---
  const rounds = useMemo(() => {
    return (currentCategoryData.rounds || []).map(r => ({
      ...r,
      groups: optimizePlayerGroups(r.groups)
    }));
  }, [currentCategoryData.rounds]);

  const currentRoundIndex = currentCategoryData.currentRoundIndex;

  const handleResolveDuplicate = (keepEntry, entriesGroup) => {
    verifyAdminAndExecute(() => {
      const idsToRemove = new Set(entriesGroup.filter(e => e !== keepEntry).map(e => e.id || e.regId || e.Registration_ID));
      const updated = localParticipants.filter(p => {
        const pid = p.id || p.regId || p.Registration_ID;
        return !idsToRemove.has(pid);
      });
      setLocalParticipants(updated);
      alert(`✅ Duplicate entries resolved successfully! Kept player: ${keepEntry.name}`);
    });
  };

  const getParticipantSchedule = (p, idx = 0) => {
    const pid = p.id || p.regId || p.Registration_ID;
    const normName = p.name?.trim().toLowerCase();

    if (pid && sportState?.playerSchedules?.[pid]) return sportState.playerSchedules[pid];
    if (normName && sportState?.playerSchedules?.[normName]) return sportState.playerSchedules[normName];

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
    return { text: previewSched.fullScheduleText, date: previewSched.scheduledDate, time: previewSched.scheduledTimeSlot, roundName: 'Round 1 (Tentative)' };
  };

  // --- FUNCTION 2: EXPORT MATCH SCHEDULE DATA ---
  const exportMatchScheduleData = (categoriesDataMap) => {
    let exportRows = [];

    Object.entries(categoriesDataMap).forEach(([catName, catData]) => {
      const catRounds = catData?.rounds || [];
      catRounds.forEach(round => {
        (round.groups || []).forEach(group => {
          if (!group.matches || group.matches.length === 0) return;

          group.matches.forEach(match => {
            let winnerText = "Pending / Scheduled";
            if (match.isLocked && match.scoreA !== null && match.scoreB !== null) {
              const sA = Number(match.scoreA);
              const sB = Number(match.scoreB);
              if (sA > sB) winnerText = match.playerA?.name || "Player A";
              else if (sB > sA) winnerText = match.playerB?.name || "Player B";
              else winnerText = "Draw";
            }

            exportRows.push({
              MatchTiming: match.fullScheduleText || `Date:${match.scheduledDate} ${match.scheduledTimeSlot}`,
              Category: catName,
              Round: round.roundName || "Round 1",
              Group: group.groupName,
              PlayerA: match.playerA ? match.playerA.name : "Bye",
              PlayerB: match.playerB ? match.playerB.name : "Bye",
              Winner: winnerText
            });
          });
        });
      });
    });

    if (exportRows.length === 0) {
      alert("No match schedules found to export!");
      return;
    }

    const headers = ['Match Timing', 'Category', 'Round', 'Group', 'Player A', 'Player B', 'Winner'];
    const rows = exportRows.map(r => [
      `"${r.MatchTiming}"`,
      `"${r.Category}"`,
      `"${r.Round}"`,
      `"${r.Group}"`,
      `"${r.PlayerA}"`,
      `"${r.PlayerB}"`,
      `"${r.Winner}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chess_match_schedule_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // 1. DELETE TOURNAMENT (Secured)
  const handleDeleteTournament = () => {
    verifyAdminAndExecute(() => {
      const confirmDelete = window.confirm(`⚠️ Are you sure you want to DELETE the active tournament for category "${selectedCategory}"?`);
      if (!confirmDelete) return;

      const updatedMap = {
        ...categoryRoundsMap,
        [selectedCategory]: { rounds: [], currentRoundIndex: 0 }
      };
      const updatedPlayerSchedules = buildPlayerSchedulesMap(updatedMap);
      Object.keys(updatedPlayerSchedules).forEach(key => {
        if (updatedPlayerSchedules[key]?.category === selectedCategory) delete updatedPlayerSchedules[key];
      });

      onUpdateSportState({ categoryRounds: updatedMap, playerSchedules: updatedPlayerSchedules });
      alert(`Tournament for "${selectedCategory}" has been deleted successfully.`);
    });
  };

  // 2. INITIALIZE ROUND 1 (Secured)
  const handleInitializeRound1 = () => {
    verifyAdminAndExecute(() => {
      if (filteredParticipants.length < 2) {
        alert(`Not enough available participants in category "${selectedCategory}" to start Round 1.`);
        return;
      }
      const shuffled = [...filteredParticipants].sort(() => 0.5 - Math.random());
      const { groupStructures, rawMatchesList } = createGroupStructures(shuffled, groupSize, 'Round 1');
      const round1StartDate = new Date('2026-08-15');
      const scheduledMatches = selectedCategory === '18+ Years Adults' 
        ? buildAdultsWeekendSchedule(rawMatchesList, round1StartDate, true) 
        : buildConflictFreeSchedule(rawMatchesList, round1StartDate, true);

      const initialGroups = groupStructures.map(grp => ({
        groupName: grp.groupName,
        standings: grp.standings,
        matches: scheduledMatches.filter(m => grp.matchIds.includes(m.id))
      }));

      const newRounds = [{ roundName: 'Round 1', groups: initialGroups }];
      updateCurrentCategoryState(newRounds, 0);
      alert(`Round 1 initialized for ${selectedCategory}! Total matches scheduled: ${scheduledMatches.length}`);
    });
  };

  // --- ADD NEW PLAYER TO ACTIVE TOURNAMENT WITH ROBUST PERSISTENCE & STANDINGS ---
  const handleAddNewPlayerSubmit = (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      alert('Please enter a valid player name.');
      return;
    }

    verifyAdminAndExecute(() => {
      const newPlayerObj = {
        id: `p_new_${Date.now()}`,
        name: newPlayerName.trim(),
        flat: newPlayerFlat.trim() || 'N/A',
        age: newPlayerAge.trim() || 'N/A',
        category: selectedCategory,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0
      };

      setLocalParticipants(prev => [...prev, newPlayerObj]);

      if (rounds.length > 0 && rounds[currentRoundIndex]) {
        const currentRound = rounds[currentRoundIndex];
        let updatedGroups = [...currentRound.groups];

        let targetGroupIndex = updatedGroups.findIndex(g => g.standings.length === 3);

        if (targetGroupIndex !== -1) {
          const targetGroup = updatedGroups[targetGroupIndex];
          const newStandings = [...targetGroup.standings, newPlayerObj];
          
          const newGroupMatches = [];
          targetGroup.standings.forEach(existingPlayer => {
            const matchExists = targetGroup.matches.some(m => 
              (m.playerA?.id === existingPlayer.id && m.playerB?.id === newPlayerObj.id) ||
              (m.playerA?.id === newPlayerObj.id && m.playerB?.id === existingPlayer.id) ||
              (m.playerA?.name === existingPlayer.name && m.playerB?.name === newPlayerObj.name) ||
              (m.playerA?.name === newPlayerObj.name && m.playerB?.name === existingPlayer.name)
            );
            if (!matchExists) {
              newGroupMatches.push({
                id: `MATCH_${selectedCategory}_${targetGroup.groupName}_${existingPlayer.id}_${newPlayerObj.id}_${Date.now()}`,
                groupName: targetGroup.groupName,
                playerA: existingPlayer,
                playerB: newPlayerObj,
                scoreA: null,
                scoreB: null,
                isLocked: false
              });
            }
          });

          const combinedMatches = [...targetGroup.matches, ...newGroupMatches];
          const recalculatedStandings = recalculateGroupStandings(newStandings, combinedMatches);

          updatedGroups[targetGroupIndex] = {
            ...targetGroup,
            standings: recalculatedStandings,
            matches: combinedMatches
          };
        } else {
          let groupWithFiveIndex = updatedGroups.findIndex(g => g.standings.length === 5);
          if (groupWithFiveIndex !== -1) {
            const fiveGroup = updatedGroups[groupWithFiveIndex];
            const movedPlayer = fiveGroup.standings.pop();
            
            const remainingFiveStandings = recalculateGroupStandings(fiveGroup.standings, fiveGroup.matches);
            const remainingMatches = fiveGroup.matches.filter(m => m.playerA.id !== movedPlayer.id && m.playerB.id !== movedPlayer.id);
            updatedGroups[groupWithFiveIndex] = { ...fiveGroup, standings: remainingFiveStandings, matches: remainingMatches };

            const newGroupName = `Group ${String.fromCharCode(65 + updatedGroups.length)}`;
            const newGroupStandings = [movedPlayer, newPlayerObj];
            const newGroupMatch = {
              id: `MATCH_${selectedCategory}_${newGroupName}_${movedPlayer.id}_${newPlayerObj.id}_${Date.now()}`,
              groupName: newGroupName,
              playerA: movedPlayer,
              playerB: newPlayerObj,
              scoreA: null,
              scoreB: null,
              isLocked: false
            };
            updatedGroups.push({
              groupName: newGroupName,
              standings: recalculateGroupStandings(newGroupStandings, [newGroupMatch]),
              matches: [newGroupMatch]
            });
          } else {
            const newGroupName = `Group ${String.fromCharCode(65 + updatedGroups.length)}`;
            const newGroupStandings = [newPlayerObj];
            updatedGroups.push({
              groupName: newGroupName,
              standings: recalculateGroupStandings(newGroupStandings, []),
              matches: []
            });
          }
        }

        updatedGroups = optimizePlayerGroups(updatedGroups);

        const allMatchesFlat = [];
        updatedGroups.forEach(g => g.matches.forEach(m => { if (!m.scheduledDate) allMatchesFlat.push(m); }));
        const scheduledNew = selectedCategory === '18+ Years Adults' 
          ? buildAdultsWeekendSchedule(allMatchesFlat) 
          : buildConflictFreeSchedule(allMatchesFlat);

        let schedIdx = 0;
        updatedGroups = updatedGroups.map(g => ({
          ...g,
          matches: g.matches.map(m => {
            if (!m.scheduledDate && scheduledNew[schedIdx]) {
              return scheduledNew[schedIdx++];
            }
            return m;
          })
        }));

        const updatedRounds = [...rounds];
        updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
        updateCurrentCategoryState(updatedRounds, currentRoundIndex);
      }

      setNewPlayerName('');
      setNewPlayerFlat('');
      setNewPlayerAge('');
      setShowAddPlayerModal(false);
      alert(`🎉 New player "${newPlayerObj.name}" successfully added and assigned to the tournament!`);
    });
  };

  // 3. SAVE INDIVIDUAL SCHEDULE (Secured)
  const handleSaveIndividualSchedule = (groupIndex, matchId) => {
    verifyAdminAndExecute(() => {
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
          const updatedMatches = grp.matches.map(m => m.id === matchId ? { ...m, scheduledDate: formattedDate, scheduledTimeSlot: tempScheduleTime, fullScheduleText: fullText } : m);
          return { ...grp, matches: updatedMatches };
        });
        return { ...r, groups: updatedGroups };
      });

      updateCurrentCategoryState(updatedRounds, currentRoundIndex);
      setEditingMatchScheduleId(null);
      setTempScheduleDate('');
      setTempScheduleTime('');
      alert(`Match schedule updated successfully to ${fullText}!`);
    });
  };

  // 4. UPDATE MATCH SCORE WITH FULL PERSISTENCE (Secured)
  const updateMatchScore = (groupIndex, matchId, scoreA, scoreB) => {
    verifyAdminAndExecute(() => {
      const currentRound = rounds[currentRoundIndex];
      if (!currentRound) return;
      const numA = Number(scoreA);
      const numB = Number(scoreB);

      const updatedGroups = currentRound.groups.map((grp, gIdx) => {
        if (gIdx !== groupIndex) return grp;
        const updatedMatches = grp.matches.map(m => m.id === matchId ? { ...m, scoreA: numA, scoreB: numB, isLocked: true } : m);
        const newStandings = recalculateGroupStandings(grp.standings, updatedMatches);
        return { ...grp, standings: newStandings, matches: updatedMatches };
      });

      const updatedRounds = [...rounds];
      updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
      updateCurrentCategoryState(updatedRounds, currentRoundIndex);
    });
  };

  // 5. REVERT / RESET MATCH RESULT (Secured)
  const handleResetMatchResult = (groupIndex, matchId) => {
    verifyAdminAndExecute(() => {
      const confirmReset = window.confirm("Are you sure you want to revert this match result back to scheduled (clearing current scores)?");
      if (!confirmReset) return;

      const currentRound = rounds[currentRoundIndex];
      if (!currentRound) return;

      const updatedGroups = currentRound.groups.map((grp, gIdx) => {
        if (gIdx !== groupIndex) return grp;
        const updatedMatches = grp.matches.map(m => m.id === matchId ? { ...m, scoreA: null, scoreB: null, isLocked: false } : m);
        const newStandings = recalculateGroupStandings(grp.standings, updatedMatches);
        return { ...grp, standings: newStandings, matches: updatedMatches };
      });

      const updatedRounds = [...rounds];
      updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
      updateCurrentCategoryState(updatedRounds, currentRoundIndex);
      alert("Match result has been reset and reverted back to scheduled status!");
    });
  };

  // 6. SCHEDULE TIEBREAKER (Secured)
  const handleScheduleTiebreaker = (groupIndex) => {
    verifyAdminAndExecute(() => {
      const currentRound = rounds[currentRoundIndex];
      if (!currentRound) return;
      const grp = currentRound.groups[groupIndex];
      const isGrand = currentRound?.roundName?.toLowerCase().includes('grand finals');
      const effectiveAdv = getEffectiveAdv(grp, isGrand);
      const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);

      let tiedPlayers = [];
      if (isGrand) {
        tiedPlayers = sorted.filter(s => s.points === sorted[0]?.points && s.won === sorted[0]?.won);
      } else {
        const cutoffPlayer = sorted[effectiveAdv - 1];
        if (cutoffPlayer) tiedPlayers = sorted.filter(s => s.points === cutoffPlayer.points);
      }

      const uniqueTiedMap = new Map();
      tiedPlayers.forEach(p => uniqueTiedMap.set(p.id || p.name, p));
      const tiedList = Array.from(uniqueTiedMap.values());

      if (tiedList.length < 2 && sorted.length >= 2) tiedList.push(sorted[0], sorted[1]);
      if (tiedList.length < 2) {
        alert('Could not determine tied players for tiebreaker match.');
        return;
      }

      const newTiebreakerMatches = [];
      for (let x = 0; x < tiedList.length; x++) {
        for (let y = x + 1; y < tiedList.length; y++) {
          const sched = calculateInitialMatchSchedule(grp.matches.length + newTiebreakerMatches.length + 10);
          newTiebreakerMatches.push({
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
          });
        }
      }

      const updatedMatches = [...grp.matches, ...newTiebreakerMatches];
      const updatedStandings = recalculateGroupStandings(grp.standings, updatedMatches);

      const updatedGroups = currentRound.groups.map((g, gIdx) => gIdx !== groupIndex ? g : { ...g, standings: updatedStandings, matches: updatedMatches });
      const updatedRounds = [...rounds];
      updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
      updateCurrentCategoryState(updatedRounds, currentRoundIndex);
      alert(`⚖️ ${newTiebreakerMatches.length} tiebreaker playoff match(es) successfully scheduled!`);
    });
  };

  // 7. ADVANCE TO NEXT ROUND (Secured)
  const handleAdvanceToNextRound = () => {
    verifyAdminAndExecute(() => {
      const currentRound = rounds[currentRoundIndex];
      if (!currentRound) return;
      const hasUncompleted = currentRound.groups.some(grp => grp.matches.length === 0 || grp.matches.some(m => !m.isLocked || m.scoreA === null || m.scoreB === null));
      if (hasUncompleted) {
        alert('❌ Cannot advance until ALL matches in the current round are completed and scored!');
        return;
      }

      let qualifiedPlayers = [];
      currentRound.groups.forEach(grp => {
        const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
        qualifiedPlayers.push(...sorted.slice(0, getEffectiveAdv(grp, false)));
      });

      const qSeenIds = new Set();
      const uniqueQualified = qualifiedPlayers.filter(p => {
        const key = p.id || p.name;
        if (key && qSeenIds.has(key)) return false;
        if (key) qSeenIds.add(key);
        return true;
      });

      if (uniqueQualified.length < 2) {
        alert('Not enough qualified players to form the next round.');
        return;
      }

      let nextRoundName = uniqueQualified.length === 8 ? 'Quarter Finals' : (uniqueQualified.length === 4 ? 'Semi Finals' : (uniqueQualified.length <= 2 ? 'Grand Finals 🏆' : `Round ${rounds.length + 1}`));
      const shuffled = [...uniqueQualified].sort(() => 0.5 - Math.random());
      const { groupStructures, rawMatchesList } = createGroupStructures(shuffled, uniqueQualified.length <= 5 ? uniqueQualified.length : groupSize, nextRoundName);
      const nextRoundStartDate = getNextWeekendSaturday(getLatestDateFromRound(currentRound));

      const scheduledMatches = selectedCategory === '18+ Years Adults' 
        ? buildAdultsWeekendSchedule(rawMatchesList, nextRoundStartDate, false) 
        : buildConflictFreeSchedule(rawMatchesList, nextRoundStartDate, false);

      const nextGroups = groupStructures.map(grp => ({
        groupName: grp.groupName,
        standings: grp.standings,
        matches: scheduledMatches.filter(m => grp.matchIds.includes(m.id))
      }));

      const updatedRounds = [...rounds, { roundName: nextRoundName, groups: nextGroups }];
      updateCurrentCategoryState(updatedRounds, rounds.length);
      alert(`Successfully advanced ${uniqueQualified.length} players to ${nextRoundName}!`);
    });
  };

  const currentRound = rounds[currentRoundIndex];
  const isGrandFinale = currentRound?.roundName?.toLowerCase().includes('grand finals');

  const hasUncompletedMatches = currentRound ? currentRound.groups.some(grp => grp.matches.length === 0 || grp.matches.some(m => !m.isLocked || m.scoreA === null || m.scoreB === null)) : false;
  const hasUnresolvedTies = currentRound ? currentRound.groups.some(grp => {
    const allDone = grp.matches.length > 0 && grp.matches.every(m => m.isLocked && m.scoreA !== null && m.scoreB !== null);
    if (!allDone) return false;
    const effectiveAdv = getEffectiveAdv(grp, isGrandFinale);
    if (effectiveAdv >= grp.standings.length) return false;
    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
    return sorted[effectiveAdv - 1]?.points === sorted[effectiveAdv]?.points;
  }) : false;

  const canAdvance = currentRound && !hasUncompletedMatches && !hasUnresolvedTies;

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
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">♟️ Chess Master Championship Suite</h3>
          <p className="text-xs text-slate-400">Independent category tournaments, duplicate detection, mid-tournament new player addition & scheduling.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Category:</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button onClick={() => setChessTab('participants')} className={`px-3 py-1.5 rounded-lg transition ${chessTab === 'participants' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}>
              📍 Participants ({filteredParticipants.length})
            </button>
            <button onClick={() => setChessTab('hub')} className={`px-3 py-1.5 rounded-lg transition ${chessTab === 'hub' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}>
              ⚔️ Tournament & Scoring Hub
            </button>
            <button onClick={() => setChessTab('duplicates')} className={`px-3 py-1.5 rounded-lg transition relative ${chessTab === 'duplicates' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}>
              ⚠️ Duplicates
              {duplicateGroups.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {duplicateGroups.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => exportMatchScheduleData(categoryRoundsMap)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow"
          >
            <span>📥 Export Match Schedule</span>
          </button>

          {rounds.length === 0 ? (
            <button onClick={handleInitializeRound1} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
              🚀 Start Round 1
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setShowAddPlayerModal(true)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs shadow transition">
                ➕ Add Player
              </button>
              <button onClick={handleDeleteTournament} className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 font-black px-3 py-2 rounded-xl text-xs shadow transition">
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Chess Admin Security Status:</span>
          {isChessUnlocked ? (
            <span className="bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-black border border-emerald-500/20">Unlocked 🔓 (admin123 verified)</span>
          ) : (
            <span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded font-black border border-amber-500/20">Secured 🔒 (Prompt on action)</span>
          )}
        </div>
        {!isChessUnlocked && (
          <button onClick={() => verifyAdminAndExecute(() => alert("Chess module successfully unlocked!"))} className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1 rounded border border-slate-800">
            Unlock Now
          </button>
        )}
      </div>

      {/* --- DUPLICATES MANAGEMENT TAB --- */}
      {chessTab === 'duplicates' && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">⚠️ Duplicate Participant Review & Resolution</h4>
              <p className="text-[11px] text-slate-400">Inspect detected duplicate participants and select which record to keep or remove.</p>
            </div>
            <span className="bg-rose-950 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-full text-xs font-black">
              {duplicateGroups.length} Duplicate Group(s) Found
            </span>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center text-slate-400 space-y-2">
              <span className="text-3xl">✨</span>
              <p className="font-bold text-slate-200">No duplicate participants detected in category "{selectedCategory}".</p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateGroups.map((dup, idx) => (
                <div key={idx} className="bg-slate-900 p-5 rounded-2xl border border-rose-500/40 shadow-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="text-xs font-black text-rose-400 uppercase">Match Key / Identifier: {dup.key}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{dup.entries.length} conflicting records</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dup.entries.map((entry, eIdx) => {
                      const entryId = entry.id || entry.regId || entry.Registration_ID || `e_${eIdx}`;
                      return (
                        <div key={entryId} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 shadow">
                          <div className="space-y-1">
                            <div className="flex justify-between items-start">
                              <h5 className="font-bold text-slate-100 text-sm">{entry.name}</h5>
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-black">ID: {entryId}</span>
                            </div>
                            <p className="text-xs text-slate-400">Flat: <strong className="text-slate-200">{entry.flat || entry.flatNo || entry.apartment || 'N/A'}</strong></p>
                            <p className="text-xs text-slate-400">Category: <strong className="text-amber-400">{selectedCategory}</strong></p>
                          </div>
                          <button
                            onClick={() => handleResolveDuplicate(entry, dup.entries)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-lg text-xs shadow transition"
                          >
                            Keep This Record (Remove Others)
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- PARTICIPANTS TAB --- */}
      {chessTab === 'participants' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Chess Participants & Assigned Schedules ({selectedCategory})</h4>
              <p className="text-[11px] text-slate-400">Each registered player's match date and time slot are displayed below in real-time.</p>
            </div>
            {rounds.length === 0 ? (
              <button onClick={handleInitializeRound1} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs shadow">🚀 Start Round 1</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setShowAddPlayerModal(true)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs shadow">➕ Add Player</button>
                <button onClick={handleDeleteTournament} className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 font-black px-3 py-2 rounded-xl text-xs shadow">🗑️ Delete</button>
              </div>
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
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-black">ID: {pid}</span>
                    </div>
                    <p className="text-xs text-slate-400">Flat: <strong className="text-slate-200">{p.flat || p.flatNo || p.apartment || 'N/A'}</strong></p>
                  </div>
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

      {/* --- TOURNAMENT & SCORING HUB TAB --- */}
      {chessTab === 'hub' && (
        <>
          {rounds.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 items-center">
              <span className="text-xs font-bold text-amber-300 mr-2">[{selectedCategory} Rounds]:</span>
              {rounds.map((r, idx) => (
                <button key={idx} onClick={() => updateCurrentCategoryState(undefined, idx)} className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition ${currentRoundIndex === idx ? 'bg-amber-500 text-slate-950 border-amber-400 shadow' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
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
                  <button onClick={() => setShowAddPlayerModal(true)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs shadow">➕ Add Player</button>
                  <button onClick={handleDeleteTournament} className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 font-black px-3.5 py-2 rounded-xl text-xs shadow">🗑️ Delete</button>
                  {!isGrandFinale ? (
                    <button onClick={handleAdvanceToNextRound} disabled={!canAdvance} className={`font-black px-4 py-2 rounded-xl text-xs shadow transition ${canAdvance ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'}`}>
                      ⚡ Regroup & Advance Qualified Players
                    </button>
                  ) : (
                    <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl font-black border border-amber-500/20">🏆 Grand Finale Stage</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {currentRound.groups.map((grp, gIdx) => {
                  const effectiveAdv = getEffectiveAdv(grp, isGrandFinale);
                  const allGroupMatchesDone = grp.matches.length > 0 && grp.matches.every(m => m.isLocked && m.scoreA !== null && m.scoreB !== null);
                  let groupHasTie = false;
                  if (allGroupMatchesDone && effectiveAdv < grp.standings.length) {
                    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
                    if (sorted[effectiveAdv - 1]?.points === sorted[effectiveAdv]?.points) groupHasTie = true;
                  }

                  return (
                    <div key={grp.groupName} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h5 className="font-black text-amber-400 text-xs">{grp.groupName} ({grp.standings.length} Players)</h5>
                        <span className="text-[10px] text-slate-400">Top {effectiveAdv} Advance</span>
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
                            <tr key={s.id || s.name} className={rank < effectiveAdv ? 'bg-emerald-950/20' : ''}>
                              <td className="py-2.5 font-bold text-slate-100 flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${rank < effectiveAdv ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>{rank + 1}</span>
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

                      {groupHasTie && (
                        <div className="bg-amber-950/60 border border-amber-500/50 p-3 rounded-xl flex justify-between items-center text-xs">
                          <span className="text-amber-300 font-bold">⚠️ Tie detected at qualifying cutoff!</span>
                          <button onClick={() => handleScheduleTiebreaker(gIdx)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs shadow">⚖️ Schedule Tiebreaker</button>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Match Score Grid & Schedule</span>
                        {grp.matches.map((m) => (
                          <div key={m.id} className={`bg-slate-950 p-3 rounded-xl border ${m.isTiebreaker ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'} space-y-3`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                  {m.isTiebreaker && <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black">Tiebreaker</span>}
                                  <span>{m.playerA.name} <span className="text-amber-400 font-normal">vs</span> {m.playerB.name}</span>
                                </div>
                                <div onClick={() => {
                                  setEditingMatchScheduleId(editingMatchScheduleId === m.id ? null : m.id);
                                  setTempScheduleDate(parseShortDateToISO(m.scheduledDate));
                                  setTempScheduleTime(m.scheduledTimeSlot || '11 AM to 12 PM');
                                }} className="inline-flex items-center gap-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/70 px-2.5 py-1 rounded text-[10px] font-bold text-rose-200 cursor-pointer shadow">
                                  <span>📅 Date:{m.scheduledDate} {m.scheduledTimeSlot}</span>
                                  <span className="bg-rose-500/30 px-1.5 py-0.5 rounded text-[9px] text-amber-300 font-black">✏️ Edit</span>
                                </div>
                              </div>

                              {m.isLocked ? (
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-black border border-emerald-500/20">Result: {m.scoreA} - {m.scoreB}</span>
                                  <button onClick={() => handleResetMatchResult(gIdx, m.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/50 px-2.5 py-1 rounded text-[10px] font-black shadow">🔄 Revert</button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <select value={m.scoreA !== null ? m.scoreA : ''} onChange={(e) => updateMatchScore(gIdx, m.id, Number(e.target.value), Number(e.target.value) === 0.5 ? 0.5 : (Number(e.target.value) === 1 ? 0 : 1))} className="bg-slate-900 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 outline-none">
                                    <option value="" disabled>{m.playerA.name} Score</option>
                                    <option value={1}>1 (Win)</option>
                                    <option value={0.5}>0.5 (Draw)</option>
                                    <option value={0}>0 (Loss)</option>
                                  </select>
                                  <span className="text-slate-500 font-bold">-</span>
                                  <select value={m.scoreB !== null ? m.scoreB : ''} onChange={(e) => updateMatchScore(gIdx, m.id, Number(e.target.value) === 0.5 ? 0.5 : (Number(e.target.value) === 1 ? 0 : 1), Number(e.target.value))} className="bg-slate-900 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 outline-none">
                                    <option value="" disabled>{m.playerB.name} Score</option>
                                    <option value={1}>1 (Win)</option>
                                    <option value={0.5}>0.5 (Draw)</option>
                                    <option value={0}>0 (Loss)</option>
                                  </select>
                                </div>
                              )}
                            </div>

                            {editingMatchScheduleId === m.id && (
                              <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/40 space-y-3 shadow-xl">
                                <div className="flex justify-between items-center">
                                  <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider">✏️ Custom Schedule Override</div>
                                  <button onClick={() => setEditingMatchScheduleId(null)} className="text-slate-400 hover:text-white text-xs font-bold">✕</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <input type="date" value={tempScheduleDate} onChange={(e) => setTempScheduleDate(e.target.value)} className="w-full bg-slate-950 text-amber-300 font-bold p-1.5 rounded border border-slate-800 text-xs outline-none [color-scheme:dark]" />
                                  <input type="text" value={tempScheduleTime} onChange={(e) => setTempScheduleTime(e.target.value)} placeholder="11 AM to 12 PM" className="w-full bg-slate-950 text-amber-300 font-bold p-1.5 rounded border border-slate-800 text-xs outline-none" />
                                  <button onClick={() => handleSaveIndividualSchedule(gIdx, m.id)} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-1.5 rounded text-xs shadow">Save Schedule</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {isGrandFinale && (
                  <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-yellow-950/30 p-8 rounded-2xl border-2 border-amber-500/50 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 rounded-full flex items-center justify-center text-3xl font-black shadow-lg mb-4">👑</div>
                    <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2">Grand Champion ({selectedCategory}) 🎆</span>
                    <h3 className="text-2xl font-black text-amber-300 mt-2">{grandFinalsCompleted && grandChampion ? grandChampion.name : (grandFinalsTie ? '⚠️ Tie in Grand Finals' : 'Waiting for Final Match Completion...')}</h3>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <p>No active tournament round for category: <strong className="text-amber-400">{selectedCategory}</strong>.</p>
              <button onClick={handleInitializeRound1} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
                🚀 Start Round 1 for {selectedCategory}
              </button>
            </div>
          )}
        </>
      )}

      {/* --- ADD NEW PLAYER MODAL --- */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="font-black text-amber-400 text-sm">➕ Add New Player to {selectedCategory}</h4>
              <button onClick={() => setShowAddPlayerModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleAddNewPlayerSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Player Full Name *</label>
                <input type="text" required value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="e.g., Alex Johnson" className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Flat No. / Apartment</label>
                <input type="text" value={newPlayerFlat} onChange={(e) => setNewPlayerFlat(e.target.value)} placeholder="e.g., B-402" className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Age / Group</label>
                <input type="text" value={newPlayerAge} onChange={(e) => setNewPlayerAge(e.target.value)} placeholder="e.g., 10" className="w-full bg-slate-950 text-slate-100 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none" />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddPlayerModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow">Add & Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}