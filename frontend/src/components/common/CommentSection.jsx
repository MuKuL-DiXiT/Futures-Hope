import React from "react";
import { NavLink } from "react-router-dom";
import { Trash2, MessageCircle, Send } from "lucide-react";

export default function CommentSection({
  postId,
  comments = [],
  userData,
  currentUserId, // new optional prop for current user id
  newComment,
  setNewComment,
  addComment,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  submitReply,
  handleDeleteComment,
  loading = false,
}) {
  const currentUser = currentUserId || userData?.user?._id;

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 sm:pt-4 sm:mt-4 bg-gray-50 dark:bg-gray-950 rounded-lg p-2">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-4 h-4 text-blue-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Add a comment</label>
        </div>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts..."
          rows={3}
          className="h-12 sm:h-16 w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200"
        />
        <div className="flex justify-end mt-3 gap-2">
          <button
            onClick={() => addComment(postId)}
            disabled={!newComment?.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors duration-200 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed font-medium"
          >
            <Send className="w-4 h-4" />
            Post Comment
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 px-4 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            <MessageCircle className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((c) => {
            if (!c || !c.author) return null;
            return (
            <div key={c._id} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between mb-3">
                <NavLink to={`/people/${c.author?._id || '#'}`} className="flex gap-3 items-center justify-start hover:opacity-80 transition-opacity">
                  <img src={c.author?.profilePic || '/dummy.png'} alt="" className="w-9 h-9 object-cover rounded-full border border-gray-200 dark:border-gray-700" />
                  <div>
                    <span className="text-blue-500 font-semibold text-sm">@{c.author?.firstname || 'User'}</span>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Just now</p>
                  </div>
                </NavLink>
                {c.author?._id === currentUser && (
                  <button 
                    onClick={() => handleDeleteComment?.(c._id)} 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-md transition-colors duration-200"
                    title="Delete comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-gray-800 dark:text-gray-100 text-sm leading-relaxed mb-3 break-words">{c.content}</p>

              <div className="flex items-center gap-4 flex-wrap">
                {replyingTo !== c._id ? (
                  <button 
                    onClick={() => setReplyingTo(c._id)} 
                    className="text-xs text-green-500 hover:text-green-600 font-medium transition-colors duration-200 flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Reply
                  </button>
                ) : (
                  <div className="w-full">
                    <textarea 
                      value={replyText} 
                      onChange={(e) => setReplyText(e.target.value)} 
                      className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-none transition-all duration-200 text-sm" 
                      placeholder="Write a reply..." 
                      rows={2} 
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button 
                        onClick={() => setReplyingTo(null)} 
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs px-3 py-1.5 transition-colors duration-200 font-medium"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => submitReply(c._id)} 
                        disabled={!replyText?.trim()} 
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs px-4 py-1.5 rounded-lg transition-colors duration-200 font-medium flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Reply
                      </button>
                    </div>
                  </div>
                )}

                {c.replies?.length > 0 && (
                  <span className="text-xs text-blue-500 font-medium">{c.replies.length} {c.replies.length === 1 ? 'reply' : 'replies'}</span>
                )}
              </div>

              {c.replies?.length > 0 && (
                <div className="mt-4 ml-4 space-y-2 border-l-2 border-green-400 pl-4">
                  {c.replies.map((r) => {
                    if (!r || !r.author) return null;
                    return (
                    <div key={r._id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={r.author?.profilePic || '/dummy.png'} alt="" className="w-7 h-7 object-cover rounded-full" />
                        <span className="text-blue-500 font-semibold text-xs">@{r.author?.firstname || 'User'}</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed break-words">{r.content}</p>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
