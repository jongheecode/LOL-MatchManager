export type Team = 'blue' | 'red';

interface TeamPalette {
  solid: string;
  solidRgb: string;
  dark: string;
  darkRgb: string;
}

const TEAM_PALETTE: Record<Team, TeamPalette> = {
  blue: { solid: '#5aa9ff', solidRgb: '90,169,255', dark: '#2f5fb0', darkRgb: '47,95,176' },
  red: { solid: '#f0656a', solidRgb: '240,101,106', dark: '#b0353a', darkRgb: '176,53,58' },
};

export function teamColor(team: Team): string {
  return TEAM_PALETTE[team].solid;
}

export function teamDark(team: Team): string {
  return TEAM_PALETTE[team].dark;
}

export function teamRgba(team: Team, alpha: number): string {
  return `rgba(${TEAM_PALETTE[team].solidRgb},${alpha})`;
}

export function teamDarkRgba(team: Team, alpha: number): string {
  return `rgba(${TEAM_PALETTE[team].darkRgb},${alpha})`;
}
