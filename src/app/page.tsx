"use client";


import { useRouter } from "next/navigation";
import { useState, useEffect } from "react"; // Added useEffect
import { AntiGravityCanvas } from "@/components/ui/particle-effect-for-hero";
import { LogoHeader } from "@/components/ui/logo-header"; // Changed path to match common Next.js structure

export default function Home() { // Renamed back to Home as per original file structure
    const [roomCode, setRoomCode] = useState("");
    const router = useRouter();
    const [mounted, setMounted] = useState(false); // Added mounted state

    useEffect(() => { // Added useEffect
        setMounted(true);
    }, []);

    const handleJoin = (e: React.FormEvent) => { // Kept original handler name
        e.preventDefault();
        if (roomCode.trim()) {
            router.push(`/play/${roomCode.toUpperCase()}`); // Kept original logic
        }
    };



    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4 overflow-hidden">
            {/* Background Effect */}
            <div className="absolute inset-0 z-0">
                <AntiGravityCanvas />
            </div>

            {/* Content */}
            <div className={`relative z-10 w-full max-w-sm flex flex-col items-center transition-all duration-1000 transform ${mounted ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>

                <LogoHeader />

                <div className="w-full space-y-8 backdrop-blur-sm bg-gray-900/30 p-8 rounded-xl border border-white/10 shadow-2xl">
                    <form onSubmit={handleJoin} className="flex flex-col space-y-4">
                        <input
                            type="text"
                            placeholder="Enter Room Code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                            className="px-4 py-3 rounded-lg bg-gray-800/80 border border-gray-700 focus:outline-none focus:border-purple-500 text-center text-xl uppercase tracking-widest placeholder-gray-500 transition-all focus:ring-2 focus:ring-purple-500/50"
                        />
                        <button
                            type="submit"
                            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/30"
                        >
                            Join Quiz
                        </button>
                    </form>


                </div>
            </div>
        </div>
    );
}
