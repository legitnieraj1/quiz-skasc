"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import { LeaderboardView } from "@/components/game/leaderboard-view";

export default function AdminPage() {
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [players, setPlayers] = useState<{ count: number, lastPlayer?: string }>({ count: 0 });
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState("WAITING");

    // Additional state for question management
    const [questions, setQuestions] = useState<any[]>([]);
    const [newQuestion, setNewQuestion] = useState({
        text: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        timer: 20,
        points: 100
    });
    const [isEditing, setIsEditing] = useState(false);

    const [leaderboardData, setLeaderboardData] = useState<any>(null); // Store full leaderboard data

    useEffect(() => {
        socket.connect();

        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onPlayerJoined(data: { count: number, lastPlayer: string }) {
            setPlayers(data);
        }

        function onGameStarted() {
            setGameState("ACTIVE");
        }

        function onLeaderboardReveal(data: any) {
            setGameState("LEADERBOARD");
            setLeaderboardData(data);
        }

        function onGameEnded(data: any) {
            console.log("Game Ended with data:", data);
            setGameState("ENDED");
            // If data is array (old format) or object (new format)
            // New format: { players, currentQuestionTotal, ... }
            if (data && data.players) {
                setLeaderboardData(data);
            } else if (Array.isArray(data)) {
                // Fallback if mismatched
                setLeaderboardData({ players: data, currentQuestionIndex: 0, currentQuestionTotal: 0 });
            }
        }

        function onNewQuestion() {
            setGameState("ACTIVE");
            setLeaderboardData(null); // Clear leaderboard view
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("player_joined", onPlayerJoined);
        socket.on("game_started", onGameStarted);
        socket.on("leaderboard_reveal", onLeaderboardReveal);
        socket.on("game_ended", onGameEnded);
        socket.on("new_question", onNewQuestion);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("player_joined", onPlayerJoined);
            socket.off("game_started", onGameStarted);
            socket.off("leaderboard_reveal", onLeaderboardReveal);
            socket.off("game_ended", onGameEnded);
            socket.off("new_question", onNewQuestion);
            socket.disconnect();
        };
    }, []);

    // Prevent accidental navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (roomCode) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [roomCode]);

    const createRoom = () => {
        socket.emit("create_room", (response: { code: string }) => {
            setRoomCode(response.code);
        });
    };

    const addQuestion = () => {
        const q = {
            id: `q${questions.length + 1}`,
            ...newQuestion,
            correctAnswer: newQuestion.correctAnswer || newQuestion.options[0]
        };
        const updated = [...questions, q];
        setQuestions(updated);
        socket.emit("admin_update_questions", { code: roomCode, questions: updated });
        setNewQuestion({ text: "", options: ["", "", "", ""], correctAnswer: "", timer: 20, points: 100 });
        setIsEditing(false);
    };

    const updateOption = (idx: number, val: string) => {
        const newOpts = [...newQuestion.options];
        newOpts[idx] = val;
        setNewQuestion({ ...newQuestion, options: newOpts });
    };

    const startGame = () => {
        if (roomCode) {
            if (questions.length === 0) {
                alert("Please add at least one question!");
                return;
            }
            socket.emit("start_game", { code: roomCode });
        }
    };

    const showLeaderboard = () => {
        if (roomCode) {
            socket.emit("show_leaderboard", { code: roomCode });
        }
    };

    const nextQuestion = () => {
        if (roomCode) {
            socket.emit("next_question", { code: roomCode });
        }
    };

    if (!isConnected) {
        return <div className="min-h-screen flex items-center justify-center text-white bg-gray-900">Connecting to server...</div>;
    }

    // Render Logic
    if ((gameState === "LEADERBOARD" || gameState === "ENDED") && leaderboardData) {
        // Show full screen leaderboard to Admin too
        // We also render a "Next Question" floating button for control
        return (
            <div className="relative">
                <LeaderboardView
                    players={leaderboardData.players}
                    currentQuestionIndex={leaderboardData.currentQuestionIndex}
                    totalQuestions={leaderboardData.currentQuestionTotal}
                />

                {gameState !== "ENDED" && (
                    <div className="fixed bottom-8 right-8 z-50">
                        <button
                            onClick={nextQuestion}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-xl shadow-2xl transition hover:scale-105 animate-bounce"
                        >
                            Next Question →
                        </button>
                    </div>
                )}

                {gameState === "ENDED" && (
                    <div className="fixed bottom-8 inset-x-0 flex justify-center z-50 pointer-events-none">
                        <div className="px-8 py-4 bg-green-600 text-white rounded-full font-bold text-2xl shadow-2xl animate-pulse cursor-default">
                            🎉 Quiz Complete! 🎉
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (gameState !== "WAITING" && roomCode) {
        // Active Game Control View
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex justify-between items-center">
                        <h1 className="text-2xl font-bold">Quiz Active: {roomCode}</h1>
                        <div className="text-right">
                            <p className="text-gray-400 text-sm">Players</p>
                            <p className="text-3xl font-bold">{players.count}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={showLeaderboard}
                            className="py-6 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold text-2xl shadow-lg transition transform hover:scale-[1.02] flex flex-col items-center justify-center gap-2"
                        >
                            <span>🏆 Show Leaderboard</span>
                            <span className="text-sm font-normal text-yellow-200 opacity-80">Sync All Players</span>
                        </button>

                        <button
                            onClick={nextQuestion}
                            className="py-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-2xl shadow-lg transition transform hover:scale-[1.02] flex flex-col items-center justify-center gap-2"
                        >
                            <span>Next Question →</span>
                            <span className="text-sm font-normal text-blue-200 opacity-80">Move Everyone Forward</span>
                        </button>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-xl flex items-center justify-center text-gray-400 text-center">
                        Control the flow: Show results first, then move to the next question.
                    </div>
                </div>
            </div>
        );
    }

    // Waiting Room / Setup View
    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pb-24">
            {!roomCode ? (
                <div className="flex flex-col items-center justify-center h-full space-y-6 pt-20">
                    <h1 className="text-3xl font-bold">Admin Panel</h1>
                    <button
                        onClick={createRoom}
                        className="px-6 py-3 bg-green-600 rounded-lg text-xl font-bold hover:bg-green-500 transition"
                    >
                        Create New Room
                    </button>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex justify-between items-center">
                        <div>
                            <p className="text-gray-400 text-sm uppercase tracking-wide">Room Code</p>
                            <p className="text-5xl font-mono font-bold tracking-widest text-green-400">{roomCode}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-sm uppercase">Players Joined</p>
                            <p className="text-4xl font-bold">{players.count}</p>
                            {players.lastPlayer && <p className="text-sm text-gray-500 animate-pulse">Last joined: {players.lastPlayer}</p>}
                        </div>
                    </div>

                    {/* Question List */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 flex justify-between">
                            <span>Questions ({questions.length})</span>
                            <button onClick={() => setIsEditing(!isEditing)} className="text-sm text-purple-400 hover:text-purple-300">
                                {isEditing ? "Cancel" : "+ Add Question"}
                            </button>
                        </h2>

                        {isEditing && (
                            <div className="bg-gray-900 p-4 rounded-lg mb-6 border border-gray-700 space-y-4">
                                <input
                                    className="w-full bg-gray-800 p-3 rounded border border-gray-600"
                                    placeholder="Question Text"
                                    value={newQuestion.text}
                                    onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    {newQuestion.options.map((opt, idx) => (
                                        <input
                                            key={idx}
                                            className={`w-full bg-gray-800 p-2 rounded border ${newQuestion.correctAnswer === opt && opt ? 'border-green-500' : 'border-gray-600'}`}
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={e => updateOption(idx, e.target.value)}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-4">
                                    <select
                                        className="bg-gray-800 p-2 rounded border border-gray-600"
                                        value={newQuestion.correctAnswer}
                                        onChange={e => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                                    >
                                        <option value="">Select Correct Answer</option>
                                        {newQuestion.options.filter(o => o).map((o, i) => (
                                            <option key={i} value={o}>{o}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        className="bg-gray-800 p-2 rounded border border-gray-600 w-24"
                                        placeholder="Secs"
                                        value={newQuestion.timer}
                                        onChange={e => setNewQuestion({ ...newQuestion, timer: parseInt(e.target.value) })}
                                    />
                                    <button onClick={addQuestion} className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 font-bold ml-auto">
                                        Save Question
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {questions.map((q, i) => (
                                <div key={i} className="p-3 bg-gray-700/50 rounded flex justify-between items-center">
                                    <span className="truncate flex-1 font-medium">{i + 1}. {q.text}</span>
                                    <span className="text-sm text-gray-400 ml-4">{q.timer}s</span>
                                </div>
                            ))}
                            {questions.length === 0 && !isEditing && (
                                <p className="text-gray-500 text-center py-4">No questions added yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={startGame}
                        disabled={players.count === 0 || questions.length === 0}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold text-xl transition shadow-lg shadow-purple-900/50"
                    >
                        Start Quiz
                    </button>
                </div>
            )}
        </div>
    );
}
