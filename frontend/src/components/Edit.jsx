import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import secureFetch from "../utils/secureFetch";

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
    <div className="w-full min-h-screen text-slate-900 dark:text-white flex items-center justify-center">
      <div className="w-full max-w-3xl sm:px-6 sm:py-12">
        {/* Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex flex-col bg-black/10 dark:bg-gray-800 gap-4 sm:p-8 rounded-2xl shadow-md w-full max-w-md border border-black dark:border-gray-700"
          encType="multipart/form-data"
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white text-center mb-1">Edit Your Profile</h2>

          <div className="mb-4 flex justify-center">
            <div className="relative group w-32 h-32">
              <img
                src={preview || '/default-avatar.png'}
                alt="Preview"
                className="w-full h-full rounded-full object-cover border-4 border-gray-300 dark:border-gray-600 shadow-lg"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="First Name"
              className="p-3 bg-transparent rounded-lg border border-gray-200 dark:border-gray-600 w-1/2 text-white"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
            />
            <input
              type="text"
              placeholder="Last Name"
              className="p-3 bg-transparent rounded-lg border border-gray-200 dark:border-gray-600 w-1/2 text-white"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
            />
          </div>

          <label
            htmlFor="profilePicUpload"
            className="cursor-pointer border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-200 py-3 px-4 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 w-full"
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
            <span className="text-sm text-slate-700 dark:text-gray-200">{selectedFile ? selectedFile.name : "Upload Profile Picture"}</span>
          </label>
          <input
            id="profilePicUpload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="submit"
            className="btn-primary w-full py-3 rounded-lg mt-1"
            disabled={uploading}
          >
            {uploading ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>

    </div>
  );
}