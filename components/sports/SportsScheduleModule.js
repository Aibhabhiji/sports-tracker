'use client';

import React, { useState } from 'react';

export default function SportsScheduleModule({ sportState = {}, onUpdateSportState }) {
  // Initialize schedule data from sportState or fallback to default data extracted from the reference sheet
  const scheduleData = sportState.sportsSchedule || [
    {
      id: 'sch_1',
      date: '15th August start and weekends',
      timing: 'Evenings',
      venue: 'Phase 1 Club House',
      whatsapp: 'https://chat.whatsapp.com/EbNmUlN3L6KAWjetoBB94I?s=qt&p=a&ilr=1',
      game: 'Table Tennis',
      phase1Spoc: 'Ajitesh',
      phase2Spoc: 'Virendra',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_2',
      date: '22nd August start and weekends',
      timing: 'Mornings',
      venue: 'Phase 2 Club House',
      whatsapp: '',
      game: 'Carrom',
      phase1Spoc: 'Rashmi Ranjan',
      phase2Spoc: 'rajesh',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_3',
      date: '15th August start and weekends',
      timing: 'Afternoon',
      venue: 'Phase 2 Club House',
      whatsapp: 'https://chat.whatsapp.com/Bu98a6ixDiTi51Q1me3mB26?s=qt&p=a&ilr=4&amv=0',
      game: 'Chess',
      phase1Spoc: 'Ravi Ranjan',
      phase2Spoc: 'patitpaban',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_4',
      date: '15th August',
      timing: 'Mornings',
      venue: 'Phase 2 Walking Area',
      whatsapp: 'https://chat.whatsapp.com/CNRJ5WPQM6oKpRz9ju pXM1?s=sh&p=a&ilr=4&amv=0',
      game: 'Walking',
      phase1Spoc: 'Manoranjan',
      phase2Spoc: 'Anjan',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_5',
      date: '22nd August and weekends',
      timing: 'Mornings',
      venue: 'Phase 2 Walking Area',
      whatsapp: 'https://chat.whatsapp.com/CNRJ5WPQM6oKpRz9ju pXM1?s=sh&p=a&ilr=4&amv=0',
      game: 'Marathon',
      phase1Spoc: 'Manoranjan',
      phase2Spoc: 'Anjan',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_6',
      date: '5th September',
      timing: 'Mornings',
      venue: 'St Joseph Sports arena (TBD)',
      whatsapp: 'https://chat.whatsapp.com/llAjxNnd1M3klkCmRDWC9?s=cl&p=a&ilr=4',
      game: 'Badminton',
      phase1Spoc: 'Shivakumar',
      phase2Spoc: 'Sourabh',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_7',
      date: '20th September',
      timing: 'Mornings',
      venue: 'St Joseph Sports arena (TBD)',
      whatsapp: 'https://chat.whatsapp.com/CRVtVKs3SkF0S4u7vQOTrb?s=cl&p=a&ilr=1',
      game: 'Football',
      phase1Spoc: 'Ashis',
      phase2Spoc: 'Biswajeet',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_8',
      date: '12th September',
      timing: 'Mornings',
      venue: 'St Joseph Sports arena (TBD)',
      whatsapp: 'https://chat.whatsapp.com/HTGw8AYj4nGD2lauuCWAi?s=qt&p=a&ilr=0',
      game: 'Cricket',
      phase1Spoc: 'Ravi Ranjan',
      phase2Spoc: 'Prince Deepal',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_9',
      date: '8th Aug start and all weekends',
      timing: '11 am to 3 pm',
      venue: 'Phase 1 Swimming Pool',
      whatsapp: '',
      game: 'Swimming',
      phase1Spoc: 'Harish Moras',
      phase2Spoc: 'Chinusree',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_10',
      date: '26th September',
      timing: 'Evening',
      venue: 'Phase 1 E block Parking area',
      whatsapp: '',
      game: 'Quiz',
      phase1Spoc: 'Prithwiraj',
      phase2Spoc: 'TBD',
      womenSpocPhase1: '',
      womenSpocPhase2: '',
    },
    {
      id: 'sch_11',
      date: '26th September',
      timing: 'Morning',
      venue: 'Phase 1 E block Parking area',
      whatsapp: '',
      game: 'Tug of War',
      phase1Spoc: 'Ram Narayan',
      phase2Spoc: 'Aditya',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    },
    {
      id: 'sch_12',
      date: '26th September',
      timing: 'Evening',
      venue: 'Phase 1 E block Parking area',
      whatsapp: '',
      game: 'Grand Finale',
      phase1Spoc: '',
      phase2Spoc: '',
      womenSpocPhase1: '',
      womenSpocPhase2: '',
    },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: '',
    timing: '',
    venue: '',
    whatsapp: '',
    game: '',
    phase1Spoc: '',
    phase2Spoc: '',
    womenSpocPhase1: 'Simi / Asha',
    womenSpocPhase2: 'Chinushree',
  });

  const handleSaveSchedule = (updatedList) => {
    if (onUpdateSportState) {
      onUpdateSportState({ ...sportState, sportsSchedule: updatedList });
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newEntry.game.trim()) return;
    const item = {
      id: `sch_${Date.now()}`,
      ...newEntry,
    };
    const updated = [...scheduleData, item];
    handleSaveSchedule(updated);
    setIsAdding(false);
    setNewEntry({
      date: '',
      timing: '',
      venue: '',
      whatsapp: '',
      game: '',
      phase1Spoc: '',
      phase2Spoc: '',
      womenSpocPhase1: 'Simi / Asha',
      womenSpocPhase2: 'Chinushree',
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this schedule entry?')) {
      const updated = scheduleData.filter((s) => s.id !== id);
      handleSaveSchedule(updated);
    }
  };

  // Filtered schedule
  const filteredSchedule = scheduleData.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.game.toLowerCase().includes(q) ||
      item.venue.toLowerCase().includes(q) ||
      item.phase1Spoc.toLowerCase().includes(q) ||
      item.phase2Spoc.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#0b0f19] text-slate-100 min-h-screen p-4 md:p-6 rounded-2xl border border-slate-800 space-y-6">
      
      {/* Top Header & Search Bar */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl border border-amber-500/20 text-2xl">
            📅
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Sports Schedule & SPOC's Information</h2>
            <p className="text-xs text-slate-400">Master timetable, venue details, WhatsApp community links, and Phase SPOC assignments.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search game, venue, SPOC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1e293b] border border-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 text-slate-200 outline-none w-full md:w-72"
          />
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-md whitespace-nowrap"
          >
            {isAdding ? 'Cancel' : '+ Add Schedule'}
          </button>
        </div>
      </div>

      {/* Add New Schedule Form Modal / Panel */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-[#131b2e] border border-amber-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
          <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">Add New Sport Schedule & SPOC Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Game / Event Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Badminton"
                value={newEntry.game}
                onChange={(e) => setNewEntry({ ...newEntry, game: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">Commencing Date</label>
              <input
                type="text"
                placeholder="e.g. 5th September"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">Timing</label>
              <input
                type="text"
                placeholder="e.g. Mornings / Evenings"
                value={newEntry.timing}
                onChange={(e) => setNewEntry({ ...newEntry, timing: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">Venue</label>
              <input
                type="text"
                placeholder="e.g. Phase 1 Club House"
                value={newEntry.venue}
                onChange={(e) => setNewEntry({ ...newEntry, venue: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">WhatsApp Group Link</label>
              <input
                type="url"
                placeholder="https://chat.whatsapp.com/..."
                value={newEntry.whatsapp}
                onChange={(e) => setNewEntry({ ...newEntry, whatsapp: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">Phase 1 SPOC</label>
              <input
                type="text"
                placeholder="Name"
                value={newEntry.phase1Spoc}
                onChange={(e) => setNewEntry({ ...newEntry, phase1Spoc: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">Phase 2 SPOC</label>
              <input
                type="text"
                placeholder="Name"
                value={newEntry.phase2Spoc}
                onChange={(e) => setNewEntry({ ...newEntry, phase2Spoc: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">Women SPOC Phase 1</label>
              <input
                type="text"
                placeholder="Simi / Asha"
                value={newEntry.womenSpocPhase1}
                onChange={(e) => setNewEntry({ ...newEntry, womenSpocPhase1: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">Women SPOC Phase 2</label>
              <input
                type="text"
                placeholder="Chinushree"
                value={newEntry.womenSpocPhase2}
                onChange={(e) => setNewEntry({ ...newEntry, womenSpocPhase2: e.target.value })}
                className="w-full bg-[#1e293b] border border-slate-700 p-2.5 rounded-xl text-white font-bold outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-2 rounded-xl text-xs"
            >
              Save Schedule Entry 🚀
            </button>
          </div>
        </form>
      )}

      {/* Schedule & SPOC Table */}
      <div className="bg-[#131b2e] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1e293b] text-slate-300 font-black uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4">Game</th>
                <th className="py-3.5 px-4">Commencing Date</th>
                <th className="py-3.5 px-4">Timing</th>
                <th className="py-3.5 px-4">Venue</th>
                <th className="py-3.5 px-4">WhatsApp Group</th>
                <th className="py-3.5 px-4">Phase 1 SPOC</th>
                <th className="py-3.5 px-4">Phase 2 SPOC</th>
                <th className="py-3.5 px-4">Women SPOC P1</th>
                <th className="py-3.5 px-4">Women SPOC P2</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSchedule.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-8 text-slate-400 italic">
                    No matching schedule records found.
                  </td>
                </tr>
              ) : (
                filteredSchedule.map((item) => (
                  <tr key={item.id} className="hover:bg-[#182238] transition">
                    <td className="py-3 px-4 font-black text-amber-300 text-sm">{item.game}</td>
                    <td className="py-3 px-4 text-slate-200 font-medium">{item.date || '-'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.timing || '-'}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{item.venue || '-'}</td>
                    <td className="py-3 px-4">
                      {item.whatsapp ? (
                        <a
                          href={item.whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold transition"
                        >
                          <span>💬 Join Chat</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">Not created</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{item.phase1Spoc || '-'}</td>
                    <td className="py-3 px-4 font-bold text-white">{item.phase2Spoc || '-'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.womenSpocPhase1 || '-'}</td>
                    <td className="py-3 px-4 text-slate-300">{item.womenSpocPhase2 || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-500/10 rounded border border-red-500/20 transition"
                        title="Delete Entry"
                      >
                        Delete
                      </button>
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