export function generateKnockoutBracket(teams, stageName = 'Round 1') {
  const matches = [];
  const byes = [];
  let matchCounter = 1;

  for (let i = 0; i < teams.length; i += 2) {
    if (i + 1 < teams.length) {
      matches.push({
        id: `M_${stageName}_${matchCounter++}`,
        stage: stageName,
        teamA: teams[i],
        teamB: teams[i + 1],
        scoreA: {},
        scoreB: {},
        winnerId: null,
        winnerName: null,
        isLocked: false,
      });
    } else {
      byes.push(teams[i]);
    }
  }

  return { matches, byes };
}