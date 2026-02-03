"use server";

import { db } from "@/lib/db";

export async function getRecentGames(limit = 10) {
    try {
        const games = await db.gameSession.findMany({
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                _count: {
                    select: { players: true },
                },
            },
        });
        return { success: true, data: games };
    } catch (error) {
        console.error("Failed to fetch recent games:", error);
        return { success: false, error: "Failed to fetch games" };
    }
}

export async function getGameDetails(id: string) {
    try {
        const game = await db.gameSession.findUnique({
            where: { id },
            include: {
                players: {
                    orderBy: {
                        score: "desc",
                    },
                },
            },
        });
        return { success: true, data: game };
    } catch (error) {
        return { success: false, error: "Failed to fetch game details" };
    }
}
