import { useState, useEffect } from 'react';

const CreateCommunityForm = () => {
  // Mock navigate function for demo
  const navigate = (path) => {
    console.log(`Would navigate to: ${path}`);
    alert(`Navigation to ${path} (demo mode)`);
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

  const steps = [
    { id: 'name', title: "What's your community name?" },
    { id: 'description', title: "Describe your community" },
    { id: 'members', title: "Invite initial members" },
    { id: 'moderators', title: "Choose moderators" }
  ];

  async function secureFetch(path, options = {}) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const url = `${baseUrl}${path}`;

  // Prevent forcing Content-Type if it's FormData
  const isFormData = options.body instanceof FormData;

  const headers = isFormData
    ? {} // Let browser set the headers
    : { "Content-Type": "application/json", ...(options.headers || {}) };

  let res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (res.status === 401) {
    console.log('Session expired, attempting refresh...');
    try {
      const refresh = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refresh.ok) {
        console.log('Session refreshed successfully');
        return fetch(url, {
          ...options,
          credentials: "include",
          headers,
        });
      } else {
        console.log('Refresh failed, logging out...');
        await fetch(`${baseUrl}/auth/logout`, {
          method: "GET",
          credentials: "include",
        });
        throw new Error("Session expired. Please log in again.");
      }
    } catch (refreshError) {
      console.error('Error during refresh:', refreshError);
      throw new Error("Authentication failed. Please log in again.");
    }
  }

  return res;
}


  useEffect(() => {
    const fetchBonds = async () => {
      try {
        setError(null);
        const response = await secureFetch("/auth/bond/allBondsAndCommunities");
        if (!response.ok) {
          throw new Error(`Failed to fetch bonds: ${response.status}`);
        }
        const data = await response.json();

        if (!data.bonds || !Array.isArray(data.bonds)) {
          throw new Error('Invalid bonds data received');
        }

        const userRes = await secureFetch("/auth/extractUser");
        if (!userRes.ok) {
          throw new Error(`Failed to fetch user: ${userRes.status}`);
        }
        const userData = await userRes.json();
        const currUserId = userData._id;

        const filteredBonds = data.bonds
          .filter(bond => bond && bond.requester && bond.receiver) // Filter out invalid bonds
          .map(bond => {
            const isRequester = bond.requester._id === currUserId;
            const otherUser = isRequester ? bond.receiver : bond.requester;
            return otherUser;
          })
          .filter(user => user && user._id); // Filter out invalid users

        setBonds(filteredBonds);
        setIsLoading(false);

      } catch (err) {
        console.error('Error fetching bonds:', err);
        setError(`Failed to fetch your connections: ${err.message}`);
        setIsLoading(false);
      }
    };
    fetchBonds();
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setError(null); // Clear error when user makes changes
    
    if (files && files[0]) {
      // Validate file size (e.g., max 5MB)
      if (files[0].size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      // Validate file type
      if (!files[0].type.startsWith('image/')) {
        setError('Please select a valid image file');
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
          return false;
        }
        if (formData.name.trim().length < 3) {
          setError('Community name must be at least 3 characters long');
          return false;
        }
        break;
      case 1:
        if (!formData.description.trim()) {
          setError('Community description is required');
          return false;
        }
        if (formData.description.trim().length < 10) {
          setError('Description must be at least 10 characters long');
          return false;
        }
        break;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Starting community creation...');
      console.log('Form data:', {
        name: formData.name,
        description: formData.description,
        hasProfilePic: !!formData.profilePic,
        selectedMembers: selectedMembers.length,
        selectedModerators: selectedModerators.length
      });
      
      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('description', formData.description.trim());
      
      if (formData.profilePic) {
        payload.append('profilePic', formData.profilePic);
      }
      
      // Handle members array properly
      if (selectedMembers.length > 0) {
        selectedMembers.forEach(id => {
          payload.append('members', id);
        });
      }
      
      // Handle moderators array properly  
      if (selectedModerators.length > 0) {
        selectedModerators.forEach(id => {
          payload.append('moderators', id);
        });
      }

      console.log('Making request to create community...');

      const response = await secureFetch('/auth/community', {
        method: "POST",
        body: payload,
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || `Server error: ${response.status}`;
        }
        console.error('Server error:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Community created successfully:', result);
      
      // Show success message and navigate
      alert('🎉 Community created successfully!');
      navigate('/communities');
      
    } catch (err) {
      console.error('Error creating community:', err);
      
      // Handle different types of errors
      if (err.message.includes('Authentication failed') || err.message.includes('Session expired')) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.message.includes('already exists')) {
        setError('A community with this name already exists. Please choose a different name.');
        setCurrentStep(0); // Go back to name step
      } else {
        setError(err.message || 'Failed to create community. Please try again.');
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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-green-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-amber-700">Loading your connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-green-100">
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full border border-amber-200 shadow-xl overflow-hidden">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-amber-600 mt-2 text-right">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2 font-serif">Build Your Community</h1>
          <p className="text-amber-700">Let's create something amazing together</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        <div className="relative min-h-[320px] mb-8">
          {currentStep === 0 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-amber-800 mb-6 text-center font-serif">
                {steps[0].title}
              </h2>
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-amber-200 bg-white/90 text-amber-900 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Enter community name..."
                    required
                    maxLength={50}
                  />
                  <p className="text-xs text-amber-600 mt-1">
                    {formData.name.length}/50 characters
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-amber-700 mb-2">
                    Community Profile Picture (Optional)
                  </label>
                  <input
                    type="file"
                    name="profilePic"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white/90 text-amber-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  {formData.profilePic && (
                    <div className="mt-3 flex items-center space-x-3">
                      <img 
                        src={URL.createObjectURL(formData.profilePic)} 
                        alt="Preview" 
                        className="w-12 h-12 rounded-full border-2 border-amber-200 object-cover" 
                      />
                      <div className="text-xs text-amber-600">
                        <p className="font-medium">{formData.profilePic.name}</p>
                        <p>{Math.round(formData.profilePic.size / 1024)}KB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-amber-800 mb-6 text-center font-serif">
                {steps[1].title}
              </h2>
              <div>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="6"
                  className="w-full px-4 py-3 rounded-lg border border-amber-200 bg-white/90 text-amber-900 resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Tell people what your community is about, what activities you'll do, and what kind of members you're looking for..."
                  required
                  maxLength={500}
                ></textarea>
                <p className="text-xs text-amber-600 mt-1 text-right">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-amber-800 mb-6 text-center font-serif">
                {steps[2].title}
              </h2>
              {bonds.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-amber-600 mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <p>No connections found yet.</p>
                    <p className="text-sm mt-2">You can create the community and invite members later!</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-amber-600 mb-4">
                    Select people from your connections to invite as initial members:
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {bonds.map(bond => (
                      <div key={bond._id} className="flex items-center p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                        <input
                          id={`member-${bond._id}`}
                          type="checkbox"
                          checked={selectedMembers.includes(bond._id)}
                          onChange={() => handleCheckboxChange('member', bond._id)}
                          className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <label htmlFor={`member-${bond._id}`} className="ml-3 flex items-center cursor-pointer flex-1">
                          <img 
                            src={bond.profilePic || '/api/placeholder/40/40'} 
                            alt="" 
                            className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-white shadow-sm" 
                          />
                          <span className="text-sm font-medium text-amber-800">
                            {bond.firstname} {bond.lastname}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-3">
                    Selected: {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-amber-800 mb-6 text-center font-serif">
                {steps[3].title}
              </h2>
              {selectedMembers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-amber-600">
                    <svg className="w-16 h-16 mx-auto mb-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                    <p>No members selected to choose moderators from.</p>
                    <p className="text-sm mt-2">You'll be the default moderator!</p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-amber-600 mb-4">
                    Choose moderators from your selected members (optional):
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {bonds.filter(bond => selectedMembers.includes(bond._id)).map(bond => (
                      <div key={bond._id} className="flex items-center p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                        <input
                          id={`mod-${bond._id}`}
                          type="checkbox"
                          checked={selectedModerators.includes(bond._id)}
                          onChange={() => handleCheckboxChange('moderator', bond._id)}
                          className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <label htmlFor={`mod-${bond._id}`} className="ml-3 flex items-center cursor-pointer flex-1">
                          <img 
                            src={bond.profilePic || '/api/placeholder/32/32'} 
                            className="w-8 h-8 rounded-full mr-3 object-cover border-2 border-white shadow-sm" 
                            alt=""
                          />
                          <span className="text-sm font-medium text-amber-800">
                            {bond.firstname} {bond.lastname}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-3">
                    Selected: {selectedModerators.length} moderator{selectedModerators.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button 
            onClick={handlePrev} 
            disabled={currentStep === 0 || isSubmitting} 
            className="flex items-center px-4 py-2 text-amber-700 hover:text-amber-900 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          
          <button 
            onClick={handleNext} 
            disabled={isSubmitting || !canProceed()}
            className={`px-6 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              currentStep === steps.length - 1 
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-lg' 
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
              </span>
            ) : (
              <span className="flex items-center">
                {currentStep === steps.length - 1 ? 'Create Community' : 'Continue'}
                {currentStep < steps.length - 1 && (
                  <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CreateCommunityForm;