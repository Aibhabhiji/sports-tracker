'use client';

import React, { useState } from 'react';

export default function TableTennisModule({ sportName = 'Table Tennis', participants, sportState, onUpdateSportState }) {
  const categories = ['All', ...new Set(participants.map(p => p.category || 'General'))];
  const [selectedCategory, setSelectedCategory] = useState(categories[1] || 'General');

  const allTeams = sportState.teams || {};
  const categoryTeams = allTeams[selectedCategory] || { singles: [], doubles: [], mixed: [] };
  const [teams, setTeams] = useState(categoryTeams);

  const matches = sportState.matches || [];
  const [matchList, setMatchList] = useState(matches);

  const updateTeamsState = (newCategoryTeams) => {
    const updatedAll = { ...allTeams, [selectedCategory]: newCategoryTeams };
    setTeams(newCategoryTeams);
    onUpdateSportState({ teams: updatedAll, matches: matchList });
  };

  const updateMatchesState = (newMatches) => {
    setMatchList(newMatches);
    onUpdateSportState({ teams: allTeams, matches: newMatches });
  };

  const catParticipants = participants.filter(p => selectedCategory === 'All' || (p.category || 'General') === selectedCategory);

  // Prevent duplicate player selection across teams in this category
  const getSelectedPlayerIds = () => {
    const selected = new Set();
    ['singles', 'doubles', 'mixed'].forEach(type => {
      if (Array.isArray(teams[type])) {
        teams[type].forEach(item => {
          if (item.player1) selected.add(item.player1);
          if (item.player2) selected.add(item.player2);
        });
      }
    });
    return selected;
  };

  const selectedIds = getSelectedPlayerIds();

  // Automatic Team Distribution
  const handleAutoDistribute = () => {
    let pool = [...catParticipants];
    pool.sort(() => Math.random() - 0.5);

    const newSingles = [];
    const newDoubles = [];
    const newMixed = [];

    while (pool.length >= 1 && newSingles.length < 4) {
      const p = pool.shift();
      newSingles.push({ id: 's_' + Date.now() + Math.random(), player1: p.id || p.regId || p.Registration_ID, name1: p.name });
    }

    while (pool.length >= 2 && newDoubles.length < 3) {
      const p1 = pool.shift();
      const p2 = pool.shift();
      newDoubles.push({ 
        id: 'd_' + Date.now() + Math.random(), 
        player1: p1.id || p1.regId || p1.Registration_ID, name1: p1.name,
        player2: p2.id || p2.regId || p2.Registration_ID, name2: p2.name 
      });
    }

    while (pool.length >= 2 && newMixed.length < 3) {
      const p1 = pool.shift();
      const p2 = pool.shift();
      newMixed.push({ 
        id: 'm_' + Date.now() + Math.random(), 
        player1: p1.id || p1.regId || p1.Registration_ID, name1: p1.name,
        player2: p2.id || p2.regId || p2.Registration_ID, name2: p2.name 
      });
    }

    const updated = { singles: newSingles, doubles: newDoubles, mixed: newMixed };
    updateTeamsState(updated);
  };

  const handlePlayerChange = (type, index, field, playerId) => {
    const updatedList = [...teams[type]];
    updatedList[index] = { ...updatedList[index], [field]: playerId };
    updateTeamsState({ ...teams, [type]: updatedList });
  };

  const handleAddRow = (type) => {
    const updatedList = [...(teams[type] || []), { id: type + '_' + Date.now(), player1: '', player2: '' }];
    updateTeamsState({ ...teams, [type]: updatedList });
  };

  const handleRemoveRow = (type, index) => {
    const updatedList = teams[type].filter((_, i) => i !== index);
    updateTeamsState({ ...teams, [type]: updatedList });
  };

  // Match Scheduler Handlers
  const handleUpdateMatch = (id, field, value) => {
    const updated = matchList.map(m => m.id === id ? { ...m, [field]: value } : m);
    updateMatchesState(updated);
  };

  const handleAddMatch = (e) => {
    e.preventDefault();
    const newMatch = {
      id: 'm_' + Date.now(),
      round: 'Quarter Final',
      player1: '',
      player2: '',
      date: '',
      time: '',
      score: '',
      status: 'Scheduled'
    };
    updateMatchesState([...matchList, newMatch]);
  };

  const handleRemoveMatch = (id) => {
    updateMatchesState(matchList.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">🏓 {sportName} - Team Distribution & Match Scheduler</h3>
          <p className="text-xs text-slate-500 mt-0.5">Category-wise automatic distribution for Singles, Doubles, & Mixed Doubles + Match Scheduler & Rescheduling Hub.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setTeams(allTeams[cat] || { singles: [], doubles: [], mixed: [] });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCategory === cat ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h4 className="font-black text-slate-900 text-sm">Active Category: <span className="text-amber-600">{selectedCategory}</span></h4>
          <p className="text-xs text-slate-500">Available participants: {catParticipants.length}</p>
        </div>
        <button
          onClick={handleAutoDistribute}
          className="bg-amber-500 hover:bg-amber-600 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow transition flex items-center gap-2"
        >
          ⚡ Auto Distribute Teams
        </button>
      </div>

      {/* Singles Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-900 text-sm">👤 Singles Draws</h4>
          <button onClick={() => handleAddRow('singles')} className="text-xs font-bold text-amber-600 hover:underline">+ Add Singles Slot</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(teams.singles || []).map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Singles #{idx + 1}</span>
                <button onClick={() => handleRemoveRow('singles', idx)} className="text-red-500 font-bold hover:underline">Remove</button>
              </div>
              <select
                value={item.player1 || ''}
                onChange={(e) => handlePlayerChange('singles', idx, 'player1', e.target.value)}
                className="w-full bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
              >
                <option value="">Select Player</option>
                {catParticipants.map(p => {
                  const pid = p.id || p.regId || p.Registration_ID;
                  const isAssigned = selectedIds.has(pid) && item.player1 !== pid;
                  return (
                    <option key={pid} value={pid} disabled={isAssigned}>
                      {p.name} ({p.flat || 'General'}) {isAssigned ? '[Assigned]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Doubles Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-900 text-sm">👥 Doubles Draws</h4>
          <button onClick={() => handleAddRow('doubles')} className="text-xs font-bold text-amber-600 hover:underline">+ Add Doubles Slot</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(teams.doubles || []).map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Doubles Team #{idx + 1}</span>
                <button onClick={() => handleRemoveRow('doubles', idx)} className="text-red-500 font-bold hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={item.player1 || ''}
                  onChange={(e) => handlePlayerChange('doubles', idx, 'player1', e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
                >
                  <option value="">Player 1</option>
                  {catParticipants.map(p => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const isAssigned = selectedIds.has(pid) && item.player1 !== pid;
                    return (
                      <option key={pid} value={pid} disabled={isAssigned}>
                        {p.name} {isAssigned ? '[Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={item.player2 || ''}
                  onChange={(e) => handlePlayerChange('doubles', idx, 'player2', e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
                >
                  <option value="">Player 2</option>
                  {catParticipants.map(p => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const isAssigned = selectedIds.has(pid) && item.player2 !== pid;
                    return (
                      <option key={pid} value={pid} disabled={isAssigned}>
                        {p.name} {isAssigned ? '[Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mixed Doubles Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-900 text-sm">👫 Mixed Doubles Draws</h4>
          <button onClick={() => handleAddRow('mixed')} className="text-xs font-bold text-amber-600 hover:underline">+ Add Mixed Doubles Slot</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(teams.mixed || []).map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Mixed Team #{idx + 1}</span>
                <button onClick={() => handleRemoveRow('mixed', idx)} className="text-red-500 font-bold hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={item.player1 || ''}
                  onChange={(e) => handlePlayerChange('mixed', idx, 'player1', e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
                >
                  <option value="">Player 1</option>
                  {catParticipants.map(p => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const isAssigned = selectedIds.has(pid) && item.player1 !== pid;
                    return (
                      <option key={pid} value={pid} disabled={isAssigned}>
                        {p.name} {isAssigned ? '[Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={item.player2 || ''}
                  onChange={(e) => handlePlayerChange('mixed', idx, 'player2', e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg font-bold outline-none"
                >
                  <option value="">Player 2</option>
                  {catParticipants.map(p => {
                    const pid = p.id || p.regId || p.Registration_ID;
                    const isAssigned = selectedIds.has(pid) && item.player2 !== pid;
                    return (
                      <option key={pid} value={pid} disabled={isAssigned}>
                        {p.name} {isAssigned ? '[Assigned]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match Scheduler & Rescheduling Hub */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-900 text-sm">📅 Match Scheduler & Rescheduling Hub</h4>
          <button onClick={handleAddMatch} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-2 rounded-xl text-xs shadow transition">
            + Add Match Draw
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="p-3">Round / Draw</th>
                <th className="p-3">Player 1 / Team 1</th>
                <th className="p-3">Player 2 / Team 2</th>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Score / Result</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matchList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-4 text-center text-slate-400 italic">No matches scheduled yet. Click "+ Add Match Draw" to begin.</td>
                </tr>
              ) : (
                matchList.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="p-3">
                      <input
                        type="text"
                        value={m.round || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'round', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded w-28 font-bold text-amber-700 outline-none"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="Player 1"
                        value={m.player1 || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'player1', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded w-32 outline-none font-medium"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="Player 2"
                        value={m.player2 || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'player2', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded w-32 outline-none font-medium"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={m.date || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'date', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="time"
                        value={m.time || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'time', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        placeholder="e.g. 11-9, 11-7"
                        value={m.score || ''}
                        onChange={(e) => handleUpdateMatch(m.id, 'score', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded w-28 outline-none font-mono"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={m.status || 'Scheduled'}
                        onChange={(e) => handleUpdateMatch(m.id, 'status', e.target.value)}
                        className="bg-slate-50 border border-slate-200 p-1.5 rounded text-xs font-bold outline-none"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Rescheduled">Rescheduled</option>
                        <option value="Live">Live</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleRemoveMatch(m.id)} className="text-red-500 font-bold hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}