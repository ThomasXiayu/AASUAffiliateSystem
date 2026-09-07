export type LeaderboardEntry = {
  affiliates: string;
  rank: number;
  points: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  let response: Response;

  try {
    response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/leaderboard`,
    );
  } catch {
    throw new Error("Could not connect to the leaderboard.");
  }

  const responseText = await response.text();
  let result: {
    leaderboard?: LeaderboardEntry[];
    detail?: string;
  } = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(`Leaderboard returned an invalid response (${response.status}).`);
    }
  }

  if (!response.ok) {
    throw new Error(result.detail || "Could not load leaderboard.");
  }

  return result.leaderboard || [];
}