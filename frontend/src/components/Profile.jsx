import React, { useState, useEffect, useCallback } from "react";
import { Heart, MessageCircle, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import CommentSection from "./common/CommentSection";
import ShareContainer from "./common/ShareContainer";
import PostModal from "./common/PostModal";
import LazyImage from "./LazyImage";

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCaptions, setExpandedCaptions] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [activeCommentPost, setActiveCommentPost] = useState(false);
  const [comments, setComments] = useState({});
  const [commentLoading, setCommentLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [activeSharePost, setActiveSharePost] = useState(null);
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

  // redirect to home if not logged in (after initial load)
  useEffect(() => {
    if (!isInitialLoading && !userData) {
      navigate("/", { replace: true });
    }
  }, [isInitialLoading, userData, navigate]);

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
  }, [expandedPostId, activeCommentPost]);

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
    return null;
  }

  const selectedPost = posts.find(post => post._id === expandedPostId);

  const openPostModal = (postId) => {
    setExpandedPostId(postId);
  };

  const closePostModal = () => {
    setExpandedPostId(null);
    setActiveCommentPost(null);
    setActiveSharePost(null);
    setNewCommentText("");
    setReplyText("");
    setReplyingTo(null);
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
                <LazyImage
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
                  className="px-3 text-white text-xs py-1 bg-gradient-to-r from-black to-gray-700 rounded-full font-thin"
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

      {/* Expanded Post Modal (shared) */}
      <PostModal
        isOpen={!!expandedPostId}
        selectedPost={selectedPost}
        onClose={closePostModal}
        likedPosts={likedPosts}
        togglePostLike={togglePostLike}
        activeCommentPost={activeCommentPost}
        setActiveCommentPost={setActiveCommentPost}
        activeSharePost={activeSharePost}
        setActiveSharePost={setActiveSharePost}
        comments={comments}
        commentLoading={commentLoading}
        newCommentText={newCommentText}
        setNewCommentText={setNewCommentText}
        handleAddComment={handleAddComment}
        replyingTo={replyingTo}
        startReply={startReply}
        replyText={replyText}
        setReplyText={setReplyText}
        handleReplySubmit={handleReplySubmit}
        handleDeleteComment={handleDeleteComment}
        currentUser={userData?.user || userData}
      />

      {/* Profile Picture Modal */}
      {profilePicExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-gray-800/90 dark:backdrop-blur-md backdrop-blur-sm" onClick={() => setProfilePicExpanded(false)}>
          <div className="relative max-w-xl w-full p-4" onClick={(e) => e.stopPropagation()}>
            <LazyImage
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 dark:bg-gray-800/90 dark:backdrop-blur-md backdrop-blur-sm" onClick={() => setActiveSharePost(null)}>
          <div className="bg-card rounded-lg shadow-2xl w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-semibold text-lg">Share Post</h3>
              <button onClick={() => setActiveSharePost(null)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <ShareContainer
                isOpen={activeSharePost !== null}
                onClose={() => setActiveSharePost(null)}
                postId={activeSharePost}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}