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
    <div className="flex flex-col sm:flex-row justify-evenly items-center min-h-screen w-full mx-4 mb-16 sm:mb-0">
      <div>
        <img src="../public/tree.webp" alt="" className="sm:w-96" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 p-6 w-full max-w-md text-white"
        encType="multipart/form-data"
      >
        <div>
          <h2 className="text-2xl text-black text-center mb-2">
            Creating a new account
          </h2>
          <h2 className="text-black text-center mb-4">It's quick and easy.</h2>
          <hr className="border-t border-gray-300 my-4" />
        </div>

        <div className="flex justify-between gap-2">
          <input
            type="text"
            name="firstname"
            placeholder="First Name (no spaces)"
            className="p-2 rounded-lg text-black border-gray-300 border-2 w-1/2"
            required
            value={formData.firstname}
            onChange={handleChange}
          />
          <input
            type="text"
            name="lastname"
            placeholder="Last Name (no spaces)"
            className="p-2 rounded-lg text-black border-gray-300 border-2 w-1/2"
            required
            value={formData.lastname}
            onChange={handleChange}
          />
        </div>

        <input
          type="number"
          name="age"
          placeholder="Age (must be >13)"
          min={13}
          max={150}
          className="p-2 rounded-lg text-black border-gray-300 border-2"
          required
          value={formData.age}
          onChange={handleChange}
        />

        <input
          type="tel"
          name="mobile"
          placeholder="Phone Number"
          className="p-2 rounded-lg text-black border-gray-300 border-2"
          required
          value={formData.mobile}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="G-mail"
          className="p-2 rounded-lg text-black border-gray-300 border-2"
          required
          value={formData.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password (atleast 8 letters including aA1)"
          className="p-2 rounded-lg text-black border-gray-300 border-2"
          required
          value={formData.password}
          onChange={handleChange}
        />

        <div className="flex justify-between">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="gender"
              value="male"
              className="text-green-800"
              checked={formData.gender === "male"}
              onChange={handleChange}
            />
            <span className="ml-2 text-black">Male</span>
          </label>

          <label className="inline-flex items-center">
            <input
              type="radio"
              name="gender"
              value="female"
              className="text-pink-600"
              checked={formData.gender === "female"}
              onChange={handleChange}
            />
            <span className="ml-2 text-black">Female</span>
          </label>

          <label className="inline-flex items-center">
            <input
              type="radio"
              name="gender"
              value="other"
              className="text-gray-600"
              checked={formData.gender === "other"}
              onChange={handleChange}
            />
            <span className="ml-2 text-black">Other</span>
          </label>
        </div>

        <div>
          <label className="text-black mb-1 block">Upload Profile Picture</label>
          <input
            type="file"
            name="profilePic"
            accept="image/*"
            onChange={handleFileChange}
            className="text-black"
          />
        </div>

        <div className="text-gray-500 text-left text-xs">
          <p>
            People who use our service may have uploaded your contact information.{" "}
            <span className="text-green-500 cursor-pointer">Learn more</span>
            <br />
            By clicking Sign Up, you agree to our{" "}
            <span className="text-green-500 cursor-pointer">
              Terms, Privacy Policy and Cookies Policy
            </span>
            . You may receive SMS notifications from us and can opt out at any time.
          </p>
        </div>

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-900 text-white font-semibold py-2 rounded transition duration-300"
        >
          Sign Up
        </button>

        <div className="text-green-600 text-center">
          Already have an account?{" "}
          <NavLink to="/" className="underline hover:text-green-800">
            Log in
          </NavLink>
        </div>
      </form>
    </div>
  );
}
