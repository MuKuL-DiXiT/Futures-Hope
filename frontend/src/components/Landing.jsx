import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

export default function Landing() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

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
        await fetch(`${baseUrl}/auth/logout`, {
          method: "GET",
          credentials: "include",
        });
        throw new Error("Session expired. Logged out.");
      }
    }

    return res;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await secureFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (res.ok) {
        alert("Login successful!");
        navigate("/home");
      } else {
        alert("Login failed: " + (result.error || "Invalid credentials"));
      }
    } catch (err) {
      alert("Login error: " + err.message);
    }
  };

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <div className="w-full items-center">
      <div className="min-h-screen flex flex-col items-center justify-evenly">
        <div>
          <img src="/tree.webp" alt="Logo" width={150} />
          <h1 className="font-marker text-center text-green-700 text-xl font-bold">
            Future's Hope
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 p-6 bg-green-900/40 shadow-lg shadow-black rounded-lg w-full max-w-md text-white items-center"
        >
          <input
            type="email"
            placeholder="G-mail"
            className="p-2 rounded text-black bg-black/40 w-5/6"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="p-2 rounded text-black bg-black/40 w-5/6"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-900 text-white font-semibold py-2 rounded w-1/3"
          >
            Log in
          </button>

          <NavLink to="/signup" className="text-green-700 text-center">
            Don't have an account?{" "}
            <span className="underline">Sign Up</span>
          </NavLink>
        </form>

        <div>OR</div>

        <button
          onClick={handleGoogleLogin}
          className="flex items-center bg-green-900/40 justify-center gap-2 shadow-black shadow-lg px-4 py-3 rounded-lg hover:shadow-md"
        >
          <FcGoogle size={20} />
          <span className="text-gray-800">Log in with Google</span>
        </button>
      </div>
    </div>
  );
}
