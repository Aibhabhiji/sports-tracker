'use client';

import React, { useState, useEffect } from 'react';

export default function CarromAdvancedModule({ participants = [], sportState = {}, onUpdateSportState }) {
  // Streamlined categories matching Chess
  const categories = [
    'Under 12 Kids',
    '12 - 17 Years',
    '18+ Years'
  ];

  const [selectedCategory, setSelectedCategory] = useState('Under 12 Kids');
  const [carromTab, setCarromTab] = useState('participants');

  // New Schedule Configuration Inputs (Date, Start Time, Total Hours)
  const [scheduleDateInput, setScheduleDateInput] = useState('2026-08-15');
  const [scheduleStartHourInput, setScheduleStartHourInput] = useState('17'); // 17 = 5 PM
  const [scheduleTotalHoursInput, setScheduleTotalHoursInput] = useState('4'); // 4 hours

  // Per-category rounds & teams stored in sportState
  const categoryRoundsMap = sportState?.categoryRounds || {};
  const categoryTeamsMap = sportState?.categoryTeams || {};

  const currentCategoryData = categoryRoundsMap[selectedCategory] || { rounds: [], currentRoundIndex: 0 };
  const rounds = currentCategoryData.rounds;
  const currentRoundIndex = currentCategoryData.currentRoundIndex;
  const currentTeams = categoryTeamsMap[selectedCategory] || [];

  const [advancementCount, setAdvancementCount] = useState(2);
  const [groupSize, setGroupSize] = useState(4); // Default 4 teams per group

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  // Editing individual match schedules
  const [editingMatchScheduleId, setEditingMatchScheduleId] = useState(null);
  const [tempScheduleDate, setTempScheduleDate] = useState('');
  const [tempScheduleTime, setTempScheduleTime] = useState('');

  // Update defaults based on selected category
  useEffect(() => {
    setAdvancementCount(2);
    setGroupSize(4);
  }, [selectedCategory]);

  // Helper to format Date object or Date string to '15Aug26'
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
    if (!dateStr) return scheduleDateInput;
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
    return scheduleDateInput;
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

  // Helper to format 30-minute time slots (e.g. 5 PM to 5:30 PM)
  const formatTimeSlot30 = (startHourFloat, durationHours) => {
    const formatSingleTime = (hFloat) => {
      const h = Math.floor(hFloat);
      const m = Math.round((hFloat - h) * 60);
      const h12 = h % 12 || 12;
      const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
      if (m === 0) return `${h12} ${ampm}`;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    const endFloat = startHourFloat + durationHours;
    return `${formatSingleTime(startHourFloat)} to ${formatSingleTime(endFloat)}`;
  };

  // Central Admin Verification Guard with Dedicated Carrom Password ('carrom2026' or 'admin123')
  const verifyAdminAndExecute = (actionCallback) => {
    if (isAdminUnlocked) {
      actionCallback();
    } else {
      const pin = prompt('🔒 Carrom Admin Password Required : - ');
      if (pin === '70908' || pin === 'sanvi70908') {
        setIsAdminUnlocked(true);
        actionCallback();
      } else if (pin !== null) {
        alert('❌ Incorrect Carrom admin password. Action cancelled.');
      }
    }
  };

  // Effective advancement count per group
  const getEffectiveAdv = (grp, isGrand) => {
    if (isGrand) return 1;
    if (grp.standings.length === 5) return 3;
    if (grp.standings.length === 4) return 2;
    if (grp.standings.length === 3) return 2;
    if (grp.standings.length < 4) return 1;
    return advancementCount;
  };

  // Conflict-free match schedule generator (6 matches per slot, 30 minutes per match)
  const buildConflictFreeSchedule = (allMatches) => {
    const startHour = parseInt(scheduleStartHourInput, 10) || 17;
    const totalHours = parseInt(scheduleTotalHoursInput, 10) || 4;
    const matchDuration = 0.5; // 30 minutes per match
    const slotsPerDay = Math.round(totalHours / matchDuration);
    const parallelCapacity = 6; // 6 matches per slot
    const startD = new Date(scheduleDateInput || '2026-08-15');

    const slotTracker = {};

    return allMatches.map((m) => {
      let dayIdx = 0;
      let slotIdx = 0;
      let assigned = false;

      const teamAId = m.playerA?.id || m.playerA?.name;
      const teamBId = m.playerB?.id || m.playerB?.name;

      while (!assigned) {
        const key = `${dayIdx}_${slotIdx}`;
        if (!slotTracker[key]) {
          slotTracker[key] = { count: 0, teams: new Set() };
        }

        const currentSlot = slotTracker[key];
        const hasConflict = (teamAId && currentSlot.teams.has(teamAId)) || (teamBId && currentSlot.teams.has(teamBId));

        if (currentSlot.count < parallelCapacity && !hasConflict) {
          currentSlot.count += 1;
          if (teamAId) currentSlot.teams.add(teamAId);
          if (teamBId) currentSlot.teams.add(teamBId);

          const currentDate = new Date(startD);
          currentDate.setDate(currentDate.getDate() + dayIdx);
          const dateStr = formatDateShort(currentDate);

          const slotStartFloat = startHour + (slotIdx * matchDuration);
          const timeSlotStr = formatTimeSlot30(slotStartFloat, matchDuration);

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

  // Calculate Initial Match Schedule Fallback (6 matches per slot, 30-min duration)
  const calculateInitialMatchSchedule = (matchIndex) => {
    const startD = new Date(scheduleDateInput || '2026-08-15');
    const startHour = parseInt(scheduleStartHourInput, 10) || 17;
    const totalHours = parseInt(scheduleTotalHoursInput, 10) || 4;
    const matchDuration = 0.5; // 30 mins
    const parallelCapacity = 6; // 6 matches per slot
    const slotsPerDay = Math.round(totalHours / matchDuration);

    const matchesPerDay = slotsPerDay * parallelCapacity;
    const dayOffset = Math.floor(matchIndex / matchesPerDay);
    const matchIndexOnDay = matchIndex % matchesPerDay;
    const slotIndex = Math.floor(matchIndexOnDay / parallelCapacity);

    const currentDate = new Date(startD);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateStr = formatDateShort(currentDate);

    const slotStartFloat = startHour + (slotIndex * matchDuration);
    const timeSlotStr = formatTimeSlot30(slotStartFloat, matchDuration);

    return {
      scheduledDate: dateStr,
      scheduledTimeSlot: timeSlotStr,
      fullScheduleText: `Date:${dateStr} ${timeSlotStr}`,
    };
  };

  // Filter participants specifically for selected category matching chess logic
  const rawFiltered = (participants || []).filter(p => {
    if (!selectedCategory || selectedCategory === 'All') return true;

    const catStr = selectedCategory.toLowerCase();
    const pCat = (p.category || p.Category || '').toString().toLowerCase();
    const pAgeGroup = (p.ageGroup || p.AgeGroup || p['Age Group'] || '').toString().toLowerCase();
    const pAge = (p.age || p.Age || '').toString();
    const numAge = parseInt(pAge.match(/\d+/)?.[0] || '0', 10);

    if (pCat === catStr || pAgeGroup === catStr) return true;

    if (catStr.includes('under 12')) {
      return (numAge > 0 && numAge < 12) || pCat.includes('under 12') || pAgeGroup.includes('under 12');
    }
    if (catStr.includes('12 - 17') || catStr.includes('teens')) {
      return (numAge >= 12 && numAge <= 17) || pCat.includes('12 - 17') || pCat.includes('teen') || pAgeGroup.includes('teen');
    }
    if (catStr.includes('18+') || catStr.includes('adult')) {
      return numAge >= 18 || pCat.includes('adult') || pCat.includes('senior') || pCat.includes('18+') || pAgeGroup.includes('adult') || pAgeGroup.includes('senior') || numAge === 0;
    }

    return pCat.includes(catStr) || pAgeGroup.includes(catStr);
  });

  // Strict participant deduplication
  const seenIds = new Set();
  const seenNames = new Set();
  const filteredParticipants = rawFiltered.filter(p => {
    const normName = p.name?.trim().toLowerCase();
    const pid = p.id || p.regId || p.Registration_ID;
    if ((pid && seenIds.has(pid)) || (normName && seenNames.has(normName))) return false;
    if (pid) seenIds.add(pid);
    if (normName) seenNames.add(normName);
    return true;
  });

  // Sync schedules for all individual players across all teams to sportState.playerSchedules
  const buildPlayerSchedulesMap = (updatedRoundsMap, updatedTeamsMap) => {
    const schedulesMap = { ...(sportState.playerSchedules || {}) };

    Object.entries(updatedRoundsMap).forEach(([catKey, catData]) => {
      const catRounds = catData?.rounds || [];
      catRounds.forEach(r => {
        (r.groups || []).forEach(g => {
          (g.matches || []).forEach(m => {
            const assignScheduleToTeamMembers = (teamObj) => {
              if (!teamObj) return;
              const players = [teamObj.player1, teamObj.player2].filter(Boolean);
              const opponent = m.playerA.id === teamObj.id ? m.playerB : m.playerA;
              const textVal = m.fullScheduleText || `Date:${m.scheduledDate} ${m.scheduledTimeSlot}`;

              players.forEach(player => {
                const partnerObj = players.find(p => (p.id || p.regId || p.name) !== (player.id || player.regId || player.name));
                const scheduleEntry = {
                  scheduledText: `${textVal} (${teamObj.name} vs ${opponent?.name || 'TBD'})`,
                  text: textVal,
                  date: m.scheduledDate,
                  time: m.scheduledTimeSlot,
                  roundName: r.roundName,
                  category: catKey,
                  teamId: teamObj.id,
                  teamName: teamObj.name,
                  partnerName: partnerObj?.name || 'N/A',
                  toString: () => textVal
                };

                const pid = player.id || player.regId || player.Registration_ID;
                if (pid) schedulesMap[pid] = scheduleEntry;
                if (player.name) schedulesMap[player.name.trim().toLowerCase()] = scheduleEntry;

                const origP = (participants || []).find(p => p.name?.trim().toLowerCase() === player.name?.trim().toLowerCase());
                if (origP) {
                  if (origP.id) schedulesMap[origP.id] = scheduleEntry;
                  if (origP.regId) schedulesMap[origP.regId] = scheduleEntry;
                  if (origP.Registration_ID) schedulesMap[origP.Registration_ID] = scheduleEntry;
                }
              });
            };

            assignScheduleToTeamMembers(m.playerA);
            assignScheduleToTeamMembers(m.playerB);
          });
        });
      });
    });

    return schedulesMap;
  };

  const updateCurrentCategoryState = (newRounds, newRoundIndex, newTeams) => {
    const updatedRoundsMap = {
      ...categoryRoundsMap,
      [selectedCategory]: {
        rounds: newRounds !== undefined ? newRounds : rounds,
        currentRoundIndex: newRoundIndex !== undefined ? newRoundIndex : currentRoundIndex,
      }
    };

    const updatedTeamsMap = {
      ...categoryTeamsMap,
      [selectedCategory]: newTeams !== undefined ? newTeams : currentTeams,
    };

    const updatedPlayerSchedules = buildPlayerSchedulesMap(updatedRoundsMap, updatedTeamsMap);
    onUpdateSportState({
      categoryRounds: updatedRoundsMap,
      categoryTeams: updatedTeamsMap,
      playerSchedules: updatedPlayerSchedules
    });
  };

  // Delete Tournament feature
  const handleDeleteTournament = () => {
    const confirmDelete = window.confirm(
      `⚠️ Are you sure you want to DELETE the active Carrom tournament for category "${selectedCategory}"?\n\nThis will completely clear rounds, group fixtures, match results, and team schedules for this category.`
    );
    if (!confirmDelete) return;

    const updatedRoundsMap = {
      ...categoryRoundsMap,
      [selectedCategory]: { rounds: [], currentRoundIndex: 0 }
    };

    const updatedTeamsMap = {
      ...categoryTeamsMap,
      [selectedCategory]: []
    };

    const updatedPlayerSchedules = buildPlayerSchedulesMap(updatedRoundsMap, updatedTeamsMap);
    onUpdateSportState({
      categoryRounds: updatedRoundsMap,
      categoryTeams: updatedTeamsMap,
      playerSchedules: updatedPlayerSchedules,
    });

    alert(`Tournament for "${selectedCategory}" has been deleted successfully!`);
  };

  // Feature: Explicitly form 2-player Teams per category
  const handleGenerateTeams = () => {
    verifyAdminAndExecute(() => {
      if (filteredParticipants.length < 2) {
        alert(`Need at least 2 participants in "${selectedCategory}" to form teams.`);
        return;
      }

      const shuffled = [...filteredParticipants].sort(() => 0.5 - Math.random());
      const generatedTeams = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          const p1 = shuffled[i];
          const p2 = shuffled[i + 1];
          const teamNum = generatedTeams.length + 1;
          generatedTeams.push({
            id: `TEAM_${selectedCategory}_${teamNum}_${Date.now()}`,
            name: `Team ${teamNum} (${p1.name} & ${p2.name})`,
            shortName: `Team ${teamNum}`,
            player1: {
              id: p1.id || p1.regId || p1.Registration_ID,
              name: p1.name,
              flat: p1.flat,
            },
            player2: {
              id: p2.id || p2.regId || p2.Registration_ID,
              name: p2.name,
              flat: p2.flat,
            },
          });
        } else {
          alert(`Note: Participant "${shuffled[i].name}" was left without a partner due to an odd total count (${shuffled.length}).`);
        }
      }

      updateCurrentCategoryState(undefined, undefined, generatedTeams);
      alert(`Successfully created ${generatedTeams.length} 2-player teams for category "${selectedCategory}"!`);
    });
  };

  // Helper to fetch individual participant's assigned team and schedule
  const getParticipantTeamAndSchedule = (p, idx = 0) => {
    const pid = p.id || p.regId || p.Registration_ID;
    const normName = p.name?.trim().toLowerCase();

    const foundTeam = currentTeams.find(t =>
      t.player1?.id === pid || t.player2?.id === pid ||
      t.player1?.name?.trim().toLowerCase() === normName ||
      t.player2?.name?.trim().toLowerCase() === normName
    );

    let partnerName = null;
    if (foundTeam) {
      if (foundTeam.player1?.id === pid || foundTeam.player1?.name?.trim().toLowerCase() === normName) {
        partnerName = foundTeam.player2?.name;
      } else {
        partnerName = foundTeam.player1?.name;
      }
    }

    const scheduleFromStore =
      (pid && sportState?.playerSchedules?.[pid]) ||
      (normName && sportState?.playerSchedules?.[normName]) ||
      (p.id && sportState?.playerSchedules?.[p.id]) ||
      (p.regId && sportState?.playerSchedules?.[p.regId]) ||
      (p.Registration_ID && sportState?.playerSchedules?.[p.Registration_ID]);

    if (scheduleFromStore) {
      return {
        team: foundTeam,
        partnerName: partnerName || scheduleFromStore.partnerName,
        schedule: scheduleFromStore
      };
    }

    if (foundTeam) {
      for (const r of rounds) {
        for (const g of r.groups || []) {
          for (const m of g.matches || []) {
            if (m.playerA?.id === foundTeam.id || m.playerB?.id === foundTeam.id) {
              const textVal = m.fullScheduleText || `Date:${m.scheduledDate} ${m.scheduledTimeSlot}`;
              return {
                team: foundTeam,
                partnerName,
                schedule: {
                  text: textVal,
                  scheduledText: textVal,
                  date: m.scheduledDate,
                  time: m.scheduledTimeSlot,
                  roundName: r.roundName
                }
              };
            }
          }
        }
      }
    }

    const matchIdx = Math.floor(idx / 2);
    const previewSched = calculateInitialMatchSchedule(matchIdx);
    return {
      team: foundTeam,
      partnerName,
      schedule: {
        text: previewSched.fullScheduleText,
        date: previewSched.scheduledDate,
        time: previewSched.scheduledTimeSlot,
        roundName: 'Round 1 (Tentative)'
      }
    };
  };

  // Initialize Round 1 Team Fixtures
  const handleInitializeRound1 = () => {
    verifyAdminAndExecute(() => {
      let teamsToUse = currentTeams;

      if (!teamsToUse || teamsToUse.length < 2) {
        if (filteredParticipants.length < 2) {
          alert(`Not enough participants in "${selectedCategory}" to form teams.`);
          return;
        }
        const shuffledParts = [...filteredParticipants].sort(() => 0.5 - Math.random());
        teamsToUse = [];
        for (let i = 0; i < shuffledParts.length; i += 2) {
          if (i + 1 < shuffledParts.length) {
            const p1 = shuffledParts[i];
            const p2 = shuffledParts[i + 1];
            const teamNum = teamsToUse.length + 1;
            teamsToUse.push({
              id: `TEAM_${selectedCategory}_${teamNum}_${Date.now()}`,
              name: `Team ${teamNum} (${p1.name} & ${p2.name})`,
              shortName: `Team ${teamNum}`,
              player1: { id: p1.id || p1.regId || p1.Registration_ID, name: p1.name, flat: p1.flat },
              player2: { id: p2.id || p2.regId || p2.Registration_ID, name: p2.name, flat: p2.flat },
            });
          }
        }
      }

      if (teamsToUse.length < 2) {
        alert('Need at least 2 teams to initialize Round 1 matches.');
        return;
      }

      const shuffledTeams = [...teamsToUse].sort(() => 0.5 - Math.random());
      const rawMatchesList = [];
      const groupStructures = [];
      let groupCharCode = 65;

      const effectiveGroupSize = shuffledTeams.length === 5 ? 5 : groupSize;

      for (let i = 0; i < shuffledTeams.length; i += effectiveGroupSize) {
        const groupTeams = shuffledTeams.slice(i, i + effectiveGroupSize);
        const groupName = `Group ${String.fromCharCode(groupCharCode++)}`;

        const standings = groupTeams.map(t => ({
          id: t.id,
          name: t.name,
          shortName: t.shortName,
          player1: t.player1,
          player2: t.player2,
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
              id: `CARROM_MATCH_${selectedCategory}_${groupName}_${x}_${y}_${Date.now()}`,
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
      }

      const scheduledMatches = buildConflictFreeSchedule(rawMatchesList);

      const initialGroups = groupStructures.map(grp => ({
        groupName: grp.groupName,
        standings: grp.standings,
        matches: scheduledMatches.filter(m => grp.matchIds.includes(m.id))
      }));

      const newRounds = [{ roundName: 'Round 1', groups: initialGroups }];
      updateCurrentCategoryState(newRounds, 0, teamsToUse);
      alert(`Round 1 initialized for ${selectedCategory} with ${teamsToUse.length} doubles teams (Starting ${scheduleDateInput} at ${scheduleStartHourInput}:00 for ${scheduleTotalHoursInput} hrs/day, 6 matches/slot, 30-min duration)!`);
    });
  };

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

      updateCurrentCategoryState(updatedRounds, currentRoundIndex, currentTeams);
      setEditingMatchScheduleId(null);
      setTempScheduleDate('');
      setTempScheduleTime('');
      alert(`Match schedule updated successfully to ${fullText}!`);
    });
  };

  const updateMatchScore = (groupIndex, matchId, scoreA, scoreB) => {
    verifyAdminAndExecute(() => {
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
            const tA = newStandings.find(s => s.id === m.playerA.id);
            const tB = newStandings.find(s => s.id === m.playerB.id);
            if (tA && tB) {
              const sA = Number(m.scoreA);
              const sB = Number(m.scoreB);
              tA.played += 1;
              tB.played += 1;
              if (sA > sB) {
                tA.won += 1; tA.points += 1;
                tB.lost += 1;
              } else if (sB > sA) {
                tB.won += 1; tB.points += 1;
                tA.lost += 1;
              } else {
                tA.drawn += 1; tA.points += 0.5;
                tB.drawn += 1; tB.points += 0.5;
              }
            }
          }
        });

        return { ...grp, standings: newStandings, matches: updatedMatches };
      });

      const updatedRounds = [...rounds];
      updatedRounds[currentRoundIndex] = { ...currentRound, groups: updatedGroups };
      updateCurrentCategoryState(updatedRounds, currentRoundIndex, currentTeams);
    });
  };

  // Schedule Tiebreaker for Tied Teams
  const handleScheduleTiebreaker = (groupIndex) => {
    verifyAdminAndExecute(() => {
      const currentRound = rounds[currentRoundIndex];
      if (!currentRound) return;

      const grp = currentRound.groups[groupIndex];
      const isGrandFinaleGroup = currentRound?.roundName?.toLowerCase().includes('grand finals');
      const effectiveAdv = getEffectiveAdv(grp, isGrandFinaleGroup);

      const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);

      let tiedTeams = [];
      if (isGrandFinaleGroup) {
        const topPoints = sorted[0]?.points;
        const topWins = sorted[0]?.won;
        tiedTeams = sorted.filter(s => s.points === topPoints && s.won === topWins);
      } else {
        const cutoffTeam = sorted[effectiveAdv - 1];
        if (cutoffTeam) {
          const boundaryScore = cutoffTeam.points;
          tiedTeams = sorted.filter(s => s.points === boundaryScore);
        }
      }

      const uniqueTiedMap = new Map();
      tiedTeams.forEach(t => uniqueTiedMap.set(t.id, t));
      const tiedList = Array.from(uniqueTiedMap.values());

      if (tiedList.length < 2 && sorted.length >= 2) {
        tiedList.push(sorted[0], sorted[1]);
      }

      if (tiedList.length < 2) {
        alert('Could not determine tied teams for tiebreaker match.');
        return;
      }

      const newTiebreakerMatches = [];
      for (let x = 0; x < tiedList.length; x++) {
        for (let y = x + 1; y < tiedList.length; y++) {
          const sched = calculateInitialMatchSchedule(grp.matches.length + newTiebreakerMatches.length + 10);
          const matchObj = {
            id: `CARROM_TIEBREAK_${selectedCategory}_${grp.groupName}_${x}_${y}_${Date.now()}`,
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
      updateCurrentCategoryState(updatedRounds, currentRoundIndex, currentTeams);
      alert(`⚖️ ${newTiebreakerMatches.length} tiebreaker playoff match(es) successfully scheduled among ${tiedList.map(t => t.name).join(', ')}!`);
    });
  };

  const handleAdvanceToNextRound = () => {
    verifyAdminAndExecute(() => {
      const currentRound = rounds[currentRoundIndex];
      if (!currentRound) return;

      const hasUncompletedMatches = currentRound.groups.some(grp =>
        grp.matches.length === 0 || grp.matches.some(m => !m.isLocked || m.scoreA === null || m.scoreB === null)
      );

      if (hasUncompletedMatches) {
        alert('❌ Cannot advance to the next round until ALL team matches in the current round are completed!');
        return;
      }

      let qualifiedTeams = [];
      currentRound.groups.forEach(grp => {
        const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
        const effectiveAdv = getEffectiveAdv(grp, isGrandFinale);
        const topN = sorted.slice(0, effectiveAdv);
        qualifiedTeams.push(...topN);
      });

      const qSeenIds = new Set();
      const uniqueQualified = qualifiedTeams.filter(t => {
        if (t.id && qSeenIds.has(t.id)) return false;
        if (t.id) qSeenIds.add(t.id);
        return true;
      });

      if (uniqueQualified.length < 2) {
        alert('Not enough qualified teams to form the next round.');
        return;
      }

      let nextRoundName = `Round ${rounds.length + 1}`;
      if (uniqueQualified.length === 8) nextRoundName = 'Quarter Finals';
      else if (uniqueQualified.length === 4) nextRoundName = 'Semi Finals';
      else if (uniqueQualified.length <= 2) nextRoundName = 'Grand Finals 🏆';

      const shuffled = [...uniqueQualified].sort(() => 0.5 - Math.random());
      const rawMatchesList = [];
      const groupStructures = [];
      let groupCharCode = 65;

      const currentGroupSize = uniqueQualified.length <= 5 ? uniqueQualified.length : groupSize;

      for (let i = 0; i < shuffled.length; i += currentGroupSize) {
        const groupTeams = shuffled.slice(i, i + currentGroupSize);
        const groupName = uniqueQualified.length <= 4 ? nextRoundName : `Group ${String.fromCharCode(groupCharCode++)}`;

        const standings = groupTeams.map(t => ({
          id: t.id,
          name: t.name,
          shortName: t.shortName,
          player1: t.player1,
          player2: t.player2,
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
              id: `CARROM_MATCH_${selectedCategory}_${groupName}_${x}_${y}_${Date.now()}`,
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
      }

      const scheduledMatches = buildConflictFreeSchedule(rawMatchesList);

      const nextGroups = groupStructures.map(grp => ({
        groupName: grp.groupName,
        standings: grp.standings,
        matches: scheduledMatches.filter(m => grp.matchIds.includes(m.id))
      }));

      const updatedRounds = [...rounds, { roundName: nextRoundName, groups: nextGroups }];
      updateCurrentCategoryState(updatedRounds, rounds.length, currentTeams);
      alert(`Successfully advanced ${uniqueQualified.length} teams to ${nextRoundName} for category ${selectedCategory}!`);
    });
  };

  const verifyAdminPassword = (e) => {
    e.preventDefault();
    if (adminPasswordInput === 'admin123' || adminPasswordInput === 'carrom2026' || adminPasswordInput === 'sanvi2026') {
      setIsAdminUnlocked(true);
      setAdminPasswordInput('');
      alert('Carrom Admin unlocked! You can now edit schedules and match results.');
    } else {
      alert('Incorrect Carrom admin password.');
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
    const effectiveAdv = getEffectiveAdv(grp, isGrandFinale);
    if (effectiveAdv >= grp.standings.length) return false;
    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
    const cutoffP = sorted[effectiveAdv - 1]?.points;
    const nextP = sorted[effectiveAdv]?.points;
    return cutoffP === nextP;
  }) : false;

  const canAdvance = currentRound && !hasUncompletedMatches && !hasUnresolvedTies;

  let grandChampionTeam = null;
  let grandFinalsCompleted = false;
  let grandFinalsTie = false;

  if (isGrandFinale && currentRound.groups.length > 0) {
    const g = currentRound.groups[0];
    const allMatchesDone = g.matches.length > 0 && g.matches.every(m => m.isLocked && m.scoreA !== null && m.scoreB !== null);
    const sorted = [...g.standings].sort((a, b) => b.points - a.points || b.won - a.won);

    if (allMatchesDone && sorted.length >= 2) {
      if (sorted[0].points > sorted[1].points || (sorted[0].points === sorted[1].points && sorted[0].won > sorted[1].won)) {
        grandChampionTeam = sorted[0];
        grandFinalsCompleted = true;
      } else if (sorted[0].points === sorted[1].points && sorted[0].won === sorted[1].won) {
        grandFinalsTie = true;
      }
    } else if (allMatchesDone && sorted.length === 1) {
      grandChampionTeam = sorted[0];
      grandFinalsCompleted = true;
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & View Toggle with Highlighted Area Schedule Inputs */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">🎯 Carrom Doubles Championship Suite</h3>
          <p className="text-xs text-slate-400">2 Players per Team format (Doubles). Form teams per category, auto-schedule team fixtures (6 matches/slot, 30-min duration) & track standings.</p>
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
            <span className="text-slate-400 font-bold">Top Teams Advance:</span>
            <select value={advancementCount} onChange={(e) => setAdvancementCount(Number(e.target.value))} className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none">
              <option value={2}>Top 2 Teams</option>
              <option value={3}>Top 3 Teams</option>
              <option value={1}>Top 1 Team</option>
            </select>
          </div>

          {/* Schedule Setup Controls placed in the highlighted area */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-amber-500/30 text-xs flex-wrap">
            <span className="text-amber-400 font-black">📅 Schedule Setup:</span>
            <input
              type="date"
              value={scheduleDateInput}
              onChange={(e) => setScheduleDateInput(e.target.value)}
              className="bg-slate-900 text-amber-300 font-bold rounded p-1 outline-none [color-scheme:dark] cursor-pointer text-xs"
              title="Tournament Start Date"
            />
            <select
              value={scheduleStartHourInput}
              onChange={(e) => setScheduleStartHourInput(e.target.value)}
              className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none text-xs"
              title="Start Time"
            >
              <option value="9">9 AM</option>
              <option value="10">10 AM</option>
              <option value="11">11 AM</option>
              <option value="12">12 PM</option>
              <option value="13">1 PM</option>
              <option value="14">2 PM</option>
              <option value="15">3 PM</option>
              <option value="16">4 PM</option>
              <option value="17">5 PM</option>
              <option value="18">6 PM</option>
              <option value="19">7 PM</option>
            </select>
            <select
              value={scheduleTotalHoursInput}
              onChange={(e) => setScheduleTotalHoursInput(e.target.value)}
              className="bg-slate-900 text-amber-400 font-bold rounded p-1 outline-none text-xs"
              title="Total Daily Hours"
            >
              <option value="2">2 Hrs</option>
              <option value="3">3 Hrs</option>
              <option value="4">4 Hrs</option>
              <option value="5">5 Hrs</option>
              <option value="6">6 Hrs</option>
              <option value="8">8 Hrs</option>
            </select>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setCarromTab('participants')}
              className={`px-3 py-1.5 rounded-lg transition ${carromTab === 'participants' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              👥 Players & Teams ({filteredParticipants.length})
            </button>
            <button
              onClick={() => setCarromTab('hub')}
              className={`px-3 py-1.5 rounded-lg transition ${carromTab === 'hub' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-400 hover:text-white'}`}
            >
              ⚔️ Tournament & Scoring Hub
            </button>
          </div>

          {currentTeams.length === 0 && (
            <button onClick={handleGenerateTeams} className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-black px-3.5 py-2 rounded-xl text-xs shadow">
              🤝 Auto-Pair 2-Player Teams
            </button>
          )}

          {rounds.length === 0 ? (
            <button onClick={handleInitializeRound1} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
              🚀 Start Round 1 ({selectedCategory})
            </button>
          ) : (
            <button
              onClick={handleDeleteTournament}
              className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/50 font-black px-3.5 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5"
            >
              🗑️ Delete Tournament
            </button>
          )}
        </div>
      </div>

      {/* Admin Security Bar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Carrom Admin Security:</span>
          {isAdminUnlocked ? (
            <span className="bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-black border border-emerald-500/20">Unlocked 🔓</span>
          ) : (
            <span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded font-black border border-amber-500/20">Locked 🔒</span>
          )}
        </div>
        {!isAdminUnlocked && (
          <form onSubmit={verifyAdminPassword} className="flex gap-2">
            <input type="password" placeholder="Carrom Admin Password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} className="bg-slate-900 text-slate-200 px-3 py-1 rounded border border-slate-800 text-xs outline-none" />
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold px-3 py-1 rounded border border-slate-800">Unlock</button>
          </form>
        )}
      </div>

      {/* TAB 1: PARTICIPANTS, TEAMS & SCHEDULE TILES */}
      {carromTab === 'participants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-3">
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Carrom Participants, 2-Player Teams & Match Schedules ({selectedCategory})</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Every match is 2 vs 2 (Doubles) with 6 parallel matches per slot and 30-minute duration.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerateTeams} className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-black px-3 py-2 rounded-xl text-xs shadow">
                🎲 {currentTeams.length > 0 ? 'Re-Pair Teams' : 'Form 2-Player Teams'}
              </button>
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
          </div>

          {/* Teams Summary Matrix */}
          {currentTeams.length > 0 && (
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider">Formed Doubles Teams ({currentTeams.length} Teams)</h5>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentTeams.map((team) => (
                  <div key={team.id} className="bg-slate-950 p-3 rounded-xl border border-amber-500/20 space-y-1 text-xs">
                    <div className="font-black text-amber-400">{team.name}</div>
                    <div className="text-slate-300 font-bold">👤 Player 1: <span className="text-white">{team.player1?.name}</span> <span className="text-slate-500">({team.player1?.flat})</span></div>
                    <div className="text-slate-300 font-bold">👤 Player 2: <span className="text-white">{team.player2?.name}</span> <span className="text-slate-500">({team.player2?.flat})</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participant Tile Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredParticipants.map((p, idx) => {
              const info = getParticipantTeamAndSchedule(p, idx);
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

                  {/* Team & Partner Info Badge */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1">
                    <div className="text-[9px] uppercase tracking-wider text-amber-400 font-black">🤝 Carrom Doubles Team</div>
                    {info.team ? (
                      <>
                        <div className="font-bold text-slate-200">{info.team.name}</div>
                        {info.partnerName && (
                          <div className="text-slate-400 text-[10px]">Partner: <strong className="text-emerald-400">{info.partnerName}</strong></div>
                        )}
                      </>
                    ) : (
                      <div className="text-amber-500/80 italic text-[10px]">Team not assigned yet</div>
                    )}
                  </div>

                  {/* Player Schedule Badge (Capturing Date, Start Time & 30-min End Time) */}
                  <div className="pt-1">
                    {info.schedule && (
                      <div className="bg-rose-950/70 border border-rose-500/60 p-2 rounded-xl text-[11px] font-bold text-rose-200 space-y-0.5 shadow">
                        <div className="text-[9px] uppercase tracking-wider text-rose-300 font-black">{info.schedule.roundName || 'Match Schedule'}</div>
                        <div>📅 {info.schedule.text || info.schedule.scheduledText}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TOURNAMENT & SCORING HUB */}
      {carromTab === 'hub' && (
        <>
          {rounds.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 items-center">
              <span className="text-xs font-bold text-amber-300 mr-2">[{selectedCategory} Rounds]:</span>
              {rounds.map((r, idx) => (
                <button
                  key={idx}
                  onClick={() => updateCurrentCategoryState(undefined, idx, currentTeams)}
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
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">{selectedCategory} — {currentRound.roundName} Leaderboards & Team Groups</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click directly on any schedule badge below to customize its date, start time, and end time (30-min duration).</p>
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
                      title={!canAdvance ? "Complete all matches and resolve any group ties with tiebreaker matches first" : "Advance qualified teams to next round"}
                    >
                      ⚡ Regroup & Advance Qualified Teams to Next Round
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

                  let groupHasTie = false;
                  if (allGroupMatchesDone && effectiveAdv < grp.standings.length) {
                    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
                    const cutoffP = sorted[effectiveAdv - 1]?.points;
                    const nextP = sorted[effectiveAdv]?.points;
                    if (cutoffP === nextP) groupHasTie = true;
                  } else if (allGroupMatchesDone && isGrandFinale) {
                    const sorted = [...grp.standings].sort((a, b) => b.points - a.points || b.won - a.won);
                    if (sorted.length >= 2 && sorted[0].points === sorted[1].points && sorted[0].won === sorted[1].won) {
                      groupHasTie = true;
                    }
                  }

                  return (
                    <div key={grp.groupName} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h5 className="font-black text-amber-400 text-xs">{grp.groupName} ({grp.standings.length} Teams)</h5>
                        <span className="text-[10px] text-slate-400">
                          {isGrandFinale ? 'Grand Final Match' : (grp.standings.length === 5 ? 'Top 3 Advance (5-Team Group)' : (grp.standings.length === 4 ? 'Top 2 Advance (4-Team Group)' : (grp.standings.length === 3 ? 'Top 2 Advance (3-Team Group)' : `Top ${effectiveAdv} Advance`)))}
                        </span>
                      </div>

                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="pb-2">Rank & Team</th>
                            <th className="pb-2">Players</th>
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
                              <td className="py-2.5 text-slate-400 text-[10px]">
                                {s.player1?.name} & {s.player2?.name}
                              </td>
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

                      {/* Team Match Scorekeeping Grid */}
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Team Match Score Grid & Schedule (6 Matches/Slot, 30-Min Duration)</span>
                        {grp.matches.map((m) => (
                          <div key={m.id} className={`bg-slate-950 p-3 rounded-xl border ${m.isTiebreaker ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'} space-y-3`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                                  {m.isTiebreaker && <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-black border border-amber-500/30">Tiebreaker</span>}
                                  <span><span className="text-amber-300">{m.playerA.name}</span> <span className="text-slate-500 font-normal">vs</span> <span className="text-amber-300">{m.playerB.name}</span></span>
                                </div>

                                {/* Schedule Badge (Date, Start Time & 30-Min End Time) */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div
                                    onClick={() => {
                                      verifyAdminAndExecute(() => {
                                        setEditingMatchScheduleId(editingMatchScheduleId === m.id ? null : m.id);
                                        setTempScheduleDate(parseShortDateToISO(m.scheduledDate));
                                        setTempScheduleTime(m.scheduledTimeSlot || '5 PM to 5:30 PM');
                                      });
                                    }}
                                    className="inline-flex items-center gap-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/70 px-2.5 py-1 rounded text-[10px] font-bold text-rose-200 cursor-pointer shadow transition"
                                    title="Click to edit schedule"
                                  >
                                    <span>📅 Date:{m.scheduledDate} Time: {m.scheduledTimeSlot} ({currentRound.roundName})</span>
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
                                    <option value="" disabled>Team A Score</option>
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
                                    <option value="" disabled>Team B Score</option>
                                    <option value={1}>1 (Win)</option>
                                    <option value={0.5}>0.5 (Draw)</option>
                                    <option value={0}>0 (Loss)</option>
                                  </select>
                                </div>
                              )}
                            </div>

                            {/* Schedule Editor Drawer */}
                            {editingMatchScheduleId === m.id && (
                              <div className="bg-slate-900 p-3 rounded-xl border border-amber-500/40 space-y-3 shadow-xl">
                                <div className="flex justify-between items-center">
                                  <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider">✏️ Custom Schedule Override for Match (30-Min Slot)</div>
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
                                    <label className="text-slate-400 text-[10px] block mb-1">Time Slot (e.g., 5 PM to 5:30 PM):</label>
                                    <input
                                      type="text"
                                      value={tempScheduleTime}
                                      onChange={(e) => setTempScheduleTime(e.target.value)}
                                      placeholder="5 PM to 5:30 PM"
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
                      Grand Champion Team ({selectedCategory}) 🎆
                    </span>

                    <h3 className="text-2xl font-black text-amber-300 mt-2">
                      {grandFinalsCompleted && grandChampionTeam ? grandChampionTeam.name : (grandFinalsTie ? '⚠️ Tie in Grand Finals (Playoff Required)' : 'Waiting for Final Result...')}
                    </h3>

                    <p className="text-xs text-slate-300 mt-1 font-bold">
                      {grandFinalsCompleted && grandChampionTeam
                        ? `Players: ${grandChampionTeam.player1?.name} & ${grandChampionTeam.player2?.name} • Total Points: ${grandChampionTeam.points} Pts`
                        : (grandFinalsTie ? 'Both finalist teams have tied. Please use the tiebreaker button to determine the sole champion team.' : 'Complete the Grand Finale match grid to reveal the champion team.')}
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-xs text-amber-400/80 bg-slate-950/60 px-4 py-2 rounded-xl border border-amber-500/20">
                      <span>✨ {grandFinalsCompleted && grandChampionTeam ? `Congratulations to the ${selectedCategory} Carrom Champions!` : 'Tournament Conclusion Pending'} ✨</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
              <p>No active tournament round for category: <strong className="text-amber-400">{selectedCategory}</strong>.</p>
              <button onClick={handleInitializeRound1} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow">
                🚀 Start Round 1 for {selectedCategory} ({currentTeams.length > 0 ? `${currentTeams.length} Teams` : `${filteredParticipants.length} players (auto-pair into teams)`})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}