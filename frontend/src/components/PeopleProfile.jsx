import React, { useState, useEffect, useCallback } from "react";
import { Heart, Share2, MessageCircle, X, Trash, Send } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

export default function PeopleProfile({ userId }) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCaptions, setExpandedCaptions] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [activeSharePost, setActiveSharePost] = useState(null);
  const [shareRecipients, setShareRecipients] = useState([]);
  const [usersToShare, setUsersToShare] = useState({ users: [], community: [] }); // Initialize as an object
  const [shareSearchTerm, setShareSearchTerm] = useState("");
  const [profilePicExpanded, setProfilePicExpanded] = useState(false);
  const [BondStatus, setBondStatus] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState(null);

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
    const checkBondStatus = async () => {
      try {
        const res = await secureFetch(`/auth/bond/status/${userId}`, {
          method: "GET",
        });
        if (res.ok) {
          const data = await res.json();
          setBondStatus(data);
        }
      } catch (error) {
        console.error("Error checking bond status:", error);
      }
    };

    if (userId) {
      checkBondStatus();
    }
  }, [userId]);

  const toggleBond = async () => {
    const res = await secureFetch(`/auth/bond/toggle/${userId}`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.bond)
        setBondStatus({ status: data.bond.status, requester: data.bond.requester });
      else setBondStatus({});
    }
  };


  useEffect(() => {
    if (!userId) {
      setIsInitialLoading(false); // If no userId, no user to fetch, so loading is done
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await secureFetch(`/auth/people/${userId}`, { method: "GET" });
        const data = await res.json();
        setUserData(data.user);
        if (data.user) {
          fetchPosts(data.user._id);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  // Fetch posts of user
  const fetchPosts = async (userId) => {
    try {
      setLoading(true);
      const res = await secureFetch(`/auth/posts/getUserPosts/${userId}`, {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);

        // Fetch liked status for each post
        const likedStatus = {};
        await Promise.all(
          data.map(async (post) => {
            const resLike = await secureFetch(`/auth/posts/${post._id}/liked`, {
              method: "GET",
            });
            if (resLike.ok) {
              const result = await resLike.json();
              likedStatus[post._id] = result.liked;
            } else {
              likedStatus[post._id] = false;
            }
          })
        );
        setLikedPosts(likedStatus);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expandedPostId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [expandedPostId]);

  // Like or unlike a post
  const togglePostLike = async (postId) => {
    try {
      const isLiked = likedPosts[postId];
      const endpoint = isLiked ? "unlike" : "like";

      const res = await secureFetch(`/auth/posts/${postId}/${endpoint}`, {
        method: "POST",
      });

      if (res.ok) {
        setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? { ...post, likesCount: post.likesCount + (isLiked ? -1 : 1) }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error toggling post like:", error);
    }
  };

  const toggleCaption = (id) => {
    setExpandedCaptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Comments Logic ---

  // Fetch comments for a post
  const fetchComments = useCallback(async (postId) => {
    if (!postId) return;
    setCommentLoading(true);
    try {
      const res = await secureFetch(`/auth/posts/${postId}/comments`, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
      console.error("Error fetching comments:", e);
    } finally {
      setCommentLoading(false);
    }
  }, []);

  // When activeCommentPost changes, fetch comments
  useEffect(() => {
    if (activeCommentPost) {
      fetchComments(activeCommentPost);
      setNewCommentText("");
      setReplyingTo(null);
      setReplyText("");
    } else {
      setComments([]);
    }
  }, [activeCommentPost, fetchComments]);

  // Add a new comment
  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    try {
      const res = await secureFetch(`/auth/posts/${activeCommentPost}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newCommentText.trim() }),
      });
      if (res.ok) {
        setNewCommentText("");
        fetchComments(activeCommentPost);
        // Update posts comments count
        setPosts((prev) =>
          prev.map((post) =>
            post._id === activeCommentPost
              ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Start replying to a comment
  const startReply = (commentId) => {
    setReplyingTo(commentId);
    setReplyText("");
  };

  // Cancel replying
  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  // Submit a reply to a comment
  const handleReplySubmit = async () => {
    if (!replyText.trim() || !replyingTo) return;

    try {
      const res = await secureFetch(
        `/auth/posts/${activeCommentPost}/comment/${replyingTo}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyText.trim() }),
        }
      );
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        fetchComments(activeCommentPost);
        // Update posts comments count
        setPosts((prev) =>
          prev.map((post) =>
            post._id === activeCommentPost
              ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error replying to comment:", error);
    }
  };

  // Delete a comment (only own)
  const handleDeleteComment = async (commentId) => {
    // IMPORTANT: Replaced window.confirm with a console log as per instructions.
    // In a real application, you would use a custom modal for confirmation.
    console.log("Delete confirmation: Are you sure you want to delete this comment? This action cannot be undone.");

    try {
      const res = await secureFetch(
        `/auth/posts/comment/${commentId}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        fetchComments(activeCommentPost);
        // Update posts comments count
        setPosts((prev) =>
          prev.map((post) =>
            post._id === activeCommentPost
              ? { ...post, commentsCount: (post.commentsCount || 0) - 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  // --- Share Logic ---

  // Fetch users for sharing (with optional search)
  const shareSearchUsers = async () => {
    try {
      // Changed endpoint from /auth/users to /auth/posts/searchShare/bonds as per Profile.jsx
      const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${encodeURIComponent(shareSearchTerm)}`, {
        method: "GET",
      });
      const data = await res.json();
      setUsersToShare({
        users: Array.isArray(data.users) ? data.users : [],
        community: Array.isArray(data.community) ? data.community : [],
      });
    } catch (err) {
      console.error("Error in shareSearchUsers:", err);
      setUsersToShare({ users: [], community: [] }); // Reset on error
    }
  };

  useEffect(() => {
    if (activeSharePost) {
      shareSearchUsers();
      setShareRecipients([]);
      setShareSearchTerm("");
    }
  }, [activeSharePost, shareSearchTerm]); // Add shareSearchTerm to dependency array

  // Handle user search input change
  const handleShareSearchChange = (e) => {
    const val = e.target.value;
    setShareSearchTerm(val);
  };

  // Toggle share recipient selection - adapted to handle both users and communities
  const toggleShareRecipient = (userOrCommunity) => {
    setShareRecipients((prev) =>
      prev.find((u) => u._id === userOrCommunity._id)
        ? prev.filter((u) => u._id !== userOrCommunity._id)
        : [...prev, userOrCommunity]
    );
  };

  // Submit share request - adapted to map recipients by _id
  const handleShareSubmit = async () => {
    if (shareRecipients.length === 0) return;
    try {
      const res = await secureFetch(`/auth/posts/${activeSharePost}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: shareRecipients.map((u) => u._id) }), // Changed to recipients: shareRecipients.map((u) => u._id)
      });
      if (res.ok) {
        // IMPORTANT: Replaced alert with a console log as per instructions.
        // In a real application, you would use a custom message box.
        console.log(`Post shared with ${shareRecipients.length} user(s)!`);
        setActiveSharePost(null);
        setShareRecipients([]);
      }
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };


  if (isInitialLoading || !userData) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-white">
        <div className="flex justify-center items-center h-40">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sendMessage = async (targetId) => {
    setLoading(true);
    try {
      const response = await secureFetch(`/auth/chat/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId }),
      });
      if (response.ok) {
        const data = await response.json();
        navigate('/messages', { state: { chat: data } });
      }
    } catch (error) {
      console.error("Couldn't create/fetch chat:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    // Main container adjusted for desktop sidebar offset and overall centering
    // Removed px-4 sm:px-6 md:px-32 to allow for full width control
    // Added md:pl-20 to account for the fixed desktop navbar width (w-20 from Navbar.jsx)
    <div className="min-h-screen w-full bg-white flex flex-col items-center relative md:pl-20 pb-14 md:pb-0">
      {/* User Info Header - Aligned like Instagram */}
      <div className="w-full max-w-4xl px-4 sm:px-6 md:px-8 py-8 flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-6 border-b border-gray-200">
        <div className="flex-shrink-0 relative group w-32 h-32 md:w-40 md:h-40">
          {/* Removed glowing effect for cleaner Instagram-like aesthetic */}
          <img
            onClick={() => setProfilePicExpanded(!profilePicExpanded)}
            src={userData.profilePic || '/default-avatar.png'} // Fallback for profile pic
            alt={userData.firstname}
            className={`relative z-10 rounded-full object-cover border-2 border-gray-300 cursor-pointer transition-all duration-300 ${profilePicExpanded ? "w-full h-full" : "w-full h-full"
              }`}
          />
        </div>
        
        <div className="flex flex-col items-center md:items-start md:ml-10 flex-grow">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="font-semibold text-2xl text-gray-800">
              {userData.username || `${userData.firstname} ${userData.lastname}`.trim()}
            </h1>
            {/* Bond Button */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleBond}
                className="bg-blue-500 text-white text-sm font-medium py-1.5 px-4 rounded-md hover:bg-blue-600 transition-colors"
              >
                {BondStatus.status ? (
                  BondStatus.status === "accepted" ? (
                    <span>Unbond</span>
                  ) : BondStatus.requester === userId ? (
                    <span>Accept</span>
                  ) : (
                    <span>Withdraw</span>
                  )
                ) : (
                  <span>Bond</span>
                )}
              </button>

              {BondStatus.status === "accepted" && (
                <button
                  onClick={() => sendMessage(userId)}
                  className="bg-gray-200 text-gray-700 text-sm font-medium py-1.5 px-4 rounded-md hover:bg-gray-300 transition-colors flex items-center"
                >
                  Message <Send className="inline w-4 h-4 ml-1" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-8 mb-4">
            <div className="flex items-center text-gray-800">
              <span className="font-semibold text-lg">{posts.length}</span>
              <span className="text-sm ml-1">posts</span>
            </div>
            {/* Bond and Community counts are not directly available for other users in this component's state */}
            {/* If you want to show these, you'd need to fetch them specifically for the 'userId' */}
          </div>
          
          {/* User Full Name and Bio (if available) */}
          <p className="font-semibold text-gray-800 text-left w-full">
            {userData.firstname} {userData.lastname}
          </p>
          {userData.bio && (
            <p className="text-gray-600 text-sm mt-1 text-left w-full">
              {userData.bio}
            </p>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-400 italic text-sm py-10">
            No posts yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.map((post) => (
              <div
                key={post._id}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPostId(post._id);
                }}
                className="cursor-pointer transition-all duration-300 overflow-hidden aspect-square relative group"
              >
                {/* Media */}
                {post.media?.url && (
                  post.media.type === "photo" ? (
                    <img
                      src={post.media.url}
                      className="w-full h-full object-cover"
                      alt="Post"
                    />
                  ) : (
                    <video
                      src={post.media.url}
                      className="w-full h-full object-cover"
                    />
                  )
                )}
                {/* Overlay for likes/comments on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center text-white font-bold">
                    <Heart fill="white" size={20} className="mr-1" />
                    <span>{post.likesCount || 0}</span>
                  </div>
                  <div className="flex items-center text-white font-bold">
                    <MessageCircle fill="white" size={20} className="mr-1" />
                    <span>{post.commentsCount || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Post Modal */}
      {expandedPostId && (() => {
        const post = posts.find(p => p._id === expandedPostId);
        if (!post) return null; // Should not happen if expandedPostId is valid

        const isLiked = likedPosts[post._id];
        const isCommentOpen = activeCommentPost === post._id;
        const isShareOpen = activeSharePost === post._id;

        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-lg shadow-lg relative flex flex-col">
              <button
                onClick={() => {
                  setExpandedPostId(null);
                  setActiveCommentPost(null);
                  setActiveSharePost(null);
                }}
                className="absolute top-2 right-2 text-gray-700 hover:text-gray-900 z-10 p-1 rounded-full bg-white/50 hover:bg-white"
              >
                <X size={24} />
              </button>

              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                <div className="md:w-1/2 bg-black flex items-center justify-center">
                  {post.media.type === "photo" ? (
                    <img
                      src={post.media.url}
                      className="w-full h-full object-contain max-h-[500px]"
                      alt="Post media"
                    />
                  ) : (
                    <video
                      src={post.media.url}
                      controls
                      className="w-full h-full object-contain max-h-[500px]"
                    />
                  )}
                </div>

                <div className="md:w-1/2 p-4 space-y-4 overflow-y-auto max-h-[90vh] flex flex-col">
                  {/* User Info in Modal */}
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <img src={post.user.profilePic || '/default-avatar.png'} className="w-10 h-10 rounded-full object-cover" alt="User profile" />
                    <span className="font-semibold text-gray-800">
                      {post.user.username || `${post.user.firstname} ${post.user.lastname}`.trim()}
                    </span>
                  </div>

                  {/* Caption */}
                  {post.caption && (
                    <div className="mb-2 text-gray-700 text-sm">
                      <span className="font-semibold mr-1">{post.user.username || `${post.user.firstname} ${post.user.lastname}`.trim()}</span>
                      {expandedCaptions[post._id] || post.caption.length < 150 ? (
                        <span>{post.caption}</span>
                      ) : (
                        <span>
                          {post.caption.substring(0, 150)}...
                          <button
                            onClick={() => toggleCaption(post._id)}
                            className="text-blue-500 hover:text-blue-700 ml-1"
                          >
                            more
                          </button>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-6 text-sm text-gray-700 py-3 border-y border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePostLike(post._id);
                      }}
                      className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors"
                    >
                      <Heart
                        fill={isLiked ? "green" : "none"}
                        className={isLiked ? "text-green-700" : "text-gray-700"}
                        size={20}
                      />
                      <span>{post.likesCount || 0}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCommentPost(isCommentOpen ? null : post._id);
                        setActiveSharePost(null); // Close share if opening comments
                      }}
                      className="flex items-center gap-1 text-gray-700 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle size={20} />
                      <span>{post.commentsCount || 0}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSharePost(isShareOpen ? null : post._id);
                        setActiveCommentPost(null); // Close comments if opening share
                      }}
                      className="flex items-center gap-1 text-gray-700 hover:text-green-500 transition-colors"
                    >
                      <Share2 size={20} />
                    </button>
                  </div>

                  {/* Comments Section */}
                  {isCommentOpen && (
                    <div className="flex-1 bg-gray-50 rounded-lg p-4 space-y-4 overflow-y-auto mt-4">
                      <h3 className="font-bold text-lg text-gray-800">Comments</h3>

                      {commentLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
                          <p className="mt-2 text-gray-600">Loading comments...</p>
                        </div>
                      ) : comments.length === 0 ? (
                        <p className="italic text-gray-500 text-center py-4">
                          No comments yet. Be the first!
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((comment) => (
                            <div key={comment._id} className="bg-white rounded-md p-3 shadow-sm">
                              <div className="flex justify-between items-start">
                                <p className="flex items-center gap-2 text-sm text-gray-700">
                                  <NavLink to={`/people/${comment.author._id}`} className="flex gap-2 items-center font-semibold text-gray-800 hover:underline">
                                    <img src={comment.author?.profilePic || '/default-avatar.png'} alt="" className="w-6 h-6 rounded-full object-cover" />
                                    <span>{comment.author?.username || `${comment.author?.firstname} ${comment.author?.lastname}`.trim()}</span>:
                                  </NavLink>
                                  <span className="flex-1">{comment.content}</span>
                                </p>
                                {comment.author?._id === userData?._id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="text-red-500 hover:text-red-700 ml-2"
                                    title="Delete comment"
                                  >
                                    <Trash size={16} />
                                  </button>
                                )}
                              </div>

                              {/* Replies */}
                              {comment.replies.length > 0 && (
                                <div className="ml-8 mt-2 space-y-1 border-l pl-3 border-gray-200">
                                  {comment.replies.map((reply) => (
                                    <div key={reply._id} className="bg-gray-100 rounded-md p-2 text-sm text-gray-700">
                                      <p className="flex gap-2 items-center">
                                        <NavLink to={`/people/${reply.author._id}`} className="flex gap-2 items-center font-semibold text-gray-800 hover:underline">
                                          <img src={reply.author?.profilePic || '/default-avatar.png'} alt="" className="w-5 h-5 rounded-full object-cover" />
                                          <span>{reply.author?.username || `${reply.author?.firstname} ${reply.author?.lastname}`.trim()}</span>:
                                        </NavLink>
                                        <span className="flex-1">{reply.content}</span>
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reply Section */}
                              {replyingTo !== comment._id ? (
                                <button
                                  onClick={() => startReply(comment._id)}
                                  className="text-blue-500 hover:text-blue-700 mt-2 text-sm font-semibold"
                                >
                                  Reply
                                </button>
                              ) : (
                                <div className="mt-2">
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-300 rounded p-2 text-sm resize-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Write your reply..."
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                    <button
                                      onClick={cancelReply}
                                      className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1 rounded-md"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleReplySubmit}
                                      className="bg-blue-500 text-white font-semibold text-sm px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
                                    >
                                      Submit
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment */}
                      <div className="border-t pt-4 mt-auto">
                        <textarea
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          rows={3}
                          placeholder="Add a comment..."
                          className="w-full border border-gray-300 rounded p-3 resize-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleAddComment}
                          className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                          Post Comment
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Share Section */}
                  {isShareOpen && (
                    <div className="flex-1 bg-gray-50 rounded-lg p-4 space-y-4 overflow-y-auto mt-4">
                      <h3 className="font-bold text-lg text-gray-800">Share Post</h3>

                      <input
                        type="text"
                        placeholder="Search users or communities to share..."
                        value={shareSearchTerm}
                        onChange={handleShareSearchChange}
                        className="w-full border border-gray-300 rounded p-3 focus:ring-blue-500 focus:border-blue-500"
                      />

                      {usersToShare.users.length === 0 && usersToShare.community.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No users or communities found</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {usersToShare.users.map((user) => (
                            <div
                              key={user._id}
                              className="flex items-center justify-between bg-white rounded p-3 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.profilePic || '/default-avatar.png'}
                                  alt={user.firstname}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <span className="text-gray-800">
                                  {user.username || `${user.firstname} ${user.lastname}`.trim()}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={shareRecipients.find(u => u._id === user._id)} // Check for object presence
                                onChange={() => toggleShareRecipient(user)}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </div>
                          ))}
                          {usersToShare.community.map((community) => (
                            <div
                              key={community._id}
                              className="flex items-center justify-between bg-white rounded p-3 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={community.profilePic || '/default-community.png'}
                                  alt={community.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <span className="text-gray-800">
                                  @{community.name}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={shareRecipients.find(c => c._id === community._id)} // Check for object presence
                                onChange={() => toggleShareRecipient(community)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={handleShareSubmit}
                        disabled={shareRecipients.length === 0}
                        className={`w-full px-4 py-2 rounded-md text-white transition-colors ${shareRecipients.length === 0
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-600"
                          }`}
                      >
                        Share ({shareRecipients.length} selected)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
