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
    <div
      className="w-full min-h-screen bg-gradient-to-b from-teal-950 via-black to-teal-950 text-white flex items-center justify-center"
    >
     
      <div className="min-h-screen flex flex-col items-center justify-evenly w-full">
        <div>
          <h1 className="font-extralight text-center  bg-clip-text text-transparent bg-gradient-to-tr from-purple-900 via-purple-600 to-slate-50 text-4xl mt-12 mb-3">
            Future's Hope
          </h1>
        </div>

        {/* Signup Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 p-6 bg-black/30 border border-black rounded-xl shadow-lg w-full max-w-md text-white items-center"
          encType="multipart/form-data"
        >
          <h2 className="text-xl font-semibold text-center text-white mb-2">
            Sign Up
          </h2>

          <div className="flex gap-4 w-5/6">
            <input
              type="text"
              name="firstname"
              placeholder="First Name"
              className="p-3 rounded-lg bg-black text-white focus:ring-0 outline-none w-1/2"
              required
              value={formData.firstname}
              onChange={handleChange}
            />
            <input
              type="text"
              name="lastname"
              placeholder="Last Name"
              className="p-3 rounded bg-black text-white focus:ring-0 outline-none w-1/2"
              required
              value={formData.lastname}
              onChange={handleChange}
            />
          </div>

          <input
            type="number"
            name="age"
            placeholder="Age (min 13)"
            className="p-3 rounded bg-black text-white focus:ring-0 outline-none w-5/6"
            required
            min={13}
            value={formData.age}
            onChange={handleChange}
          />

          <input
            type="tel"
            name="mobile"
            placeholder="Mobile Number"
            className="p-3 rounded bg-black text-white focus:ring-0 outline-none w-5/6"
            required
            value={formData.mobile}
            onChange={handleChange}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            className="p-3 rounded bg-black text-white focus:ring-0 outline-none w-5/6"
            required
            value={formData.email}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password (8+ aA1)"
            className="p-3 rounded bg-black text-white focus:ring-0 outline-none w-5/6"
            required
            value={formData.password}
            onChange={handleChange}
          />

          <div className="flex justify-between w-5/6">
            {["male", "female", "other"].map((g) => (
              <label key={g} className="flex items-center text-white text-sm">
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  className="mr-1 form-radio text-purple-600 focus:ring-green-600"
                  checked={formData.gender === g}
                  onChange={handleChange}
                />
                <span className="capitalize">{g}</span>
              </label>
            ))}
          </div>

          <div className="w-5/6">
            <label
              htmlFor="profilePicUpload"
              className="cursor-pointer border border-gray-500  bg-black text-white py-3 px-4 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors duration-200"
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
              {formData.profilePic ? formData.profilePic.name : "Upload Profile Picture"}
            </label>
            <input
              id="profilePicUpload"
              type="file"
              name="profilePic"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden" // Hide default file input
            />
          </div>
          <button
            type="submit"
            className="border border-gray-400  px-4 py-2 rounded-lg shadow-md font-semibold"
          >
            Sign Up
          </button>

          <p className="text-xs text-gray-400 text-center w-5/6">
            By signing up, you agree to our{" "}
            <span className="text-purple-500 underline hover:text-purple-400 cursor-pointer">Terms</span>,{" "}
            <span className="text-purple-500 underline hover:text-purple-400 cursor-pointer">Privacy</span>, and{" "}
            <span className="text-purple-500 underline hover:text-purple-400 cursor-pointer">Cookies</span> policies.
          </p>

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
            <FaGoogle size={22} className="text-purple-200 " />
            <span className="text-gray-300">
              Continue with Google
            </span>
          </button>

          <p className="text-sm text-center mt-4 text-gray-300">
            Already have an account?{" "}
            <NavLink to="/" className="text-purple-500 underline">
              Log in
            </NavLink>
          </p>
        </form>
      </div>
    </div>
  );
}
