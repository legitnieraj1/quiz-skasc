import { db } from "./db";

export type Player = {
    id: string; // Socket ID
    username: string;
    score: number;
    timeTaken: number; // in milliseconds (total)
    answers: Record<number, { choice: string; time: number }>; // qIndex -> choice, time
};

export type Question = {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
    timer: number;
    points: number;
};

export type GameState = "WAITING" | "ACTIVE" | "LEADERBOARD" | "ENDED";

export type Room = {
    code: string;
    hostId: string;
    players: Record<string, Player>;
    questions: Question[];
    currentQuestionIndex: number;
    state: GameState;
    startTime: number | null; // For current question to calculate delta
    autoAdvance?: boolean;
};

class GameManager {
    private rooms: Record<string, Room> = {};

    async createRoom(hostId: string): Promise<string> {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Save to DB
        try {
            await db.quiz.create({
                data: {
                    roomCode: code,
                    title: "Untitled Quiz",
                    status: "WAITING"
                }
            });
        } catch (e) {
            console.error("DB Create Error", e);
        }

        this.rooms[code] = {
            code,
            hostId, // Note: Socket ID changes on reconnect, logic needs handling in join/load
            players: {},
            questions: [],
            currentQuestionIndex: -1,
            state: "WAITING",
            startTime: null,
        };
        return code;
    }

    // Restore room from DB if not in memory
    async loadRoom(code: string): Promise<Room | undefined> {
        if (this.rooms[code]) return this.rooms[code];

        try {
            const quiz = await db.quiz.findUnique({
                where: { roomCode: code },
                include: { questions: true }
            });

            if (!quiz) return undefined;

            // Reconstruct Room object
            // Note: Players are lost if only persisted in GameSession at end. 
            // If we want persistent players, we need Player model linked to Quiz/Room in real-time.
            // For now, loading the Quiz configuration (questions) is the main goal.
            // Players will have to rejoin.

            this.rooms[code] = {
                code: quiz.roomCode,
                hostId: "", // Host needs to reclaim!
                players: {},
                questions: quiz.questions.map(q => ({
                    id: q.id,
                    text: q.text,
                    options: JSON.parse(q.options as string),
                    correctAnswer: q.correctAnswer,
                    timer: 15, // Default or store in DB? DB doesn't have timer/points in schema yet!
                    points: 100
                })),
                currentQuestionIndex: -1,
                state: "WAITING", // Reset to waiting or store state?
                startTime: null,
            };

            // Map DB fields back if we update schema later
            return this.rooms[code];
        } catch (e) {
            console.error("DB Load Error", e);
            return undefined;
        }
    }

    joinRoom(code: string, playerId: string, username: string): boolean {
        const room = this.rooms[code];
        if (!room) return false;

        // Check if player already exists (rejoining)
        const existingPlayer = Object.values(room.players).find(p => p.username === username);
        if (existingPlayer) {
            // Update socket ID for the rejoining player
            // If we strictly map by ID, this is tricky. The user map keys are IDs.
            // If we want to support reconnect by username, we need to handle the ID change.
            // For now, let's assume the client uses the same ID or we map by Username?
            // "username" is passed.
            // Let's swap the key? Or just update the object ref?

            // To keep it simple for this session:
            // logic: If username matches, we treat it as a rejoin.
            // We need to delete old key and add new key? Or just update the object ref?
            // Creating a new key for new socket ID is safest for socket.io targeting.

            // Remove old entry if ID changed
            if (existingPlayer.id !== playerId) {
                delete room.players[existingPlayer.id];
            }

            room.players[playerId] = {
                ...existingPlayer,
                id: playerId, // Update to new socket ID
            };
            return true;
        }

        if (room.state !== "WAITING") return false; // Lock room if started and not rejoining

        if (room.players[playerId]) return true; // Already joined by ID (rare if reconnected)

        room.players[playerId] = {
            id: playerId,
            username,
            score: 0,
            timeTaken: 0,
            answers: {},
        };
        return true;
    }

    leaveRoom(code: string, playerId: string) {
        if (this.rooms[code] && this.rooms[code].players[playerId]) {
            delete this.rooms[code].players[playerId];
        }
    }

    getRoom(code: string): Room | undefined {
        return this.rooms[code];
    }

    // Async to save to DB
    async updateQuestions(code: string, questions: Question[]) {
        const room = this.rooms[code];
        if (room) {
            room.questions = questions;

            // Sync to DB
            try {
                // Transaction: Delete old Qs, Create new Qs? Or Upsert?
                // Simpler: Delete all for this quiz and recreate.
                const quiz = await db.quiz.findUnique({ where: { roomCode: code } });
                if (quiz) {
                    await db.$transaction([
                        db.question.deleteMany({ where: { quizId: quiz.id } }),
                        db.question.createMany({
                            data: questions.map((q, i) => ({
                                text: q.text,
                                options: JSON.stringify(q.options),
                                correctAnswer: q.correctAnswer,
                                order: i,
                                quizId: quiz.id
                            }))
                        })
                    ]);
                }
            } catch (e) {
                console.error("DB Update Questions Error", e);
            }
        }
    }

    addQuestion(code: string, question: Question) {
        const room = this.rooms[code];
        if (room) {
            room.questions.push(question);
            // Ideally trigger async save, but we use updateQuestions for bulk primarily now
            this.updateQuestions(code, room.questions);
        }
    }

    startGame(code: string) {
        const room = this.rooms[code];
        if (room && room.questions.length > 0) {
            room.state = "ACTIVE";
            room.currentQuestionIndex = 0;
            room.startTime = Date.now();
        }
    }

    submitAnswer(code: string, playerId: string, answer: string, timeTaken: number) {
        const room = this.rooms[code];
        if (!room || room.state !== "ACTIVE") return;

        const player = room.players[playerId];
        if (!player) return;

        const currentQ = room.questions[room.currentQuestionIndex];

        if (!player.answers[room.currentQuestionIndex]) {
            // Calculate precise time taken using server time if available
            // Fallback to client provided timeTaken if startTime is null (rare)
            let calculatedTimeTaken = timeTaken;
            if (room.startTime) {
                calculatedTimeTaken = (Date.now() - room.startTime) / 1000; // Seconds
            }

            player.answers[room.currentQuestionIndex] = { choice: answer, time: calculatedTimeTaken };

            // Speed Scoring Formula (Kahoot-like)
            // Score = Points * (1 - (TimeTaken / TotalTime / 2))
            // Min Score: 50% points if correct within time.
            const totalQTime = currentQ.timer; // Seconds

            if (answer === currentQ.correctAnswer) {
                // Ensure timeTaken doesn't exceed limit for safe calculation
                const safeTime = Math.min(calculatedTimeTaken, totalQTime);
                const speedFactor = 1 - (safeTime / totalQTime / 2);
                const points = Math.round(currentQ.points * speedFactor);

                player.score += points;
            }
            // Accumulate total raw time (ms) for tie-breaker
            player.timeTaken += (calculatedTimeTaken * 1000);
        }
    }

    nextQuestion(code: string) {
        const room = this.rooms[code];
        if (!room) return;

        this.clearAutoTimer(code);

        if (room.currentQuestionIndex < room.questions.length - 1) {
            room.currentQuestionIndex++;
            room.state = "ACTIVE";
            room.startTime = Date.now(); // Reset timer for next Q
        } else {
            room.state = "ENDED";
            this.saveGameSession(room);
        }
    }

    // Timer Management for Auto-Advance
    private timers: Record<string, NodeJS.Timeout> = {};

    setAutoAdvance(code: string, enabled: boolean) {
        const room = this.rooms[code];
        if (room) {
            room.autoAdvance = enabled;
            if (!enabled) this.clearAutoTimer(code);
        }
    }

    scheduleNextQuestion(code: string, delayMs: number, callback: () => void) {
        this.clearAutoTimer(code);
        this.timers[code] = setTimeout(() => {
            callback();
        }, delayMs);
    }

    clearAutoTimer(code: string) {
        if (this.timers[code]) {
            clearTimeout(this.timers[code]);
            delete this.timers[code];
        }
    }

    showLeaderboard(code: string) {
        const room = this.rooms[code];
        if (!room) return;

        room.state = "LEADERBOARD";
    }

    private async saveGameSession(room: Room) {
        try {
            await db.gameSession.create({
                data: {
                    code: room.code,
                    hostId: room.hostId,
                    state: room.state,
                    startTime: room.startTime ? new Date(room.startTime) : new Date(), // Fallback
                    endTime: new Date(),
                    players: {
                        create: Object.values(room.players).map((p) => ({
                            username: p.username,
                            socketId: p.id,
                            score: p.score,
                            timeTaken: p.timeTaken,
                        })),
                    },
                },
            });
            console.log(`Game ${room.code} saved to DB.`);
        } catch (error) {
            console.error("Failed to save game to DB:", error);
        }
    }
}

export const gameManager = new GameManager();
