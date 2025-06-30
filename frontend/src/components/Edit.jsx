import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Edit() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const user = state?.user;

  const [firstname, setFirstname] = useState(user?.firstname || '');
  const [lastname, setLastname] = useState(user?.lastname || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(user?.profilePic || '');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

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
        return fetch(url, { ...options, credentials: "include" }); // retry
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('firstname', firstname);
    formData.append('lastname', lastname);
    if (selectedFile) formData.append('profilePic', selectedFile);

    try {
      setUploading(true);
      const res = await secureFetch(`/auth/editProfile`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      setUploading(false);

      if (res.ok) {
        alert('Profile updated!');
        navigate('/profile');
      } else {
        alert(data?.error || 'Update failed');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Upload error');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen w-full  flex items-center justify-center px-4 md:px-32 bg-gradient-to-br from-emerald-50 via-green-100 to-white">
      <div className="w-full max-w-md p-8 rounded-3xl shadow-2xl bg-white/40 border border-green-300 backdrop-blur-md text-green-900 animate-fade-in">
        <h2 className="text-3xl font-bold mb-6 text-center tracking-tight">Edit Your Profile</h2>

        <div className="mb-6 flex justify-center">
          <div className="relative group w-32 h-32 sm:w-36 sm:h-36">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-green-300 via-amber-300 to-emerald-300 opacity-30 blur group-hover:opacity-50 transition"></div>
            <img
              src={preview || '/default-avatar.png'}
              alt="Preview"
              className="relative w-full h-full rounded-full object-cover border-4 border-green-300 shadow-xl"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <input
            type="text"
            placeholder="First Name"
            className="bg-white/60 px-4 py-2 rounded-xl text-green-900 placeholder-green-500 outline-none focus:ring-2 focus:ring-emerald-300"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
          />
          <input
            type="text"
            placeholder="Last Name"
            className="bg-white/60 px-4 py-2 rounded-xl text-green-900 placeholder-green-500 outline-none focus:ring-2 focus:ring-emerald-300"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
          />

          <label className="flex flex-col items-center px-4 py-3 bg-white/50 border border-green-200 rounded-xl text-green-800 cursor-pointer hover:bg-white/70 transition">
            <span className="text-sm font-medium">Choose a new profile picture</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            type="submit"
            className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-semibold py-2 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={uploading}
          >
            {uploading ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
