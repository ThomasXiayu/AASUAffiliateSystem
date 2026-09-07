export type LeaderboardEntry = {
  affiliates: string;
  rank: number;
  points: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/leaderboard`,
  );
  const result = await response.json() as {
    leaderboard?: LeaderboardEntry[];
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(result.detail || "Could not load leaderboard.");
  }

  return result.leaderboard || [];
}