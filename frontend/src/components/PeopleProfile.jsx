import React, { useState, useEffect, useCallback } from "react";
import { Heart, Share2, MessageCircle, X, Trash2, Send } from "lucide-react"; 
import { NavLink, useNavigate } from "react-router-dom";
import CommentSection from "./common/CommentSection";
import ShareContainer from "./common/ShareContainer";
import PostModal from "./common/PostModal";
import LazyImage from "./LazyImage";

export default function PeopleProfile({ userId }) {
  const navigate = useNavigate();
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
  const [profilePicExpanded, setProfilePicExpanded] = useState(false);
  const [BondStatus, setBondStatus] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

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

  // Effect to check bond status
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
      setIsInitialLoading(false);
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

  // Fetch current logged-in user for permissions (delete comment etc.)
  useEffect(() => {
    const fetchCurrent = async () => {
      try {
        const res = await secureFetch("/auth/extractUser", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          // data may be { user: { ... } } or user object depending on backend
          setCurrentUser(data.user || data.user?.user || data);
        }
      } catch (e) {
        // ignore silently
      }
    };

    fetchCurrent();
  }, []);


  const fetchPosts = async (userId) => {
    try {
      setLoading(true);
      const res = await secureFetch(`/auth/posts/getUserPosts/${userId}`, {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);

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

  // Effect to control body overflow when modal is open
  useEffect(() => {
    if (expandedPostId || activeCommentPost || activeSharePost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [expandedPostId, activeCommentPost, activeSharePost]);

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


  const fetchComments = useCallback(async (postId) => {
    if (!postId) return;
    setCommentLoading(true);
    try {
      const res = await secureFetch(`/auth/posts/${postId}/comments`, {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => ({ ...prev, [postId]: data })); // Store comments by postId
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
      setComments({}); // Clear comments when modal closes
    }
  }, [activeCommentPost, fetchComments]);

  // Add a new comment
  const handleAddComment = async (postId) => { // Added postId parameter
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
          [postId]: [data.comment, ...(prev[postId] || [])], // Add new comment to the specific post's comments
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
  const handleReplySubmit = async (postId, commentId) => { // Added postId and commentId
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
        fetchComments(postId); // Re-fetch comments for the specific post
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

  // Delete a comment (only own)
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

  if (isInitialLoading || !userData) {
    return (
      <div className="flex items-center justify-center w-full h-screen dark:bg-black">
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

  const selectedPost = posts.find(post => post._id === expandedPostId);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black flex flex-col items-center relative md:pl-20 pb-14 md:pb-0">
      <div className="w-full max-w-4xl px-4 sm:px-6 md:px-8 py-8 flex flex-col md:flex-row items-center md:items-start justify-center md:justify-start gap-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex-shrink-0 relative group w-32 h-32 md:w-40 md:h-40">
          <LazyImage
            onClick={() => setProfilePicExpanded(!profilePicExpanded)}
            src={userData.profilePic}
            alt={userData.username}
            className={`relative z-10 rounded-full object-cover border-2 border-gray-300 dark:border-gray-700 cursor-pointer transition-all duration-300 ${profilePicExpanded ? "w-full h-full" : "w-full h-full"}`}
          />
        </div>
        <div className="flex flex-col items-center md:items-start md:ml-10 flex-grow">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="font-semibold text-2xl text-gray-800 dark:text-white">
              {userData.username || `${userData.firstname} ${userData.lastname}`.trim()}
            </h1>
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
                  className="bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200 text-sm font-medium py-1.5 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center"
                >
                  Message <Send className="inline w-4 h-4 ml-1" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-8 mb-4">
            <div className="flex items-center text-gray-800 dark:text-gray-200">
              <span className="font-semibold text-lg">{posts.length}</span> <span className="text-sm ml-1">posts</span>
            </div>
            {/* Bond and Community counts are not directly available for other users in this component's state */}
            {/* If you want to show these, you'd need to fetch them specifically for the 'userId' */}
          </div>
          <p className="font-semibold text-gray-800 dark:text-white text-left w-full">
            {userData.firstname} {userData.lastname}
          </p>
          {userData.bio && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 text-left w-full">
              {userData.bio}
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
            No posts yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.map((post) => (
              <div key={post._id} onClick={(e) => { e.stopPropagation(); setExpandedPostId(post._id); }}
                className="relative w-full pb-[100%] bg-gray-100 dark:bg-gray-900 cursor-pointer overflow-hidden group">
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

      <PostModal
        isOpen={expandedPostId}
        selectedPost={selectedPost}
        onClose={() => {
          setExpandedPostId(null);
          setActiveCommentPost(null);
          setActiveSharePost(null);
          setNewCommentText("");
          setReplyText("");
          setReplyingTo(null);
        }}
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
        currentUser={currentUser}
      />
      
    </div>
  );
}
