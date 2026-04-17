import type { TeamAPI } from '../../interfaces/TeamAPI';
import type { Team, Member } from '../../types';

export class DummyTeamAPI implements TeamAPI {
  private teams: Team[] = [
    { id: 'tm1', name: 'Core Engine', projectId: 'p1' },
    { id: 'tm2', name: 'UI / Design', projectId: 'p1' },
  ];

  private members: Member[] = [
    { id: 'm1', username: 'kuchuk', email: 'kuchuk@taskinator.io' },
    { id: 'm2', username: 'borom', email: 'borom@taskinator.io' },
  ];

  async getTeams(projectId: string): Promise<Team[]> {
    return this.teams.filter((t) => t.projectId === projectId);
  }

  async getTeamMembers(projectId: string, _teamId: string): Promise<Member[]> {
    console.log(`[Dummy] Fetching members for project ${projectId} and team ${_teamId}`);
    return [...this.members];
  }
}
