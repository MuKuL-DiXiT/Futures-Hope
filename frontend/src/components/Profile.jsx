import React, { useState, useEffect, useCallback } from "react";
import { Heart, Share2, MessageCircle, X, Trash } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Profile() {
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
  const [usersToShare, setUsersToShare] = useState([]);
  const [shareSearchTerm, setShareSearchTerm] = useState("");
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
  // Fetch user info and posts on mount
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

  // Fetch posts of user
  const fetchPosts = async (userId) => {
    try {
      setLoading(true);
      const res = await secureFetch(`/auth/posts/getUserPosts/${userId}`, {
        method: "GET"
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);

        // Fetch liked status for each post
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
    if (
      !window.confirm(
        "Are you sure you want to delete this comment? This action cannot be undone."
      )
    )
      return;

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
        setResults1({ users: [], community: [] });
      }
    };
    useEffect(() => {
      shareSearchUsers()
    }, [shareSearchTerm])

  // When share modal opens, fetch users
  useEffect(() => {
    if (activeSharePost) {
      shareSearchUsers();
      setShareRecipients([]);
      setShareSearchTerm("");
    }
  }, [activeSharePost]);

  // Handle user search input change
  const handleShareSearchChange = (e) => {
    const val = e.target.value;
    setShareSearchTerm(val);
  };

  // Toggle share recipient selection
  const toggleShareRecipient = (userId) => {
    setShareRecipients((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Submit share request
  const handleShareSubmit = async () => {
    if (shareRecipients.length === 0) return;
    try {
      const res = await secureFetch(`/auth/posts/${activeSharePost}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: shareRecipients }),
      });
      if (res.ok) {
        alert(`Post shared with ${shareRecipients.length} user(s)!`);
        setActiveSharePost(null);
        setShareRecipients([]);
      }
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="flex justify-center items-center h-40">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-green-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen only after we've confirmed user is not logged in
  if (!userData) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="min-h-screen flex items-center justify-center">
          <img
            src="./public/tree.webp"
            alt=""
            className="h-3/4 hidden sm:inline"
          />
          <div className="bg-green-100 flex flex-col justify-center items-center gap-10 rounded-md md:w-1/4 md:px-12 w-5/6 sm:mr-10 h-1/2">
            <a
              href="/"
              className="text-center w-1/3 sm:w-3/4 md:w-full p-1 px-3 border-2 border-green-700 hover:bg-green-700 hover:shadow-lg shadow-black rounded-md"
            >
              log in
            </a>
            <h1>OR</h1>
            <a
              href="/signup"
              className="text-center w-1/3 sm:w-3/4 md:w-full p-1 px-3 border-2 border-green-700 hover:bg-green-700 hover:shadow-lg shadow-black rounded-md"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-5/6 min-h-screen justify-center items-center md:px-32 px-2 sm:px-4 py-8 relative">
      {/* User Info Header - Centered */}
      <div className="flex flex-wrap items-center justify-center mb-8 gap-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group w-fit">
            {/* Glowing background behind the image */}
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500 to-green-500 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-400 animate-tilt z-0"></div>

            {/* Profile image with higher z-index */}
            <img
              onClick={() => setProfilePicExpanded(!profilePicExpanded)}
              src={userData.user?.profilePic}
              alt={userData.user?.username}
              className={`relative z-10 rounded-full object-cover border border-green-600 cursor-pointer transition-all duration-300 ${profilePicExpanded ? "w-60 h-60" : "w-20 h-20"
                }`}
            />
          </div>
          <NavLink
            to="/edit"
            state={{ user: userData }}
            className="text-white bg-teal-900 text-center rounded-lg px-4 py-2"
          >
            <span>Edit</span>
          </NavLink>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-bold text-2xl">@{userData.user?.firstname}</h1>
          <p className="text-green-700 font-semibold">{userData.user?.lastname}</p>
        </div>

        <div className="flex gap-8">
          <div className="flex flex-col items-center text-black font-serif bg-green-800/40 rounded-lg p-3">
            <span className="font-semibold">{posts.length}</span>
            <span className="text-sm">Posts</span>
          </div>
          <NavLink to='/connections' className="flex items-center text-black font-serif gap-12 bg-amber-800/40 rounded-lg p-3 hover:shadow-lg hover:shadow-black transition-shadow duration-1000">
            <div className="flex flex-col items-center">
              <span className="font-semibold">{userData.bondCount}</span>
              <span className="text-sm">Bonds</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-semibold">{userData.comCount}</span>
              <span className="text-sm">Communities</span>
            </div>
          </NavLink>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-green-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-400 italic text-xs sm:text-sm">
            No posts yet. Start sharing your projects and ideas!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {posts.map((post) => (
              <div
                key={post._id}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPostId(post._id);
                }}
                className="cursor-pointer transition-all duration-300 rounded-md overflow-hidden hover:scale-[1.02] aspect-square"
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Post Modal */}
      {expandedPostId && (() => {
        const post = posts.find(p => p._id === expandedPostId);
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
                className="absolute top-2 right-2 text-black hover:text-red-500 z-10"
              >
                <X size={24} />
              </button>

              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                <div className="md:w-1/2 bg-black flex items-center justify-center">
                  {post.media.type === "photo" ? (
                    <img
                      src={post.media.url}
                      className="w-full h-full object-contain max-h-[500px]"
                      alt=""
                    />
                  ) : (
                    <video
                      src={post.media.url}
                      controls
                      className="w-full h-full object-contain max-h-[500px]"
                    />
                  )}
                </div>

                <div className="md:w-1/2 p-4 space-y-4 overflow-y-auto max-h-[90vh]">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <img src={post.user.profilePic} className="w-10 h-10 rounded-full" />
                    <span className="font-semibold">
                      {post.user.firstname} {post.user.lastname}
                    </span>
                  </div>

                  {/* Caption */}
                  {post.caption && <p>{post.caption}</p>}

                  {/* Action Buttons */}
                  <div className="flex space-x-6 text-sm text-gray-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePostLike(post._id);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Heart
                        fill={isLiked ? "green" : "none"}
                        className={isLiked ? "text-green-600" : "text-black"}
                        size={20}
                      />
                      <span>{post.likesCount || 0}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCommentPost(isCommentOpen ? null : post._id);
                      }}
                      className="flex items-center gap-1"
                    >
                      <MessageCircle className="text-black" size={20} />
                      <span>{post.commentsCount || 0}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSharePost(isShareOpen ? null : post._id);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Share2 className="text-black" size={20} />
                    </button>
                  </div>

                  {/* Comments Section */}
                  {isCommentOpen && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <h3 className="font-bold text-lg">Comments</h3>

                      {commentLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                          <p className="mt-2 text-gray-600">Loading comments...</p>
                        </div>
                      ) : comments.length === 0 ? (
                        <p className="italic text-gray-500 text-center py-4">
                          No comments yet. Be the first!
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {comments.map((comment) => (
                            <div key={comment._id} className="bg-white rounded-md p-3">
                              <div className="flex justify-between items-start">
                                <p className="flex items-center gap-2 text-sm">
                                  <NavLink to={`/people/${comment.author._id}`} className="flex gap-2 items-center">
                                    <img src={comment.author?.profilePic} alt="" className="w-6 h-6 rounded-full" />
                                    <strong>@{comment.author?.firstname}</strong>:
                                  </NavLink>
                                  {comment.content}
                                </p>
                                {comment.author?._id === userData.user._id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Delete comment"
                                  >
                                    <Trash size={16} />
                                  </button>
                                )}
                              </div>

                              {/* Replies */}
                              {comment.replies.length > 0 && (
                                <div className="ml-4 mt-2 space-y-1">
                                  {comment.replies.map((reply) => (
                                    <div key={reply._id} className="bg-gray-100 rounded-md p-2">
                                      <p className="text-sm flex gap-2 items-center">
                                        <NavLink to={`/people/${reply.author._id}`} className="flex gap-2 items-center">
                                          <strong>@{reply.author?.firstname || "User"}</strong>:
                                        </NavLink>
                                        {reply.content}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reply Section */}
                              {replyingTo !== comment._id ? (
                                <button
                                  onClick={() => startReply(comment._id)}
                                  className="text-green-700 mt-2 text-sm font-semibold"
                                >
                                  Reply
                                </button>
                              ) : (
                                <div className="mt-2">
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-300 rounded p-2 text-sm"
                                    placeholder="Write your reply..."
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                    <button
                                      onClick={cancelReply}
                                      className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleReplySubmit}
                                      className="text-green-700 font-semibold text-sm px-3 py-1"
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
                      <div className="border-t pt-4">
                        <textarea
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          rows={3}
                          placeholder="Add a comment..."
                          className="w-full border border-gray-300 rounded p-3 resize-none"
                        />
                        <button
                          onClick={handleAddComment}
                          className="mt-3 px-4 py-2 bg-yellow-800/70 text-black rounded"
                        >
                          Post Comment
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Share Section */}
                  {isShareOpen && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <h3 className="font-bold text-lg">Share Post</h3>

                      <input
                        type="text"
                        placeholder="Search users to share..."
                        value={shareSearchTerm}
                        onChange={handleShareSearchChange}
                        className="w-full border border-gray-300 rounded p-3"
                      />

                      {usersToShare.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No users found</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {usersToShare.users.map((user) => (
                            <div
                              key={user._id}
                              className="flex items-center justify-between bg-white rounded p-3"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.profilePic}
                                  alt={user.firstname}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <span>
                                  @{user.firstname} {user.lastname}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={shareRecipients.includes(user._id)}
                                onChange={() => toggleShareRecipient(user._id)}
                                className="w-4 h-4"
                              />
                            </div>
                          ))}
                          {usersToShare.community.map((community) => (
                            <div
                              key={community._id}
                              className="flex items-center justify-between bg-white rounded p-3"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={community.profilePic}
                                  alt={community.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <span>
                                  @{community.name}
                                </span>
                              </div>
                              <input
                                type="checkbox"
                                checked={shareRecipients.includes(community._id)}
                                onChange={() => toggleShareRecipient(community._id)}
                                className="w-4 h-4"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={handleShareSubmit}
                        disabled={shareRecipients.length === 0}
                        className={`w-full px-4 py-2 rounded text-black transition-colors ${shareRecipients.length === 0
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-yellow-800/70"
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