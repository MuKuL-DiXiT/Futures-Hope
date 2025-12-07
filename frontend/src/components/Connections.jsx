import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { UserCheck, Users2, Heart, Globe } from "lucide-react";
import secureFetch from "../utils/secureFetch";

export default function BondAndCommunityPanel() {
  const [bonds, setBonds] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

 


  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const userRes = await secureFetch("/auth/extractUser");
        const userInfo = await userRes.json();
        setCurrentUserId(userInfo.user._id);

        const res = await secureFetch("/auth/bond/allBondsAndCommunities");
        const data = await res.json();

        const rawBonds = Array.isArray(data.bonds) ? data.bonds : [];
        const rawCommunities = Array.isArray(data.communities) ? data.communities : [];

        const formattedBonds = rawBonds.map(bond => {
          const otherUser = bond.requester._id === userInfo.user._id ? bond.receiver : bond.requester;
          return otherUser;
        });

        setBonds(formattedBonds);
        setCommunities(rawCommunities);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white text-lg">Loading your connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent w-full sm:px-32 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-green-700 dark:text-green-400 mb-4   ">
            Your Network
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Connect with friends and explore communities that share your interests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-r from-amber-100 to-green-100 dark:from-amber-900/40 dark:to-green-900/40 backdrop-blur-sm border border-blue-200 dark:border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-300 text-sm font-medium uppercase tracking-wider">Total Bonds</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{bonds.length}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-500/20 p-3 rounded-full">
                <Heart className="w-8 h-8 text-green-600 dark:text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-100 to-amber-100 dark:from-green-900/40 dark:to-amber-900/40 backdrop-blur-sm border border-purple-200 dark:border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 dark:text-purple-300 text-sm font-medium uppercase tracking-wider">Communities</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{communities.length}</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-500/20 p-3 rounded-full">
                <Globe className="w-8 h-8 text-teal-600 dark:text-teal-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Bonds Section */}
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 dark:bg-blue-500/20 p-2 rounded-lg">
                <UserCheck className="w-6 h-6 text-teal-600 dark:text-teal-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Bonds</h2>
            </div>

            {bonds.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 dark:bg-gray-700/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No bonds yet</p>
                <p className="text-gray-500 text-sm">Start connecting with people to build meaningful relationships</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                {bonds.map((user, index) => (
                  <NavLink 
                    to={`/people/${user._id}`}
                    key={user._id} 
                    className="group flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="relative">
                      <img
                        src={user.profilePic || '/default-avatar.png'}
                        alt={`${user.firstname}'s profile`}
                        className="w-14 h-14 rounded-full object-cover border-2 border-blue-400/50 group-hover:border-blue-400 transition-colors"
                        onError={(e) => {
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 dark:text-white font-semibold text-lg group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        {user.firstname} {user.lastname}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Connected friend</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Communities Section */}
          <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-100 dark:bg-purple-500/20 p-2 rounded-lg">
                <Users2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Communities</h2>
            </div>

            {communities.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 dark:bg-gray-700/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No communities joined yet</p>
                <p className="text-gray-500 text-sm">Discover and join communities that match your interests</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                {communities.map((com, index) => (
                  <NavLink
                    to={`/community/${com._id}`}
                    key={com._id} 
                    className="group flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="relative">
                      <img
                        src={com.profilePic || '/default-community.png'}
                        alt={`${com.name} community`}
                        className="w-14 h-14 rounded-full object-cover border-2 border-purple-400/50 group-hover:border-purple-400 transition-colors"
                        onError={(e) => {
                          e.target.src = '/default-community.png';
                        }}
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                        <Users2 className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-gray-900 dark:text-white font-semibold text-lg group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors">
                        {com.name}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{(com.creator == currentUserId)?"Community Founder" :"Community member"}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(75, 85, 99, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }
      `}</style>
      
    </div>
  );
}