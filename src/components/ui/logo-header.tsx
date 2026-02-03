"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function LogoHeader() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div
            className={`flex flex-col items-center justify-center gap-6 mb-12 transition-all duration-1000 ease-out transform ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
                }`}
        >
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <div className="relative rounded-full p-1 bg-black ring-1 ring-white/10">
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white/5 backdrop-blur-sm flex items-center justify-center border-4 border-white/10 shadow-2xl">
                        <Image
                            src="/logo.jpg"
                            alt="SKASC Logo"
                            width={160}
                            height={160}
                            className="object-contain p-2 transform scale-[1.2]"
                            priority
                        />
                    </div>
                </div>
            </div>

            <div className="relative text-center space-y-2">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight p-2">
                    <span className="bg-clip-text text-transparent bg-[size:200%] animate-gradient bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
                        SKASC
                    </span>
                </h1>
                <p className="text-xl md:text-2xl font-bold text-white/90 tracking-widest uppercase relative inline-block">
                    Quiz Competition
                    <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></span>
                </p>
            </div>

            <style jsx global>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
        </div>
    );
}
