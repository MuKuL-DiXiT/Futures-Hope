// Home.jsx – Final Full Version
import React, { useState, useEffect } from "react";
import { FaSignOutAlt } from "react-icons/fa";
import { Heart, MessageCircle, Share2, Trash, LogOut } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default function Home() {
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
  const [results, setResults] = useState([]);
  const [results1, setResults1] = useState({ users: [], community: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [userData, setUserData] = useState(null);
  const [repliesOpen, setRepliesOpen] = useState(false);


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
    await secureFetch(`/auth/posts/${postId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: selectedUsers.map((u) => u._id) }),
    });
    alert(`Shared with ${selectedUsers.length} user(s)`);
    setSelectedUsers([]);
    setOpenShareFor(null);
  };

  // Delete a comment (only own)
  const handleDeleteComment = async (c) => {
    if (
      !window.confirm(
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
        // Update posts comments count
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
    setResults(data);
  };

  useEffect(() => {
    fetchPosts();
  }, []);
  useEffect(() => {
    searchUsers()
  }, [searchTerm])

  return (
    <div className="w-full md:w-5/6 md:px-32 mx-auto px-4 py-6 mb-10 relative">


      {/* Header Container */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 mb-4 sm:mb-8 bg-black/40 shadow-white rounded-xl shadow-lg backdrop-blur-md">
        {/* Search - Responsive width */}
        <div className="flex-1 min-w-0 max-w-xs sm:max-w-md lg:max-w-lg">
          <input
            type="text"
            placeholder="Search people / comm....."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 sm:h-10 bg-black/60 text-amber-600 rounded-lg px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base outline-none placeholder:text-gray-400 focus:ring-none transition-all"
          />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
          <button
            onClick={logout}
            className="flex items-center justify-center h-8 sm:h-10 gap-1 sm:gap-2 text-white px-2 sm:px-3 rounded-3xl hover:bg-white/30 hover:text-black transition-all duration-200 group"
          >
            <LogOut className="h-4 w-4 text-black sm:h-5 sm:w-5" />
            <span className="font-medium hidden md:inline-block text-black text-sm sm:text-base">Logout</span>
          </button>
          <NavLink
            to="/createCommunity"
            className="flex items-center justify-center text-black px-1 sm:px-2 md:px-3 rounded-3xl hover:bg-white/30 transition-all duration-200 group"
          >
            <img
              src="./community_logo.webp"
              alt="community"
              className="w-8 sm:w-12 md:w-16 h-auto"
            />
            <span className="font-semibold hidden lg:inline-block text-sm sm:text-base ml-1 sm:ml-2">Community</span>
          </NavLink>
        </div>
      </div>
      <div className={`${results.length === 0 ? "hidden" : ""} max-h-60 overflow-y-auto border border-gray-300 rounded-md shadow-black mb-5 shadow-md w-full`}>
        {(results.users?.length > 0 || results.community?.length > 0) && (
          <div className="flex flex-col">
            {results.users?.map((res) => (
              <div
                key={res._id}
                className="flex items-center w-full gap-2 p-2 hover:bg-black/20 cursor-pointer hover:shadow-black hover:shadow-lg hover:rounded-lg"
              >
                <NavLink to={`/people/${res._id}`} className="flex gap-3 items-center">
                  <img
                    src={res.profilePic}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <strong>{res.firstname} {res.lastname}</strong>
                </NavLink>
              </div>
            ))}

            {results.community?.map((res) => (
              <div
                key={res._id}
                className="flex items-center gap-2 p-2 hover:bg-black/20 cursor-pointer hover:shadow-black hover:shadow-lg hover:rounded-lg"
              >
                <NavLink to={`/community/${res._id}`} className="flex gap-3 items-center">
                  <img
                    src={res.profilePic}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <strong>{res.name}</strong>
                </NavLink>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {loading ? (
            <p className="text-center text-gray-600">Loading posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-center text-gray-500 italic">No posts yet.</p>
          ) : (
            posts.map((post) => {
              const isCommentOpen = openCommentsFor === post._id;
              const isShareOpen = openShareFor === post._id;
              const isCaptionOpen = expandedCaptions[post._id];

              return (
                <div key={post._id} className=" p-4  mb-6 mx-auto lg:mx-0">
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
                  <p className="mb-2">
                    {isCaptionOpen || post.caption.length <= 60 ? post.caption : post.caption.slice(0, 60) + "..."}
                    {post.caption.length > 60 && (
                      <button
                        className="text-green-700 ml-2"
                        onClick={() =>
                          setExpandedCaptions((prev) => ({ ...prev, [post._id]: !prev[post._id] }))
                        }
                      >
                        {isCaptionOpen ? "Show less" : "See more"}
                      </button>
                    )}
                  </p>

                  <div className="flex justify-around mb-2 text-gray-700">
                    <button onClick={() => togglePostLike(post._id)}>
                      <Heart className={likedPosts[post._id] ? "text-green-600" : ""} /> {post.likesCount}
                    </button>
                    <button
                      onClick={() => {
                        setOpenCommentsFor((prev) => (prev === post._id ? null : post._id));
                        if (openCommentsFor !== post._id) fetchComments(post._id);
                      }}
                    >
                      <MessageCircle /> {post.commentsCount}
                    </button>
                    <button
                      onClick={() => setOpenShareFor((prev) => (prev === post._id ? null : post._id))}
                    >
                      <Share2 />
                    </button>
                  </div>

                  {/* Comment + Share panel on mobile */}
                  {isCommentOpen && (
                    <div className="lg:hidden mt-4 border-t pt-4 bg-white/10">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full border-none outline-none rounded p-2 mb-2 bg-black/50 text-white"
                      ></textarea>
                      <button
                        onClick={() => addComment(post._id)}
                        className="bg-yellow-800/70 text-black px-4 py-1 rounded mb-2"
                      >
                        Post Comment
                      </button>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {(comments[post._id] || []).map((c) => (
                          <div key={c._id} className="border-t pt-2">

                            <div className="flex justify-between gap-2 items-center">
                              <div className="flex items-center justify-center gap-2">
                                <NavLink to={`/people/${c.author._id}`} className="flex gap-3 items-center">
                                  <img src={c.author?.profilePic} alt="" className="w-10 h-10 rounded-full" />
                                  <strong>@{c.author?.firstname}</strong>:
                                </NavLink>
                                {c.content}
                              </div>
                              {c.author?._id == userData.user._id && (
                                <button
                                  onClick={() => handleDeleteComment(c)}
                                  className="text-red-500  hover:text-red-700 font-bold ml-2"
                                  title="Delete comment"
                                >
                                  <Trash />
                                </button>
                              )}
                            </div>
                            {replyingTo !== c._id ? (
                              <button
                                onClick={() => setReplyingTo(c._id)}
                                className="text-xs text-green-700 mt-1"
                              >
                                Reply
                              </button>
                            ) : (
                              <div className="mt-1">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="w-full border-none outline-none p-1 text-black  text-xs rounded bg-black/50 "
                                  placeholder="Write a reply..."
                                ></textarea>
                                <div className="flex justify-end gap-2 mt-1">
                                  <button
                                    onClick={() => setReplyingTo(null)}
                                    className="text-gray-500 text-xs"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => submitReply(openCommentsFor, c._id)}
                                    className="text-green-700 text-xs"
                                  >
                                    Submit
                                  </button>
                                </div>
                              </div>
                            )}
                            <br />
                            {c.replies?.length > 0 && repliesOpen && (
                              <div className="ml-4 mt-1 max-h-32 bg-transparent p-3 rounded-md overflow-y-auto space-y-1">
                                {c.replies.map((r) => (
                                  <div key={r._id} className="flex gap-1">
                                    <NavLink to={`/people/${r.author._id}`} className="flex gap-3 items-center">
                                      <strong>@{r.author?.firstname}</strong>:
                                    </NavLink>
                                    {r.content}
                                  </div>
                                ))}
                              </div>
                            )}
                            <button className="bg-none text-sm font-bold border-none text-green-700" onClick={() => setRepliesOpen(!repliesOpen)}>
                              {(repliesOpen ? <p>hide replies</p> : <p>show replies</p>)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isShareOpen && (
                    <div className="lg:hidden mt-4 border-t pt-4">
                      <input
                        type="text"
                        value={shareSearch}
                        onChange={(e) => setShareSearch(e.target.value)}
                        placeholder="Search users to share..."
                        className="w-full border-none rounded p-2 mb-2 bg-black/50 text-white outline-none"
                      />
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {shareSearch != "" && results1.users.map((u) => (
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
                        {shareSearch != "" && results1.community.map((u) => (
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
                      <button
                        onClick={() => sharePost(post._id)}
                        className="bg-yellow-800/70 text-black px-4 py-1 mt-2 rounded"
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

        {/* Right Panel for Large Screens */}
        {(openCommentsFor || openShareFor) && (
          <div className="hidden lg:flex lg:w-96 lg:h-[90vh] lg:sticky lg:top-20 lg:self-start bg-transparent border-1 border-gray-300 p-4 shadow-lg overflow-y-auto flex-col">
            <div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full min-h-16 border-none outline-none bg-black/50 text-white rounded p-2 mb-2"
              ></textarea>
              <button
                onClick={() => addComment(openCommentsFor)}
                className="bg-yellow-800/70 text-black px-4 py-1 rounded mb-4"
              >
                Post Comment
              </button>
            </div>
            {openCommentsFor && (
              <>
                <h3 className="text-lg font-semibold mb-4">Comments</h3>

                <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
                  {(comments[openCommentsFor] || []).map((c) => (
                    <div key={c._id} className="pt-2">

                      <div className="flex justify-between overflow-y-auto gap-2 items-center">
                        <div className="flex items-center overflow-y-auto justify-center gap-2">
                          <NavLink to={`/people/${c.author._id}`} className="flex gap-3 items-center">
                            <img src={c.author?.profilePic} alt="" className="w-10 h-10 rounded-full" />
                            <strong>@{c.author?.firstname}</strong>:
                          </NavLink>
                          {c.content}
                        </div>
                        {c.author?._id == userData.user._id && (
                          <button
                            onClick={() => handleDeleteComment(c)}
                            className="text-red-500  hover:text-red-700 font-bold ml-2"
                            title="Delete comment"
                          >
                            <Trash />
                          </button>
                        )}
                      </div>
                      {replyingTo !== c._id ? (
                        <button
                          onClick={() => setReplyingTo(c._id)}
                          className="text-xs text-green-700 mt-1"
                        >
                          Reply
                        </button>
                      ) : (
                        <div className="mt-1">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full border-none p-1 bg-black/50 text-white outline-none text-xs rounded"
                            placeholder="Write a reply..."
                          ></textarea>
                          <div className="flex justify-end gap-2 mt-1">
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="text-gray-500 text-xs"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => submitReply(openCommentsFor, c._id)}
                              className="text-green-700 text-xs"
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      )}
                      <br />
                      {c.replies?.length > 0 && repliesOpen && (
                        <div className="ml-4 mt-1 max-h-32 text-xs bg-transparent p-3 rounded-md overflow-y-auto space-y-1">
                          {c.replies.map((r) => (
                            <div key={r._id} className="flex gap-1">
                              <NavLink to={`/people/${r.author._id}`} className="flex gap-3 items-center">
                                <strong>@{r.author?.firstname}</strong>:
                              </NavLink>
                              {r.content}
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="bg-none text-sm font-bold border-none text-green-700" onClick={() => setRepliesOpen(!repliesOpen)}>
                        {(repliesOpen ? <p>hide replies</p> : <p>show replies</p>)}
                      </button>

                    </div>
                  ))}
                </div>

              </>
            )}

            {openShareFor && (
              <>
                <h3 className="text-lg font-semibold mb-4">Share Post</h3>
                <input
                  type="text"
                  value={shareSearch}
                  onChange={(e) => setShareSearch(e.target.value)}
                  placeholder="Search users to share..."
                  className="w-full border-none outline-none bg-black/50 rounded p-2 mb-2 "
                />
                <div className="space-y-2">
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
                <button
                  onClick={() => sharePost(openShareFor)}
                  className="bg-yellow-800/70 text-white px-4 py-1 mt-4 rounded"
                >
                  Share
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
