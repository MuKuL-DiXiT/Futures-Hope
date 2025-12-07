import React, { useState, useEffect, useRef } from "react";
import secureFetch from "../utils/secureFetch";
import { Heart, MessageCircle, Share2, Loader2 } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { io } from "socket.io-client";
import PostCard from "./common/PostCard";
import CommentSection from "./common/CommentSection";
import ShareContainer from "./common/ShareContainer";
import LazyImage from "./LazyImage";

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default function Home() {
  const scrollRef = useRef(null);
  const communityScrollRef = useRef(null);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCommentsFor, setOpenCommentsFor] = useState(null);
  const [openShareFor, setOpenShareFor] = useState(null);
  const [expandedCaptions, setExpandedCaptions] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [results, setResults] = useState({ users: [], community: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [userData, setUserData] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);


  

  const logout = async () => {
    try {
      await secureFetch("/auth/logout", { method: "POST" });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await secureFetch("/auth/extractUser", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        setUserData(data);
      } catch (err) {
        console.error("Error fetching user data", err);
      }
    };

    const fetchPosts = async () => {
      try {
        const res = await secureFetch("/auth/posts/getPosts", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("Posts data:", data); // Debug log
        setPosts(Array.isArray(data) ? data : []);
        
        // Fetch liked status for all posts
        if (Array.isArray(data) && data.length > 0) {
          const likedStatus = {};
          await Promise.all(
            data.map(async (post) => {
              try {
                const resLike = await secureFetch(`/auth/posts/${post._id}/liked`, {
                  method: "GET",
                });
                if (resLike.ok) {
                  const result = await resLike.json();
                  likedStatus[post._id] = result.liked;
                } else {
                  likedStatus[post._id] = false;
                }
              } catch (err) {
                likedStatus[post._id] = false;
              }
            })
          );
          setLikedPosts(likedStatus);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching posts", err);
        setPosts([]);
        setLoading(false);
      }
    };

    const fetchCommunities = async () => {
      try {
        const res = await secureFetch("/auth/community/communityDataBase", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          console.log("Communities data:", data); // Debug log
          setCommunities(Array.isArray(data) ? data : []);
          setLoadingCommunities(false);
        }
      } catch (err) {
        console.error("Error fetching communities", err);
        setCommunities([]);
        setLoadingCommunities(false);
      }
    };

    fetchUserData();
    fetchPosts();
    fetchCommunities();
  }, []);

  useEffect(() => {
    const scrollContainer = communityScrollRef.current;
    if (!scrollContainer || communities.length === 0) return;

    let scrollDirection = 1; 
    const scrollSpeed = 0.5; 
    const pauseDuration = 2000; 
    let isScrolling = true;
    let scrollInterval;
    let pauseTimeout;

    const autoScroll = () => {
      if (!isScrolling) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      const maxScroll = scrollWidth - clientWidth;

      if (scrollDirection === 1 && scrollLeft >= maxScroll) {
        isScrolling = false;
        clearInterval(scrollInterval);
        pauseTimeout = setTimeout(() => {
          scrollDirection = -1;
          isScrolling = true;
          scrollInterval = setInterval(autoScroll, 20);
        }, pauseDuration);
      } else if (scrollDirection === -1 && scrollLeft <= 0) {
        isScrolling = false;
        clearInterval(scrollInterval);
        pauseTimeout = setTimeout(() => {
          scrollDirection = 1;
          isScrolling = true;
          scrollInterval = setInterval(autoScroll, 20);
        }, pauseDuration);
      } else {
        scrollContainer.scrollLeft += scrollDirection * scrollSpeed;
      }
    };

    const startDelay = setTimeout(() => {
      scrollInterval = setInterval(autoScroll, 20);
    }, 1000);
    const handleMouseEnter = () => {
      isScrolling = false;
      clearInterval(scrollInterval);
      clearTimeout(pauseTimeout);
    };

    const handleMouseLeave = () => {
      isScrolling = true;
      scrollInterval = setInterval(autoScroll, 20);
    };
    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      clearInterval(scrollInterval);
      clearTimeout(pauseTimeout);
      clearTimeout(startDelay);
      if (scrollContainer) {
        scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
        scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [communities]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.trim() === "") {
        setResults({ users: [], community: [] });
        return;
      }
      try {
        const res = await secureFetch(`/auth/posts/search/users?query=${encodeURIComponent(searchTerm)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        setResults({
          users: Array.isArray(data.users) ? data.users : [],
          community: Array.isArray(data.community) ? data.community : [],
        });
      } catch (err) {
        console.error("Search error:", err);
        setResults({ users: [], community: [] });
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const toggleLike = async (postId) => {
    try {
      const isLiked = likedPosts[postId];
      const endpoint = isLiked ? "unlike" : "like";

      const res = await secureFetch(`/auth/posts/${postId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const fetchComments = async (postId) => {
    try {
      const res = await secureFetch(`/auth/posts/${postId}/comments`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      setComments((prev) => ({ ...prev, [postId]: data }));
    } catch (err) {
      console.error("Comments fetch error:", err);
    }
  };

  const addComment = async (postId) => {
    if (!newComment.trim()) return;

    const optimisticComment = {
      _id: Date.now().toString(), 
      content: newComment,
      author: {
        _id: userData?.user?._id || userData?._id,
        firstname: userData?.user?.firstname || userData?.firstname,
        lastname: userData?.user?.lastname || userData?.lastname,
        profilePic: userData?.user?.profilePic || userData?.profilePic,
      },
      replies: [],
      createdAt: new Date().toISOString(),
    };

    // Show comment immediately
    setComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimisticComment],
    }));
    setNewComment("");
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? { ...post, commentsCount: post.commentsCount + 1 }
          : post
      )
    );
    try {
      const res = await secureFetch(`/auth/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: optimisticComment.content }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Server response:", data); 
        setComments((prev) => ({
          ...prev,
          [postId]: prev[postId].map((c) => {
            if (c._id === optimisticComment._id) {
              return {
                ...data,
                _id: data._id || data.comment?._id || c._id,
                content: data.content || data.comment?.content || c.content,
                author: data.author || data.comment?.author || c.author,
                replies: data.replies || data.comment?.replies || [],
              };
            }
            return c;
          }),
        }));
      }
    } catch (err) {
      console.error("Comment error:", err);
      // Remove optimistic comment on error
      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId].filter((c) => c._id !== optimisticComment._id),
      }));
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, commentsCount: Math.max(0, post.commentsCount - 1) }
            : post
        )
      );
    }
  };

  const addReply = async (postId, commentId) => {
    if (!replyText.trim()) return;

    try {
      const res = await secureFetch(`/auth/posts/${postId}/comment/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });

      if (res.ok) {
        fetchComments(postId);
        setReplyText("");
        setReplyingTo(null);
      }
    } catch (err) {
      console.error("Reply error:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await secureFetch(`/auth/posts/comment/${commentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // Re-fetch comments for the current post
        if (openCommentsFor) {
          fetchComments(openCommentsFor);
          // Update the comments count
          setPosts((prev) =>
            prev.map((post) =>
              post._id === openCommentsFor
                ? { ...post, commentsCount: Math.max(0, (post.commentsCount || 0) - 1) }
                : post
            )
          );
        }
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Main container */}
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto bg-white dark:bg-black min-h-screen">

        {/* Header with search and actions - Fixed positioning */}
        <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-lg px-3 pl-9 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:bg-white dark:focus:bg-black focus:border focus:border-gray-300 dark:focus:border-gray-700"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 dark:text-gray-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-16 justify-between">
              <div className="group">
                <NavLink
                  to="/createCommunity"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </NavLink>
                <div className="hidden absolute -bottom-2 right-[2vh] -translate-x-1/2   bg-black text-xs p-1 rounded-md text-gray-300 group-hover:block">
                  Create Community
                </div>
              </div>

              {userData ? (<div className="group">
                <button
                  onClick={logout}
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mt-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
                <div className="hidden absolute -bottom-2 right-0 -translate-x-1/2 bg-black text-xs p-1 rounded-md text-gray-300 group-hover:block">
                  Logout
                </div>
              </div>) :
              <NavLink to="/" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mt-1">
                Signup
              </NavLink>
              }
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && (results.users?.length > 0 || results.community?.length > 0) && (
            <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm max-h-60 overflow-y-auto">
              {results.users?.map((res) => (
                <div key={res._id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <NavLink to={`/people/${res._id}`} className="flex items-center gap-3">
                    <LazyImage src={res.profilePic || '/dummy.png'} alt="" className="w-8 h-8 rounded-full" />
                    <div>
                      <strong className="text-gray-900 dark:text-white">{res.firstname} {res.lastname}</strong>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{res.username}</p>
                    </div>
                  </NavLink>
                </div>
              ))}
              {results.community?.map((res) => (
                <div key={res._id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <NavLink to={`/community/${res._id}`} className="flex items-center gap-3">
                    <LazyImage src={res.profilePic || '/dummyGroup.png'} alt="" className="w-8 h-8 rounded-lg" />
                    <div>
                      <strong className="text-gray-900 dark:text-white">{res.name}</strong>
                    </div>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modern Communities Section - Rectangular Cards */}
        <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Communities</h3>
          <div 
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth" 
            ref={communityScrollRef}
            style={{ scrollBehavior: 'smooth' }}
          >
            {loadingCommunities ? (
              <div className="flex justify-center items-center w-full h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : (
              communities.map((community) => (
                <NavLink
                  key={community._id}
                  to={`/community/${community._id}`}
                  className="flex-shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-4 w-40 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl mb-3 overflow-hidden shadow-md">
                      <LazyImage
                        src={community.profilePic || '/dummyGroup.png'}
                        alt={community.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate w-full mb-1">{community.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">{community.description || 'Community'}</p>
                  </div>
                </NavLink>
              ))
            )}
          </div>
        </div>

        {/* Posts Feed */}
        <div className="pb-20 md:pb-4">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => {
              // Safety checks for post data
              if (!post || !post._id || !post.user) {
                console.warn("Invalid post data:", post);
                return null;
              }

              const isCaptionOpen = expandedCaptions[post._id];

              return (
                <PostCard
                  key={post._id}
                  post={post}
                  liked={!!likedPosts[post._id]}
                  onToggleLike={toggleLike}
                  onToggleComments={(id) => {
                    setOpenCommentsFor((prev) => {
                      const newOpenCommentsFor = prev === id ? null : id;
                      if (newOpenCommentsFor === id) fetchComments(id);
                      return newOpenCommentsFor;
                    });
                  }}
                  onToggleShare={(id) => setOpenShareFor((prev) => (prev === id ? null : id))}
                  expandedCaption={!!expandedCaptions[post._id]}
                  onToggleCaption={(id) => setExpandedCaptions((prev) => ({ ...prev, [id]: !prev[id] }))}
                >
                  {/* Comments (delegated to CommentSection) */}
                  {openCommentsFor === post._id && (
                    <CommentSection
                      postId={post._id}
                      comments={comments[post._id] || []}
                      userData={userData}
                      newComment={newComment}
                      setNewComment={setNewComment}
                      addComment={addComment}
                      replyingTo={replyingTo}
                      setReplyingTo={setReplyingTo}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      submitReply={(commentId) => addReply(post._id, commentId)}
                      handleDeleteComment={handleDeleteComment}
                      loading={false}
                    />
                  )}

                  {/* Share panel (delegated to ShareContainer) */}
                  <ShareContainer
                    isOpen={openShareFor === post._id}
                    onClose={() => setOpenShareFor(null)}
                    postId={post._id}
                    onShareSuccess={() => {
                      // Optional: refresh posts or show success message
                    }}
                  />
                </PostCard>
              );
            })
          )}
        </div>
      </div>
      
      {/* Notification Panel */}
    </div>
  );
}