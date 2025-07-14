import React, { useState } from "react";
import { ImagePlay, Video, PlusSquare } from "lucide-react"; // Added PlusSquare icon

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
    // Adjusted padding for a fixed bottom navbar
    // Assuming a navbar height of approximately 56px (h-14) or similar.
    // The `pb-[80px]` ensures there's enough space above the navbar.
    <div className="min-h-screen w-full  flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 pb-[80px] md:pb-8">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg overflow-hidden md:p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Create new post</h2>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !file}
            className="text-blue-500 font-semibold text-sm px-3 py-1 rounded-md hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sharing..." : "Share"}
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* File Upload / Media Selection Area */}
          {!file ? (
            <div className="flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-10 cursor-pointer hover:bg-gray-100 transition-colors duration-200">
              <label htmlFor="upload" className="flex flex-col items-center text-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  id="upload"
                  className="hidden"
                />
                <PlusSquare className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium text-lg">Select media from your device</p>
                <p className="text-gray-500 text-sm mt-1">Images or videos</p>
              </label>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="rounded-lg overflow-hidden border border-gray-200 bg-black flex items-center justify-center">
                {mediaType === "photo" ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="w-full h-80 object-contain max-h-80" // object-contain for full view
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(file)}
                    controls
                    className="w-full h-80 object-contain max-h-80" // object-contain for full view
                  />
                )}
              </div>

              {/* Caption */}
              <textarea
                rows="4" // Increased rows for more space
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full bg-gray-50 text-gray-800 placeholder:text-gray-500 border border-gray-200 rounded-lg p-3 focus:outline-none focus:border-gray-400 resize-none text-sm"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}