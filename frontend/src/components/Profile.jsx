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

  useEffect(() => {
    if (activeSharePost !== null) {
      if (shareSearchTerm !== "") {
        shareSearchUsers();
      } else {
        setUsersToShare({ users: [], community: [] });
      }
    } else {
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
      <div className="flex items-center justify-center w-full h-screen bg-background">
        <div className="w-16 h-16 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-background">
        <div className="card p-8 text-center">
          <img
            src="/tree.webp"
            alt="App Logo"
            className="h-24 mx-auto mb-6"
          />
          <p className="text-muted-foreground mb-6">Please log in or create an account to view your profile.</p>
          <div className="flex flex-col gap-3">
            <NavLink
              to="/"
              className="btn btn-primary w-full"
            >
              Log In
            </NavLink>
            <NavLink
              to="/signup"
              className="btn btn-secondary w-full"
            >
              Create Account
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  const selectedPost = posts.find(post => post._id === expandedPostId);

  const openPostModal = (postId) => {
    setExpandedPostId(postId);
    setActiveCommentPost(postId);
  };

  const closePostModal = () => {
    setExpandedPostId(null);
    setActiveCommentPost(null);
    setActiveSharePost(null);
    setNewCommentText("");
    setReplyText("");
    setReplyingTo(null);
    setShareRecipients([]);
    setSearchTerm("");
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0 relative group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-primary to-secondary p-1 shadow-lg">
                <img
                  onClick={() => setProfilePicExpanded(true)}
                  src={userData.user?.profilePic || '/dummy.png'}
                  alt={userData.user?.username}
                  className="w-full h-full rounded-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center md:items-start flex-grow">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4 w-full">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {userData.user?.username || `${userData.user?.firstname} ${userData.user?.lastname}`.trim()}
                </h1>
                <NavLink 
                  to="/edit" 
                  state={{ user: userData }} 
                  className="btn btn-secondary text-sm"
                >
                  Edit Profile
                </NavLink>
              </div>

              {/* Stats */}
              <div className="flex gap-8 mb-6">
                <div className="text-center">
                  <div className="font-bold text-xl">{posts.length}</div>
                  <div className="text-muted-foreground text-sm">Posts</div>
                </div>
                <NavLink to='/connections' className="text-center hover:scale-105 transition-transform">
                  <div className="font-bold text-xl">{userData.bondCount}</div>
                  <div className="text-muted-foreground text-sm">Bonds</div>
                </NavLink>
                <NavLink to='/connections' className="text-center hover:scale-105 transition-transform">
                  <div className="font-bold text-xl">{userData.comCount}</div>
                  <div className="text-muted-foreground text-sm">Communities</div>
                </NavLink>
              </div>

              {/* Name and Bio */}
              <div className="text-center md:text-left">
                <p className="font-semibold text-lg mb-1">
                  {userData.user?.firstname} {userData.user?.lastname}
                </p>
                {userData.user?.bio && (
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                    {userData.user.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="w-full max-w-4xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="card text-center text-muted-foreground p-10">
              <h3 className="font-semibold text-lg mb-2">No Posts Yet</h3>
              <p className="text-sm">Start sharing your journey and connect with others!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2">
              {posts.map((post) => (
                <div key={post._id} onClick={() => openPostModal(post._id)}
                  className="relative aspect-square bg-card cursor-pointer overflow-hidden group rounded-md">
                  {post.media?.url && (
                    post.media.type === "photo" ? (
                      <img
                        src={post.media.url}
                        alt="Post"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <video
                        src={post.media.url}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center text-white font-semibold">
                      <Heart className="w-5 h-5 mr-1.5" /> {post.likesCount}
                    </div>
                    <div className="flex items-center text-white font-semibold">
                      <MessageCircle className="w-5 h-5 mr-1.5" /> {post.commentsCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Post Modal */}
      {expandedPostId && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closePostModal}>
          <div className="relative bg-card rounded-lg shadow-2xl w-[95vw] h-[90vh] max-w-6xl flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closePostModal}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-background/80 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-full md:w-3/5 flex items-center justify-center bg-black/50 p-2">
              {selectedPost.media?.url && (
                selectedPost.media.type === "photo" ? (
                  <img
                    src={selectedPost.media.url}
                    alt="Post"
                    className="max-h-full max-w-full object-contain rounded-md"
                  />
                ) : (
                  <video
                    controls
                    autoPlay
                    src={selectedPost.media.url}
                    className="max-h-full max-w-full object-contain rounded-md"
                  />
                )
              )}
            </div>

            <div className="w-full md:w-2/5 flex flex-col h-full bg-card">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <NavLink to={`/people/${selectedPost.user._id}`} className="flex items-center gap-3">
                  <img src={selectedPost.user?.profilePic || '/dummy.png'} alt="" className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <span className="font-semibold">{selectedPost.user.firstname} {selectedPost.user.lastname}</span>
                    <p className="text-xs text-muted-foreground">@{selectedPost.user.username}</p>
                  </div>
                </NavLink>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Caption */}
                {selectedPost.caption && (
                  <div className="text-sm">
                    <p>
                      {expandedCaptions[selectedPost._id] || selectedPost.caption.length <= 100 
                        ? selectedPost.caption 
                        : `${selectedPost.caption.slice(0, 100)}...`
                      }
                      {selectedPost.caption.length > 100 && (
                        <button
                          className="text-muted-foreground ml-1 text-xs hover:text-foreground"
                          onClick={() => toggleCaption(selectedPost._id)}
                        >
                          {expandedCaptions[selectedPost._id] ? "Show less" : "Show more"}
                        </button>
                      )}
                    </p>
                  </div>
                )}

                {/* Comments Section */}
                {activeCommentPost === selectedPost._id && (
                  commentLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin"></div>
                    </div>
                  ) : (comments[selectedPost._id] || []).length > 0 ? (
                    (comments[selectedPost._id] || []).map((comment) => (
                      <div key={comment._id} className="flex flex-col gap-2">
                        <div className="flex items-start gap-3">
                          <NavLink to={`/people/${comment.author?._id}`}>
                            <img src={comment.author?.profilePic || '/dummy.png'} alt="" className="w-8 h-8 rounded-full object-cover" />
                          </NavLink>
                          <div className="flex-1">
                            <div className="bg-muted p-3 rounded-lg">
                              <div className="flex items-center justify-between">
                                <NavLink to={`/people/${comment.author?._id}`} className="font-semibold text-sm">
                                  {comment.author?.firstname} {comment.author?.lastname}
                                </NavLink>
                                {comment.author?._id === userData?.user?._id && (
                                  <button onClick={() => handleDeleteComment(comment._id)} className="text-muted-foreground hover:text-destructive">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                              <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <button onClick={() => startReply(comment._id)} className="font-semibold hover:text-foreground">Reply</button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Replies */}
                        {comment.replies?.length > 0 && (
                          <div className="ml-8 pl-3 border-l-2 border-border space-y-3">
                            {comment.replies.map((reply) => (
                               <div key={reply._id} className="flex items-start gap-3">
                                <NavLink to={`/people/${reply.author?._id}`}>
                                  <img src={reply.author?.profilePic || '/dummy.png'} alt="" className="w-6 h-6 rounded-full object-cover" />
                                </NavLink>
                                <div className="flex-1">
                                  <div className="bg-background p-2 rounded-lg">
                                    <NavLink to={`/people/${reply.author?._id}`} className="font-semibold text-xs">
                                      {reply.author?.firstname} {reply.author?.lastname}
                                    </NavLink>
                                    <p className="text-sm mt-1">{reply.content}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply Input */}
                        {replyingTo === comment._id && (
                          <div className="ml-11 mt-2">
                            <div className="flex items-start gap-2">
                              <img src={userData?.user?.profilePic || '/dummy.png'} alt="Your profile" className="w-6 h-6 rounded-full object-cover" />
                              <div className="flex-1">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="input text-sm w-full"
                                  placeholder="Write a reply..."
                                  rows="2"
                                ></textarea>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button onClick={cancelReply} className="btn btn-ghost text-xs">Cancel</button>
                                  <button onClick={() => handleReplySubmit(selectedPost._id, comment._id)} className="btn btn-primary text-xs">Reply</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      <h4 className="font-semibold">No comments yet.</h4>
                      <p className="text-sm">Be the first to share your thoughts!</p>
                    </div>
                  )
                )}
              </div>

              <div className="p-4 border-t border-border mt-auto">
                <div className="flex justify-around mb-4">
                  <button onClick={() => togglePostLike(selectedPost._id)} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <Heart className={`w-6 h-6 ${likedPosts[selectedPost._id] ? "fill-primary text-primary" : ""}`} />
                    <span className="text-sm font-medium">{selectedPost.likesCount}</span>
                  </button>
                  <button onClick={() => document.getElementById('comment-input')?.focus()} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <MessageCircle className="w-6 h-6" />
                    <span className="text-sm font-medium">{selectedPost.commentsCount}</span>
                  </button>
                  <button onClick={() => setActiveSharePost(selectedPost._id)} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <Share2 className="w-6 h-6" />
                    <span className="text-sm font-medium">Share</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <img src={userData.user?.profilePic || '/dummy.png'} alt="Your Profile" className="w-8 h-8 rounded-full object-cover" />
                  <input
                    id="comment-input"
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(selectedPost._id)}
                    placeholder="Add a comment..."
                    className="input flex-1"
                  />
                  <button
                    onClick={() => handleAddComment(selectedPost._id)}
                    disabled={!newCommentText.trim()}
                    className="btn btn-primary"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Picture Modal */}
      {profilePicExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setProfilePicExpanded(false)}>
          <div className="relative max-w-xl w-full p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={userData.user?.profilePic || '/dummy.png'}
              alt={userData.user?.username}
              className="w-full h-auto object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setProfilePicExpanded(false)}
              className="absolute top-0 right-0 -mt-4 -mr-4 w-10 h-10 rounded-full bg-background/80 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}

       {/* Share Modal */}
      {activeSharePost && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setActiveSharePost(null)}>
          <div className="bg-card rounded-lg shadow-2xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-lg">Share Post</h3>
              <button onClick={() => setActiveSharePost(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Search users or communities..."
                value={shareSearchTerm}
                onChange={handleShareSearchChange}
                className="input w-full mb-4"
              />
            </div>
            <div className="max-h-64 overflow-y-auto px-4 space-y-2">
              {(usersToShare.users.length === 0 && usersToShare.community.length === 0 && shareSearchTerm !== "") ? (
                <p className="text-center text-muted-foreground py-4">No results found.</p>
              ) : (
                <>
                  {usersToShare.users.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <img src={user.profilePic || '/dummy.png'} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-sm font-medium">{user.firstname} {user.lastname}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareRecipients.some((r) => r._id === user._id)}
                        onChange={() => toggleShareRecipient(user)}
                        className="form-checkbox h-5 w-5 text-primary rounded bg-background border-border focus:ring-primary"
                      />
                    </div>
                  ))}
                  {usersToShare.community.map((community) => (
                    <div key={community._id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <img src={community.profilePic || '/dummyGroup.png'} alt={community.name} className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-sm font-medium">@{community.name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareRecipients.some(c => c._id === community._id)}
                        onChange={() => toggleShareRecipient(community)}
                        className="form-checkbox h-5 w-5 text-primary rounded bg-background border-border focus:ring-primary"
                      />
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end mt-2">
              <button
                onClick={() => handleShareSubmit(activeSharePost)}
                disabled={shareRecipients.length === 0}
                className="btn btn-primary"
              >
                Share ({shareRecipients.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}