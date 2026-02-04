import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { gameManager, Player } from "./src/lib/gameManager";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer(handler);

    const io = new Server(httpServer);

    // Helper to generate ranked leaderboard
    function getLeaderboardData(room: any) {
        // Sort players
        const playersList = Object.values(room.players).sort((a: any, b: any) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.timeTaken - b.timeTaken;
        });

        // Calculate ranks
        let currentRank = 1;
        playersList.forEach((p: any, index) => {
            if (index > 0) {
                const prev: any = playersList[index - 1];
                if (p.score < prev.score || (p.score === prev.score && p.timeTaken > prev.timeTaken)) {
                    currentRank = index + 1;
                }
            }
            p.rank = currentRank;
        });

        return playersList;
    }

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("create_room", async (callback) => {
            const code = await gameManager.createRoom(socket.id);
            socket.join(code);
            callback({ code });
        });

        socket.on("join_room", async ({ code, username }: { code: string, username: string }, callback: (res: any) => void) => {
            // Try to load room from DB if not in memory
            const room = gameManager.getRoom(code);
            if (!room) {
                await gameManager.loadRoom(code);
            }

            const success = gameManager.joinRoom(code, socket.id, username);
            if (success) {
                socket.join(code);
                const activeRoom = gameManager.getRoom(code);
                if (activeRoom) {
                    // Update hostId if it's empty (restored room)
                    if (!activeRoom.hostId) {
                        // NOTE: This logic assumes the first joiner MIGHT be host if we don't have auth.
                        // But actually 'join_room' is for players.
                        // We need a separate 'host_rejoin' or we assume players are just players.
                    }

                    if (activeRoom.hostId) {
                        io.to(activeRoom.hostId).emit("player_joined", {
                            count: Object.keys(activeRoom.players).length,
                            lastPlayer: username
                        });
                    }
                }
                callback({ success: true });
            } else {
                callback({ success: false, error: "Room not found or locked" });
            }
        });

        // New handler for Host Rejoin
        socket.on("host_rejoin", async ({ code }: { code: string }, callback) => {
            // Try to find room
            let room = gameManager.getRoom(code);
            if (!room) {
                room = await gameManager.loadRoom(code);
            }

            if (room) {
                // Claim hostship
                // Security warning: Anyone with code can claim host if hostId is empty?
                // Since we don't have auth, yes. For this demo, we allow "Reclaim" if hostId is empty.
                // Or we just overwrite it.
                room.hostId = socket.id;
                socket.join(code);

                callback({
                    success: true,
                    questions: room.questions
                });
            } else {
                callback({ success: false });
            }
        });

        socket.on("admin_update_questions", async ({ code, questions }) => {
            const room = gameManager.getRoom(code);
            if (room && room.hostId === socket.id) {
                await gameManager.updateQuestions(code, questions);
            }
        });

        socket.on("start_game", ({ code }) => {
            const room = gameManager.getRoom(code);
            if (room && room.hostId === socket.id) {
                gameManager.startGame(code);
                io.to(code).emit("game_started");
                io.to(code).emit("new_question", room.questions[0]);
            }
        });

        socket.on("submit_answer", ({ code, answer, timeTaken }: { code: string, answer: string, timeTaken: number }) => {
            const room = gameManager.getRoom(code);
            if (room) {
                gameManager.submitAnswer(code, socket.id, answer, timeTaken);
                // Notify admin of progress
                io.to(room.hostId).emit("answer_submitted", { playerId: socket.id });

                // Live Ranking Update (Top 8 for preview, unranked/raw if preferred, or use helper)
                // Using helper for consistency even in small updates
                const playersList = getLeaderboardData(room).slice(0, 8);
                io.to(code).emit("leaderboard_update", playersList);
            }
        });

        socket.on("show_leaderboard", ({ code }) => {
            console.log(`Received show_leaderboard for ${code} from ${socket.id}`);
            const room = gameManager.getRoom(code);
            if (room) {
                if (room.hostId !== socket.id) {
                    console.warn(`Host mismatch: Room Host ${room.hostId} vs Requestor ${socket.id}. Allowing for debug.`);
                }

                gameManager.showLeaderboard(code);

                const playersList = getLeaderboardData(room);
                console.log("Broadcasting leaderboard to", code);

                io.to(code).emit("leaderboard_reveal", {
                    state: "LEADERBOARD",
                    players: playersList,
                    currentQuestionTotal: room.questions.length,
                    currentQuestionIndex: room.currentQuestionIndex
                });
            } else {
                console.error("Room not found for show_leaderboard:", code);
            }
        });

        socket.on("toggle_auto_mode", ({ code, enabled }) => {
            const room = gameManager.getRoom(code);
            if (room && room.hostId === socket.id) {
                gameManager.setAutoAdvance(code, enabled);
                // If enabling while active, should we trigger? 
                // It's safer to wait for next manual action OR trigger if we know where we are.
                // For now, it just sets the flag for subsequent questions.
                // Actually the user wants "when the timer ends... it should move". 
                // If we toggle ON mid-question, we should schedule the END of this question.
                if (enabled && room.state === "ACTIVE" && room.startTime) {
                    const currentQ = room.questions[room.currentQuestionIndex];
                    const elapsed = Date.now() - room.startTime;
                    const remaining = (currentQ.timer * 1000) - elapsed;

                    if (remaining > 0) {
                        scheduleAutoNext(code, remaining + 5000); // Timer + 5s buffer
                    } else {
                        // Already past time, just trigger soon
                        scheduleAutoNext(code, 5000);
                    }
                }
            }
        });

        function scheduleAutoNext(code: string, delay: number) {
            gameManager.scheduleNextQuestion(code, delay, () => {
                const room = gameManager.getRoom(code);
                if (!room || room.state === "ENDED") return;

                // Logic: 
                // 1. Reveal Leaderboard? (Optional intermediate state)
                // 2. Move to Next Question

                // To keep it simple per request "automatically move to next question":
                // We call nextQuestion directly.

                gameManager.nextQuestion(code);
                if ((room.state as string) === "ENDED") {
                    const playersList = getLeaderboardData(room);
                    io.to(code).emit("game_ended", {
                        players: playersList,
                        currentQuestionTotal: room.questions.length,
                        currentQuestionIndex: room.questions.length
                    });
                } else {
                    io.to(code).emit("new_question", room.questions[room.currentQuestionIndex]);
                    io.to(room.hostId).emit("auto_progress_update", { index: room.currentQuestionIndex }); // Opt update for admin

                    // Schedule NEXT loop
                    const nextQ = room.questions[room.currentQuestionIndex];
                    scheduleAutoNext(code, (nextQ.timer * 1000) + 5000); // 5s buffer between questions
                }
            });
        }

        socket.on("next_question", ({ code }) => {
            console.log(`Received next_question for ${code} from ${socket.id}`);
            const room = gameManager.getRoom(code);
            if (room) {
                if (room.hostId !== socket.id) {
                    console.warn(`Host mismatch for next_question. Allowed for debug.`);
                }

                // If manual click, we clear any pending auto timer (handled in gameManager.nextQuestion)
                // but if auto-mode IS active, we need to schedule the NEXT one.

                gameManager.nextQuestion(code);

                if ((room.state as string) === "ENDED") {
                    // Send FINAL ranked results
                    const playersList = getLeaderboardData(room);
                    io.to(code).emit("game_ended", {
                        players: playersList,
                        currentQuestionTotal: room.questions.length,
                        currentQuestionIndex: room.questions.length // End
                    });
                } else {
                    io.to(code).emit("new_question", room.questions[room.currentQuestionIndex]);

                    if (room.autoAdvance) {
                        const nextQ = room.questions[room.currentQuestionIndex];
                        scheduleAutoNext(code, (nextQ.timer * 1000) + 5000);
                    }
                }
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
