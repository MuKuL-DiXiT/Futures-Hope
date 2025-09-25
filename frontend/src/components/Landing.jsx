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
    <div className="w-full">
      {/* Hero Section */}
      <section className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
        {/* Decorative blobs behind content */}
        <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
          <div className="hero-blob blob-1" aria-hidden style={{ transform: `translate3d(0, ${scrollY * 0.3}px, 0)` }} />
          <div className="hero-blob blob-2" aria-hidden style={{ transform: `translate3d(0, ${scrollY * -0.2}px, 0)` }} />
          <div className="hero-blob blob-3" aria-hidden style={{ transform: `translate3d(0, ${scrollY * 0.4}px, 0)` }} />
        </div>

        <div className="max-w-6xl w-full px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="space-y-6 w-full">
              <div className="inline-flex items-center gap-3 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-sm">
                <TreePine className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">FuturesHope</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-900 fade-in" style={{ animationDelay: "120ms" }}>
                Build community. Share hope. Grow together.
              </h1>

              <p className="text-lg text-slate-700 max-w-xl fade-in" style={{ animationDelay: "220ms" }}>
                Join small groups, post thoughts, and connect with people who care. Simple, private, and delightful.
              </p>

              <div className="flex flex-wrap gap-3 items-center mt-4">
                <button
                  onClick={() => setShowForm("signup")}
                  className="btn-primary px-4 py-2 shadow-md fade-in"
                  style={{ animationDelay: "320ms" }}
                >
                  Create account
                </button>

                <button
                  onClick={() => setShowForm("login")}
                  className="btn-outline px-4 py-2 fade-in"
                  style={{ animationDelay: "320ms" }}
                >
                  Log in
                </button>

                <button
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm bg-white/80 hover:bg-white shadow-sm fade-in"
                  style={{ animationDelay: "420ms" }}
                >
                  <FaGoogle className="w-4 h-4 text-red-500" /> Sign in with Google
                </button>
              </div>

              <div className="text-sm text-slate-500 mt-6">
                <span>Already have an account?</span>
                <NavLink to="/login" className="ml-2 text-emerald-700 font-medium">
                  Log in
                </NavLink>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center min-h-[600px]">
            <div className="w-full max-w-md mx-auto fade-in" style={{ animationDelay: "220ms" }}>
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
              <div className="w-full bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-sm text-slate-600 font-medium">{showForm === "login" ? "Welcome back" : "Get started"}</div>

                  <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                  />

                  <div className="relative">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-200 pr-12"
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

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-400">Made with ♥ for communities</div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">What makes us different</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              FuturesHope isn't just another social platform. We're building something better — focused, meaningful, and human.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100 hover:shadow-lg transition-all duration-300 animate-on-scroll">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Small Communities</h3>
              <p className="text-slate-600">
                Join intimate groups where every voice matters. No noise, no algorithms — just real people sharing real conversations.
              </p>
            </div>

            <div className="group p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-100 hover:shadow-lg transition-all duration-300 animate-on-scroll" style={{ animationDelay: "150ms" }}>
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Meaningful Posts</h3>
              <p className="text-slate-600">
                Share thoughts, projects, and ideas that matter. Every post is an opportunity to connect and inspire others.
              </p>
            </div>

            <div className="group p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-100 border border-purple-100 hover:shadow-lg transition-all duration-300 animate-on-scroll" style={{ animationDelay: "300ms" }}>
              <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Safe Spaces</h3>
              <p className="text-slate-600">
                Thoughtful moderation and community guidelines ensure every space remains welcoming and constructive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-lg text-slate-600">Simple steps to meaningful connections</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center group animate-on-scroll">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Join Communities</h3>
              <p className="text-slate-600">
                Discover communities that match your interests, values, and goals. From creative projects to professional growth.
              </p>
            </div>

            <div className="text-center group animate-on-scroll" style={{ animationDelay: "150ms" }}>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Share & Connect</h3>
              <p className="text-slate-600">
                Post your thoughts, ask questions, share progress. Engage with others' content through thoughtful comments and reactions.
              </p>
            </div>

            <div className="text-center group animate-on-scroll" style={{ animationDelay: "300ms" }}>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Build Relationships</h3>
              <p className="text-slate-600">
                Form genuine connections, collaborate on projects, and support each other's journeys in a positive environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-on-scroll">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Our values guide everything we do</h2>
              <p className="text-lg text-slate-600 mb-8">
                We believe technology should bring people closer together, not drive them apart. Every feature we build reflects our commitment to authentic human connection.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Heart className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Human-first design</h4>
                    <p className="text-slate-600">Every interaction is designed to feel personal and meaningful, not automated or cold.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Global community</h4>
                    <p className="text-slate-600">Connect with like-minded people from around the world, breaking down barriers and building bridges.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Continuous growth</h4>
                    <p className="text-slate-600">We're constantly improving, learning from our community, and evolving to serve you better.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative animate-on-scroll">
              <div className="w-full h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <TreePine className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">FuturesHope</h3>
                  <p className="text-slate-600">Building tomorrow's communities today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center animate-on-scroll">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to build something meaningful?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of people creating the future of community, one conversation at a time.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => document.querySelector('section').scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-blue-600 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors duration-200"
            >
              Get started for free
            </button>
            <button
              onClick={() => document.querySelector('section').scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-white/30 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors duration-200"
            >
              Learn more
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

