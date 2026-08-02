export function getInitialParticipants() {
  return [
    { id: 'P_1_0', regId: '1', name: 'Rounak Ghosh', flat: 'D-143', age: '15', ageGroup: '13 - 17 years', category: 'Kids', gameChoice: 'Football', phone: '9036419205', phase: 'Phase 2' },
    { id: 'P_2_1', regId: '2', name: 'Shaurya Mukherjee', flat: 'TF 16', age: '12', ageGroup: 'Under 13 (Kids)', category: 'Kids', gameChoice: 'Cricket', phone: '9739978138', phase: 'Phase 1' },
    { id: 'P_2_2', regId: '2', name: 'Shaurya Mukherjee', flat: 'TF 16', age: '12', ageGroup: 'Under 13 (Kids)', category: 'Kids', gameChoice: 'Badminton', phone: '9739978138', phase: 'Phase 1' },
    { id: 'P_3_0', regId: '3', name: 'Nakshatra Jenson', flat: 'G20', age: '10', ageGroup: 'Under 13 (Kids)', category: 'Kids', gameChoice: 'Running', phone: '9962466642', phase: 'Phase 2' },
    { id: 'P_4_0', regId: '4', name: 'Arshit Pandey', flat: 'A302', age: '12', ageGroup: 'Under 13 (Kids)', category: 'Kids', gameChoice: 'Football', phone: '9686662834', phase: 'Phase 2' }
  ];
}

function determineAgeGroup(ageStr) {
  const match = String(ageStr).match(/\d+/);
  if (!match) return '18 - 49 years';
  const val = parseFloat(match[0]);
  if (val < 13) return 'Under 13 (Kids)';
  if (val < 18) return '13 - 17 years';
  if (val < 50) return '18 - 49 years';
  return '50+ Senior Citizens';
}

export function parseCSVParticipants(text) {
  const lines = text.split(/\r?\n/);
  const newParticipants = [];
  const seenEntries = new Set();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    
    // CSV Schema: Registration_ID, Name, Sport, Phase, Category, Age, Flat, Phone
    if (row.length >= 8 && row[1]) {
      const regId = row[0];
      const name = row[1];
      const sport = row[2];
      const phase = row[3] || 'Phase 1';
      const category = row[4] || 'Male';
      const age = row[5] || '17+';
      const flat = row[6] || 'Block A-101';
      const phone = row[7] || '';

      if (sport && sport.toLowerCase() !== 'nan') {
        const uniqueKey = `${regId}_${sport.toLowerCase()}`;
        if (!seenEntries.has(uniqueKey)) {
          seenEntries.add(uniqueKey);
          newParticipants.push({
            id: `P_${regId}_${i}`,
            regId,
            name,
            flat,
            age,
            ageGroup: determineAgeGroup(age),
            category,
            gameChoice: sport,
            phone,
            phase,
          });
        }
      }
    }
  }
  return newParticipants;
}