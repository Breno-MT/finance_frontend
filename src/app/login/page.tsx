"use client";

import { useState, SubmitEventHandler } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/users?username=${username}&password=${password}`
            );
            const data = await res.json();

            if (!data.length) {
                setError("Invalid credentials.");
                return;
            }

            const user = data[0];

            if (user.password !== password) {
                setError("Invalid Credentials.");
                return;
            }

            localStorage.setItem("user", JSON.stringify({
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
            }));
            router.push("/dashboard")

        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = () => {
        // handle Google OAuth
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-black font-sans">

            {/* LEFT PANEL */}
            <div className="hidden lg:flex flex-col justify-between bg-[#e8ff3b] p-14 relative overflow-hidden">
                {/* Brand */}
                <span className="text-black tracking-[6px] text-sm font-bold uppercase">
                    Finance App.
                </span>

                {/* Headline */}
                <div>
                    <h1 className="font-black text-[clamp(72px,9vw,120px)] leading-[0.9] text-black uppercase tracking-tight">
                        JUMP
                        <br />
                        <span
                            className="text-transparent"
                            style={{ WebkitTextStroke: "3px #0a0a0a" }}
                        >
                            INTO
                        </span>
                        <br />
                        YOUR
                        <br />
                        WORLD
                    </h1>
                    <p className="mt-6 text-black/60 text-sm max-w-65 leading-relaxed">
                        Access your dashboard, manage your money, and pick up right where
                        you left off.
                    </p>
                </div>

                {/* Decorative circles */}
                <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full border-2 border-black/10" />
                <div className="absolute -bottom-4 -right-4 w-44 h-44 rounded-full border-2 border-black/15" />
            </div>

            {/* RIGHT PANEL */}
            <div className="flex items-center justify-center bg-[#0a0a0a] px-6 py-16">
                <div className="w-full max-w-sm animate-[fadeUp_0.5s_ease_both]">

                    {/* Header */}
                    <h2 className="text-5xl font-black text-white uppercase tracking-wide leading-none mb-1">
                        Welcome back
                    </h2>
                    <p className="text-sm text-neutral-500 mb-10">
                        Don&apos;t have an account?{" "}
                        <a href="#" className="text-[#e8ff3b] font-medium hover:underline">
                            Sign up
                        </a>
                    </p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Username */}
                        <div className="group">
                            <label className="block text-[11px] uppercase tracking-[1.5px] text-neutral-500 group-focus-within:text-[#e8ff3b] mb-2 transition-colors duration-200">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                                placeholder="johndoe"
                                required
                                className="w-full bg-[#111] border border-[#222] text-white text-sm px-4 py-3.5 rounded focus:outline-none focus:border-[#e8ff3b] focus:ring-2 focus:ring-[#e8ff3b]/10 placeholder:text-neutral-700 transition-all duration-200"
                            />
                        </div>

                        {/* Password */}
                        <div className="group">
                            <label className="block text-[11px] uppercase tracking-[1.5px] text-neutral-500 group-focus-within:text-[#e8ff3b] mb-2 transition-colors duration-200">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                placeholder="••••••••"
                                required
                                className="w-full bg-[#111] border border-[#222] text-white text-sm px-4 py-3.5 rounded focus:outline-none focus:border-[#e8ff3b] focus:ring-2 focus:ring-[#e8ff3b]/10 placeholder:text-neutral-700 transition-all duration-200"
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 px-4 py-3 rounded">
                                {error}
                            </p>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#e8ff3b] text-black font-black text-lg uppercase tracking-[3px] py-3.5 rounded hover:bg-[#d4eb1a] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Logging in...
                                </>
                            ) : (
                                "Login"
                            )}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-[#222]" />
                            <span className="text-xs text-neutral-600 uppercase tracking-widest">or</span>
                            <div className="flex-1 h-px bg-[#222]" />
                        </div>

                        {/* Google OAuth */}
                        <button
                            type="button"
                            onClick={handleGoogle}
                            className="w-full flex items-center justify-center gap-3 bg-[#111] border border-[#222] text-white text-sm font-medium py-3.5 rounded hover:border-neutral-500 hover:bg-[#181818] active:scale-[0.99] transition-all duration-200"
                        >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
