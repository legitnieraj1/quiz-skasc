"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";

type PlayerRank = {
    id: string;
    username: string;
    score: number;
    timeTaken: number;
};

export default function RankPage() {
    const { roomCode } = useParams();
    const [leaderboard, setLeaderboard] = useState<PlayerRank[]>([]);
    const [isGameOver, setIsGameOver] = useState(false);

    useEffect(() => {
        socket.connect();

        // Join as observer (reuse join_room or just listen if room is public broadcast)
        // Server emits specific 'leaderboard_update' to room.
        // So we must join the socket room.
        socket.emit("join_room", { code: roomCode, username: "Leaderboard" });

        function onLeaderboardUpdate(data: PlayerRank[]) {
            setLeaderboard(data);
        }

        function onGameEnded(data: PlayerRank[]) {
            // Sort final results just in case
            const sorted = data.sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);
            setLeaderboard(sorted);
            setIsGameOver(true);
        }

        socket.on("leaderboard_update", onLeaderboardUpdate);
        socket.on("game_ended", onGameEnded);

        return () => {
            socket.off("leaderboard_update", onLeaderboardUpdate);
            socket.off("game_ended", onGameEnded);
            socket.disconnect();
        };
    }, [roomCode]);

    if (isGameOver) {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center overflow-hidden relative">
                {/* Confetti or simple celebration animation effect could go here */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                    <div className="absolute top-10 right-1/4 w-3 h-3 bg-blue-400 rounded-full animate-ping delay-100"></div>
                </div>

                <h1 className="text-6xl font-bold mb-12 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 animate-pulse">
                    WINNERS
                </h1>

                <div className="flex items-end justify-center space-x-4 mb-16">
                    {/* 2nd Place */}
                    {leaderboard[1] && (
                        <div className="flex flex-col items-center animate-bounce delay-100" style={{ animationDuration: '2s' }}>
                            <div className="w-24 h-24 rounded-full bg-gray-700 border-4 border-gray-400 flex items-center justify-center text-3xl font-bold mb-4 shadow-xl">
                                2
                            </div>
                            <div className="bg-gray-800 p-6 rounded-t-xl w-40 h-48 flex flex-col items-center justify-between border-t-4 border-gray-400">
                                <span className="font-bold text-xl truncate w-full text-center">{leaderboard[1].username}</span>
                                <span className="text-2xl font-mono text-green-400">{leaderboard[1].score}</span>
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {leaderboard[0] && (
                        <div className="flex flex-col items-center z-10 transform -translate-y-8">
                            <div className="w-32 h-32 rounded-full bg-yellow-600 border-4 border-yellow-300 flex items-center justify-center text-5xl font-bold mb-6 shadow-2xl relative">
                                <span className="absolute -top-10 text-6xl">👑</span>
                                1
                            </div>
                            <div className="bg-gray-800 p-8 rounded-t-xl w-48 h-64 flex flex-col items-center justify-between border-t-4 border-yellow-400 shadow-yellow-900/50 shadow-lg">
                                <span className="font-bold text-2xl truncate w-full text-center text-yellow-300">{leaderboard[0].username}</span>
                                <div className="text-center">
                                    <p className="text-xs text-gray-400">Score</p>
                                    <span className="text-4xl font-mono text-green-400 font-bold">{leaderboard[0].score}</span>
                                </div>
                                <p className="text-xs text-gray-500">{(leaderboard[0].timeTaken / 1000).toFixed(2)}s</p>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {leaderboard[2] && (
                        <div className="flex flex-col items-center animate-bounce delay-200" style={{ animationDuration: '2.5s' }}>
                            <div className="w-24 h-24 rounded-full bg-yellow-900 border-4 border-yellow-700 flex items-center justify-center text-3xl font-bold mb-4 shadow-xl">
                                3
                            </div>
                            <div className="bg-gray-800 p-6 rounded-t-xl w-40 h-40 flex flex-col items-center justify-between border-t-4 border-yellow-700">
                                <span className="font-bold text-xl truncate w-full text-center">{leaderboard[2].username}</span>
                                <span className="text-2xl font-mono text-green-400">{leaderboard[2].score}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="max-w-2xl w-full">
                    <h3 className="text-xl text-gray-400 mb-4 text-center border-b border-gray-700 pb-2">Runners Up</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {leaderboard.slice(3, 8).map((player, idx) => (
                            <div key={player.id} className="flex justify-between items-center bg-gray-800 p-3 rounded px-6 opacity-75">
                                <span className="font-mono text-gray-500">#{idx + 4}</span>
                                <span className="font-bold">{player.username}</span>
                                <span className="text-green-400">{player.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
            <header className="flex justify-between items-center mb-12 border-b border-gray-800 pb-6">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                    Live Rankings
                </h1>
                <div className="text-right">
                    <p className="text-gray-400 text-sm">ROOM CODE</p>
                    <p className="text-3xl font-mono font-bold text-white">{roomCode}</p>
                </div>
            </header>

            <div className="max-w-4xl mx-auto space-y-4">
                {leaderboard.length === 0 ? (
                    <div className="text-center text-gray-500 py-20 text-xl">
                        Waiting for results...
                    </div>
                ) : (
                    leaderboard.map((player, index) => (
                        <div
                            key={player.id}
                            className="flex items-center p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-lg transform transition-all duration-500 hover:scale-[1.02]"
                            style={{
                                order: index // Flex order if we used flex-col, but mapping normally works if array is sorted
                            }}
                        >
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-gray-700 font-bold text-xl mr-6">
                                {index + 1}
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-2xl font-bold truncate">{player.username}</h3>
                            </div>
                            <div className="text-right mx-6">
                                <p className="text-xs text-gray-400 uppercase">Time</p>
                                <p className="font-mono text-purple-400">{(player.timeTaken / 1000).toFixed(1)}s</p>
                            </div>
                            <div className="text-right w-24">
                                <p className="text-xs text-gray-400 uppercase">Score</p>
                                <p className="text-3xl font-bold text-green-400">{player.score}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
