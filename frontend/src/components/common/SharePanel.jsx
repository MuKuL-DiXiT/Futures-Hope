import React from "react";
import { Share2, Search, Users, Send } from "lucide-react";

export default function SharePanel({
  shareSearch,
  setShareSearch,
  results = { users: [], community: [] },
  selectedUsers = [],
  toggleSelect,
  onShare,
}) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4 bg-gray-50 dark:bg-gray-950 rounded-b-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-4 h-4 text-blue-500" />
        <h4 className="font-semibold text-gray-900 dark:text-white">Share with connections</h4>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={shareSearch}
          onChange={(e) => setShareSearch(e.target.value)}
          placeholder="Search users or communities..."
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200"
        />
      </div>


      {shareSearch !== "" && (
        <div className="space-y-2 mb-4">
          {results.users?.length === 0 && results.community?.length === 0 ? (
            <div className="text-center py-6 px-4 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">No users or communities found</p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {results.users?.map((u) => (
                <label key={u._id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group">
                  <div className="flex items-center gap-3 flex-1">
                    <img src={u.profilePic || '/dummy.png'} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{u.firstname} {u.lastname}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={!!selectedUsers.find((sel) => sel._id === u._id)} 
                    onChange={() => toggleSelect(u)} 
                    className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer" 
                  />
                </label>
              ))}

              {results.community?.map((u) => (
                <label key={u._id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group">
                  <div className="flex items-center gap-3 flex-1">
                    <img src={u.profilePic || '/dummyGroup.png'} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{u.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Community</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={!!selectedUsers.find((sel) => sel._id === u._id)} 
                    onChange={() => toggleSelect(u)} 
                    className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer" 
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <button 
        onClick={onShare} 
        disabled={selectedUsers.length === 0} 
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm"
      >
        <Send className="w-4 h-4" />
        Share with {selectedUsers.length} {selectedUsers.length === 1 ? 'recipient' : 'recipients'}
      </button>
    </div>
  );
}
