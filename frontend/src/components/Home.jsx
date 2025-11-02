import React, { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Loader2 } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { io } from "socket.io-client";
import Notification from "./Notification";

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
  const [shareSearch, setShareSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [results, setResults] = useState({ users: [], community: [] });
  const [results1, setResults1] = useState({ users: [], community: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [userData, setUserData] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);

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
        navigate("/");
        throw new Error("Session expired. Logged out.");
      }
    }

    return res;
  }

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

    // Pause auto-scroll on hover
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

    // Cleanup
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

  useEffect(() => {
    const searchUsersForShare = async () => {
      if (shareSearch.trim() === "") {
        setResults1({ users: [], community: [] });
        return;
      }
      try {
        const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${encodeURIComponent(shareSearch)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        setResults1({
          users: data.users || [],
          community: data.community || [],
        });
      } catch (err) {
        console.error("Share search error:", err);
      }
    };

    const timeoutId = setTimeout(searchUsersForShare, 300);
    return () => clearTimeout(timeoutId);
  }, [shareSearch]);

  const toggleLike = async (postId) => {
    try {
      const res = await secureFetch(`/auth/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setLikedPosts((prev) => ({ ...prev, [postId]: data.liked }));
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? { ...post, likesCount: data.liked ? post.likesCount + 1 : post.likesCount - 1 }
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

    try {
      const res = await secureFetch(`/auth/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data],
        }));
        setNewComment("");
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? { ...post, commentsCount: post.commentsCount + 1 }
              : post
          )
        );
      }
    } catch (err) {
      console.error("Comment error:", err);
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

  const sharePost = async (postId) => {
    if (selectedUsers.length === 0) return;

    try {
      const res = await secureFetch(`/auth/posts/${postId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      if (res.ok) {
        setSelectedUsers([]);
        setOpenShareFor(null);
        alert("Post shared successfully!");
      }
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main container */}
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto bg-white min-h-screen">

        {/* Header with search and actions - Fixed positioning */}
        <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 md:top-8 lg:top-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 bg-gray-100 text-gray-900 rounded-lg px-3 pl-9 text-sm placeholder:text-gray-500 focus:outline-none focus:bg-white focus:border focus:border-gray-300"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-16 justify-between">
              <div className="group">
                <NavLink
                  to="/createCommunity"
                  className="text-gray-700 hover:text-gray-900 "
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
                  className="text-gray-700 hover:text-gray-900 mt-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
                <div className="hidden absolute -bottom-2 right-0 -translate-x-1/2 bg-black text-xs p-1 rounded-md text-gray-300 group-hover:block">
                  Logout
                </div>
              </div>) :
              <NavLink to="/" className="text-gray-700 hover:text-gray-900 mt-1">
                Signup
              </NavLink>
              }
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && (results.users?.length > 0 || results.community?.length > 0) && (
            <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-sm max-h-60 overflow-y-auto">
              {results.users?.map((res) => (
                <div key={res._id} className="p-3 hover:bg-gray-50">
                  <NavLink to={`/people/${res._id}`} className="flex items-center gap-3">
                    <img src={res.profilePic || '/dummy.png'} alt="" className="w-8 h-8 rounded-full" />
                    <div>
                      <strong className="text-gray-900">{res.firstname} {res.lastname}</strong>
                      <p className="text-sm text-gray-500">@{res.username}</p>
                    </div>
                  </NavLink>
                </div>
              ))}
              {results.community?.map((res) => (
                <div key={res._id} className="p-3 hover:bg-gray-50">
                  <NavLink to={`/community/${res._id}`} className="flex items-center gap-3">
                    <img src={res.profilePic || '/dummyGroup.png'} alt="" className="w-8 h-8 rounded-lg" />
                    <div>
                      <strong className="text-gray-900">{res.name}</strong>
                    </div>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modern Communities Section - Rectangular Cards */}
        <div className="bg-white border-b border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Communities</h3>
          <div 
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth" 
            ref={communityScrollRef}
            style={{ scrollBehavior: 'smooth' }}
          >
            {loadingCommunities ? (
              <div className="flex justify-center items-center w-full h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              communities.map((community) => (
                <NavLink
                  key={community._id}
                  to={`/community/${community._id}`}
                  className="flex-shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 w-40 hover:shadow-lg transition-all duration-300 border border-gray-100"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl mb-3 overflow-hidden shadow-md">
                      <img
                        src={community.profilePic || '/dummyGroup.png'}
                        alt={community.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 truncate w-full mb-1">{community.name}</h4>
                    <p className="text-xs text-gray-500 truncate w-full">{community.description || 'Community'}</p>
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
              <p className="text-sm text-gray-500">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No posts yet. Be the first to share something!</p>
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
                <div key={post._id} className="bg-white border-b border-gray-200">
                  {/* Post Header */}
                  <div className="flex items-center justify-between p-4">
                    <NavLink to={`/people/${post.user._id}`} className="flex items-center gap-3">
                      <img src={post.user?.profilePic || 'dummy.png'} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <span className="font-semibold text-sm text-gray-900">
                          {(post.user.firstname || '') + ' ' + (post.user.lastname || 'User')}
                        </span>
                        <p className="text-xs text-gray-500">@{post.user.username || 'user'}</p>
                      </div>
                    </NavLink>
                  </div>

                  {/* Post Media */}
                  {post.media?.url && (
                    <div className="w-full">
                      {post.media.type === "photo" ? (
                        <img
                          src={post.media.url}
                          alt="Post"
                          className="w-full object-cover max-h-96"
                        />
                      ) : (
                        <video
                          controls
                          src={post.media.url}
                          className="w-full object-cover max-h-96"
                        />
                      )}
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-4 mb-3">
                      <button
                        onClick={() => toggleLike(post._id)}
                        className="flex items-center gap-1"
                      >
                        <Heart
                          className={`h-6 w-6 ${likedPosts[post._id] ? 'fill-red-500 text-red-500' : 'text-gray-700'} hover:text-red-500 transition-colors`}
                        />
                        <span className="text-sm text-gray-700">{post.likesCount}</span>
                      </button>

                      <button
                        onClick={() => {
                          setOpenCommentsFor((prev) => {
                            const newOpenCommentsFor = prev === post._id ? null : post._id;
                            if (newOpenCommentsFor === post._id) {
                              fetchComments(post._id);
                            }
                            return newOpenCommentsFor;
                          });
                        }}
                        className="flex items-center gap-1"
                      >
                        <MessageCircle className="h-6 w-6 text-gray-700 hover:text-gray-900 transition-colors" />
                        <span className="text-sm text-gray-700">{post.commentsCount}</span>
                      </button>

                      <button
                        onClick={() => setOpenShareFor((prev) => (prev === post._id ? null : post._id))}
                      >
                        <Share2 className="h-6 w-6 text-gray-700 hover:text-gray-900 transition-colors" />
                      </button>
                    </div>

                    {/* Caption */}
                    <div className="mb-2">
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{post.user.firstname + " " + post.user.lastname}</span>
                        {isCaptionOpen || post.caption.length <= 60 ? post.caption : post.caption.slice(0, 60) + "..."}
                        {post.caption.length > 60 && (
                          <button
                            className="text-gray-500 ml-1 hover:text-gray-700"
                            onClick={() =>
                              setExpandedCaptions((prev) => ({ ...prev, [post._id]: !prev[post._id] }))
                            }
                          >
                            {isCaptionOpen ? "less" : "more"}
                          </button>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(post.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* Comments */}
                    {openCommentsFor === post._id && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <div className="mb-3 flex items-start gap-2">
                          <img
                            src={userData?.user?.profilePic || '/dummy.png'}
                            alt="Your profile"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Add a comment..."
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-gray-400"
                              rows="2"
                            ></textarea>
                            <button
                              onClick={() => addComment(post._id)}
                              className="mt-2 px-4 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              Post
                            </button>
                          </div>
                        </div>

                        {/* Comments list */}
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {comments[post._id]?.map((comment) => (
                            <div key={comment._id} className="flex items-start gap-2">
                              <img
                                src={comment.author?.profilePic || '/dummy.png'}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                              />
                              <div className="flex-1">
                                <p className="text-sm">
                                  <span className="font-semibold mr-1">{comment.author?.firstname} {comment.author?.lastname}</span>
                                  {comment.content}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => setReplyingTo(comment._id)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    Reply
                                  </button>
                                  <span className="text-xs text-gray-400">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </span>
                                </div>

                                {replyingTo === comment._id && (
                                  <div className="mt-2 flex gap-2">
                                    <textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder="Write a reply..."
                                      className="flex-1 border border-gray-200 rounded p-2 text-xs resize-none focus:outline-none focus:border-gray-400"
                                      rows="2"
                                    />
                                    <button
                                      onClick={() => addReply(post._id, comment._id)}
                                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                      Reply
                                    </button>
                                  </div>
                                )}

                                {/* Render replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div className="ml-6 mt-2 space-y-2">
                                    {comment.replies.map((reply, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <img
                                          src={reply.author?.profilePic || '/dummy.png'}
                                          alt=""
                                          className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1">
                                          <p className="text-xs">
                                            <span className="font-semibold mr-1">{reply.author?.firstname} {reply.author?.lastname}</span>
                                            {reply.content}
                                          </p>
                                          <span className="text-xs text-gray-400">
                                            {new Date(reply.createdAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Share modal */}
                    {openShareFor === post._id && (
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        <h4 className="font-semibold mb-2">Share with</h4>
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={shareSearch}
                          onChange={(e) => setShareSearch(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-gray-400 mb-2"
                        />
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {results1.users?.map((user) => (
                            <div key={user._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUsers([...selectedUsers, user._id]);
                                  } else {
                                    setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                                  }
                                }}
                              />
                              <img src={user.profilePic || '/dummy.png'} alt="" className="w-6 h-6 rounded-full" />
                              <span className="text-sm">{user.firstname} {user.lastname}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => sharePost(post._id)}
                          className="mt-2 px-4 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Share
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}