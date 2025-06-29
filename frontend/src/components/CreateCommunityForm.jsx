import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateCommunityForm = () => {
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
  const [error, setError] = useState(null);

  const steps = [
    { id: 'name', title: "What's your community name?" },
    { id: 'description', title: "Describe your community" },
    { id: 'members', title: "Invite initial members" },
    { id: 'moderators', title: "Choose moderators" }
  ];

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
    const fetchBonds = async () => {
      try {
        const response = await secureFetch('/auth/bond/allBondsAndCommunities', {
          method: 'GET'
        });
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setBonds(data.bonds);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to fetch your connections');
        setIsLoading(false);
        console.error('Error fetching bonds:', err);
      }
    };
    fetchBonds();
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else handleSubmit();
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleCheckboxChange = (type, id) => {
    const updateList = (list, id) => list.includes(id) ? list.filter(i => i !== id) : [...list, id];
    if (type === 'member') setSelectedMembers(prev => updateList(prev, id));
    else setSelectedModerators(prev => updateList(prev, id));
  };

  const handleSubmit = async () => {
    const payload = new FormData();
    payload.append('name', formData.name);
    payload.append('description', formData.description);
    if (formData.profilePic) payload.append('profilePic', formData.profilePic);
    selectedMembers.forEach(id => payload.append('members', id));
    selectedModerators.forEach(id => payload.append('moderators', id));

    try {
      const navigate = useNavigate();
      await secureFetch('/auth/community', {
        method:"POST",
        body:payload,
      });
      alert('Community created successfully!');
      navigate(0);
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to create community');
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;
  const getInitials = (name) => name.split(' ').map(part => part[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-transparent">
      <div className="relative bg-black/20 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full border border-amber-100 shadow-lg overflow-hidden">
        <div className="mb-8">
          <div className="h-1.5 w-full bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <p className="text-xs text-amber-600 mt-1 text-right">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        <h1 className="text-3xl font-bold text-amber-900 mb-2 text-center font-serif">Build Your Community</h1>
        <p className="text-amber-600 text-center mb-8">Let's create something amazing together</p>

        <div className="relative min-h-[300px]">
          {currentStep === 0 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-amber-800 mb-6 text-center font-serif">{steps[0].title}</h2>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-amber-200 mb-4 bg-white/90 text-amber-900"
                placeholder="Community name"
                required
              />
              <label className="block text-sm text-amber-700 mb-2">Community Profile Picture</label>
              <input
                type="file"
                name="profilePic"
                accept="image/*"
                onChange={handleInputChange}
                className="w-full"
              />
              {formData.profilePic && (
                <img src={URL.createObjectURL(formData.profilePic)} alt="preview" className="mt-2 w-16 h-16 rounded-full border border-amber-200" />
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-amber-800 mb-6 text-center font-serif">{steps[1].title}</h2>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-3 rounded-lg border border-amber-200 bg-white/90 text-amber-900"
                placeholder="Community description"
                required
              ></textarea>
            </div>
          )}

          {currentStep === 2 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-amber-800 mb-6 text-center font-serif">{steps[2].title}</h2>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-4">{error}</div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {bonds.map(bond => (
                    <div key={bond._id} className="flex items-center p-3 rounded-lg bg-amber-50">
                      <input
                        id={`member-${bond._id}`}
                        type="checkbox"
                        checked={selectedMembers.includes(bond._id)}
                        onChange={() => handleCheckboxChange('member', bond._id)}
                        className="h-5 w-5 text-green-600"
                      />
                      <label htmlFor={`member-${bond._id}`} className="ml-3 text-sm text-amber-700 flex items-center">
                        <img src={bond.profilePic} alt="" className="w-10 h-10 rounded-full mr-3" />
                        {bond.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="animate-fadeIn">
              <h2 className="text-xl font-semibold text-amber-800 mb-6 text-center font-serif">{steps[3].title}</h2>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center py-4">{error}</div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {bonds.filter(bond => selectedMembers.includes(bond._id)).map(bond => (
                    <div key={bond._id} className="flex items-center p-3 rounded-lg bg-amber-50">
                      <input
                        id={`mod-${bond._id}`}
                        type="checkbox"
                        checked={selectedModerators.includes(bond._id)}
                        onChange={() => handleCheckboxChange('moderator', bond._id)}
                        className="h-5 w-5 text-green-600"
                      />
                      <label htmlFor={`mod-${bond._id}`} className="ml-3 text-sm text-amber-700 flex items-center">
                        <img src={bond.profilePic} className="w-8 h-8 rounded-full" />
                          
                        {bond.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-6">
          <button onClick={handlePrev} disabled={currentStep === 0} className="text-amber-700 hover:text-amber-900 text-sm">← Back</button>
          <button onClick={handleNext} className={`px-6 py-2 rounded-md text-sm font-medium text-white ${currentStep === steps.length - 1 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}>{currentStep === steps.length - 1 ? 'Create Community' : 'Continue →'}</button>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunityForm;
