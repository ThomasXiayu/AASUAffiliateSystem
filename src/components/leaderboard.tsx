import { useEffect, useState } from "react";
import akdphiLogo from "../assets/akdphilogo.png";
import casoLogo from "../assets/casologo.png";
import fsaLogo from "../assets/fsalogo.png";
import jsaLogo from "../assets/jsalogo.png";
import kasaLogo from "../assets/kasalogo.png";
import sasaLogo from "../assets/sasalogo.png";
import saseLogo from "../assets/saselogo.png";
import vsaLogo from "../assets/vsalogo.png";
import type { LeaderboardEntry } from "../leaderboard.api";
import { getLeaderboard } from "../leaderboard.api";

const affiliateLogos: Record<string, string> = {
    akdphi: akdphiLogo,
    caso: casoLogo,
    fsa: fsaLogo,
    jsa: jsaLogo,
    kasa: kasaLogo,
    sasa: sasaLogo,
    sase: saseLogo,
    vsa: vsaLogo,
};

function Leaderboard({ refreshKey = 0 }: { refreshKey?: number }){
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getLeaderboard()
            .then(setEntries)
            .catch((loadError: unknown) => {
                setError(loadError instanceof Error ? loadError.message : "Could not load leaderboard.");
            });
    }, [refreshKey]);

    return (
        <div className= "pt-16"> {/*margin between sections*/}
            <div className="p-1 bg-black"> {/*border line separator*/}
                <div className="flex flex-col px-4 pt-4 min-h-screen bg-blue-800">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-center text-white">Leaderboard</h1>

                    <div className="max-w-3xl mx-auto mt-2 w-full p-4 sm:p-6 drop-shadow bg-gray-500 rounded-lg shadow-md border border-gray-200 space-y-2">
                        {error && <p className="text-center text-red-200">{error}</p>}
                        {!error && entries.map((entry) => {
                            const affiliateName = entry.affiliates?.trim() || "Unknown affiliate";
                            const logo = affiliateLogos[affiliateName.toLowerCase()];

                            return (
                                <div key={`${affiliateName}-${entry.rank}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded bg-white px-3 py-2 text-slate-950">
                                    {logo ? (
                                        <img src={logo} alt={`${affiliateName} logo`} className="h-12 w-12 object-contain" />
                                    ) : (
                                        <div className="h-12 w-12" aria-hidden="true" />
                                    )}
                                    <span className="font-semibold">{affiliateName}</span>
                                    <span className="text-right font-semibold">{entry.points} points</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Leaderboard;