import React, { useState, useEffect, useRef } from "react";
import { FaSignOutAlt } from "react-icons/fa";
import { Heart, MessageCircle, Share2, Trash, LogOut, Loader2 } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default function Home() {
  const scrollRef = useRef(null);
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
  // Initialize results as an object with users and community arrays
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
    const res = secureFetch("/auth/extractUser", {
      method: "GET",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setUserData(data);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
      });
  }, []);

  useEffect(() => {
    const fetchCommunities = async () => {
      const res = await secureFetch("/auth/community/communityDataBase", {
        method: "GET"
      })
      if (res.ok) {
        const data = await res.json();
        setCommunities(data);
        setLoadingCommunities(false);
      }
    }
    fetchCommunities();

  }, []);

  const logout = async () => {
    await secureFetch("/auth/logout", { method: "POST" });
    navigate("/");
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await secureFetch("/auth/posts/getPosts?page=1&limit=10", {
        method: "GET",
      });
      const data = await response.json();
      setPosts(data);

      const likedStatus = {};
      await Promise.all(
        data.map(async (post) => {
          const resLike = await secureFetch(`/auth/posts/${post._id}/liked`, {
            method: "GET",
          });
          likedStatus[post._id] = resLike.ok ? (await resLike.json()).liked : false;
        })
      );
      setLikedPosts(likedStatus);
    } catch (e) {
      console.error("Post fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId) => {
    const response = await secureFetch(`/auth/posts/${postId}/comments`, {
      method: "GET"
    });
    const data = await response.json();
    setComments((prev) => ({ ...prev, [postId]: data }));
  };

  const togglePostLike = async (postId) => {
    try {
      const isLiked = likedPosts[postId];
      const endpoint = isLiked ? "unlike" : "like";

      const res = await secureFetch(`/auth/posts/${postId}/${endpoint}`, {
        method: "POST"
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

  const addComment = async (postId) => {
    if (!newComment.trim()) return;
    const res = await secureFetch(`/auth/posts/${postId}/comment`, {
      method: "POST",
      body: JSON.stringify({ content: newComment }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => ({
        ...prev,
        [postId]: [data.comment, ...(prev[postId] || [])],
      }));
      setNewComment("");
    }
  };

  const submitReply = async (postId, commentId) => {
    if (!replyText.trim()) return;
    await secureFetch(`/auth/posts/${postId}/comment/${commentId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText }),
    });
    fetchComments(postId);
    setReplyingTo(null);
    setReplyText("");
  };

  const sharePost = async (postId) => {
    console.log(`Shared with ${selectedUsers.length} user(s)`);
    await secureFetch(`/auth/posts/${postId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: selectedUsers.map((u) => u._id) }),
    });
    setSelectedUsers([]);
    setOpenShareFor(null);
  };

  const handleDeleteComment = async (c) => {
    if (
      !confirm(
        "Are you sure you want to delete this comment? This action cannot be undone."
      )
    )
      return;
    const postId = c.post;
    try {
      const res = await secureFetch(
        `/auth/posts/comment/${c._id}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        fetchComments(postId);
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? { ...post, commentsCount: (post.commentsCount || 0) - 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const shareSearchUsers = async () => {
    try {
      const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${encodeURIComponent(shareSearch)}`, {
        method: "GET",
      });
      const data = await res.json();
      setResults1({
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
  }, [shareSearch])

  const searchUsers = async () => {
    const res = await secureFetch(`/auth/posts/search/users?query=${encodeURIComponent(searchTerm)}`, {
      method: "GET",
    });
    const data = await res.json();
    setResults({
      users: data.users || [],
      community: data.community || [],
    });
  };

  useEffect(() => {
    fetchPosts();
  }, []);
  useEffect(() => {
    searchUsers()
  }, [searchTerm])

  useEffect(() => {
    if (!loadingCommunities) {
      const scrollContainer = scrollRef.current;
      let scrollAmount = 0;

      const scrollInterval = setInterval(() => {
        if (!scrollContainer) return;

        scrollAmount += 1;
        scrollContainer.scrollLeft += 1;

        if (scrollContainer.scrollLeft + scrollContainer.offsetWidth >= scrollContainer.scrollWidth) {
          scrollAmount = 0;
          scrollContainer.scrollLeft = 0;
        }
      }, 30);

      return () => clearInterval(scrollInterval);
    }
  }, [loadingCommunities]);

  // Find the selected post for the split view
  const selectedPost = posts.find(post => post._id === openCommentsFor || post._id === openShareFor);

  return (
    <div className="w-full md:w-5/6 mx-auto px-0 py-6 mb-10 relative md:ml-20 lg:ml-24">

      {/* Header Container - Premium Design */}
      <div className="flex flex-col gap-4 px-6 py-4 mb-8 bg-white rounded-xl shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-opacity-90">
        <div className="flex items-center justify-between gap-4">
          <div className="w-10 h-10 rounded-lg hidden bg-gradient-to-r from-teal-800 to-teal-600 md845:flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>

          {/* Search Input Container */}
          <div className="relative flex-1 max-w-md mx-4">
            <input
              type="text"
              placeholder="Search people, communities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 bg-gray-50 text-gray-800 rounded-xl px-4 pl-10 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white transition-all duration-300 shadow-sm"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Community Button */}
            <NavLink
              to="/createCommunity"
              className="flex items-center justify-center h-10 px-3 rounded-xl bg-gradient-to-r from-teal-50 to-purple-50 text-teal-800 hover:from-blue-100 hover:to-purple-100 transition-all duration-300 group"
              title="Create Community"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-r from-teal-800 to-teal-500 flex items-center justify-center sm:mr-2  transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="font-medium text-sm hidden sm:inline-block">
                Community
              </span>
            </NavLink>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center justify-center h-10 px-3 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-300 group"
              title="Logout"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center sm:mr-2 group-hover:from-gray-600 group-hover:to-gray-700 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="font-medium text-sm hidden sm:inline-block">
                Logout
              </span>
            </button>
          </div>
        </div>

        {/* Search Results - Premium Dropdown (moved outside the relative search input container) */}
        <div className={`${(searchTerm === "" || (results.users?.length === 0 && results.community?.length === 0)) ? "hidden" : ""} w-full max-h-72 overflow-y-auto border border-gray-200 rounded-xl shadow-xl bg-white backdrop-blur-sm bg-opacity-95 z-20`}>
          {(results.users?.length > 0 || results.community?.length > 0) && (
            <div className="flex flex-col">
              {results.users?.map((res) => (
                <div
                  key={res._id}
                  className="flex items-center w-full  gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                >
                  <NavLink to={`/people/${res._id}`} className="flex gap-3 items-center flex-1">
                    <div className="relative">
                      <img
                        src={res.profilePic}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <strong className="text-gray-800">{res.firstname} {res.lastname}</strong>
                    </div>
                  </NavLink>
                </div>
              ))}

              {results.community?.map((res) => (
                <div
                  key={res._id}
                  className="flex items-center w-full gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                >
                  <NavLink to={`/community/${res._id}`} className="flex gap-3 items-center flex-1">
                    <div className="relative">
                      <img
                        src={res.profilePic}
                        alt=""
                        className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-purple-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <strong className="text-gray-800">{res.name}</strong>
                    </div>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Communities Section  */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto border-b-2 border-gray-300 scrollbar-hide mb-8"
      >
        <div className="flex space-x-4 w-max mx-auto px-1 py-2">
          {loadingCommunities ? (
            <div className="flex justify-center items-center h-32 w-full">
              <div className="relative w-64 h-2 bg-gray-300 overflow-hidden rounded-full">
                <div className="absolute inset-0 bg-gradient-to-tl from-teal-800 via-gray-700 to-amber-800 w-1/3 h-full animate-slide" />
              </div>
            </div>

          ) : (
            <div className="flex space-x-4 w-max mx-auto">
              {communities.map((community) => (
                <div
                  key={community._id}
                  className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
                >
                  <NavLink to={`/community/${community._id}`} className="relative flex flex-col items-center">
                    <div className="relative w-32 h-32 rounded-2xl flex flex-col items-center justify-center p-1 bg-gradient-to-tl from-teal-800 via-blue-900 to-amber-800 shadow-lg">
                      <div className="w-full h-full rounded-lg bg-gradient-to-br from-teal-800 to-yellow-800 flex flex-col items-center justify-center overflow-hidden p-2">
                        <img
                          src={community.profilePic}
                          alt={community.name}
                          className="w-16 h-16 rounded-full object-cover mb-2 shadow-sm"
                        />
                        <h2 className="text-xs font-semibold text-gray-800 truncate w-full text-center">
                          {community.name}
                        </h2>
                        <p className="text-[10px] text-gray-500 mt-1">
                          by {community.creator.firstname}
                        </p>
                      </div>
                    </div>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full flex flex-col lg:flex-row gap-6 justify-center">
        <div className="flex-1 space-y-6 max-w-2xl w-full mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-700 border-t-gray-400 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-gradient-to-r from-black to-gray-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => {
              const isCaptionOpen = expandedCaptions[post._id];

              return (
                <div key={post._id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                  {/* Post Header */}
                  <div className="flex items-center justify-between p-4">
                    <NavLink to={`/people/${post.user._id}`} className="flex items-center gap-3">
                      <div className="relative">
                        <img src={post.user?.profilePic} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-gray-800">{post.user.firstname + " " + post.user.lastname}</span>
                        <p className="text-xs text-gray-500">@{post.user.username}</p>
                      </div>
                    </NavLink>
                    
                  </div>

                  {/* Post Media */}
                  {post.media?.url && (
                    <div className="w-full bg-gray-50 flex justify-center items-center">
                      {post.media.type === "photo" ? (
                        <img
                          src={post.media.url}
                          alt="Post"
                          className="w-full object-contain max-h-[600px]"
                        />
                      ) : (
                        <video
                          controls
                          src={post.media.url}
                          className="w-full object-contain max-h-[600px]"
                        />
                      )}
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex justify-between items-center p-3">
                    <div className="flex gap-4">
                      <button onClick={() => togglePostLike(post._id)} className="flex items-center gap-1 group">
                        <div className="relative">
                          <svg xmlns="http://www.w3.org/2000/svg"
                            className={`h-6 w-6 ${likedPosts[post._id] ? "text-green-500 fill-green-500" : "text-gray-600 group-hover:text-green-500"}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <span className={`text-sm ${likedPosts[post._id] ? "text-green-500" : "text-gray-600"}`}>
                          {post.likesCount}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setOpenCommentsFor((prev) => {
                            const newOpenCommentsFor = prev === post._id ? null : post._id;
                            if (newOpenCommentsFor === post._id) { // Only fetch if it's being opened
                              fetchComments(post._id);
                            }
                            return newOpenCommentsFor;
                          });
                        }}
                        className="flex items-center gap-1 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 group-hover:text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm text-gray-600 group-hover:text-teal-500">
                          {post.commentsCount}
                        </span>
                      </button>
                      <button
                        onClick={() => setOpenShareFor((prev) => (prev === post._id ? null : post._id))}
                        className="group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 group-hover:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeLineWidth="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                    
                  </div>

                  {/* Post Caption */}
                  <div className="px-4 pb-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{post.user.firstname + " " + post.user.lastname}</span>{" "}
                      {isCaptionOpen || post.caption.length <= 60 ? post.caption : post.caption.slice(0, 60) + "..."}
                      {post.caption.length > 60 && (
                        <button
                          className="text-gray-500 ml-1 text-xs hover:text-teal-500"
                          onClick={() =>
                            setExpandedCaptions((prev) => ({ ...prev, [post._id]: !prev[post._id] }))
                          }
                        >
                          {isCaptionOpen ? "Show less" : "Show more"}
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

                  {/* Small Screen Comments Panel - Below Post */}
                  {openCommentsFor === post._id && (
                    <div className="lg:hidden p-4 border-t border-gray-100 bg-gray-50">
                      <h4 className="font-medium text-gray-700 mb-3">Comments</h4>
                      <div className="mb-3 flex items-start gap-2">
                        <img
                          src={userData?.user?.profilePic}
                          alt="Your profile"
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                        />
                        <div className="flex-1 bg-white rounded-xl shadow-sm">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full border-none rounded-xl p-3 text-sm resize-none focus:ring-1 focus:ring-teal-200"
                            rows="2"
                          ></textarea>
                          <div className="flex justify-end p-2">
                            <button
                              onClick={() => addComment(post._id)}
                              className="px-3 py-1 bg-gradient-to-r from-teal-800 to-black text-white text-sm font-medium rounded-lg hover:from-teal-800 hover:to-black transition-all "
                              disabled={!newComment.trim()}
                            >
                              comment
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-4 text-sm">
                        {(comments[post._id] || []).map((c) => (
                          <div key={c._id} className="flex flex-col">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <NavLink to={`/people/${c.author._id}`} className="flex-shrink-0">
                                  <img src={c.author?.profilePic} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                </NavLink>
                                <div className="bg-white p-3 rounded-xl shadow-sm flex-1">
                                  <div className="flex items-center gap-2">
                                    <NavLink to={`/people/${c.author._id}`} className="font-semibold text-gray-800 text-sm">
                                      {c.author?.firstname}
                                    </NavLink>
                                    <span className="text-gray-500 text-xs">
                                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 mt-1">{c.content}</p>
                                  <button
                                    onClick={() => setReplyingTo(c._id)}
                                    className="text-blue-500 text-xs mt-1"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                              {c.author?._id === userData?.user?._id && (
                                <button
                                  onClick={() => handleDeleteComment(c)}
                                  className="text-gray-400 hover:text-green-500 text-xs flex-shrink-0"
                                  title="Delete comment"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Reply Input */}
                            {replyingTo === c._id && (
                              <div className="mt-2 ml-12">
                                <div className="flex items-start gap-2">
                                  <img
                                    src={userData?.user?.profilePic}
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
                                        onClick={() => setReplyingTo(null)}
                                        className="px-2 py-1 text-gray-500 text-xs rounded hover:bg-gray-100"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => submitReply(post._id, c._id)}
                                        className="px-2 py-1 bg-teal-700 text-white text-xs rounded hover:bg-teal-900"
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Replies */}
                            {c.replies?.length > 0 && (
                              <div className="ml-12 mt-2 space-y-2">
                                {c.replies.map((r) => (
                                  <div key={r._id} className="flex items-start gap-2">
                                    <NavLink to={`/people/${r.author._id}`} className="flex-shrink-0">
                                      <img src={r.author?.profilePic} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                                    </NavLink>
                                    <div className="bg-white p-2 rounded-lg shadow-sm flex-1">
                                      <div className="flex items-center gap-2">
                                        <NavLink to={`/people/${r.author._id}`} className="font-semibold text-gray-800 text-xs">
                                          {r.author?.firstname}
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

                  {/* Small Screen Share Panel - Below Post (Moved inside posts.map) */}
                  {openShareFor === post._id && (
                    <div className="lg:hidden p-4 border-t border-gray-100 bg-gray-50 mt-4">
                      <h3 className="font-medium text-gray-700 mb-3">Share Post</h3>
                      <input
                        type="text"
                        value={shareSearch}
                        onChange={(e) => setShareSearch(e.target.value)}
                        placeholder="Search users to share..."
                        className="w-full border-b border-gray-200 outline-none p-2 text-sm resize-none"
                      />
                      {shareSearch.trim() !== "" && ( // Only show results when typing
                        <div className="space-y-2 max-h-40 overflow-y-auto mt-3">
                          {results1.users.map((u) => (
                            <div key={u._id} className="flex justify-between items-center">
                              <span>{u.firstname} {u.lastname}</span>
                              <input
                                type="checkbox"
                                checked={selectedUsers.find((sel) => sel._id === u._id)}
                                onChange={() =>
                                  setSelectedUsers((prev) =>
                                    prev.find((sel) => sel._id === u._id)
                                      ? prev.filter((sel) => sel._id !== u._id)
                                      : [...prev, u]
                                  )
                                }
                              />
                            </div>
                          ))}
                          {results1.community.map((u) => (
                            <div key={u._id} className="flex justify-between items-center">
                              <span>{u.name}</span>
                              <input
                                type="checkbox"
                                checked={selectedUsers.find((sel) => sel._id === u._id)}
                                onChange={() =>
                                  setSelectedUsers((prev) =>
                                    prev.find((sel) => sel._id === u._id)
                                      ? prev.filter((sel) => sel._id !== u._id)
                                      : [...prev, u]
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => sharePost(post._id)}
                        className="bg-gradient-to-tr from-teal-800 to-black text-white px-3 py-1 mt-3 rounded-md text-sm float-right"
                      >
                        Share
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Large Screen Comments/Share Modal */}
      {selectedPost && (openCommentsFor || openShareFor) && (
        <div className="hidden lg:fixed lg:inset-0 lg:flex lg:items-center lg:justify-center lg:bg-black lg:bg-opacity-50 lg:backdrop-blur-sm lg:z-50">
          <div className="relative flex bg-white rounded-2xl shadow-2xl overflow-hidden w-[90vw] h-[90vh] max-w-6xl">
            {/* Close Button */}
            <button
              onClick={() => {
                setOpenCommentsFor(null);
                setOpenShareFor(null);
                setReplyingTo(null);
                setNewComment("");
                setShareSearch("");
                setSelectedUsers([]);
              }}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left Side: Post Content */}
            <div className="w-1/2 flex items-center justify-center bg-black">
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

            {/* Right Side: Interactive Panel */}
            <div className="w-1/2 flex flex-col">
              {/* Post Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <NavLink to={`/people/${selectedPost.user._id}`} className="flex items-center gap-3">
                  <img src={selectedPost.user?.profilePic} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                  <div>
                    <span className="font-semibold text-gray-800">{selectedPost.user.firstname + " " + selectedPost.user.lastname}</span>
                    <p className="text-xs text-gray-500">@{selectedPost.user.username}</p>
                  </div>
                </NavLink>
              </div>

              {openCommentsFor && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Comments</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(comments[openCommentsFor] || []).map((c) => (
                      <div key={c._id} className="flex flex-col">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <NavLink to={`/people/${c.author._id}`} className="flex-shrink-0">
                              <img src={c.author?.profilePic} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            </NavLink>
                            <div className="bg-gray-50 p-3 rounded-xl flex-1">
                              <div className="flex items-center gap-2">
                                <NavLink to={`/people/${c.author._id}`} className="font-semibold text-gray-800 text-sm">
                                  {c.author?.firstname}
                                </NavLink>
                                <span className="text-gray-500 text-xs">
                                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-gray-700 mt-1">{c.content}</p>
                              <button
                                onClick={() => setReplyingTo(c._id)}
                                className="text-teal-700 text-xs mt-1"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                          {c.author?._id === userData?.user?._id && (
                            <button
                              onClick={() => handleDeleteComment(c)}
                              className="text-gray-400 hover:text-red-600 text-xs flex-shrink-0"
                              title="Delete comment"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Reply Input */}
                        {replyingTo === c._id && (
                          <div className="mt-2 ml-12">
                            <div className="flex items-start gap-2">
                              <img
                                src={userData?.user?.profilePic}
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
                                    onClick={() => setReplyingTo(null)}
                                    className="px-2 py-1 text-gray-500 text-xs rounded hover:bg-gray-100"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => submitReply(openCommentsFor, c._id)}
                                    className="px-2 py-1 bg-teal-700 text-white text-xs rounded hover:bg-teal-900"
                                  >
                                    Submit
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Replies */}
                        {c.replies?.length > 0 && (
                          <div className="ml-12 mt-2 space-y-2">
                            {c.replies.map((r) => (
                              <div key={r._id} className="flex items-start gap-2">
                                <NavLink to={`/people/${r.author._id}`} className="flex-shrink-0">
                                  <img src={r.author?.profilePic} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-200" />
                                </NavLink>
                                <div className="bg-white p-2 rounded-lg shadow-sm flex-1">
                                  <div className="flex items-center gap-2">
                                    <NavLink to={`/people/${r.author._id}`} className="font-semibold text-gray-800 text-xs">
                                      {r.author?.firstname}
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
                  {/* Input for new comment at the bottom of the large screen comment panel */}
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-start gap-2">
                      <img
                        src={userData?.user?.profilePic}
                        alt="Your profile"
                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      />
                      <div className="flex-1 bg-white rounded-xl shadow-sm">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full border-none rounded-xl p-3 text-sm resize-none focus:ring-1 focus:ring-blue-200"
                          rows="2"
                        ></textarea>
                        <div className="flex justify-end p-2">
                          <button
                            onClick={() => addComment(openCommentsFor)}
                            className="px-3 py-1 bg-gradient-to-r from-teal-800/60 to-black/60 text-white text-sm font-medium rounded-lg hover:from-teal-800 hover:to-black transition-all "
                            disabled={!newComment.trim()}
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {openShareFor && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Share Post</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <input
                      type="text"
                      value={shareSearch}
                      onChange={(e) => setShareSearch(e.target.value)}
                      placeholder="Search users to share..."
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200 mb-4"
                    />
                    <div className="space-y-3">
                      {shareSearch !== "" && results1.users.map((u) => (
                        <div key={u._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                            <img src={u.profilePic} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <span>{u.firstname} {u.lastname}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedUsers.find((sel) => sel._id === u._id)}
                            onChange={() =>
                              setSelectedUsers((prev) =>
                                prev.find((sel) => sel._id === u._id)
                                  ? prev.filter((sel) => sel._id !== u._id)
                                  : [...prev, u]
                              )
                            }
                            className="form-checkbox h-5 w-5 text-teal-700 rounded"
                          />
                        </div>
                      ))}
                      {shareSearch !== "" && results1.community.map((u) => (
                        <div key={u._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg shadow-sm">
                          <div className="flex items-center gap-3">
                            <img src={u.profilePic} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            <span>{u.name}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedUsers.find((sel) => sel._id === u._id)}
                            onChange={() =>
                              setSelectedUsers((prev) =>
                                prev.find((sel) => sel._id === u._id)
                                  ? prev.filter((sel) => sel._id !== u._id)
                                  : [...prev, u]
                              )
                            }
                            className="form-checkbox h-5 w-5 text-purple-600 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => sharePost(openShareFor)}
                      className="bg-gradient-to-r from-teal-800/60 to-black/60 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-teal-800 hover:to-black transition-all disabled:opacity-50"
                      disabled={selectedUsers.length === 0}
                    >
                      Share
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}