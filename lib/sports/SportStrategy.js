// lib/sports/SportStrategy.js
export class BaseSportStrategy {
  constructor(sportName) {
    this.sportName = sportName;
  }

  // Base methods to be overridden by game-specific modules
  generateGroups(players, groupSize) {
    throw new Error("generateGroups method must be implemented");
  }

  calculateStandings(matches, groupMembers) {
    throw new Error("calculateStandings method must be implemented");
  }
}

// lib/sports/ChessCarromStrategy.js
export class ChessCarromStrategy extends BaseSportStrategy {
  generateGroups(players, targetSize = 4) {
    const groups = [];
    let groupCount = 1;
    for (let i = 0; i < players.length; i += targetSize) {
      groups.push({
        name: `Group ${String.fromCharCode(64 + groupCount)}`,
        members: players.slice(i, i + targetSize),
      });
      groupCount++;
    }
    return groups;
  }

  // Points: Win = 2, Draw = 1, Loss = 0
  calculateStandings(completedMatches, members) {
    const standings = {};
    members.forEach((m) => {
      standings[m.id] = { player: m, played: 0, won: 0, drawn: 0, lost: 0, points: 0 };
    });

    completedMatches.forEach((m) => {
      const pA = m.player_a_id;
      const pB = m.player_b_id;
      if (standings[pA] && standings[pB]) {
        standings[pA].played += 1;
        standings[pB].played += 1;

        if (m.score_a > m.score_b) {
          standings[pA].won += 1;
          standings[pA].points += 2;
          standings[pB].lost += 1;
        } else if (m.score_b > m.score_a) {
          standings[pB].won += 1;
          standings[pB].points += 2;
          standings[pA].lost += 1;
        } else {
          standings[pA].drawn += 1;
          standings[pA].points += 1;
          standings[pB].drawn += 1;
          standings[pB].points += 1;
        }
      }
    });

    return Object.values(standings).sort((a, b) => b.points - a.points);
  }
}