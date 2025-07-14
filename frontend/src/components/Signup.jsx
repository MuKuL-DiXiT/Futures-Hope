import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

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
    <div className="w-full min-h-screen flex flex-col items-center justify-center "> {/* Dark background for contrast */}
      <div className="min-h-screen flex flex-col items-center justify-evenly w-full">
        <div>
          <img src="/tree.webp" alt="Logo" width={150} />
          <h1 className="font-marker text-center text-green-700 text-xl font-bold">
            Future's Hope
          </h1>
        </div>

        {/* Signup Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 p-6 bg-green-900/40 shadow-lg shadow-black rounded-lg w-full max-w-md text-white items-center"
          encType="multipart/form-data"
        >
          <h2 className="text-3xl  font-bold text-center text-teal-800 mb-2">
            Create Account
          </h2>
          <p className="text-sm text-center text-gray-300 mb-4">It's quick and easy.</p>
          <hr className="border-gray-700 w-5/6" /> {/* Darker hr */}

          <div className="flex gap-4 w-5/6"> {/* Adjusted gap and width */}
            <input
              type="text"
              name="firstname"
              placeholder="First Name"
              className="p-2 rounded text-white bg-black/40 w-1/2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              required
              value={formData.firstname}
              onChange={handleChange}
            />
            <input
              type="text"
              name="lastname"
              placeholder="Last Name"
              className="p-2 rounded text-white bg-black/40 w-1/2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              required
              value={formData.lastname}
              onChange={handleChange}
            />
          </div>

          <input
            type="number"
            name="age"
            placeholder="Age (min 13)"
            className="p-2 rounded text-white bg-black/40 w-5/6 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            required
            min={13}
            value={formData.age}
            onChange={handleChange}
          />

          <input
            type="tel"
            name="mobile"
            placeholder="Mobile Number"
            className="p-2 rounded text-white bg-black/40 w-5/6 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            required
            value={formData.mobile}
            onChange={handleChange}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            className="p-2 rounded text-white bg-black/40 w-5/6 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            required
            value={formData.email}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password (8+ aA1)"
            className="p-2 rounded text-white bg-black/40 w-5/6 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            required
            value={formData.password}
            onChange={handleChange}
          />

          <div className="flex justify-between w-5/6"> {/* Adjusted width */}
            {["male", "female", "other"].map((g) => (
              <label key={g} className="flex items-center text-white text-sm"> {/* Text color adjusted */}
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  className="mr-1 form-radio text-green-600 focus:ring-green-600" // Tailwind radio styling
                  checked={formData.gender === g}
                  onChange={handleChange}
                />
                <span className="capitalize">{g}</span>
              </label>
            ))}
          </div>

          <div className="w-5/6"> {/* Adjusted width */}
            <label className="block text-sm mb-2 text-gray-300">Upload Profile Picture</label>
            <label htmlFor="profilePicUpload" className="cursor-pointer bg-black/40 text-white py-2 px-4 rounded-lg flex items-center justify-center hover:bg-black/60 transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {formData.profilePic ? formData.profilePic.name : "Choose File"}
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

          <p className="text-xs text-gray-400 text-center w-5/6"> {/* Adjusted width and text color */}
            By signing up, you agree to our{" "}
            <span className="text-green-500 underline hover:text-green-400 cursor-pointer">Terms</span>,{" "}
            <span className="text-green-500 underline hover:text-green-400 cursor-pointer">Privacy</span>, and{" "}
            <span className="text-green-500 underline hover:text-green-400 cursor-pointer">Cookies</span> policies.
          </p>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-900 text-white font-semibold py-2 rounded w-1/3 transition-all duration-300"
          >
            Sign Up
          </button>

          <p className="text-sm text-center mt-4 text-gray-300"> {/* Text color adjusted */}
            Already have an account?{" "}
            <NavLink to="/" className="text-green-500 underline hover:text-green-400">
              Log in
            </NavLink>
          </p>
        </form>
      </div>
    </div>
  );
}
