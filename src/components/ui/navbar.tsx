"use client";

import { useState } from "react";

export function Navbar() {
    const [showAbout, setShowAbout] = useState(false);

    return (
        <>
            {/* Floating About Button with Liquid Glass Effect */}
            <button
                onClick={() => setShowAbout(true)}
                className="
                    fixed top-4 left-1/2 -translate-x-1/2 z-50
                    px-5 py-2.5 rounded-2xl
                    backdrop-blur-xl backdrop-saturate-150
                    bg-gradient-to-r from-white/15 via-white/10 to-white/15
                    border border-white/25
                    text-white/90 hover:text-white
                    font-medium text-sm
                    shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
                    hover:shadow-[0_8px_40px_rgba(147,51,234,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]
                    hover:bg-gradient-to-r hover:from-white/20 hover:via-white/15 hover:to-white/20
                    hover:border-white/40
                    transition-all duration-300
                    active:scale-95
                    overflow-hidden
                    group
                "
            >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative">About</span>
            </button>

            {/* About Modal with Glass Morphism */}
            {showAbout && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={() => setShowAbout(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" />

                    {/* Modal Content with Liquid Glass Effect */}
                    <div
                        className="
                            relative max-w-lg w-full
                            backdrop-blur-2xl backdrop-saturate-200
                            bg-gradient-to-br from-white/10 via-white/5 to-white/10
                            border border-white/20
                            rounded-3xl
                            shadow-[0_25px_80px_rgba(147,51,234,0.3),0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]
                            overflow-hidden
                            animate-modal-enter
                        "
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative gradient orbs */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/30 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

                        {/* Close button */}
                        <button
                            onClick={() => setShowAbout(false)}
                            className="
                                absolute top-4 right-4 z-10
                                w-8 h-8 rounded-full
                                backdrop-blur-md
                                bg-white/10 hover:bg-white/20
                                border border-white/20
                                flex items-center justify-center
                                transition-all duration-200
                                text-white/60 hover:text-white
                            "
                        >
                            ✕
                        </button>

                        {/* Content */}
                        <div className="relative p-8 space-y-6">
                            {/* Title */}
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                                    About This Website
                                </h2>
                                <div className="w-16 h-1 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                            </div>

                            {/* Description */}
                            <p className="text-gray-300 text-center leading-relaxed text-sm">
                                This website was thoughtfully designed and developed by{" "}
                                <span className="text-white font-semibold">Nieraj Niketan S</span>,
                                bringing together clean aesthetics, smooth functionality, and a modern digital experience.
                                The project reflects a commitment to quality, usability, and attention to detail,
                                ensuring that every interaction feels seamless and professional.
                            </p>

                            {/* Development Team - Glass Card */}
                            <div className="backdrop-blur-md bg-white/5 rounded-2xl p-5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-3">
                                <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider text-center">
                                    Development Team
                                </h3>
                                <div className="space-y-2 text-center">
                                    <p className="text-white/90">
                                        <span className="text-gray-400">Lead Developer:</span>{" "}
                                        <span className="font-semibold">Nieraj Niketan S</span>
                                    </p>
                                    <p className="text-white/80 text-sm">
                                        <span className="text-gray-400">Team Members:</span>{" "}
                                        Kavishnu G • Likhith Sai S
                                    </p>
                                </div>
                            </div>

                            {/* Event Hosted By - Glass Card */}
                            <div className="backdrop-blur-md bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-5 border border-purple-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-3">
                                <h3 className="text-sm font-semibold text-pink-400 uppercase tracking-wider text-center">
                                    Event Hosted By
                                </h3>
                                <p className="text-center text-white font-semibold text-lg">
                                    Melvin & Krishna
                                </p>
                            </div>

                            {/* Footer note */}
                            <p className="text-gray-400 text-xs text-center leading-relaxed">
                                Together, this collaboration blends creativity, technical precision,
                                and organizational excellence to deliver a platform built with purpose and professionalism.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
