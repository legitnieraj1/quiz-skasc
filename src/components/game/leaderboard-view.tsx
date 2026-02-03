"use client";

import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { LogoHeader } from "@/components/ui/logo-header";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type Player = {
    rank: number;
    username: string;
    score: number;
    id: string;
};

interface LeaderboardViewProps {
    players: Player[];
    currentQuestionIndex: number;
    totalQuestions: number;
}

export function LeaderboardView({ players, currentQuestionIndex, totalQuestions }: LeaderboardViewProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-900 text-white relative overflow-hidden z-50">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-900 to-gray-900 z-0 pointer-events-none" />

            <div className="relative z-10 w-full max-w-5xl px-4 py-8 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 scale-75 md:scale-90 origin-top"
                >
                    <LogoHeader />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mb-8 space-y-2"
                >
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-pulse">
                        LEADERBOARD
                    </h2>
                    <p className="text-gray-400 font-mono text-sm uppercase tracking-[0.2em]">
                        Question {currentQuestionIndex + 1} / {totalQuestions}
                    </p>
                </motion.div>

                <div className="w-full space-y-3">
                    <AnimatePresence>
                        {players.slice(0, 10).map((player, index) => (
                            <motion.div
                                key={player.id}
                                layout
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className={twMerge(
                                    "flex items-center justify-between p-4 rounded-xl border-l-4 shadow-xl backdrop-blur-md transition-colors",
                                    index === 0 ? "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500" :
                                        index === 1 ? "bg-gradient-to-r from-gray-300/20 to-transparent border-gray-400" :
                                            index === 2 ? "bg-gradient-to-r from-orange-700/20 to-transparent border-orange-700" :
                                                "bg-gray-800/50 border-gray-700"
                                )}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={twMerge(
                                        "w-12 h-12 flex items-center justify-center rounded-full font-black text-xl",
                                        index === 0 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/50" :
                                            index === 1 ? "bg-gray-400 text-black shadow-lg shadow-gray-400/50" :
                                                index === 2 ? "bg-orange-700 text-white shadow-lg shadow-orange-700/50" :
                                                    "bg-gray-700 text-gray-400"
                                    )}>
                                        {player.rank}
                                    </div>

                                    <div className="flex flex-col">
                                        <span className={clsx(
                                            "text-xl md:text-2xl font-bold tracking-wide",
                                            index === 0 ? "text-yellow-400" : "text-white"
                                        )}>
                                            {player.username}
                                        </span>
                                        {index === 0 && (
                                            <span className="text-xs text-yellow-500/80 uppercase font-bold tracking-widest">
                                                Current Leader
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-3xl md:text-4xl font-black font-mono tracking-tighter text-white drop-shadow-md">
                                        <CountUp
                                            end={player.score}
                                            duration={2.5}
                                            separator=","
                                            useEasing={true}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Points</div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
