return (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-900 to-green-900 text-white px-4 py-8">
    <div className="bg-white text-black rounded-2xl shadow-2xl flex flex-col sm:flex-row max-w-4xl w-full overflow-hidden">
      
      {/* Left Side Image */}
      <div className="hidden sm:block sm:w-1/2">
        <img src="/tree.webp" alt="Nature" className="object-cover h-full w-full" />
      </div>

      {/* Signup Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 p-8 sm:w-1/2 w-full"
        encType="multipart/form-data"
      >
        <h2 className="text-3xl font-bold text-center text-green-800 mb-2">
          Create Account
        </h2>
        <p className="text-sm text-center text-gray-500 mb-4">It's quick and easy.</p>
        <hr className="border-gray-300" />

        <div className="flex gap-2">
          <input
            type="text"
            name="firstname"
            placeholder="First Name"
            className="p-2 border border-gray-300 rounded-lg w-1/2"
            required
            value={formData.firstname}
            onChange={handleChange}
          />
          <input
            type="text"
            name="lastname"
            placeholder="Last Name"
            className="p-2 border border-gray-300 rounded-lg w-1/2"
            required
            value={formData.lastname}
            onChange={handleChange}
          />
        </div>

        <input
          type="number"
          name="age"
          placeholder="Age (min 13)"
          className="p-2 border border-gray-300 rounded-lg"
          required
          min={13}
          value={formData.age}
          onChange={handleChange}
        />

        <input
          type="tel"
          name="mobile"
          placeholder="Mobile Number"
          className="p-2 border border-gray-300 rounded-lg"
          required
          value={formData.mobile}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="p-2 border border-gray-300 rounded-lg"
          required
          value={formData.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password (8+ aA1)"
          className="p-2 border border-gray-300 rounded-lg"
          required
          value={formData.password}
          onChange={handleChange}
        />

        <div className="flex justify-between">
          {["male", "female", "other"].map((g) => (
            <label key={g} className="flex items-center text-sm">
              <input
                type="radio"
                name="gender"
                value={g}
                className="mr-1"
                checked={formData.gender === g}
                onChange={handleChange}
              />
              <span className="capitalize">{g}</span>
            </label>
          ))}
        </div>

        <div>
          <label className="block text-sm mb-1">Upload Profile Picture</label>
          <input
            type="file"
            name="profilePic"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm"
          />
        </div>

        <p className="text-xs text-gray-500">
          By signing up, you agree to our{" "}
          <span className="text-green-700 underline">Terms</span>,{" "}
          <span className="text-green-700 underline">Privacy</span>, and{" "}
          <span className="text-green-700 underline">Cookies</span> policies.
        </p>

        <button
          type="submit"
          className="bg-green-700 hover:bg-green-900 text-white py-2 rounded-lg font-semibold transition-all duration-300"
        >
          Sign Up
        </button>

        <p className="text-sm text-center mt-4">
          Already have an account?{" "}
          <NavLink to="/" className="text-green-700 underline hover:text-green-900">
            Log in
          </NavLink>
        </p>
      </form>
    </div>
  </div>
);
