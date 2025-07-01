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
  const fetchUsersToShare = useCallback(
    async (searchTerm = "") => {
      try {
        const res = await secureFetch(`/auth/users?q=${encodeURIComponent(searchTerm)}`, {
          method: "GET",
        });
        if (res.ok) {
          const data = await res.json();
          setUsersToShare(data);
        }
      } catch (e) {
        console.error("Error fetching users for sharing:", e);
      }
    },
    []
  );

  // When share modal opens, fetch users
  useEffect(() => {
    if (activeSharePost) {
      fetchUsersToShare();
      setShareRecipients([]);
      setShareSearchTerm("");
    }
  }, [activeSharePost, fetchUsersToShare]);

  // Handle user search input change
  const handleShareSearchChange = (e) => {
    const val = e.target.value;
    setShareSearchTerm(val);
    fetchUsersToShare(val);
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

  // Add a loading state to prevent flash


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
    <div className="max-w-6xl mx-auto px-6 py-12 relative mb-10">
      {/* User Info Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">

        <div className="flex flex-col gap-2">
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
            className="text-white bg-teal-900 text-center rounded-lg"
          >
            <span>Edit</span>
          </NavLink>

        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-12 flex-1">
          <div>
            <h1 className="font-bold text-2xl">@{userData.user?.firstname}</h1>
            <p className="text-green-700 font-semibold">{userData.user?.lastname}</p>
          </div>
          <div className="flex gap-8 mt-6 sm:mt-0">
            <div className="flex justify-center sm:justify-start gap-8">
              <div className="flex flex-col  items-center text-black font-serif bg-green-800/40 rounded-lg p-3">
                <span className="font-semibold">{posts.length}</span>
                <span className=" text-sm">Posts</span>
              </div>
              <NavLink to='/connections' className="flex flex- items-center text-black font-serif gap-12 bg-amber-800/40 rounded-lg p-3 hover:shadow-lg hover:shadow-black transition-shadow duration-1000">
                <div className="flex flex-col  items-center">
                  <span className="font-semibold">{userData.bondCount}</span>
                  <span className="t text-sm">Bonds</span>
                </div>
                <div className="flex flex-col  items-center">
                  <span className="font-semibold">{userData.comCount}</span>
                  <span className=" text-sm">Communities</span>
                </div>
              </NavLink>

            </div>
          </div>
        </div>
      </div>

      {/* Posts Container */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Posts List */}
        <div className="flex-1 max-w-xl space-y-6">
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
            posts.map((post) => {
              const isCaptionOpen = expandedCaptions[post._id];
              const isCommentOpen = activeCommentPost === post._id;
              const isShareOpen = activeSharePost === post._id;

              return (
                <div key={post._id} className="space-y-4">
                  {/* Post Content */}
                  <div className=" p-4  mb-6 max-w-xl mx-auto lg:mx-0">
                    <div className="w-full">
                      {/* Post Media */}
                      {post.media?.url && (
                        <div className="mb-4 pt-4 rounded-xl overflow-hidden bg-green-900/40 shadow-md ">
                          <NavLink to={`/people/${post.user._id}`} className="flex items-center gap-2 sm:mb-5 sm:ml-5">
                            <img src={post.user.profilePic} alt="" className="w-12 h-12 rounded-full" />
                            <span className="font-serif font-semibold">{post.user.firstname + " " + post.user.lastname}</span>
                          </NavLink>
                          {post.media.type === "photo" ? (
                            <img
                              src={post.media.url}
                              alt="Post"
                              className="w-full  max-h-[32rem] bg-black/50 rounded-xl object-contain"
                            />
                          ) : (
                            <video
                              controls
                              src={post.media.url}
                              className="w-full rounded-lg max-h-[32rem] bg-black/50 object-contain "
                            />
                          )}
                        </div>
                      )}

                      {/* Caption */}
                      {post.caption && (
                        <p className="text-gray-700 mb-4">
                          {isCaptionOpen || post.caption.length <= 60
                            ? post.caption
                            : post.caption.slice(0, 60) + "... "}
                          {post.caption.length > 60 && (
                            <button
                              className="text-green-700 font-semibold ml-1"
                              onClick={() => toggleCaption(post._id)}
                            >
                              {isCaptionOpen ? "show less" : "see more"}
                            </button>
                          )}
                        </p>
                      )}

                      {/* Engagement Stats */}
                      <div className="flex space-x-4 text-sm text-gray-600 mb-3 justify-around">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <button
                            onClick={() => togglePostLike(post._id)}
                            className={`font-semibold ${likedPosts[post._id]
                              ? "text-green-700"
                              : "hover:text-gray-700"
                              }`}
                          >
                            <div className="flex items-center gap-2 mt-2">
                              <Heart
                                fill={likedPosts[post._id] ? "green" : "none"}
                                className={`${likedPosts[post._id]
                                  ? "text-green-700"
                                  : "text-black"
                                  } text-xl`}
                                size={20}
                              />
                              <span className="hidden sm:inline">Likes</span>
                            </div>
                          </button>
                          <span>{post.likesCount || 0}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              setActiveCommentPost(isCommentOpen ? null : post._id)
                            }
                            className="flex items-center gap-2"
                          >
                            <MessageCircle
                              className="text-black text-xl"
                              size={20}
                            />
                            <span className="hidden sm:inline">Comment</span>
                          </button>
                          <span>{post.commentsCount || 0}</span>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              setActiveSharePost(isShareOpen ? null : post._id)
                            }
                            className="flex items-center gap-2"
                          >
                            <Share2 className="text-black text-xl" size={20} />
                            <span className="hidden sm:inline">Share</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comment Panel - Shows directly under the post on small screens */}
                  {isCommentOpen && (
                    <div className="lg:hidden bg-transparent  rounded-lg p-4 shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Comments</h3>
                        <button
                          onClick={() => setActiveCommentPost(null)}
                          className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                        >
                          <X />
                        </button>
                      </div>

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
                        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto mb-4">
                          {comments.map((comment) => (
                            <div
                              key={comment._id}
                              className=" rounded-md p-3 bg-transparent"
                            >
                              <div className="flex justify-between items-start">
                                <p className="flex items-center gap-2 text-sm">
                                  <NavLink to={`/people/${comment.author._id}`} className="flex gap-3 items-center">
                                    <img src={comment.author?.profilePic} alt="" className="w-10 h-10 rounded-full" />
                                    <strong>@{comment.author?.firstname}</strong>:
                                  </NavLink>
                                  {comment.content}
                                </p>
                                {comment.author?._id === userData.user._id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="text-red-500 hover:text-red-700 font-bold"
                                    title="Delete comment"
                                  >
                                    <Trash />
                                  </button>
                                )}
                              </div>

                              {/* Replies */}
                              {comment.replies.length > 0 && (
                                <div className="ml-4 mt-2 space-y-1">
                                  {comment.replies.map((reply) => (
                                    <div
                                      key={reply._id}
                                      className="bg-transparent rounded-md p-2"
                                    >
                                      <p className="text-sm flex gap-2">
                                        <NavLink to={`/people/${reply.author._id}`} className="flex gap-3 items-center">
                                          <strong>@{reply.author?.firstname || "User"}</strong>:{" "}
                                        </NavLink>
                                        {reply.content}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reply button */}
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
                                    className="w-full border-none outline-none bg-black/50 rounded p-2 text-sm"
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
                          className="w-full border-none outline-none bg-black/50 rounded p-3 resize-none"
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

                  {/* Share Panel - Shows directly under the post on small screens */}
                  {isShareOpen && (
                    <div className="lg:hidden bg-transparent rounded-lg p-4 shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Share Post</h3>
                        <button
                          onClick={() => setActiveSharePost(null)}
                          className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                        >
                          <X />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Search users to share..."
                        value={shareSearchTerm}
                        onChange={handleShareSearchChange}
                        className="w-full border border-gray-300 rounded p-3 mb-3"
                      />

                      {usersToShare.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No users found</p>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                          {usersToShare.map((user) => (
                            <div
                              key={user._id}
                              className="flex items-center justify-between bg-gray-50 rounded p-3"
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
              );
            })
          )}
        </div>

        {/* Desktop Comment Panel - Only shows on large screens */}
        {(activeCommentPost || activeSharePost) &&
          (
            <div className="hidden lg:flex lg:w-96 lg:h-[90vh] lg:sticky lg:top-20 lg:self-start bg-transparent border-1 border-gray-300 p-4 shadow-lg overflow-y-auto flex-col">
              {/* Add Comment */}
              <div className="mt-4">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  rows={3}
                  placeholder="Add a comment..."
                  className="w-full border-none outline-none bg-black/50 rounded p-2"
                />
                <button
                  onClick={handleAddComment}
                  className="mt-2 px-5 py-2 bg-yellow-800/70 text-black rounded "
                >
                  Post Comment
                </button>
              </div>
              {activeCommentPost && (
                <>

                  <h3 className="font-bold mb-4 text-lg">Comments</h3>
                  {commentLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading comments...</p>
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="italic text-gray-500">No comments yet. Be the first!</p>
                  ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
                      {comments.map((comment) => (
                        <div
                          key={comment._id}
                          className=" rounded-md p-2 bg-transparent"
                        >
                          <div className="flex justify-between items-center">
                            <p className="flex items-center gap-2">
                              <NavLink to={`/people/${comment.author._id}`} className="flex gap-3 items-center">
                                <img src={comment.author?.profilePic} alt="" className="w-10 h-10 rounded-full" />
                                <strong>@{comment.author?.firstname}</strong>:
                              </NavLink>
                              {comment.content}
                            </p>
                            {comment.user?._id === userData.user._id && (
                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                className="text-red-500 hover:text-red-700 font-bold"
                                title="Delete comment"
                              >
                                &times;
                              </button>
                            )}
                            {comment.author?._id === userData.user._id && (
                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                className="text-red-500 hover:text-red-700 font-bold"
                                title="Delete comment"
                              >
                                <Trash />
                              </button>
                            )}
                          </div>

                          {/* Replies */}
                          {comment.replies.length > 0 && (
                            <div className="ml-4 mt-2 space-y-1">
                              {comment.replies.map((reply) => (
                                <div
                                  key={reply._id}
                                  className="bg-transparent rounded-md p-1"
                                >
                                  <p className="text-sm flex gap-2">
                                    <NavLink to={`/people/${reply.author._id}`} className="flex gap-3 items-center">
                                      <strong>@{reply.author?.firstname || "User"}</strong>:{" "}
                                    </NavLink>
                                    {reply.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply button */}
                          {replyingTo !== comment._id ? (
                            <button
                              onClick={() => startReply(comment._id)}
                              className="text-green-700 mt-1 text-xs font-semibold"
                            >
                              Reply
                            </button>
                          ) : (
                            <div className="mt-1">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                                className="w-full border-none outline-none bg-black/50 rounded p-1 text-sm"
                                placeholder="Write your reply..."
                              />
                              <div className="flex justify-end gap-2 mt-1">
                                <button
                                  onClick={cancelReply}
                                  className="text-gray-600 hover:text-gray-800 text-xs"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleReplySubmit}
                                  className="text-green-700 font-semibold text-xs"
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


                </>
              )}
              {activeSharePost && (
                <>
                  <h3 className="font-bold text-lg">Share Post</h3>
                  <input
                    type="text"
                    placeholder="Search users to share..."
                    value={shareSearchTerm}
                    onChange={handleShareSearchChange}
                    className="w-full border-none outline-none bg-black/50 rounded p-2 mb-3"
                  />

                  {usersToShare.length === 0 ? (
                    <p className="text-gray-500 text-sm">No users found</p>
                  ) : (
                    <div className="overflow-y-auto max-h-[60vh] space-y-2">
                      {usersToShare.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center justify-between bg-gray-50 rounded p-2"
                        >
                          <div className="flex items-center gap-2">
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
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleShareSubmit}
                    disabled={shareRecipients.length === 0}
                    className={`mt-4 px-4 py-2 rounded text-black ${shareRecipients.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-yellow-800/70"
                      }`}
                  >
                    Share
                  </button>
                </>
              )}
            </div>
          )
        }

      </div>
    </div>
  );
}
