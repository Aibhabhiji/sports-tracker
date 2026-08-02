'use client';

import React, { useState, useEffect } from 'react';
import { getInitialParticipants, parseCSVParticipants } from '@/lib/participantStore';
import TeamAuctionModule from '@/components/sports/TeamAuctionModule';
import ChessCarromModule from '@/components/sports/ChessCarromModule';
import ChessAdvancedModule from '@/components/sports/ChessAdvancedModule';
import RaceModule from '@/components/sports/RaceModule';
import CricketModule from '@/components/sports/CricketModule';
import FootballModule from '@/components/sports/FootballModule';
import TableTennisModule from '@/components/sports/TableTennisModule';
import BadmintonModule from '@/components/sports/BadmintonModule';

const LOCAL_STORAGE_KEY = 'sanvi_olympics_master_v9';

const SPORTS_LIST = [
  { id: 'cricket', name: 'Cricket', type: 'AUCTION_TEAM' },
  { id: 'football', name: 'Football', type: 'FOOTBALL_CUSTOM' },
  { id: 'badminton', name: 'Badminton', type: 'BADMINTON_CUSTOM' },
  { id: 'table_tennis', name: 'Table Tennis', type: 'TABLE_TENNIS_CUSTOM' },
  { id: 'tug_of_war', name: 'Tug of War', type: 'AUCTION_TEAM' },
  { id: 'chess', name: 'Chess', type: 'ADVANCED_CHESS' },
  { id: 'carrom', name: 'Carrom', type: 'ROUND_ROBIN' },
  { id: 'running', name: 'Running', type: 'RACE' },
  { id: 'walking', name: 'Walking', type: 'RACE' },
  { id: 'swimming', name: 'Swimming', type: 'RACE' },
  { id: 'quiz', name: 'Quiz', type: 'AUCTION_TEAM' },
];

export default function SanviOlympicsPortal() {
  const [activeSport, setActiveSport] = useState(SPORTS_LIST[1]); // Default to Football for testing
  const [activeSubTab, setActiveSubTab] = useState('participants');
  const [participants, setParticipants] = useState([]);
  const [sportsData, setSportsData] = useState({});

  const [filterByGameChoice, setFilterByGameChoice] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState('All Phases');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('All Age Groups');
  const [isLoaded, setIsLoaded] = useState(false);

  // Sponsor Logos State
  const [sponsorLogos, setSponsorLogos] = useState({
    sponsor1: null,
    sponsor2: null,
    sponsor3: null,
  });

  const handleSponsorLogoChange = (sponsorKey, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSponsorLogos(prev => ({ ...prev, [sponsorKey]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.participants && parsed.participants.length > 0) {
          setParticipants(parsed.participants);
        } else {
          setParticipants(getInitialParticipants());
        }
        if (parsed.sportsData) setSportsData(parsed.sportsData);
      } catch (e) {
        setParticipants(getInitialParticipants());
      }
    } else {
      setParticipants(getInitialParticipants());
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ participants, sportsData }));
  }, [participants, sportsData, isLoaded]);

  const currentSportState = sportsData[activeSport.id] || {};

  const updateSportState = (updatedFields) => {
    setSportsData((prev) => ({
      ...prev,
      [activeSport.id]: {
        ...currentSportState,
        ...updatedFields,
      },
    }));
  };

  const filteredParticipants = participants.filter((p) => {
    const pSport = p.gameChoice || p.sport || '';
    const pAgeGroup = p.ageGroup || p.age || '';

    const matchGame = !filterByGameChoice || pSport.trim().toLowerCase() === activeSport.name.trim().toLowerCase();
    const matchPhase = selectedPhase === 'All Phases' || p.phase === selectedPhase;
    const matchCat = selectedCategory === 'All Categories' || p.category === selectedCategory;
    const matchAge = selectedAgeGroup === 'All Age Groups' || pAgeGroup.toString().trim().toLowerCase() === selectedAgeGroup.trim().toLowerCase();
    
    return matchGame && matchPhase && matchCat && matchAge;
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSVParticipants(text);
      if (parsed.length > 0) {
        setParticipants(parsed);
        alert(`Successfully imported ${parsed.length} registration records! Saved to persistent storage.`);
      } else {
        alert('Could not parse CSV.');
      }
    };
    reader.readAsText(file);
  };

  const exportDatabaseBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ participants, sportsData }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sanvi_olympics_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importDatabaseBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (backup.participants) setParticipants(backup.participants);
        if (backup.sportsData) setSportsData(backup.sportsData);
        alert('Database restored successfully from backup!');
      } catch (err) {
        alert('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-400 tracking-wide">🏆 SANVI OLYMPICS PORTAL</h1>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
            <span>Active Sport: <strong className="text-amber-300">{activeSport.name}</strong></span>
            <span>|</span>
            <span className="text-emerald-400 font-bold">Total Records: {participants.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs shadow transition">
            📁 Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={exportDatabaseBackup} className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 font-black px-3 py-2 rounded-xl text-xs shadow">
            💾 Backup JSON
          </button>
          <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 font-black px-3 py-2 rounded-xl text-xs shadow">
            📂 Restore JSON
            <input type="file" accept=".json" className="hidden" onChange={importDatabaseBackup} />
          </label>
        </div>
      </header>

      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">🌟 Official Event Sponsors & Partners</span>
          <span className="text-[10px] text-slate-500">Browse image or GIF logo for each sponsor</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative group">
                {sponsorLogos.sponsor1 ? (
                  <img src={sponsorLogos.sponsor1} alt="Sponsor 1" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="text-lg animate-pulse">🎆</span>
                    <span className="text-[8px] text-amber-400/80 block font-bold">SPONSOR 1</span>
                  </div>
                )}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-black text-amber-300 truncate">Sponsor 1</h4>
                <p className="text-[10px] text-slate-400 truncate">Browse logo (Image/GIF)</p>
              </div>
            </div>

            <label className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[10px] px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer shrink-0 transition">
              Browse
              <input type="file" accept="image/*,.gif" className="hidden" onChange={(e) => handleSponsorLogoChange('sponsor1', e)} />
            </label>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative group">
                {sponsorLogos.sponsor2 ? (
                  <img src={sponsorLogos.sponsor2} alt="Sponsor 2" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="text-lg animate-pulse">🎇</span>
                    <span className="text-[8px] text-amber-400/80 block font-bold">SPONSOR 2</span>
                  </div>
                )}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-black text-amber-300 truncate">Sponsor 2</h4>
                <p className="text-[10px] text-slate-400 truncate">Browse logo (Image/GIF)</p>
              </div>
            </div>

            <label className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[10px] px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer shrink-0 transition">
              Browse
              <input type="file" accept="image/*,.gif" className="hidden" onChange={(e) => handleSponsorLogoChange('sponsor2', e)} />
            </label>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative group">
                {sponsorLogos.sponsor3 ? (
                  <img src={sponsorLogos.sponsor3} alt="Sponsor 3" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="text-lg animate-pulse">✨</span>
                    <span className="text-[8px] text-amber-400/80 block font-bold">SPONSOR 3</span>
                  </div>
                )}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-black text-amber-300 truncate">Sponsor 3</h4>
                <p className="text-[10px] text-slate-400 truncate">Browse logo (Image/GIF)</p>
              </div>
            </div>

            <label className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-[10px] px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer shrink-0 transition">
              Browse
              <input type="file" accept="image/*,.gif" className="hidden" onChange={(e) => handleSponsorLogoChange('sponsor3', e)} />
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-slate-700">
        {SPORTS_LIST.map((sport) => (
          <button
            key={sport.id}
            onClick={() => setActiveSport(sport)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider whitespace-nowrap transition shadow ${
              activeSport.id === sport.id
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {sport.name}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1.5">Game Choice Matching</label>
          <button
            onClick={() => setFilterByGameChoice(!filterByGameChoice)}
            className={`w-full p-2.5 rounded-xl text-xs font-black border transition ${
              filterByGameChoice ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800'
            }`}
          >
            {filterByGameChoice ? `✓ Filtering "${activeSport.name}"` : 'Showing All Registrations'}
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1.5">Age Group Segregation</label>
          <select value={selectedAgeGroup} onChange={(e) => setSelectedAgeGroup(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none">
            <option>All Age Groups</option>
            <option>Under 12</option>
            <option>Under 13 (Kids)</option>
            <option>13 - 17 years</option>
            <option>18 - 49 years</option>
            <option>50+ Senior Citizens</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1.5">Phase Filter</label>
          <select value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none">
            <option>All Phases</option>
            <option>Phase 1</option>
            <option>Phase 2</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 block mb-1.5">Category Filter</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-200 outline-none">
            <option>All Categories</option>
            <option>Kids</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-800 pb-3">
        <button onClick={() => setActiveSubTab('participants')} className={`text-xs font-black pb-1 ${activeSubTab === 'participants' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400'}`}>
          🛡️ Participants ({filteredParticipants.length})
        </button>
        <button onClick={() => setActiveSubTab('scores')} className={`text-xs font-black pb-1 ${activeSubTab === 'scores' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400'}`}>
          ⚔️ Tournament & Scoring Hub ({activeSport.name})
        </button>
      </div>

      {activeSubTab === 'participants' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredParticipants.map((p) => (
            <div key={p.id || p.regId || p.Registration_ID} className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-100 text-sm">{p.name}</h4>
                <span className="text-[10px] bg-slate-950 text-amber-400 px-2 py-0.5 rounded border border-slate-800">ID: {p.regId || p.Registration_ID}</span>
              </div>
              <p className="text-xs text-amber-300 mt-1">{p.flat} • {p.gameChoice || p.sport}</p>
              <div className="mt-3 flex justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-2">
                <span className="bg-slate-950 px-2 py-0.5 rounded text-amber-400 font-bold">{p.ageGroup || p.age}</span>
                <span className="text-emerald-400 font-bold">{p.phase}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'scores' && (
        <div>
          {activeSport.type === 'FOOTBALL_CUSTOM' && (
            <FootballModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'AUCTION_TEAM' && activeSport.id === 'cricket' && (
            <CricketModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'TABLE_TENNIS_CUSTOM' && (
            <TableTennisModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'BADMINTON_CUSTOM' && (
            <BadmintonModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'ADVANCED_CHESS' && (
            <ChessAdvancedModule participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'ROUND_ROBIN' && (
            <ChessCarromModule sportName={activeSport.name} participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'AUCTION_TEAM' && activeSport.id !== 'cricket' && activeSport.id !== 'table_tennis' && activeSport.id !== 'badminton' && (
            <TeamAuctionModule sportName={activeSport.name} participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
          {activeSport.type === 'RACE' && (
            <RaceModule sportName={activeSport.name} participants={filteredParticipants} sportState={currentSportState} onUpdateSportState={updateSportState} />
          )}
        </div>
      )}
    </div>
  );
}