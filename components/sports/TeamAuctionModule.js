'use client';

import React, { useState } from 'react';

export default function TeamAuctionModule({ sportName, participants, sportState, onUpdateSportState }) {
  // Teams state stored in sportState.teams (array of { id, name, purse, players: [] })
  const teams = sportState?.teams || [
    { id: 't1', name: 'Alpha Strikers', purse: 1000, players: [] },
    { id: 't2', name: 'Beta Titans', purse: 1000, players: [] },
    { id: 't3', name: 'Gamma Warriors', purse: 1000, players: [] },
    { id: 't4', name: 'Delta Legends', purse: 1000, players: [] },
  ];

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPurse, setNewTeamPurse] = useState(1000);
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
  const [bidAmount, setBidAmount] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to check if a player is already assigned to ANY team across ANY sport/category with safe array fallback
  const isPlayerAlreadyAuctioned = (playerId) => {
    for (const t of teams) {
      if (t.players && Array.isArray(t.players) && t.players.some(p => p.id === playerId)) {
        return true;
      }
    }
    return false;
  };

  // Available participants for auction (excluding already auctioned players)
  const availableParticipants = participants.filter(p => {
    const pId = p.id || p.regId || p.Registration_ID;
    return !isPlayerAlreadyAuctioned(pId);
  });

  const searchedParticipants = availableParticipants.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.flat?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTeam = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const teamObj = {
      id: `team_${Date.now()}`,
      name: newTeamName.trim(),
      purse: Number(newTeamPurse) || 1000,
      players: [],
    };
    const updatedTeams = [...teams, teamObj];
    onUpdateSportState({ teams: updatedTeams });
    setNewTeamName('');
    if (!selectedTeamId) setSelectedTeamId(teamObj.id);
  };

  const handleRemoveTeam = (teamId) => {
    if (confirm('Are you sure you want to delete this team? Assigned players will return to the auction pool.')) {
      const updatedTeams = teams.filter(t => t.id !== teamId);
      onUpdateSportState({ teams: updatedTeams });
      if (selectedTeamId === teamId) {
        setSelectedTeamId(updatedTeams[0]?.id || '');
      }
    }
  };

  const handleAuctionPlayer = (player, teamId, amount) => {
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) {
      alert('Please select a valid team for the auction.');
      return;
    }

    const cost = Number(amount) || 0;
    if (targetTeam.purse < cost) {
      alert(`Insufficient purse! Team "${targetTeam.name}" has only ${targetTeam.purse} remaining.`);
      return;
    }

    const pId = player.id || player.regId || player.Registration_ID;
    if (isPlayerAlreadyAuctioned(pId)) {
      alert('This player has already been auctioned to a team.');
      return;
    }

    const assignedPlayerObj = {
      ...player,
      id: pId,
      auctionPrice: cost,
    };

    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        const currentPlayers = Array.isArray(t.players) ? t.players : [];
        return {
          ...t,
          purse: t.purse - cost,
          players: [...currentPlayers, assignedPlayerObj],
        };
      }
      return t;
    });

    onUpdateSportState({ teams: updatedTeams });
    alert(`Successfully auctioned ${player.name} to ${targetTeam.name} for ${cost}! 🎯`);
  };

  const handleReleasePlayer = (teamId, playerId) => {
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    const currentPlayers = Array.isArray(targetTeam.players) ? targetTeam.players : [];
    const playerToRelease = currentPlayers.find(p => p.id === playerId);
    const refund = playerToRelease?.auctionPrice || 0;

    const updatedTeams = teams.map(t => {
      if (t.id === teamId) {
        const tPlayers = Array.isArray(t.players) ? t.players : [];
        return {
          ...t,
          purse: t.purse + refund,
          players: tPlayers.filter(p => p.id !== playerId),
        };
      }
      return t;
    });

    onUpdateSportState({ teams: updatedTeams });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <h3 className="text-sm font-black text-amber-400">⚡ {sportName} Team Auction & Draft Suite</h3>
          <p className="text-xs text-slate-400">Swift player auction, team purse management, and strict cross-category exclusivity (auctioned players are locked).</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-bold">Unauctioned Pool:</span>
          <span className="text-emerald-400 font-black">{availableParticipants.length} Players</span>
        </div>
      </div>

      {/* Add Team & Quick Stats Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Create New Team</h4>
          <form onSubmit={handleAddTeam} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Team Name</label>
              <input 
                type="text" 
                placeholder="e.g. Royal Challengers" 
                value={newTeamName} 
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 text-xs outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Starting Purse / Budget</label>
              <input 
                type="number" 
                value={newTeamPurse} 
                onChange={(e) => setNewTeamPurse(e.target.value)}
                className="w-full bg-slate-950 text-amber-400 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none focus:border-amber-400"
              />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow transition">
              + Add Team to Auction
            </button>
          </form>
        </div>

        {/* Quick Auction Controls & Team Selector */}
        <div className="lg:col-span-2 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-3">Swift Auction Bidding Panel</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Bidding Team</label>
                <select 
                  value={selectedTeamId} 
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full bg-slate-950 text-amber-400 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Purse: 🪙 {t.purse})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Default Bid / Price</label>
                <input 
                  type="number" 
                  value={bidAmount} 
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full bg-slate-950 text-amber-400 font-bold p-2.5 rounded-xl border border-slate-800 text-xs outline-none"
                />
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
            <span>💡 Tip: Click "Auction to Team" on any available player below to instantly assign them at the current bid amount.</span>
            <span className="text-emerald-400 font-bold">Active Teams: {teams.length}</span>
          </div>
        </div>
      </div>

      {/* Available Players Pool for Auction */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
            Available Players Pool ({searchedParticipants.length} Unauctioned)
          </h4>
          <input 
            type="text" 
            placeholder="Search player name or flat..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-800 text-xs outline-none w-full sm:w-64"
          />
        </div>

        {searchedParticipants.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No available players found in auction pool (all matching players may have been auctioned).
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin">
            {searchedParticipants.map((p) => {
              const pId = p.id || p.regId || p.Registration_ID;
              return (
                <div key={pId} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between gap-3 shadow hover:border-slate-700 transition">
                  <div>
                    <div className="flex justify-between items-start">
                      <h5 className="font-bold text-slate-100 text-sm">{p.name}</h5>
                      <span className="text-[10px] bg-slate-900 text-amber-400 px-2 py-0.5 rounded border border-slate-800">ID: {pId}</span>
                    </div>
                    <p className="text-xs text-amber-300 mt-1">{p.flat} • {p.gameChoice || p.sport || sportName}</p>
                    <div className="mt-2 flex gap-2 text-[10px] text-slate-400">
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-bold">{p.category || 'Open'}</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-amber-400 font-bold">{p.ageGroup || p.age}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                    <input 
                      type="number" 
                      defaultValue={bidAmount} 
                      id={`bid_${pId}`}
                      className="w-20 bg-slate-900 text-amber-400 font-bold text-xs p-1.5 rounded border border-slate-800 text-center outline-none"
                    />
                    <button 
                      onClick={() => {
                        const inputVal = document.getElementById(`bid_${pId}`)?.value || bidAmount;
                        handleAuctionPlayer(p, selectedTeamId, inputVal);
                      }}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black py-1.5 px-3 rounded-lg text-xs shadow transition"
                    >
                      🔨 Auction to Team
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teams Rosters & Squads */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Team Squads & Remaining Purses</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => {
            const teamPlayers = Array.isArray(team.players) ? team.players : [];
            return (
              <div key={team.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h5 className="font-black text-amber-300 text-sm">{team.name}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Remaining Purse: <strong className="text-emerald-400">🪙 {team.purse}</strong> | Squad: {teamPlayers.length} Players</p>
                  </div>
                  <button 
                    onClick={() => handleRemoveTeam(team.id)}
                    className="text-rose-400 hover:text-rose-300 text-[10px] bg-rose-950/40 px-2.5 py-1 rounded border border-rose-500/20"
                  >
                    Delete Team
                  </button>
                </div>

                {teamPlayers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No players drafted yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {teamPlayers.map((pl) => (
                      <div key={pl.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-200">{pl.name}</span>
                          <span className="text-[10px] text-slate-400 ml-2">({pl.flat}) • <strong className="text-amber-400">🪙 {pl.auctionPrice}</strong></span>
                        </div>
                        <button 
                          onClick={() => handleReleasePlayer(team.id, pl.id)}
                          className="text-slate-400 hover:text-rose-400 text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 transition"
                        >
                          Release
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}