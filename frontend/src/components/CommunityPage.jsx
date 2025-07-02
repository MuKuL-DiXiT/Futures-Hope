import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { ImagePlay } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify'; // Import ToastContainer and toast
import 'react-toastify/dist/ReactToastify.css'; // Import toastify CSS

export default function CommunityProfile({ comId }) {
  const [community, setCommunity] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState(0);
  const [joinStatus, setJoinstatus] = useState(null);

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

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const  res  = await secureFetch(`/auth/community/${comId}`, { method:"GET"});
        const data = await res.json();
        setCommunity(data);
      } catch (error) {
        console.error('Failed to fetch community:', error);
      }
    };

    const fetchUser = async () => {
      try {
        const res = await secureFetch('/auth/extractUser',  {method:"GET"});
        const data = await res.json();
        setUserId(data.user._id);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    const fetchStatus = async () => {
      try {
        const res = await secureFetch(`/auth/community/${comId}/status`, {method:"GET"});
        const data = await res.json();
        setJoinstatus(data.status);
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    };

    const loadData = async () => {
      await Promise.all([fetchCommunity(), fetchUser(), fetchStatus()]);
      setIsLoading(false);
    };

    loadData();
  }, [comId]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('qr', selectedFile);

    try {
      await secureFetch(`/auth/community/${comId}/upload-qr`,{method:"POST", body:formData});
      toast.success('QR code uploaded successfully!'); // Toast notification
    } catch (err) {
      toast.error('QR upload failed: ' + (err.message || 'An error occurred.')); // Toast error
      console.error('QR upload failed', err);
    }
  };

  const uploadScreenshot = async (e) => {
    e.preventDefault(); // This will now correctly prevent default form submission
    const formData = new FormData();
    formData.append('screenShot', selectedFile);
    formData.append('amount', amount);
    formData.append('communityId', community._id);

    try {
      // Corrected secureFetch call
      const res = await secureFetch(`/auth/payment`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to process donation.');
      }

      toast.success("You won't regret donating!"); // Toast notification
      setAmount(0);
      setSelectedFile(null);
      // Manually reset file input value
      const fileInput = document.getElementById('screenshot-upload-input');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      toast.error('Donation failed: ' + (err.message || 'An error occurred.')); // Toast error
      console.error('Donation upload failed', err);
    }
  };

  const joinCommunity = async () => {
    try {
      await secureFetch(`/auth/community/${comId}/join`, { method:"POST" });
      toast.success(joinStatus === 'none' ? 'Joined community!' : 'Left community!'); // Dynamic toast
    } catch (err) {
      toast.error('Failed to join/leave community: ' + (err.message || 'An error occurred.')); // Toast error
      console.error('Failed to join community', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-amber-800 text-xl font-semibold">Community not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-4 sm:px-6 md:px-32 flex flex-col justify-center items-center bg-transparent">
      <ToastContainer /> {/* Toast container added here */}
      {/* Hero Section */}
      <div className="relative w-full max-w-7xl mx-auto rounded-b-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-800 via-green-700 to-emerald-800"></div>
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>

        {/* Organic Shape Overlay */}
        <div className="absolute inset-0">
          <svg viewBox="0 0 1200 600" className="w-full h-full">
            <path d="M0,300 C300,100 600,500 1200,200 L1200,600 L0,600 Z" fill="rgba(34, 197, 94, 0.1)" />
          </svg>
        </div>

        <div className="relative px-4 sm:px-8 py-10 sm:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12">
              {/* Profile Image */}
              <div className="relative group mb-6 lg:mb-0">
                <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-amber-400 to-green-400 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <div className="relative w-32 h-32 sm:w-48 sm:h-48 bg-white rounded-full p-2 sm:p-3 shadow-2xl">
                  <img
                    src={community.profilePic}
                    alt={community.name}
                    className="w-full h-full rounded-full object-cover border-4 border-green-100"
                  />
                </div>
              </div>

              {/* Community Info */}
              <div className="flex-1 w-full text-center lg:text-left">
                <div className='flex flex-col lg:flex-row lg:justify-between items-center lg:items-start gap-6'>
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
                      {community.name}
                      <div className="h-1 w-24 sm:w-32 bg-gradient-to-r from-amber-400 to-green-400 mx-auto lg:mx-0 mt-3 sm:mt-4 rounded-full"></div>
                    </h1>
                    <p className="text-base sm:text-xl text-green-100 leading-relaxed max-w-2xl mb-6 sm:mb-8">
                      {community.description}
                    </p>
                  </div>

                  {(community.creator._id !== userId) && (
                    <button
                      className='px-4 py-3 bg-white/30 backdrop-blur-md rounded-xl hover:shadow-white hover:shadow-xl transition-all duration-300 text-white font-medium whitespace-nowrap'
                      onClick={() => joinCommunity()}>
                      {joinStatus === 'none'
                        ? 'Join Us'
                        : joinStatus === 'pending'
                          ? 'Withdraw'
                          : 'Leave Community'}
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 sm:gap-6 justify-center lg:justify-start mt-6">
                  <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-white border-opacity-30 min-w-[100px]">
                    <div className="text-2xl sm:text-3xl font-bold text-white">{community.members.length}</div>
                    <div className="text-green-200 text-xs sm:text-sm">Members</div>
                  </div>
                  <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-white border-opacity-30 min-w-[100px]">
                    <div className="text-2xl sm:text-3xl font-bold text-white">{community.moderators?.length || 0}</div>
                    <div className="text-green-200 text-xs sm:text-sm">Guardians</div>
                  </div>

                  {(userId === community.creator._id) && (
                    <form onSubmit={handleSubmit} className='flex flex-col items-center gap-3 justify-center bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-white border-opacity-30'>
                      <label className="cursor-pointer inline-flex items-center gap-2 text-amber-200 hover:text-white transition-colors">
                        <ImagePlay className="w-5 h-5" />
                        <span className="font-medium text-xs sm:text-sm">Select QR Image</span>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <button type="submit" className="px-3 py-2 bg-white/30 text-white rounded-lg hover:bg-white/50 transition-colors text-xs sm:text-sm font-medium">
                        Upload QR Code
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-7xl mx-auto -mt-8 sm:-mt-16">
        {/* Creator Section */}
        <div className="mb-12">
          <div className="bg-gradient-to-br mb-8 from-amber-100 via-green-50 to-emerald-100 rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full -translate-y-16 translate-x-16 opacity-10"></div>
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-amber-400 to-green-400 rounded-full blur opacity-50"></div>
                <img
                  src={community.creator.profilePic || '/default-avatar.png'}
                  alt={community.creator.firstname}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.664 1.319a.75.75 0 01.672 0 41.059 41.059 0 008.198 5.424.75.75 0 01-.254 1.285 31.372 31.372 0 00-7.86 3.83.75.75 0 01-.84 0 31.508 31.508 0 00-2.08-1.287V9.394c0-.244.116-.463.302-.592a35.504 35.504 0 013.305-2.033.75.75 0 00-.714-1.319 37 37 0 00-3.446 2.12A2.216 2.216 0 006 9.393v.38a31.293 31.293 0 00-4.28-1.746.75.75 0 01-.254-1.285 41.059 41.059 0 008.198-5.424zM6 11.459a29.848 29.848 0 00-2.455-1.158 41.029 41.029 0 00-.39 3.114.75.75 0 00.419.74c.528.256 1.046.53 1.554.82-.21-.324-.438-.643-.676-.943a.75.75 0 112.946-1.416c.106.116.22.232.342.349.14.133.289.26.448.381.82.66 1.673 1.284 2.512 1.846.75.501 1.516.986 2.29 1.45.75.45 1.509.882 2.277 1.294.75.403 1.508.79 2.275 1.16.75.361 1.509.706 2.275 1.035.75.322 1.508.628 2.275.918.75.284 1.508.553 2.275.805.75.247 1.508.477 2.275.693.75.212 1.508.408 2.275.587.75.176 1.508.335 2.275.478.75.14 1.508.264 2.275.371.75.105 1.508.193 2.275.264.75.07 1.508.123 2.275.158.75.034 1.508.052 2.275.052.75 0 1.508-.018 2.275-.052z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold text-amber-900 mb-2">
                  {community.creator.firstname} {community.creator.lastname}
                </h3>
                <p className="text-green-700 font-medium mb-4 text-sm sm:text-base">{community.creator.email}</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-xs font-semibold">👑 Founder</span>
                  <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-semibold">🌱 Visionary</span>
                  <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-xs font-semibold">💫 Leader</span>
                </div>
              </div>
            </div>
          </div>

          {(community.qrCodeUrl) && (
            <div className="mb-12">
              <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white border-opacity-50">
                <h3 className="text-xl sm:text-2xl font-bold text-amber-900 mb-6 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Support Our Mission
                </h3>

                <div className="flex flex-col lg:flex-row items-start gap-6">
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-green-400 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
                    <img
                      src={community.qrCodeUrl}
                      alt="Community QR Code"
                      className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl shadow-lg border-4 border-white"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <p className="text-amber-800 mb-4 text-sm sm:text-base">Scan this QR code to make a donation and help us grow our community! Upload screenshot after donating</p>
                    <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">🌱 Plant Trees</span>
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">🌍 Save Environment</span>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">💚 Community Growth</span>
                    </div>
                    <form onSubmit={uploadScreenshot} className='flex flex-col sm:flex-row bg-green-900/40 p-3 rounded-xl gap-3 sm:gap-4'>
                      <input
                        type="number" // Changed type to number
                        placeholder='Amount (INR)'
                        value={amount === 0 ? '' : amount} // Handle 0 for display
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} // Parse as float
                        className='bg-amber-100 rounded-full text-amber-800 focus:outline-none text-center placeholder-amber-700 focus:ring-0 ring-0 border-none px-3 py-2 text-sm flex-1'
                        required // Made required
                      />
                      <label className='bg-green-100 text-green-800 rounded-full flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-green-200 transition-colors'>
                        <span className="font-medium text-sm">Select Screenshot</span>
                        <ImagePlay className="w-4 h-4" />
                        <input
                          type="file"
                          id="screenshot-upload-input" // Added ID
                          onChange={handleFileChange}
                          className="hidden"
                          accept="image/*" // Restrict to images
                          required // Made required
                        />
                      </label>
                      <button type='submit' className='bg-amber-100 text-amber-800 rounded-full px-4 py-2 hover:bg-amber-200 transition-colors text-sm font-medium'>
                        Submit
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Moderators Section */}
        {community.moderators?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-amber-900 mb-8 text-center">
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Community Guardians
              </span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {community.moderators.map((mod, index) => (
                <div key={mod._id} className="group relative overflow-hidden bg-white bg-opacity-70 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-lg border border-white border-opacity-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full -translate-y-12 translate-x-12 opacity-10 group-hover:opacity-20 transition-opacity"></div>

                  <div className="relative flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={mod.profilePic || '/default-avatar.png'}
                        alt={mod.firstname}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-3 border-green-200 shadow-md"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                        <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-amber-900 mb-1">
                        {mod.firstname} {mod.lastname}
                      </h3>
                      <p className="text-green-700 text-xs sm:text-sm mb-2">{mod.email}</p>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">🛡️ Guardian</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Section */}
        <div className="pb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-amber-900 mb-8 text-center">
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Our Growing Family
            </span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {community.members.map((member, index) => (
              <div key={member._id} className="group relative overflow-hidden bg-white bg-opacity-60 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-lg border border-white border-opacity-40 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-400 opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl"></div>

                <div className="relative">
                  <div className="relative inline-block mb-3 sm:mb-4">
                    <img
                      src={member.profilePic || '/default-avatar.png'}
                      alt={member.firstname}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto object-cover border-3 border-green-200 shadow-lg group-hover:border-green-300 transition-colors"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-amber-900 mb-2 group-hover:text-green-800 transition-colors">
                    {member.firstname} {member.lastname}
                  </h3>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">🌿 Member</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes tilt {
          0%, 50%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(1deg); }
          75% { transform: rotate(-1deg); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        
        .animate-tilt {
          animation: tilt 10s infinite linear;
        }
      `}</style>
    </div>
  );
}
