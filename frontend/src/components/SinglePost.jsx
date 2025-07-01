import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Share, Trash } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";

export default function SinglePost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [shareSearch, setShareSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [results1, setResults1] = useState({ users: [], community: [] });
  const [userData, setUserData] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);

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
    secureFetch("/auth/extractUser", { method: "GET" })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setUserData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    async function fetchPost() {
      const res = await secureFetch(`/auth/posts/one/${postId}`);
      const data = await res.json();
      setPost(data);
      setLoading(false);
    }
    async function checkLiked() {
      const resLike = await secureFetch(`/auth/posts/${postId}/liked`);
      const likedState = resLike.ok ? (await resLike.json()).liked : false;
      setLiked(likedState);
    }
    fetchPost();
    checkLiked();
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    const res = await secureFetch(`/auth/posts/${postId}/comments`);
    const data = await res.json();
    setComments(data);
  };

  const toggleLike = async () => {
    const endpoint = liked ? "unlike" : "like";
    const res = await secureFetch(`/auth/posts/${postId}/${endpoint}`, { method: "POST" });
    if (res.ok) {
      setLiked(!liked);
      setPost(prev => ({ ...prev, likesCount: prev.likesCount + (liked ? -1 : 1) }));
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    const res = await secureFetch(`/auth/posts/${postId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    const data = await res.json();
    setComments(prev => [data.comment, ...prev]);
    setNewComment("");
    setPost(prev => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
  };

  const handleDeleteComment = async (commentId) => {
    const res = await secureFetch(`/auth/posts/comment/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      fetchComments();
      setPost(prev => ({ ...prev, commentsCount: prev.commentsCount - 1 }));
    }
  };

  const submitReply = async (commentId) => {
    if (!replyText.trim()) return;
    await secureFetch(`/auth/posts/${postId}/comment/${commentId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText }),
    });
    fetchComments();
    setReplyingTo(null);
    setReplyText("");
  };

  const shareSearchUsers = async () => {
    try {
      const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${encodeURIComponent(shareSearch)}`);
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

  const sharePost = async () => {
    await secureFetch(`/auth/posts/${postId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: selectedUsers.map((u) => ({ _id: u._id, type: u.name ? 'community' : 'user' })) }),
    });
    alert("Post shared!");
    setSelectedUsers([]);
  };

  useEffect(() => {
    shareSearchUsers();
  }, [shareSearch]);

  if (loading || !post) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="flex justify-center items-center h-40">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-green-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>    </div>
  );

  return (
    <div className="min-h-screen w-full bg-transparent py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Main Post Card */}
        <div className="bg-teal-950/80 rounded-xl shadow-lg p-6 mb-6">
          {/* Post Content */}
          <div className="mb-4">
            <h1 className="text-xl  text-gray-400 leading-relaxed">
              <span className="text-green-500">About this post:</span> <br /> {post.caption}
            </h1>
          </div>

          {/* Media Content */}
          {post.media?.type === "photo" && post.media?.url && (
            <div className="mb-4 flex justify-center">
              <img
                src={post.media.url}
                alt="shared"
                className="rounded-lg max-h-96 object-contain shadow-md"
              />
            </div>
          )}

          {post.media?.type === "video" && post.media?.url && (
            <div className="mb-4 flex justify-center">
              <video
                src={post.media.url}
                controls
                className="rounded-lg max-h-96 object-contain shadow-md"
              />
            </div>
          )}

          {/* Post Meta */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
            <NavLink to={`/people/${post.user._id}`} className="text-sm text-gray-400">
              Posted by: <span className="text-gray-300 font-medium">{post?.user?.firstname || "Unknown"}</span>
            </NavLink>
          </div>

          {/* Engagement Buttons */}
          <div className="flex items-center gap-8 mb-6">
            <button
              onClick={toggleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${liked
                ? "text-green-500 bg-red-500/10 hover:bg-red-500/20"
                : "text-gray-400 hover:text-green-500 hover:bg-red-500/10"
                }`}
            >
              <Heart size={20} fill={liked ? "currentColor" : "none"} />
              <span className="font-medium">{post.likesCount}</span>
            </button>

            <div className="flex items-center gap-2 text-gray-400">
              <MessageCircle size={20} />
              <span className="font-medium">{post.commentsCount}</span>
            </div>

            <button
              onClick={() => setSharePanelOpen(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${sharePanelOpen
                ? "text-blue-500 bg-blue-500/10"
                : "text-gray-400 hover:text-blue-500 hover:bg-blue-500/10"
                }`}
            >
              <Share size={20} />
              <span className="font-medium">{post.sharesCount}</span>
            </button>
          </div>

          {/* Share Panel */}
          {sharePanelOpen && (
            <div className="bg-transparent rounded-lg p-4 mb-6">
              <h3 className="text-white font-medium mb-3">Share with friends</h3>
              <input
                type="text"
                value={shareSearch}
                onChange={(e) => setShareSearch(e.target.value)}
                placeholder="Search users to share..."
                className="w-full p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
              />

              {shareSearch !== "" && (
                <div className="mt-3 max-h-48 overflow-y-auto space-y-2">
                  {results1.users.map((u) => (
                    <label key={u._id} className="flex items-center justify-between p-2 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-500 transition-colors">
                      <span className="text-white">{u.firstname} {u.lastname}</span>
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
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  ))}
                  {results1.community.map((u) => (
                    <label key={u._id} className="flex items-center justify-between p-2 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-500 transition-colors">
                      <span className="text-white">{u.name}</span>
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
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              )}

              <button
                onClick={sharePost}
                disabled={selectedUsers.length === 0}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Share Post ({selectedUsers.length})
              </button>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="bg-transparent rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Comments</h2>

          {/* Add Comment */}
          <div className="mb-6">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full p-4 rounded-lg bg-black/40 text-white placeholder-gray-400 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none transition-colors"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Post Comment
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map(c => (
                <div key={c._id} className="bg-transparent rounded-lg p-4">
                  {/* Comment Header */}
                  <div className="flex items-center justify-between mb-2">
                    <NavLink to={`/people/${c.author._id}`} className="flex gap-2 items-center justify-start">
                      <img src={c.author.profilePic} alt="" className="w-8 h-8 object-cover rounded-full" />
                      <span className="text-blue-400 font-medium">@{c.author?.firstname}</span>
                    </NavLink>
                    {c.author?._id === userData?.user?._id && (
                      <button
                        onClick={() => handleDeleteComment(c._id)}
                        className="text-red-500 flex items-center hover:text-red-800 text-sm transition-colors"
                      >
                        <Trash /> Delete
                      </button>
                    )}
                  </div>

                  {/* Comment Content */}
                  <p className="text-black mb-3 leading-relaxed">{c.content}</p>

                  {/* Comment Actions */}
                  <div className="flex items-center gap-4">
                    {replyingTo !== c._id ? (
                      <button
                        onClick={() => setReplyingTo(c._id)}
                        className="text-sm text-green-400 hover:text-green-300 transition-colors"
                      >
                        Reply
                      </button>
                    ) : (
                      <div className="w-full">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full p-3 rounded-lg bg-gray-600 text-white placeholder-gray-400 border border-gray-500 focus:border-green-500 focus:outline-none resize-none transition-colors"
                          placeholder="Write a reply..."
                          rows={2}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="text-gray-400 hover:text-gray-300 text-sm px-3 py-1 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => submitReply(c._id)}
                            disabled={!replyText.trim()}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm px-4 py-1 rounded transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}

                    {c.replies?.length > 0 && (
                      <button
                        onClick={() => setRepliesOpen(!repliesOpen)}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {repliesOpen ? "Hide replies" : `Show ${c.replies.length} replies`}
                      </button>
                    )}
                  </div>

                  {/* Replies */}
                  {repliesOpen && c.replies?.length > 0 && (
                    <div className="mt-4 ml-4 space-y-3 border-l-2 border-gray-600 pl-4">
                      {c.replies.map(r => (
                        <div key={r._id} className="bg-gray-600/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-blue-400 font-medium text-sm">@{r.author?.firstname}</span>
                          </div>
                          <p className="text-white text-sm leading-relaxed">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}