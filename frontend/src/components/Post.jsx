import React, { useState } from "react";
import secureFetch from "../utils/secureFetch";
import { ImagePlay, Video, PlusSquare } from "lucide-react"; // Added PlusSquare icon

export default function Post() {
  const [mediaType, setMediaType] = useState("photo");
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  
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
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto bg-white dark:bg-black min-h-screen">
        
        {/* Header */}
        <div className="sticky top-0 md:top-8 lg:top-4 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <PlusSquare className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Create Post</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Share your moment</p>
              </div>
            </div>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !file}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>

        <div className="p-4 pb-20 md:pb-4">
          {/* File Upload / Media Selection Area */}
          {!file ? (
            <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200">
              <label htmlFor="upload" className="flex flex-col items-center text-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  id="upload"
                  className="hidden"
                />
                <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                  <PlusSquare className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select media from your device</h3>
                <p className="text-gray-500 dark:text-gray-400">Images or videos</p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {mediaType === "photo" ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Preview"
                    className="w-full h-96 object-cover"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(file)}
                    controls
                    className="w-full h-96 object-cover"
                  />
                )}
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Caption</label>
                <textarea
                  rows="4"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption for your post..."
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* File Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  {mediaType === "photo" ? (
                    <ImagePlay className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  ) : (
                    <Video className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mediaType === "photo" ? "Image" : "Video"} • {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}