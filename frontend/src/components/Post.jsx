import React, { useState } from "react";
import { ImagePlay, Video } from "lucide-react";

export default function Post() {
  const [mediaType, setMediaType] = useState("photo");
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

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
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (selected.type.startsWith("image/")) setMediaType("photo");
      else if (selected.type.startsWith("video/")) setMediaType("video");
      else alert("Unsupported file type");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a media file.");

    const formData = new FormData();
    formData.append("media", file);
    formData.append("type", mediaType);
    formData.append("caption", caption);

    setLoading(true);
    try {
      const res = await secureFetch("/auth/posts/create", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert("Post uploaded successfully!");
        setFile(null);
        setCaption("");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent w-full flex flex-col justify-center items-center  p-6">
      <h2 className="text-3xl text-black font-semibold text-center mb-6 font-marker">
          Share Something
        </h2>
      <div className="w-full flex flex-col items-center max-w-3xl py-16 bg-teal-950/80  rounded-2xl shadow-lg p-6 relative">
        

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Upload */}
          <div className="flex flex-col items-center gap-3">
            <label htmlFor="upload" className="cursor-pointer w-full">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                id="upload"
                className="hidden"
              />
              <div className="w-full flex flex-col items-center text-center bg-green-700  hover:shadow-white hover:shadow-lg transition-shadows text-white py-2 rounded-xl duration-500 font-medium tracking-wide">
                {file ? "Change Media" : "Select from Device"}<span className="flex items-center"><ImagePlay/></span>
              </div>
            </label>
          </div>

          {/* Preview */}
          {file && (
            <div className="rounded-lg overflow-hidden border border-green-500">
              {mediaType === "photo" ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="w-full h-72 object-cover"
                />
              ) : (
                <video
                  src={URL.createObjectURL(file)}
                  controls
                  className="w-full h-72 object-contain"
                />
              )}
            </div>
          )}

          {/* Caption */}
          <textarea
            rows="3"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full bg-black/30 text-white placeholder:text-gray-400 border border-green-600 rounded-lg p-3 focus:outline-none focus:border-green-400 resize-none"
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-2 rounded-xl transition disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Post"}
          </button>
        </form>
      </div>
    </div>
  );
}
