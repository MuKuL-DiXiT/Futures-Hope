import { useState, useEffect, useCallback, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { gsap } from 'gsap'; // Import GSAP
import { Brain, Save, Plus, Trash2, Users, UserPlus, ShieldPlus, ChevronLeft, ChevronRight, Image as ImageIcon, MessageSquare, Tag, Info, XCircle } from 'lucide-react'; // Import more icons

const CreateCommunityForm = () => {
  const navigate = (path) => {
    console.log(`Would navigate to: ${path}`);
    console.log(`Navigation to ${path} (demo mode)`);
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [bonds, setBonds] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedModerators, setSelectedModerators] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    profilePic: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // GSAP Refs for animations
  const formContainerRef = useRef(null);
  const stepContentRef = useRef(null);
  const progressBarRef = useRef(null);

  const steps = [
    { id: 'name', title: "What's your community name?", icon: <Tag className="w-6 h-6 text-indigo-400" /> },
    { id: 'description', title: "Describe your community", icon: <MessageSquare className="w-6 h-6 text-purple-400" /> },
    { id: 'members', title: "Invite initial members", icon: <UserPlus className="w-6 h-6 text-emerald-400" /> },
    { id: 'moderators', title: "Choose moderators", icon: <ShieldPlus className="w-6 h-6 text-rose-400" /> }
  ];

  async function secureFetch(path, options = {}) {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const url = `${baseUrl}${path}`;

    const isFormData = options.body instanceof FormData;

    const headers = isFormData
      ? {}
      : { "Content-Type": "application/json", ...(options.headers || {}) };

    let res = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });

    if (res.status === 401) {
      try {
        const refresh = await fetch(`${baseUrl}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refresh.ok) {
          return fetch(url, {
            ...options,
            credentials: "include",
            headers,
          });
        } else {
          await fetch(`${baseUrl}/auth/logout`, {
            method: "GET",
            credentials: "include",
          });
          throw new Error("Session expired. Please log in again.");
        }
      } catch (refreshError) {
        throw new Error("Authentication failed. Please log in again.");
      }
    }
    return res;
  }

  useEffect(() => {
    const fetchBonds = async () => {
      try {
        setError(null);
        const userRes = await secureFetch("/auth/extractUser");
        const userInfo = await userRes.json();

        const res = await secureFetch("/auth/bond/allBondsAndCommunities");
        const data = await res.json();

        const rawBonds = Array.isArray(data.bonds) ? data.bonds : [];

        const formattedBonds = rawBonds.map(bond => {
          const otherUser = bond.requester._id === userInfo.user._id ? bond.receiver : bond.requester;
          return otherUser;
        });

        setBonds(formattedBonds);
        setIsLoading(false);

      } catch (err) {
        console.error('Error fetching bonds:', err);
        setError(`Failed to fetch your connections: ${err.message}`);
        setIsLoading(false);
      }
    };
    fetchBonds();
  }, []);

  // GSAP animation for form container on initial load
  useEffect(() => {
    if (formContainerRef.current) {
      gsap.fromTo(formContainerRef.current,
        { opacity: 0, y: 50, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" }
      );
    }
  }, []);

  // GSAP animation for step content transition
  useEffect(() => {
    if (stepContentRef.current) {
      gsap.fromTo(stepContentRef.current,
        { opacity: 0, x: currentStep > (currentStep - 1) ? 30 : -30 }, // Slide from right for next, left for prev
        { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
      );
    }
    // Animate progress bar
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, {
        width: `${((currentStep + 1) / steps.length) * 100}%`,
        duration: 0.5,
        ease: "power2.out"
      });
    }
  }, [currentStep]);

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setError(null);

    if (files && files[0]) {
      if (files[0].size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!files[0].type.startsWith('image/')) {
        setError('Please select a valid image file');
        toast.error('Please select a valid image file');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleCheckboxChange = (type, id) => {
    const updateList = (list, id) => list.includes(id) ? list.filter(i => i !== id) : [...list, id];
    if (type === 'member') {
      setSelectedMembers(prev => updateList(prev, id));
    } else {
      setSelectedModerators(prev => updateList(prev, id));
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        if (!formData.name.trim()) {
          setError('Community name is required');
          toast.error('Community name is required');
          return false;
        }
        if (formData.name.trim().length < 3) {
          setError('Community name must be at least 3 characters long');
          toast.error('Community name must be at least 3 characters long');
          return false;
        }
        break;
      case 1:
        if (!formData.description.trim()) {
          setError('Community description is required');
          toast.error('Community description is required');
          return false;
        }
        if (formData.description.trim().length < 10) {
          setError('Description must be at least 10 characters long');
          toast.error('Description must be at least 10 characters long');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('description', formData.description.trim());

      if (formData.profilePic) {
        payload.append('profilePic', formData.profilePic);
      }

      if (selectedMembers.length > 0) {
        selectedMembers.forEach(id => {
          payload.append('members', id);
        });
      }

      if (selectedModerators.length > 0) {
        selectedModerators.forEach(id => {
          payload.append('moderators', id);
        });
      }

      const response = await secureFetch('/auth/community', {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success('🎉 Community created successfully!');
      navigate('/communities');

    } catch (err) {
      if (err.message.includes('Authentication failed') || err.message.includes('Session expired')) {
        setError('Your session has expired. Please log in again.');
        toast.error('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.message.includes('already exists')) {
        setError('A community with this name already exists. Please choose a different name.');
        toast.error('A community with this name already exists. Please choose a different name.');
        setCurrentStep(0);
      } else {
        setError(err.message || 'Failed to create community. Please try again.');
        toast.error(err.message || 'Failed to create community. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name.trim().length >= 3;
      case 1:
        return formData.description.trim().length >= 10;
      default:
        return true;
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-indigo-700 font-semibold">Loading your connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-indigo-50 to-purple-100 font-inter">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div ref={formContainerRef} className="relative bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-10 max-w-lg w-full border border-indigo-200 shadow-2xl overflow-hidden transform transition-all duration-300">
        {/* Decorative background elements */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-indigo-200 rounded-full opacity-30 blur-xl"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-200 rounded-full opacity-30 blur-xl"></div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
              style={{ width: `${progressPercentage}%` }} // Initial width for GSAP
            ></div>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-right font-medium">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-indigo-800 mb-3 drop-shadow-sm">Build Your Community</h1>
          <p className="text-gray-700 text-lg font-light">Let's create something amazing together</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-xl text-sm flex items-center gap-3 shadow-md">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div ref={stepContentRef} className="relative min-h-[360px] mb-8 flex flex-col justify-center">
          {currentStep === 0 && (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center flex items-center justify-center gap-3">
                {steps[0].icon} {steps[0].title}
              </h2>
              <div className="space-y-5">
                <div>
                  <label htmlFor="communityName" className="block text-sm font-medium text-gray-700 mb-2">Community Name</label>
                  <input
                    id="communityName"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-400 focus:ring-3 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 shadow-sm"
                    placeholder="e.g., Eco Warriors, Book Lovers Club"
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {formData.name.length}/50 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="profilePic" className="block text-sm font-medium text-gray-700 mb-2">
                    Community Profile Picture (Optional)
                  </label>
                  <input
                    id="profilePic"
                    type="file"
                    name="profilePic"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors duration-200 shadow-sm"
                  />
                  {formData.profilePic && (
                    <div className="mt-4 flex items-center space-x-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <img
                        src={URL.createObjectURL(formData.profilePic)}
                        alt="Profile Preview"
                        className="w-16 h-16 rounded-full border-3 border-white object-cover shadow-md"
                      />
                      <div className="text-sm text-indigo-800">
                        <p className="font-semibold">{formData.profilePic.name}</p>
                        <p className="text-xs text-indigo-600">{Math.round(formData.profilePic.size / 1024)} KB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center flex items-center justify-center gap-3">
                {steps[1].icon} {steps[1].title}
              </h2>
              <div>
                <label htmlFor="communityDescription" className="block text-sm font-medium text-gray-700 mb-2">Community Description</label>
                <textarea
                  id="communityDescription"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="8"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-800 resize-none focus:ring-3 focus:ring-indigo-400 focus:border-transparent transition-all duration-200 shadow-sm"
                  placeholder="Tell people what your community is about, what activities you'll do, and what kind of members you're looking for..."
                  required
                  maxLength={500}
                ></textarea>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center flex items-center justify-center gap-3">
                {steps[2].icon} {steps[2].title}
              </h2>
              {bonds.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 text-lg font-medium">No connections found yet.</p>
                  <p className="text-sm text-gray-500 mt-2">You can create the community and invite members later!</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4 font-medium">
                    Select people from your connections to invite as initial members:
                  </p>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {bonds.map(bond => (
                      <div key={bond._id} className="flex items-center p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors duration-200 border border-indigo-100 shadow-sm">
                        <input
                          id={`member-${bond._id}`}
                          type="checkbox"
                          checked={selectedMembers.includes(bond._id)}
                          onChange={() => handleCheckboxChange('member', bond._id)}
                          className="h-5 w-5 text-purple-600 rounded-md focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
                        />
                        <label htmlFor={`member-${bond._id}`} className="ml-4 flex items-center cursor-pointer flex-1">
                          <img
                            src={bond.profilePic || 'https://placehold.co/40x40/E0E7FF/6366F1?text=U'} // Placeholder for user
                            alt={bond.firstname}
                            className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-white shadow-md"
                          />
                          <span className="text-base font-medium text-gray-800">
                            {bond.firstname} {bond.lastname}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-right">
                    Selected: <span className="font-semibold text-indigo-700">{selectedMembers.length}</span> member{selectedMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="w-full">
              <h2 className="text-2xl font-bold text-indigo-700 mb-6 text-center flex items-center justify-center gap-3">
                {steps[3].icon} {steps[3].title}
              </h2>
              {selectedMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 text-lg font-medium">No members selected to choose moderators from.</p>
                  <p className="text-sm text-gray-500 mt-2">You'll be the default moderator!</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4 font-medium">
                    Choose moderators from your selected members (optional):
                  </p>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {bonds.filter(bond => selectedMembers.includes(bond._id)).map(bond => (
                      <div key={bond._id} className="flex items-center p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors duration-200 border border-purple-100 shadow-sm">
                        <input
                          id={`mod-${bond._id}`}
                          type="checkbox"
                          checked={selectedModerators.includes(bond._id)}
                          onChange={() => handleCheckboxChange('moderator', bond._id)}
                          className="h-5 w-5 text-rose-600 rounded-md focus:ring-rose-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer"
                        />
                        <label htmlFor={`mod-${bond._id}`} className="ml-4 flex items-center cursor-pointer flex-1">
                          <img
                            src={bond.profilePic || 'https://placehold.co/32x32/E0E7FF/6366F1?text=U'} // Placeholder for user
                            className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-white shadow-md"
                            alt={bond.firstname}
                          />
                          <span className="text-base font-medium text-gray-800">
                            {bond.firstname} {bond.lastname}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-right">
                    Selected: <span className="font-semibold text-purple-700">{selectedModerators.length}</span> moderator{selectedModerators.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0 || isSubmitting}
            className="flex items-center px-5 py-2.5 text-gray-600 hover:text-gray-900 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting || !canProceed()}
            className={`px-8 py-3 rounded-full text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg ${currentStep === steps.length - 1
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800'
              : 'bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800'
              } flex items-center justify-center`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {currentStep === steps.length - 1 ? 'Create Community' : 'Continue'}
                {currentStep < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5" />
                )}
              </span>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default CreateCommunityForm;
