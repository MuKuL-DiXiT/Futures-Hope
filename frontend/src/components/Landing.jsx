import React, { useState } from "react";
import { FaGoogle } from "react-icons/fa";
import { useNavigate, NavLink } from "react-router-dom";

export default function Home() {
  const [showForm, setShowForm] = useState(null); // "login" | "signup" | null
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setPos({ x: e.clientX, y: e.clientY });
  };


  const secureFetch = async (path, options = {}) => {
    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    const url = `${baseUrl}${path}`;
    let res = await fetch(url, { ...options, credentials: "include" });
    if (res.status === 401) {
      const refresh = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refresh.ok) {
        return fetch(url, { ...options, credentials: "include" });
      } else {
        await fetch(`${baseUrl}/auth/logout`, { method: "GET", credentials: "include" });
        throw new Error("Session expired. Logged out.");
      }
    }
    return res;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await secureFetch(`/auth/${showForm}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (res.ok) {
        navigate("/home");
      } else {
        alert("Failed: " + (result.error || "Invalid credentials"));
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <div onMouseMove={handleMouseMove}
    className="w-full min-h-screen bg-gradient-to-b from-teal-950 via-black to-teal-950 text-white">
       <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(
            200px circle at ${pos.x}px ${pos.y}px,
            rgba(50,0,120,0.4),
            transparent 60%
          )`,
        }}
      ></div>
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* <img src="/tree.webp" alt="Logo" width={140} className="mb-6 drop-shadow-lg" /> */}
        
        <h1 className="font-thin  text-5xl sm:text-7xl bg-clip-text text-transparent bg-gradient-to-tr from-purple-900 to-slate-500 mt-20 mb-20">
          Welcome to Future&apos;s Hope 
        </h1>
        
        <p className="text-gray-300 max-w-2xl leading-relaxed mb-8">
          <span className="font-semibold">Future’s Hope</span> is a hybrid social media 
          and community platform designed to bring people together for meaningful change.  
          Here, you can <span className="text-purple-400">connect with your bonds</span>, 
          create <span className="text-purple-400">communities</span>, share posts with 
          <span className="text-purple-400"> likes, shares, and comments</span>, 
          and collaborate for impact.  
          <br /><br />
          ✨ It’s more than just a platform — it’s a space where 
          <span className="text-purple-400"> individual actions turn into collective hope </span>
          for a better tomorrow.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-6">
          <button
            onClick={() => setShowForm(showForm === "login" ? null : "login")}
            className="bg-transparent border border-gray-600  px-6 py-3 rounded-lg font-semibold shadow-md"
          >
            Log In
          </button>
          <button
            onClick={() => setShowForm(showForm === "signup" ? null : "signup")}
          >
            
          </button>
          <NavLink 
            to="/signup"
            className="bg-transparent border border-gray-600 px-6 py-3 rounded-lg font-semibold shadow-md"
          >Sign Up</NavLink>
        </div>

        {/* Dropdown Form */}
        {showForm && (
          <div className="mt-10 w-full max-w-md bg-black/30 border border-black rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 capitalize">{showForm} Form</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                className="p-3 rounded bg-black text-white focus:ring-0 outline-none"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                className="p-3 rounded bg-black text-white focus:ring-0 outline-none"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="submit"
                className="border border-gray-400  px-4 py-2 rounded-lg shadow-md font-semibold"
              >
                {showForm === "login" ? "Log In" : "Sign Up"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex justify-center items-center gap-2 my-4 text-gray-500">
              <span className="w-16 h-px bg-gray-700"></span>
              OR
              <span className="w-16 h-px bg-gray-700"></span>
            </div>

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3  border border-gray-400 px-6 py-3 rounded-lg  transition-all"
            >
              <FaGoogle size={22} className="text-purple-200" />
              <span className="text-gray-300">
                Continue with Google
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
