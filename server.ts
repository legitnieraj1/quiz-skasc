import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { gameManager, Player } from "./src/lib/gameManager";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

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

        socket.on("create_room", (callback) => {
            const code = gameManager.createRoom(socket.id);
            socket.join(code);
            callback({ code });
        });

        socket.on("join_room", ({ code, username }: { code: string, username: string }, callback: (res: any) => void) => {
            const success = gameManager.joinRoom(code, socket.id, username);
            if (success) {
                socket.join(code);
                const room = gameManager.getRoom(code);
                if (room) {
                    io.to(room.hostId).emit("player_joined", {
                        count: Object.keys(room.players).length,
                        lastPlayer: username
                    });
                }
                callback({ success: true });
            } else {
                callback({ success: false, error: "Room not found or locked" });
            }
        });

        socket.on("admin_update_questions", ({ code, questions }) => {
            const room = gameManager.getRoom(code);
            if (room && room.hostId === socket.id) {
                room.questions = questions;
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

        socket.on("next_question", ({ code }) => {
            console.log(`Received next_question for ${code} from ${socket.id}`);
            const room = gameManager.getRoom(code);
            if (room) {
                if (room.hostId !== socket.id) {
                    console.warn(`Host mismatch for next_question. Allowed for debug.`);
                }
                gameManager.nextQuestion(code);
                if (room.state === "ENDED") {
                    // Send FINAL ranked results
                    const playersList = getLeaderboardData(room);
                    io.to(code).emit("game_ended", {
                        players: playersList,
                        currentQuestionTotal: room.questions.length,
                        currentQuestionIndex: room.questions.length // End
                    });
                } else {
                    io.to(code).emit("new_question", room.questions[room.currentQuestionIndex]);
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
