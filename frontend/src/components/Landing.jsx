import React, { useState, useEffect } from "react";
import { FaGoogle } from "react-icons/fa";
import { useNavigate, NavLink } from "react-router-dom";
import { TreePine, Eye, EyeOff, Users, MessageCircle, Shield, Zap, Heart, Globe } from "lucide-react";
import Signup from "./Signup";

export default function Landing() {
  const [showForm, setShowForm] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const ping = async () => {
      const base = import.meta.env.VITE_BACKEND_URL || "https://localhost:5173";
      try {
        const res = await fetch(base + "/auth/up", {
          credentials: "include",
        });
        if (res.ok) {
          console.log("working fine");
        }
      } catch (err) {
        console.error("Ping error:", err);
      }
    };
    ping();
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
        }
      });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.animate-on-scroll');
    animateElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  async function secureFetch(path, options = {}) {
    const base = import.meta.env.VITE_BACKEND_URL || "";
    const res = await fetch(base + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (res.status === 401) {
      try {
        const r = await fetch(base + "/auth/refresh", {
          credentials: "include",
        });
        if (!r.ok) throw new Error("refresh-failed");
        return await fetch(base + path, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          ...options,
        });
      } catch (err) {
        navigate("/login");
        throw err;
      }
    }

    return res;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!showForm) return;
    const url = `/auth/${showForm}`;
    try {
      const res = await secureFetch(url, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("auth-failed");
      const data = await res.json();
      if (data?.user) navigate("/home");
    } catch (err) {
      console.error(err);
      alert("Authentication failed. Check console for details.");
    }
  }

  function handleGoogleLogin() {
    const base = import.meta.env.VITE_BACKEND_URL || "";
    window.location.href = base + "/auth/google";
  }

  return (
    <div className="w-full bg-noise dark:bg-black/80 bg-black/20">
      <section className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <div className="hero-blob blob-1" aria-hidden style={{ transform: `translate3d(0, ${scrollY * 0.3}px, 0)` }} />
          <div className="hero-blob blob-2" aria-hidden style={{ transform: `translate3d(0, ${scrollY * -0.2}px, 0)` }} />
          <div className="hero-blob blob-3" aria-hidden style={{ transform: `translate3d(0, ${scrollY * 0.4}px, 0)` }} />
        </div>

        <div className="max-w-6xl w-full sm:px-6 px-2 mb-20 mt-10 sm:mb-0 sm:mt-0  sm:py-20 flex flex-col sm:grid sm:grid-cols-1 md:grid-cols-2 sm:gap-12">
          <div className="flex items-center justify-center mt-16 sm:mt-0 min-h-[200px] sm:min-h-[600px]">
            <div className="space-y-6 w-full">
              <div className="inline-flex items-center gap-3 bg-white/60 backdrop-blur-md dark:bg-black/60 rounded-full px-4 py-2 shadow-sm">
                <TreePine className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">FuturesHope</span>
              </div>

              <h1 className="text-2xl md:text-5xl font-extrabold leading-tight fade-in text-black dark:text-white" style={{ animationDelay: "120ms" }}>
                Build community. Share hope. Grow together.
              </h1>

              <p className="text-lg hidden sm:block text-black dark:text-gray-200 font-semibold max-w-xl fade-in" style={{ animationDelay: "220ms" }}>
                Join small groups, post thoughts, and connect with people who care. Simple, private, and delightful.
              </p>

              <div className="flex flex-wrap gap-3 items-center sm:mt-4">
                <button
                  onClick={() => setShowForm("signup")}
                  className="btn-primary rounded-full px-4 py-2 shadow-md fade-in"
                  style={{ animationDelay: "320ms" }}
                >
                  Create account
                </button>

                <button
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-2 text-black dark:text-white rounded-full border px-3 py-2 text-sm bg-white/80 hover:bg-white dark:bg-black/80 dark:hover:bg-black dark:border-gray-700 shadow-sm fade-in"
                  style={{ animationDelay: "420ms" }}
                >
                  <FaGoogle className="w-4 h-4 text-red-500" /> Sign in with Google
                </button>
              </div>

              <div className="text-sm text-gray-800 dark:text-slate-300 mt-6">
                <span>Already have an account?</span>
                <button onClick={() => setShowForm("login")} className="ml-2 text-black dark:text-white px-2 py-0.5 rounded-full shadow-md sm:bg-gray-100/20 shadow-black font-semibold">
                  Log in
                </button>
              </div>
            </div>
          </div>

          <div className="flex sm:items-center sm:mt-0 mt-16 justify-center min-h-[300px]">
            <div className="w-full sm:max-w-md mx-auto fade-in" style={{ animationDelay: "220ms" }}>
              {showForm === "signup" ? (
              <Signup
                showForm={showForm}
                setShowForm={setShowForm}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                handleSubmit={handleSubmit}
                handleGoogleLogin={handleGoogleLogin}
              />
            ) : (
              <div className="w-full">
                <form onSubmit={handleSubmit}  className="mx-auto flex flex-col bg-black/10 dark:bg-gray-800 gap-4 sm:p-8 rounded-2xl shadow-md w-full max-w-md border border-black dark:border-gray-700">
                  <div className=" text-black text-center font-medium">{showForm === "login" ? "Welcome back" : "Get started"}</div>

                  <input
                    className="w-full rounded-xl border border-slate-200 bg-transparent text-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                  />

                  <div className="relative">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-transparent text-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200 pr-12"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-label="toggle password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      className="btn-primary w-full"
                      onClick={() => setShowForm((s) => s || "signup")}
                    >
                      {showForm === "login" ? "Sign in" : "Continue"}
                    </button>
                  </div>
                </form>
              </div>
            )}
            </div>
          </div>
        </div>
        <button className="absolute bottom-16 left-0.45 mt-12 bg-gradient-to-br from-pink-700/40 to-white/20 hover:from-pink-700/80 hover:to-black/20 font-semibold  text-2xl rounded-full px-3 py-1 animate-bounce"><NavLink to='/home'>Explore</NavLink></button>
        <div className="absolute bottom-6 left-0.3 sm:left-1/2  sm:-translate-x-1/2 text-xs text-slate-400">Made with ♥ for communities</div>
      </section>


      {/* Footer */}
      <footer className="w-full bg-black text-white py-12 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <TreePine className="w-6 h-6 text-white" />
            <span className="text-lg font-light tracking-wider">FuturesHope</span>
          </div>
          
          <div className="flex gap-8 text-sm font-light text-gray-400">
            <a href="#" className="hover:text-white transition-colors">About</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>

          <div className="text-xs text-gray-600 font-light">
            © {new Date().getFullYear()} FuturesHope. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

