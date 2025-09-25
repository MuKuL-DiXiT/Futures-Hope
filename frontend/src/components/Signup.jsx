import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaGoogle } from "react-icons/fa";

export default function Signup() {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    age: "",
    mobile: "",
    email: "",
    password: "",
    gender: "",
    profilePic: null,
  });
  async function secureFetch(path, options = {}) {
    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    const url = `${baseUrl}${path}`;

    let res = await fetch(url, { ...options, credentials: "include" });

    if (res.status === 401) {
      const refresh = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refresh.ok) {
        return fetch(url, { ...options, credentials: "include" }); // retry original request
      } else {
        await fetch(`${baseUrl}/auth/logout`, {
          method: "GET",
          credentials: "include",
        });

        throw new Error("Session expired. Logged out.");
      }
    }

    return res;
  }
  const navigate = useNavigate();

  // Handle text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle file input
  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, profilePic: e.target.files[0] }));
  };

  

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    window.location.href = `${baseUrl}/auth/google`;
  };

  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();

    const form = new FormData();
    form.append("firstname", formData.firstname);
    form.append("lastname", formData.lastname);
    form.append("age", formData.age);
    form.append("email", formData.email);
    form.append("mobile", formData.mobile);
    form.append("password", formData.password);
    form.append("gender", formData.gender);
    if (formData.profilePic) {
      form.append("profilePic", formData.profilePic);
    }

    try {
      const response = await secureFetch("/auth/signup", {
        method: "POST",
        body: form,
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        console.error("Signup failed:", data);
        alert(data?.error || "Signup failed");
        return;
      }

      console.log("Signup success:", data);
      // Navigate to home or login after signup success
      navigate("/");
    } catch (err) {
      console.error("Signup error:", err);
      alert("An error occurred during signup.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900 flex items-center justify-center">
      <div className="w-full max-w-3xl px-6 py-12">
       

        {/* Signup Form (light themed) */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex flex-col gap-4 p-8 bg-white rounded-2xl shadow-md w-full max-w-md border border-gray-100"
          encType="multipart/form-data"
        >
          <h2 className="text-lg font-semibold text-slate-900 text-center mb-1">Sign Up</h2>

          <div className="flex gap-3">
            <input
              type="text"
              name="firstname"
              placeholder="First Name"
              className="p-3 rounded-lg border border-gray-200 w-1/2 text-slate-800"
              required
              value={formData.firstname}
              onChange={handleChange}
            />
            <input
              type="text"
              name="lastname"
              placeholder="Last Name"
              className="p-3 rounded-lg border border-gray-200 w-1/2 text-slate-800"
              required
              value={formData.lastname}
              onChange={handleChange}
            />
          </div>

          <input
            type="number"
            name="age"
            placeholder="Age (min 13)"
            className="p-3 rounded-lg border border-gray-200 w-full text-slate-800"
            required
            min={13}
            value={formData.age}
            onChange={handleChange}
          />

          <input
            type="tel"
            name="mobile"
            placeholder="Mobile Number"
            className="p-3 rounded-lg border border-gray-200 w-full text-slate-800"
            required
            value={formData.mobile}
            onChange={handleChange}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            className="p-3 rounded-lg border border-gray-200 w-full text-slate-800"
            required
            value={formData.email}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password (8+ aA1)"
            className="p-3 rounded-lg border border-gray-200 w-full text-slate-800"
            required
            value={formData.password}
            onChange={handleChange}
          />

          <div className="flex gap-3 justify-start">
            {["male", "female", "other"].map((g) => (
              <label key={g} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  className="mr-1 form-radio"
                  checked={formData.gender === g}
                  onChange={handleChange}
                />
                <span className="capitalize">{g}</span>
              </label>
            ))}
          </div>

          <div>
            <label
              htmlFor="profilePicUpload"
              className="cursor-pointer border border-gray-200 bg-white text-slate-700 py-3 px-4 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors duration-150 w-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="text-sm text-slate-700">{formData.profilePic ? formData.profilePic.name : "Upload Profile Picture"}</span>
            </label>
            <input
              id="profilePicUpload"
              type="file"
              name="profilePic"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 rounded-lg mt-1"
          >
            Sign Up
          </button>

          <p className="text-xs text-slate-500 text-center">
            By signing up, you agree to our <span className="text-emerald-600">Terms</span>, <span className="text-emerald-600">Privacy</span>, and <span className="text-emerald-600">Cookies</span> policies.
          </p>

        
        </form>
      </div>
    </div>
  );
}
