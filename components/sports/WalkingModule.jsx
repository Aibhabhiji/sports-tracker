'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function WalkingModule({ sportState = {}, onUpdateSportState }) {
  const registeredParticipants = sportState.participants || [];

  // Read groups directly from sportState, fallback to default only if empty
  const groups = sportState.walkingGroups && sportState.walkingGroups.length > 0 ? sportState.walkingGroups : [
    { 
      id: 'group_1', 
      name: 'Male Group 2', 
      isCompleted: false, 
      winnerCount: 3, 
      requiredLaps: 2,
      lapColors: { 
        1: '#3b82f6', 2: '#eab308', 3: '#10b981', 4: '#ec4899', 
        5: '#8b5cf6', 6: '#f97316', 7: '#06b6d4', 8: '#14b8a6', 9: '#f43f5e', 10: '#a855f7' 
      },
      participants: [] 
    }
  ];
  
  const [activeGroupId, setActiveGroupId] = useState(() => groups[0]?.id || 'group_1');
  const [activeTab, setActiveTab] = useState('scorekeeper'); // 'scorekeeper', 'roster', 'lapColors'
  const [newParticipantName, setNewParticipantName] = useState('');
  const [importSummary, setImportSummary] = useState(null);

  // Timer States
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
  const requiredLaps = activeGroup.requiredLaps || 2;
  const lapColors = activeGroup.lapColors || { 
    1: '#3b82f6', 2: '#eab308', 3: '#10b981', 4: '#ec4899', 
    5: '#8b5cf6', 6: '#f97316', 7: '#06b6d4', 8: '#14b8a6', 9: '#f43f5e', 10: '#a855f7' 
  };

  // Check if all active participants have finished or DNF
  const participantsList = activeGroup.participants || [];
  const allFinished = participantsList.length > 0 && participantsList.every((p) => p.status === 'Finished' || p.status === 'DNF');

  // Timer interval effect with auto-stop on race completion
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && !allFinished) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else if (allFinished && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, allFinished]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleUpdateGroups = (updatedGroups) => {
    if (onUpdateSportState) {
      onUpdateSportState({ ...sportState, walkingGroups: updatedGroups });
    }
  };

  const handleUpdateActiveGroup = (updatedGroup) => {
    const updatedGroups = groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
    handleUpdateGroups(updatedGroups);
  };

  // --- EXCEL FILE UPLOAD & PARSER ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const newGroups = [...groups]; // Keep existing groups or merge
        let totalImported = 0;
        let matchedCount = 0;
        let unmatchedCount = 0;

        workbook.SheetNames.forEach((sheetName) => {
          if (sheetName.trim().toLowerCase() === 'date and time') return;

          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (jsonData.length === 0) return;

          let nameRowIdx = -1;
          for (let i = 0; i < jsonData.length; i++) {
            const rowStr = JSON.stringify(jsonData[i]).toLowerCase();
            if (rowStr.includes('name')) {
              nameRowIdx = i;
              break;
            }
          }
          if (nameRowIdx === -1) return;

          const participants = [];
          for (let i = nameRowIdx + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const nameVal = row[0] ? String(row[0]).trim() : '';
            if (!nameVal || nameVal.startsWith('Unnamed')) continue;

            totalImported++;
            const matchedReg = registeredParticipants.find(
              (p) => p.name && p.name.trim().toLowerCase() === nameVal.toLowerCase()
            );

            if (matchedReg) matchedCount++;
            else unmatchedCount++;

            participants.push({
              id: `walk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              name: nameVal,
              phase: row[1] ? String(row[1]).trim() : (matchedReg?.phase || 'Phase-1'),
              flat: row[2] ? String(row[2]).trim() : (matchedReg?.flat || ''),
              bib: row[3] ? String(row[3]).trim() : `#${String(participants.length + 1).padStart(2, '0')}`,
              laps: 0,
              requiredLaps: 2,
              splits: [],
              status: 'Yet to Start',
              finalTime: null,
              rank: null,
              isVerified: !!matchedReg,
            });
          }

          if (participants.length > 0) {
            const existingGroupIndex = newGroups.findIndex(g => g.name.toLowerCase() === sheetName.trim().toLowerCase());
            if (existingGroupIndex >= 0) {
              // Merge participants if group already exists
              newGroups[existingGroupIndex] = {
                ...newGroups[existingGroupIndex],
                participants: participants
              };
            } else {
              newGroups.push({
                id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: sheetName.trim(),
                isCompleted: false,
                winnerCount: 3,
                requiredLaps: 2,
                lapColors: { 
                  1: '#3b82f6', 2: '#eab308', 3: '#10b981', 4: '#ec4899', 
                  5: '#8b5cf6', 6: '#f97316', 7: '#06b6d4', 8: '#14b8a6', 9: '#f43f5e', 10: '#a855f7' 
                },
                participants,
              });
            }
          }
        });

        if (newGroups.length > 0) {
          handleUpdateGroups(newGroups);
          setActiveGroupId(newGroups[newGroups.length - 1].id);
          setImportSummary({ totalGroups: newGroups.length, totalImported, matchedCount, unmatchedCount });
          alert(`✅ Successfully imported walking sheets!`);
        } else {
          alert('⚠️ Could not find valid participant tables.');
        }
      } catch (err) {
        console.error(err);
        alert('❌ Error reading Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- LIVE SCOREKEEPER ACTIONS ---
  const handleRecordLap = (participantId) => {
    if (!isTimerRunning && secondsElapsed === 0) {
      setIsTimerRunning(true);
    }

    const updatedParticipants = activeGroup.participants.map((p) => {
      if (p.id === participantId && p.status !== 'DNF' && p.laps < requiredLaps) {
        const newLaps = p.laps + 1;
        const currentTimeStr = formatTime(secondsElapsed);
        const newSplits = [...(p.splits || []), currentTimeStr];
        const isFinished = newLaps >= requiredLaps;

        return {
          ...p,
          laps: newLaps,
          splits: newSplits,
          status: isFinished ? 'Finished' : 'Racing',
          finalTime: isFinished ? currentTimeStr : null,
        };
      }
      return p;
    });

    handleUpdateActiveGroup({ ...activeGroup, participants: updatedParticipants });
  };

  const handleUndoLap = (participantId, e) => {
    e.stopPropagation();
    const updatedParticipants = activeGroup.participants.map((p) => {
      if (p.id === participantId && p.laps > 0) {
        const newLaps = p.laps - 1;
        const newSplits = [...p.splits];
        newSplits.pop();
        return {
          ...p,
          laps: newLaps,
          splits: newSplits,
          status: newLaps === 0 ? 'Yet to Start' : 'Racing',
          finalTime: null,
        };
      }
      return p;
    });

    handleUpdateActiveGroup({ ...activeGroup, participants: updatedParticipants });
  };

  const handleToggleDNF = (participantId, e) => {
    e.stopPropagation();
    const updatedParticipants = activeGroup.participants.map((p) => {
      if (p.id === participantId) {
        const newStatus = p.status === 'DNF' ? 'Yet to Start' : 'DNF';
        return { ...p, status: newStatus };
      }
      return p;
    });
    handleUpdateActiveGroup({ ...activeGroup, participants: updatedParticipants });
  };

  const handleResetRace = () => {
    if (window.confirm('Are you sure you want to reset the race timer and all recorded laps for this group?')) {
      setIsTimerRunning(false);
      setSecondsElapsed(0);
      const updatedParticipants = activeGroup.participants.map((p) => ({
        ...p,
        laps: 0,
        splits: [],
        status: 'Yet to Start',
        finalTime: null,
        rank: null,
      }));
      handleUpdateActiveGroup({ ...activeGroup, participants: updatedParticipants, isCompleted: false });
    }
  };

  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (!newParticipantName.trim()) return;
    const newP = {
      id: `walk_${Date.now()}`,
      name: newParticipantName.trim(),
      phase: 'Phase-1',
      flat: '',
      bib: `#${String((activeGroup.participants?.length || 0) + 1).padStart(2, '0')}`,
      laps: 0,
      requiredLaps: requiredLaps,
      splits: [],
      status: 'Yet to Start',
      finalTime: null,
      rank: null,
      isVerified: false,
    };
    handleUpdateActiveGroup({ ...activeGroup, participants: [...(activeGroup.participants || []), newP] });
    setNewParticipantName('');
  };

  // Sort leaderboard data
  const sortedLeaderboard = [...(activeGroup.participants || [])].sort((a, b) => {
    if (a.status === 'Finished' && b.status !== 'Finished') return -1;
    if (b.status === 'Finished' && a.status !== 'Finished') return 1;
    if (a.status === 'Finished' && b.status === 'Finished') {
      return (a.finalTime || '').localeCompare(b.finalTime || '');
    }
    return b.laps - a.laps;
  });

  return (
    <div className="bg-[#0b0f19] text-slate-100 min-h-screen p-4 md:p-6 rounded-2xl border border-slate-800 space-y-6">
      
      {/* Top Header & Event Navigation */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-xl border border-amber-500/20 text-xl">
            🚶
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Walking Event Module & Live Lap Scorekeeper</h2>
            <p className="text-xs text-slate-400">Manage walking schedules, fixtures, and record multi-lap timings via interactive player tiles.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={activeGroupId}
            onChange={(e) => setActiveGroupId(e.target.value)}
            className="bg-[#1e293b] border border-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 text-slate-200 outline-none w-full md:w-64 cursor-pointer"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name} {g.isCompleted ? '🔒' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Module Mode Switcher Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('scorekeeper')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'scorekeeper' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-[#131b2e] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>⏱️ Live Lap Scorekeeper</span>
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'roster' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-[#131b2e] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>📋 Roster & Group Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('lapColors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'lapColors' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-[#131b2e] text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>🎨 Configure Lap Colors</span>
        </button>
      </div>

      {/* VIEW 1: LIVE LAP SCOREKEEPER */}
      {activeTab === 'scorekeeper' && (
        <div className="space-y-6">
          {/* Scorekeeping Control Panel */}
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-amber-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-br-lg uppercase tracking-wider">
              Live Scorekeeping
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mt-2 mb-6">
              <div>
                <h3 className="text-2xl font-black text-white">{activeGroup.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Required Laps: <span className="text-amber-400 font-bold">{requiredLaps}</span>
                  {allFinished && <span className="ml-3 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">🏁 Race Completed - Timer Stopped</span>}
                </p>
              </div>

              {/* Timer & Global Controls */}
              <div className="flex items-center gap-4 bg-[#1a233a] border border-slate-700/60 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Race Elapsed Time</span>
                  <span className="text-2xl font-mono font-bold text-amber-400">{formatTime(secondsElapsed)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    disabled={allFinished}
                    className={`font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition shadow-lg ${
                      allFinished ? 'bg-slate-700 text-slate-400 cursor-not-allowed' :
                      isTimerRunning ? 'bg-amber-500 text-slate-950 shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    <span>{isTimerRunning ? '⏸️ Pause Timer' : '▶️ Start Race Timer'}</span>
                  </button>
                  <button
                    onClick={handleResetRace}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs transition border border-slate-700"
                    title="Reset Race"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Player Tiles Grid */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tap player tile when completing a lap (<span className="text-amber-400 font-bold">{requiredLaps}</span> laps total)
              </span>
              <span className="text-xs text-amber-400 font-medium">💡 Tap once per completed lap</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {(activeGroup.participants || []).map((player) => {
                const isFinished = player.laps >= requiredLaps;
                const currentLap = Math.min(player.laps + 1, requiredLaps);
                const activeLapColor = lapColors[isFinished ? requiredLaps : currentLap] || '#3b82f6';

                return (
                  <div
                    key={player.id}
                    onClick={() => !isFinished && player.status !== 'DNF' && handleRecordLap(player.id)}
                    style={{
                      borderColor: isFinished ? '#10b981' : player.status === 'DNF' ? '#ef4444' : activeLapColor,
                    }}
                    className={`bg-[#1a233a] border-2 rounded-2xl p-4 flex flex-col justify-between transition relative overflow-hidden select-none shadow-md ${
                      isFinished
                        ? 'bg-emerald-950/20'
                        : player.status === 'DNF'
                        ? 'opacity-60'
                        : 'hover:scale-[1.01] cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-base font-mono font-black text-amber-300 tracking-wider bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 shadow">
                        {player.bib || '#--'}
                      </span>
                      <div className="flex items-center gap-1">
                        {player.laps > 0 && (
                          <button
                            onClick={(e) => handleUndoLap(player.id, e)}
                            className="text-[10px] bg-slate-700 hover:bg-red-500/20 hover:text-red-400 text-slate-300 px-1.5 py-0.5 rounded transition"
                            title="Undo Last Lap"
                          >
                            ↩️ Undo
                          </button>
                        )}
                        <span 
                          style={{ backgroundColor: activeLapColor }}
                          className="text-xs font-black px-2.5 py-1 rounded text-slate-950 shadow-md"
                        >
                          Lap {player.laps}/{requiredLaps}
                        </span>
                      </div>
                    </div>

                    <div className="my-2">
                      <h4 className="font-black text-sm text-white truncate">{player.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{player.phase} {player.flat ? `(${player.flat})` : ''}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center text-xs">
                      <span className={isFinished ? 'text-emerald-400 font-bold' : player.status === 'DNF' ? 'text-red-400 font-bold' : 'text-slate-300 font-semibold'}>
                        {isFinished ? '✅ Completed' : player.status === 'DNF' ? '❌ DNF' : `Tap for Lap ${currentLap}`}
                      </span>
                      <button
                        onClick={(e) => handleToggleDNF(player.id, e)}
                        className="text-[10px] text-slate-400 hover:text-amber-400 underline"
                      >
                        {player.status === 'DNF' ? 'Reactivate' : 'Mark DNF'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Leaderboard Table */}
          <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span>🏆</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Live Results & Leaderboard</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">BIB #</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Flat / Phase</th>
                    <th className="py-3 px-4">Lap Splits</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Final Timing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sortedLeaderboard.map((player, index) => (
                    <tr key={player.id} className="hover:bg-[#182238] transition">
                      <td className="py-3 px-4 font-bold text-slate-300">#{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-300">{player.bib || '-'}</td>
                      <td className="py-3 px-4 font-bold text-white">{player.name}</td>
                      <td className="py-3 px-4 text-slate-400">{player.phase} {player.flat ? `(${player.flat})` : ''}</td>
                      <td className="py-3 px-4 font-mono text-amber-300/90">
                        {player.splits && player.splits.length > 0 ? player.splits.join(' • ') : <span className="text-slate-500 italic">No laps recorded</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded font-bold ${
                          player.status === 'Finished' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          player.status === 'DNF' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {player.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {player.finalTime || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LAP COLOR CUSTOMIZER */}
      {activeTab === 'lapColors' && (
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">🎨 Configure Lap Tile Colors for {activeGroup.name}</h3>
            <p className="text-xs text-slate-400">Assign a unique tile accent color for each lap (1 to {requiredLaps}). When a runner reaches that lap, their interactive tile will switch to that color.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: Math.max(requiredLaps, 4) }, (_, i) => i + 1).map((lapNum) => (
              <div key={lapNum} className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Lap {lapNum} Color</span>
                  <span className="text-[10px] text-slate-400">{lapNum <= requiredLaps ? 'Active Lap' : 'Optional'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={lapColors[lapNum] || '#3b82f6'}
                    onChange={(e) => {
                      const newColors = { ...lapColors, [lapNum]: e.target.value };
                      handleUpdateActiveGroup({ ...activeGroup, lapColors: newColors });
                    }}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300">{lapColors[lapNum] || '#3b82f6'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Required Laps Configured: <span className="text-amber-400 font-bold">{requiredLaps}</span>
            </div>
            <button
              onClick={() => setActiveTab('scorekeeper')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition"
            >
              Save & Return to Scorekeeper 🚀
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: ROSTER & GROUP SETTINGS */}
      {activeTab === 'roster' && (
        <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Excel Roster Upload & Group Settings</h3>
              <p className="text-xs text-slate-400">Import walking schedule sheets, configure required laps (1-10), and manage competitor BIB numbers.</p>
            </div>
            <label className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs shadow cursor-pointer transition flex items-center gap-2">
              <span>📥 Load Walking Excel</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {importSummary && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-300 flex justify-between items-center">
              <span>📊 Imported <strong>{importSummary.totalGroups}</strong> sheets ({importSummary.totalImported} players). Verified: {importSummary.matchedCount}, New: {importSummary.unmatchedCount}.</span>
              <button onClick={() => setImportSummary(null)} className="underline font-bold">Dismiss</button>
            </div>
          )}

          {/* Group Required Laps Selector (1 to 10 Dropdown) */}
          <div className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Group Required Laps (1 to 10)</span>
              <span className="text-[10px] text-slate-400">Select total laps required for this group's race event</span>
            </div>
            <select
              value={requiredLaps}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 2;
                handleUpdateActiveGroup({ ...activeGroup, requiredLaps: val });
              }}
              className="bg-[#0b0f19] border border-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-400 w-36 text-center outline-none cursor-pointer"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} Lap{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Quick Add Participant */}
          <form onSubmit={handleAddParticipant} className="flex gap-3">
            <input
              type="text"
              placeholder="Add participant to group..."
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              className="flex-1 bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-xs font-bold text-white outline-none"
            />
            <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition">
              + Add Participant
            </button>
          </form>

          {/* Roster Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e293b] text-slate-300 font-black uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Participant Name</th>
                  <th className="p-3">Phase / Flat</th>
                  <th className="p-3">BIB #</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(activeGroup.participants || []).map((p) => (
                  <tr key={p.id} className="hover:bg-[#182238] transition">
                    <td className="p-3 font-bold text-white">{p.name}</td>
                    <td className="p-3 text-slate-400">{p.phase} {p.flat ? `(${p.flat})` : ''}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={p.bib || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = activeGroup.participants.map(item => item.id === p.id ? { ...item, bib: val } : item);
                          handleUpdateActiveGroup({ ...activeGroup, participants: updated });
                        }}
                        className="bg-[#0b0f19] border border-slate-700 px-2 py-1 rounded text-xs font-bold text-white w-20 outline-none"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          const updated = activeGroup.participants.filter(item => item.id !== p.id);
                          handleUpdateActiveGroup({ ...activeGroup, participants: updated });
                        }}
                        className="text-red-400 hover:text-red-300 font-bold"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}