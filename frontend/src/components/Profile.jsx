import React, { useState, useEffect, useCallback } from "react";
import { Heart, Share2, MessageCircle, X, Trash2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCaptions, setExpandedCaptions] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [comments, setComments] = useState({});
  const [commentLoading, setCommentLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [activeSharePost, setActiveSharePost] = useState(null);
  const [shareRecipients, setShareRecipients] = useState([]);
  const [usersToShare, setUsersToShare] = useState({ users: [], community: [] });
  const [shareSearchTerm, setSearchTerm] = useState("");
  const [profilePicExpanded, setProfilePicExpanded] = useState(false);
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
        return fetch(url, { ...options, credentials: "include" });
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
    const fetchUser = async () => {
      try {
        const res = await secureFetch("/auth/extractUser", { method: "GET" });
        const data = await res.json();
        setUserData(data);
        if (data.user) {
          fetchPosts(data.user._id);
        }
        setIsInitialLoading(false);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchUser();
  }, []);

  const fetchPosts = async (userId) => {
    try {
      setLoading(true);
      const res = await secureFetch(`/auth/posts/getUserPosts/${userId}`, {
        method: "GET"
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);

        const likedStatus = {};
        await Promise.all(
          data.map(async (post) => {
            const resLike = await secureFetch(`/auth/posts/${post._id}/liked`, {
              method: "GET"
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
    if (expandedPostId || activeCommentPost || activeSharePost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [expandedPostId, activeCommentPost, activeSharePost]);

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

  const fetchComments = useCallback(async (postId) => {
    if (!postId) return;
    setCommentLoading(true);
    try {
      const res = await secureFetch(`/auth/posts/${postId}/comments`, {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => ({ ...prev, [postId]: data }));
      }
    } catch (e) {
      console.error("Error fetching comments:", e);
    } finally {
      setCommentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeCommentPost) {
      fetchComments(activeCommentPost);
      setNewCommentText("");
      setReplyingTo(null);
      setReplyText("");
    } else {
      setComments({});
    }
  }, [activeCommentPost, fetchComments]);

  const handleAddComment = async (postId) => {
    if (!newCommentText.trim()) return;

    try {
      const res = await secureFetch(`/auth/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newCommentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => ({
          ...prev,
          [postId]: [data.comment, ...(prev[postId] || [])],
        }));
        setNewCommentText("");
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const startReply = (commentId) => {
    setReplyingTo(commentId);
    setReplyText("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
  };

  const handleReplySubmit = async (postId, commentId) => {
    if (!replyText.trim() || !replyingTo) return;

    try {
      const res = await secureFetch(
        `/auth/posts/${postId}/comment/${commentId}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyText.trim() }),
        }
      );
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        fetchComments(postId);
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error replying to comment:", error);
    }
  };

  const shareSearchUsers = async () => {
    try {
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
      setUsersToShare({ users: [], community: [] });
    }
  };

  // Modified useEffect for share search term persistence
  useEffect(() => {
    if (activeSharePost !== null) {
      // Only call shareSearchUsers if there's a search term or recipients are selected
      if (shareSearchTerm !== "" || shareRecipients.length > 0) {
        shareSearchUsers();
      } else {
        // Clear search results only when activeSharePost is just opened and no search term/recipients
        setUsersToShare({ users: [], community: [] });
      }
    } else {
      // Reset when share panel is closed
      setShareRecipients([]);
      setSearchTerm("");
    }
  }, [activeSharePost, shareSearchTerm]);


  const handleShareSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
  };

  const toggleShareRecipient = (userOrCommunity) => {
    setShareRecipients((prev) =>
      prev.find((u) => u._id === userOrCommunity._id)
        ? prev.filter((u) => u._id !== userOrCommunity._id)
        : [...prev, userOrCommunity]
    );
  };

  const handleShareSubmit = async (postId) => {
    if (shareRecipients.length === 0) return;
    try {
      const res = await secureFetch(`/auth/posts/${postId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: shareRecipients.map((u) => u._id) }),
      });
      if (res.ok) {
        console.log(`Post shared with ${shareRecipients.length} user(s)!`);
        setActiveSharePost(null);
        setShareRecipients([]);
      }
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

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

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
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

  if (!userData) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-gray-50">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <img
            src="../public/tree.webp"
            alt="App Logo"
            className="h-24 mb-8"
          />
          <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-sm w-full">
            <p className="text-gray-700 mb-6">Please log in or create an account to view your profile.</p>
            <NavLink
              to="/"
              className="block w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors mb-3"
            >
              Log In
            </NavLink>
            <NavLink
              to="/signup"
              className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Create Account
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  const selectedPost = posts.find(post => post._id === expandedPostId);

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center relative md:pl-20 pb-14 md:pb-0">
      <div className="w-full max-w-4xl px-4 sm:px-6 md:px-8 py-8 flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-6 border-b border-gray-200">
        <div className="flex-shrink-0 relative group w-32 h-32 md:w-40 md:h-40">
          <img
            onClick={() => setProfilePicExpanded(!profilePicExpanded)}
            src={userData.user?.profilePic || 'dummy.png'}
            alt={userData.user?.username}
            className={`relative z-10 rounded-full object-cover border-2 border-gray-300 cursor-pointer transition-all duration-300 ${profilePicExpanded ? "w-full h-full" : "w-full h-full" }`}
          />
        </div>
        <div className="flex flex-col items-center md:items-start md:ml-10 flex-grow">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="font-semibold text-2xl text-gray-800">
              {userData.user?.username || `${userData.user?.firstname} ${userData.user?.lastname}`.trim()}
            </h1>
            <NavLink to="/edit" state={{ user: userData }} className="bg-gray-200 text-gray-700 text-sm font-medium py-1.5 px-4 rounded-md hover:bg-gray-300 transition-colors" >
              Edit Profile
            </NavLink>
          </div>
          <div className="flex gap-8 mb-4">
            <div className="flex items-center text-gray-800">
              <span className="font-semibold text-lg">{posts.length}</span> <span className="text-sm ml-1">posts</span>
            </div>
            <NavLink to='/connections' className="flex items-center text-gray-800">
              <span className="font-semibold text-lg">{userData.bondCount}</span> <span className="text-sm ml-1">bonds</span>
            </NavLink>
            <NavLink to='/connections' className="flex items-center text-gray-800">
              <span className="font-semibold text-lg">{userData.comCount}</span> <span className="text-sm ml-1">communities</span>
            </NavLink>
          </div>
          <p className="font-semibold text-gray-800 text-left w-full">
            {userData.user?.firstname} {userData.user?.lastname}
          </p>
          {userData.user?.bio && (
            <p className="text-gray-600 text-sm mt-1 text-left w-full">
              {userData.user.bio}
            </p>
          )}
        </div>
      </div>

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
            No posts yet. Start sharing your projects and ideas!
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.map((post) => (
              <div key={post._id} onClick={(e) => { e.stopPropagation(); setExpandedPostId(post._id); }}
                className="relative w-full pb-[100%] bg-gray-100 cursor-pointer overflow-hidden group">
                {post.media?.url && (
                  post.media.type === "photo" ? (
                    <img
                      src={post.media.url}
                      alt="Post Thumbnail"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={post.media.url}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )
                )}
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center text-white font-semibold">
                    <Heart className="w-5 h-5 mr-1" /> {post.likesCount}
                  </div>
                  <div className="flex items-center text-white font-semibold">
                    <MessageCircle className="w-5 h-5 mr-1" /> {post.commentsCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {expandedPostId && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 transition-opacity overflow-y-auto">
          <div className="relative flex flex-col md:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden w-[90vw] h-[90vh] max-w-6xl"> {/* Added flex-col for small screens */}
            <button
              onClick={() => {
                setExpandedPostId(null);
                setActiveCommentPost(null);
                setActiveSharePost(null);
                setNewCommentText("");
                setReplyText("");
                setReplyingTo(null);
                setShareRecipients([]);
                setSearchTerm("");
              }}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-all"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-3/5 flex items-center justify-center bg-black p-2 md:p-0"> {/* Added padding for small screens */}
              {selectedPost.media?.url && (
                selectedPost.media.type === "photo" ? (
                  <img
                    src={selectedPost.media.url}
                    alt="Post"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <video
                    controls
                    src={selectedPost.media.url}
                    className="max-h-full max-w-full object-contain"
                  />
                )
              )}
            </div>

            <div className="w-full md:w-2/5 flex flex-col h-full"> {/* Made height full for vertical panel */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <NavLink to={`/people/${selectedPost.user._id}`} className="flex items-center gap-3">
                  <img src={selectedPost.user?.profilePic || 'dummy.png'} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                  <div>
                    <span className="font-semibold text-gray-800">{selectedPost.user.firstname + " " + selectedPost.user.lastname}</span>
                    <p className="text-xs text-gray-500">@{selectedPost.user.username}</p>
                  </div>
                </NavLink>
              </div>

              {selectedPost.caption && (
                <div className="px-4 pb-3 text-sm text-gray-800 border-b border-gray-100">
                  <span className="font-semibold">{selectedPost.user.firstname + " " + selectedPost.user.lastname}</span>{" "}
                  {expandedCaptions[selectedPost._id] || selectedPost.caption.length <= 60 ? selectedPost.caption : selectedPost.caption.slice(0, 60) + "..."}
                  {selectedPost.caption.length > 60 && (
                    <button
                      className="text-gray-500 ml-1 text-xs hover:text-teal-500"
                      onClick={() =>
                        setExpandedCaptions((prev) => ({ ...prev, [selectedPost._id]: !prev[selectedPost._id] }))
                      }
                    >
                      {expandedCaptions[selectedPost._id] ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-around p-3 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => togglePostLike(selectedPost._id)}
                  className="flex flex-col items-center text-gray-600 hover:text-green-500 transition-colors"
                >
                  <Heart className={`w-6 h-6 ${likedPosts[selectedPost._id] ? "fill-green-500 text-green-500" : ""}`} />
                  <span className="text-xs mt-1">Like ({selectedPost.likesCount})</span>
                </button>
                <button
                  onClick={() => {
                    setActiveCommentPost(selectedPost._id);
                    setActiveSharePost(null);
                  }}
                  className="flex flex-col items-center text-gray-600 hover:text-teal-500 transition-colors"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="text-xs mt-1">Comment ({selectedPost.commentsCount})</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSharePost(selectedPost._id);
                    setActiveCommentPost(null);
                  }}
                  className="flex flex-col items-center text-gray-600 hover:text-blue-500 transition-colors"
                >
                  <Share2 className="w-6 h-6" />
                  <span className="text-xs mt-1">Share</span>
                </button>
              </div>

              {/* Conditional rendering for comments/share panels based on screen size */}
              {/* Desktop view (md and up) */}
              <div className="hidden md:flex flex-1 flex-col overflow-hidden">
                {activeCommentPost === selectedPost._id && (
                  <>
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-800">Comments</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {commentLoading ? (
                        <div className="flex justify-center items-center h-full">
                          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                      ) : comments[selectedPost._id]?.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                          No comments yet. Be the first to comment!
                        </div>
                      ) : (
                        comments[selectedPost._id]?.map((comment) => (
                          <div key={comment._id} className="flex flex-col">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <NavLink to={`/people/${comment.author?._id}`} className="flex-shrink-0">
                                  <img src={comment.author?.profilePic || 'dummy.png'} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                </NavLink>
                                <div className="bg-gray-50 p-3 rounded-xl flex-1">
                                  <div className="flex items-center gap-2">
                                    <NavLink to={`/people/${comment.author?._id}`} className="font-semibold text-gray-800 text-sm">
                                      {comment.author?.firstname} {comment.author?.lastname}
                                    </NavLink>
                                    <span className="text-gray-500 text-xs">
                                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                 <div className="flex justify-between">
                                   <p className="text-gray-700 mt-1">{comment.content}</p>
                                  {comment.author?._id === userData?.user?._id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="text-red-500 hover:text-red-700 ml-2"
                                    title="Delete comment"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                 </div>
                                  <button
                                    onClick={() => startReply(comment._id)}
                                    className="text-blue-500 text-xs mt-1"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            </div>

                            {replyingTo === comment._id && (
                              <div className="mt-2 ml-12">
                                <div className="flex items-start gap-2">
                                  <img
                                    src={userData?.user?.profilePic || 'dummy.png'}
                                    alt="Your profile"
                                    className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                  />
                                  <div className="flex-1 bg-white rounded-lg shadow-sm">
                                    <textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      className="w-full border-none rounded-lg p-2 text-xs resize-none focus:ring-1 focus:ring-blue-200"
                                      placeholder="Write a reply..."
                                      rows="2"
                                    ></textarea>
                                    <div className="flex justify-end gap-2 p-1">
                                      <button
                                        onClick={cancelReply}
                                        className="px-2 py-1 text-gray-500 text-xs rounded hover:bg-gray-100"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleReplySubmit(selectedPost._id, comment._id)}
                                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {comment.replies?.length > 0 && (
                              <div className="ml-12 mt-2 space-y-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply._id} className="flex items-start gap-2">
                                    <NavLink to={`/people/${reply.author?._id}`} className="flex-shrink-0">
                                      <img src={reply.author?.profilePic || 'dummy.png'} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                                    </NavLink>
                                    <div className="bg-white p-2 rounded-lg shadow-sm flex-1">
                                      <div className="flex items-center gap-2">
                                        <NavLink to={`/people/${reply.author?._id}`} className="font-semibold text-gray-800 text-xs">
                                          {reply.author?.firstname} {reply.author?.lastname}
                                        </NavLink>
                                        <span className="text-gray-500 text-[10px]">
                                          {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <p className="text-gray-700 text-xs mt-1">{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-200 flex items-center gap-3">
                      <img
                        src={userData.user?.profilePic || 'dummy.png'}
                        alt="Your Profile"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <input
                        type="text"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-4 py-2 rounded-full bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                      />
                      <button
                        onClick={() => handleAddComment(selectedPost._id)}
                        disabled={!newCommentText.trim()}
                        className={`px-5 py-2 rounded-full text-white transition-colors ${newCommentText.trim() ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 cursor-not-allowed"
                          }`}
                      >
                        Post
                      </button>
                    </div>
                  </>
                )}

                {activeSharePost === selectedPost._id && (
                  <>
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-800">Share Post</h3>
                    </div>
                    <div className="p-4 border-b border-gray-100">
                      <input
                        type="text"
                        placeholder="Search users or communities..."
                        value={shareSearchTerm}
                        onChange={handleShareSearchChange}
                        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {(usersToShare.users.length === 0 && usersToShare.community.length === 0 && shareSearchTerm !== "") ? (
                        <p className="p-4 text-center text-gray-500">No results found.</p>
                      ) : (
                        <div className="p-4 space-y-3">
                          {usersToShare.users.map((user) => (
                            <div key={user._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.profilePic || 'dummy.png'}
                                  alt={user.username}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <span className="text-gray-800">{user.firstname} {user.lastname}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={shareRecipients.some((r) => r._id === user._id)}
                                onChange={() => toggleShareRecipient(user)}
                                className="form-checkbox h-5 w-5 text-teal-700 rounded"
                              />
                            </div>
                          ))}
                          {usersToShare.community.map((community) => (
                            <div key={community._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg shadow-sm">
                              <div className="flex items-center gap-3">
                                <img
                                  src={community.profilePic || 'dummy.png'}
                                  alt={community.name}
                                  className="w-8 h-8 rounded-lg object-cover"
                                />
                                <span className="text-gray-800">
                                  @{community.name}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={shareRecipients.some(c => c._id === community._id)}
                                onChange={() => toggleShareRecipient(community)}
                                className="form-checkbox h-5 w-5 text-purple-600 rounded"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => handleShareSubmit(selectedPost._id)}
                        disabled={shareRecipients.length === 0}
                        className="bg-gradient-to-r from-teal-800/60 to-black/60 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-teal-800 hover:to-black transition-all disabled:opacity-50"
                      >
                        Share ({shareRecipients.length} selected)
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile view (below md) - panels shown below the post in expanded mode */}
              <div className="md:hidden flex-1 flex flex-col overflow-hidden">
                {activeCommentPost === selectedPost._id && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50 mt-4">
                    <h4 className="font-medium text-gray-700 mb-3">Comments</h4>
                    <div className="mb-3 flex items-start gap-2">
                      <img
                        src={userData?.user?.profilePic || 'dummy.png'}
                        alt="Your profile"
                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      />
                      <div className="flex-1 bg-white rounded-xl shadow-sm">
                        <textarea
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full border-none rounded-xl p-3 text-sm resize-none focus:ring-1 focus:ring-teal-200"
                          rows="2"
                        ></textarea>
                        <div className="flex justify-end p-2">
                          <button
                            onClick={() => handleAddComment(selectedPost._id)}
                            className="px-3 py-1 bg-gradient-to-r from-teal-800 to-black text-white text-sm font-medium rounded-lg hover:from-teal-800 hover:to-black transition-all "
                            disabled={!newCommentText.trim()}
                          >
                            Comment
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-4 text-sm custom-scrollbar">
                      {(comments[selectedPost._id] || []).map((c) => (
                        <div key={c._id} className="flex flex-col">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <NavLink to={`/people/${c.author?._id}`} className="flex-shrink-0">
                                <img src={c.author?.profilePic || 'dummy.png'} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                              </NavLink>
                              <div className="bg-white p-3 rounded-xl shadow-sm flex-1">
                                <div className="flex items-center gap-2">
                                  <NavLink to={`/people/${c.author?._id}`} className="font-semibold text-gray-800 text-sm">
                                    {c.author?.firstname} {c.author?.lastname}
                                  </NavLink>
                                  <span className="text-gray-500 text-xs">
                                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                   <p className="text-gray-700 mt-1">{c.content}</p>
                                  {c.author?._id === userData?.user?._id && (
                                  <button
                                    onClick={() => handleDeleteComment(c._id)}
                                    className="text-red-500 hover:text-red-700 ml-2"
                                    title="Delete comment"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                 </div>
                                <button
                                  onClick={() => startReply(c._id)}
                                  className="text-blue-500 text-xs mt-1"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>

                          {replyingTo === c._id && (
                            <div className="mt-2 ml-12">
                              <div className="flex items-start gap-2">
                                <img
                                  src={userData?.user?.profilePic || 'dummy.png'}
                                  alt="Your profile"
                                  className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                />
                                <div className="flex-1 bg-white rounded-lg shadow-sm">
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="w-full border-none rounded-lg p-2 text-xs resize-none focus:ring-1 focus:ring-teal-200"
                                    placeholder="Write a reply..."
                                    rows="2"
                                  ></textarea>
                                  <div className="flex justify-end gap-2 p-1">
                                    <button
                                      onClick={cancelReply}
                                      className="px-2 py-1 text-gray-500 text-xs rounded hover:bg-gray-100"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleReplySubmit(selectedPost._id, c._id)}
                                      className="px-2 py-1 bg-teal-700 text-white text-xs rounded hover:bg-teal-900"
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {c.replies?.length > 0 && (
                            <div className="ml-12 mt-2 space-y-2">
                              {c.replies.map((r) => (
                                <div key={r._id} className="flex items-start gap-2">
                                  <NavLink to={`/people/${r.author?._id}`} className="flex-shrink-0">
                                    <img src={r.author?.profilePic || 'dummy.png'} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                                  </NavLink>
                                  <div className="bg-white p-2 rounded-lg shadow-sm flex-1">
                                    <div className="flex items-center gap-2">
                                      <NavLink to={`/people/${r.author?._id}`} className="font-semibold text-gray-800 text-xs">
                                        {r.author?.firstname} {r.author?.lastname}
                                      </NavLink>
                                      <span className="text-gray-500 text-[10px]">
                                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-xs mt-1">{r.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSharePost === selectedPost._id && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50 mt-4">
                    <h3 className="font-medium text-gray-700 mb-3">Share Post</h3>
                    <input
                      type="text"
                      value={shareSearchTerm}
                      onChange={handleShareSearchChange}
                      placeholder="Search users to share..."
                      className="w-full border-b border-gray-200 outline-none p-2 text-sm resize-none text-gray-800"
                    />
                    {shareSearchTerm.trim() !== "" && (
                      <div className="space-y-2 max-h-40 overflow-y-auto mt-3 custom-scrollbar">
                        {usersToShare.users.map((u) => (
                          <div key={u._id} className="flex justify-between items-center">
                            <span>{u.firstname} {u.lastname}</span>
                            <input
                              type="checkbox"
                              checked={shareRecipients.some((sel) => sel._id === u._id)}
                              onChange={() => toggleShareRecipient(u)}
                            />
                          </div>
                        ))}
                        {usersToShare.community.map((u) => (
                          <div key={u._id} className="flex justify-between items-center">
                            <span>{u.name}</span>
                            <input
                              type="checkbox"
                              checked={shareRecipients.some((sel) => sel._id === u._id)}
                              onChange={() => toggleShareRecipient(u)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleShareSubmit(selectedPost._id)}
                      className="bg-gradient-to-tr from-teal-800 to-black text-white px-3 py-1 mt-3 rounded-md text-sm float-right"
                      disabled={shareRecipients.length === 0}
                    >
                      Share
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}