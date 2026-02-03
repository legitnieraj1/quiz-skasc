"use client";

import { useEffect, useState, useRef } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";
import { LeaderboardView } from "@/components/game/leaderboard-view";

export default function UserPage() {
    const { roomCode } = useParams();
    const [username, setUsername] = useState("");
    const [hasJoined, setHasJoined] = useState(false);
    const [gameState, setGameState] = useState("WAITING"); // WAITING, ACTIVE, SUBMITTED, LEADERBOARD, ENDED
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        socket.connect();

        function onNewQuestion(question: any) {
            setGameState("ACTIVE");
            setCurrentQuestion(question);
            setTimeLeft(question.timer);
            setSelectedOption(null);
            startTimer(question.timer);
        }

        function onLeaderboardReveal(data: any) {
            setGameState("LEADERBOARD");
            // Reuse currentQuestion state to hold leaderboard data for now to avoid extensive refactor
            // or create new state. Let's use currentQuestion as a generic "view data" holder if lazy,
            // but cleaner to make a new state.
            // Actually, in the render above I used `currentQuestion` to pass to LeaderboardView.
            // Let's populate it with the data.
            setCurrentQuestion(data);
        }

        function onGameEnded(data: any) {
            setGameState("ENDED");
            // Render final leaderboard
            if (data && data.players) {
                setCurrentQuestion(data);
            } else if (Array.isArray(data)) {
                setCurrentQuestion({ players: data, currentQuestionIndex: 0, currentQuestionTotal: 0 });
            }
        }

        socket.on("new_question", onNewQuestion);
        socket.on("leaderboard_reveal", onLeaderboardReveal);
        socket.on("game_ended", onGameEnded);

        const handleVisibilityChange = () => {
            if (document.hidden && gameState === "ACTIVE") {
                setWarning("DO NOT EXIT! You may be disqualified.");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            socket.off("new_question", onNewQuestion);
            socket.off("leaderboard_reveal", onLeaderboardReveal);
            socket.off("game_ended", onGameEnded);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (timerRef.current) clearInterval(timerRef.current);
            socket.disconnect();
        };
    }, [roomCode]); // Removed gameState to prevent socket disconnect/reconnect cycle on state change

    // Prevent accidental navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasJoined && gameState !== "ENDED") {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasJoined, gameState]);

    const startTimer = (duration: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        let t = duration;
        timerRef.current = setInterval(() => {
            t--;
            setTimeLeft(t);
            if (t <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                if (gameState === "ACTIVE") handleSubmit(null); // Only submit if active
            }
        }, 1000);
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username) return;

        socket.emit("join_room", { code: roomCode, username }, (response: any) => {
            if (response.success) {
                setHasJoined(true);
                // Request Fullscreen
                document.documentElement.requestFullscreen().catch((err) => {
                    console.log("Fullscreen denied", err);
                });
            } else {
                setError(response.error);
            }
        });
    };

    const handleSubmit = (option: string | null) => {
        if (gameState !== "ACTIVE") return; // Already submitted

        if (timerRef.current) clearInterval(timerRef.current);
        setSelectedOption(option);
        setGameState("SUBMITTED");

        // Calculate time taken (approximate)
        const timeTaken = currentQuestion.timer - timeLeft; // Can be more precise
        socket.emit("submit_answer", { code: roomCode, answer: option, timeTaken });
    };

    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
                <form onSubmit={handleJoin} className="w-full max-w-sm space-y-6">
                    <h1 className="text-3xl font-bold text-center text-purple-400">Join Room {roomCode}</h1>
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    <input
                        type="text"
                        placeholder="Enter Team Name"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white border border-gray-700"
                    />
                    <button
                        type="submit"
                        className="w-full py-4 bg-purple-600 rounded-lg font-bold hover:bg-purple-500 transition"
                    >
                        Enter Quiz
                    </button>
                </form>
            </div>
        );
    }

    // Render Logic
    if (gameState === "LEADERBOARD" && currentQuestion) { // Helper hack: currentQuestion might be stale or part of data
        // Actually currentQuestion state might not matter for Leaderboard view, but we use the one passed in event
        // Let's use a separate state for leaderboard data
        // See changes below for state addition
    }

    if (gameState === "LEADERBOARD" || gameState === "ENDED") {
        return (
            // @ts-ignore - types are loose for this demo
            <div className="relative w-full min-h-screen">
                <LeaderboardView
                    players={currentQuestion?.players || []}
                    currentQuestionIndex={currentQuestion?.currentQuestionIndex || 0}
                    totalQuestions={currentQuestion?.currentQuestionTotal || 0}
                />
                {gameState === "ENDED" && (
                    <div className="absolute top-20 left-0 w-full text-center z-[60] pointer-events-none">
                        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 drop-shadow-lg animate-pulse">
                            WINNERS
                        </h1>
                    </div>
                )}
                <div className="mt-8 absolute bottom-8 left-0 w-full flex justify-center z-[60]">
                    <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-gray-800/80 backdrop-blur rounded-lg border border-white/10 hover:bg-gray-700 transition">Exit Quiz</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {warning && (
                <div className="absolute top-0 left-0 w-full bg-red-600 text-white p-2 text-center animate-pulse z-50">
                    {warning}
                </div>
            )}

            {gameState === "WAITING" && (
                <div className="text-center animate-pulse">
                    <h2 className="text-2xl font-bold text-purple-400">Waiting for Host...</h2>
                    <p className="text-gray-400 mt-2">Get ready!</p>
                </div>
            )}

            {gameState === "ACTIVE" && currentQuestion && (
                <div className="w-full max-w-md flex flex-col h-full justify-between pb-10">
                    <div className="flex justify-between items-center mb-6">
                        <span className="bg-gray-800 px-3 py-1 rounded-full text-xs font-bold text-gray-400">Q{currentQuestion.id}</span>
                        <span className={`text-2xl font-mono font-bold ${timeLeft < 5 ? 'text-red-500' : 'text-green-400'}`}>{timeLeft}s</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-8 text-center">{currentQuestion.text}</h2>

                    <div className="space-y-3">
                        {currentQuestion.options.map((option: string, idx: number) => (
                            <button
                                key={idx}
                                onClick={() => handleSubmit(option)}
                                className="w-full py-4 bg-gray-800 hover:bg-gray-700 active:bg-purple-600 rounded-xl border-2 border-transparent focus:border-purple-500 transition-all font-semibold text-lg"
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {gameState === "SUBMITTED" && (
                <div className="text-center">
                    <div className="mb-4 text-green-500">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold">Answer Locked!</h2>
                    <p className="text-gray-400 mt-2">Waiting for next question...</p>
                </div>
            )}

            {gameState === "ENDED" && (
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-purple-400">Quiz Over!</h2>
                    <p className="text-gray-400 mt-4">Check the big screen for results.</p>
                    <div className="mt-8">
                        <button onClick={() => window.location.href = '/'} className="px-6 py-3 bg-gray-800 rounded-lg">Exit</button>
                    </div>
                </div>
            )}
        </div>
    );
}
