"use client";

import Image from "next/image";

export function MalpracticeScreen() {
    return (
        <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-4xl md:text-6xl font-black text-red-600 mb-8 tracking-widest uppercase animate-pulse">
                Malpractice Detected
            </h1>

            <div className="relative w-full max-w-sm aspect-square mb-8 p-1 bg-white/10 rounded-2xl border-4 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)] overflow-hidden">
                <Image
                    src="/MALPRACTICE.png"
                    alt="Get Out Meme"
                    fill
                    className="object-contain rounded-xl"
                    priority
                />
            </div>

            <p className="text-2xl font-bold font-mono text-red-400">
                Tab Switching is Not Allowed.
            </p>
            <p className="text-gray-500 mt-4 text-sm font-mono">
                You have been disqualified from this round.
            </p>
        </div>
    );
}
