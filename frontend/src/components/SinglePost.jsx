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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto bg-white min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto bg-white min-h-screen">
        
        {/* Header */}
        <div className="sticky top-0 md:top-8 lg:top-4 z-10 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Post</h1>
              <p className="text-sm text-gray-500">by {post?.user?.firstname || "Unknown"}</p>
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="p-4">
          
          {/* Post Author */}
          <div className="flex items-center gap-3 mb-4">
            <NavLink to={`/people/${post.user._id}`}>
              <img 
                src={post?.user?.profilePic || '/dummy.png'} 
                alt="" 
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" 
              />
            </NavLink>
            <div className="flex-1">
              <NavLink 
                to={`/people/${post.user._id}`}
                className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                {post?.user?.firstname} {post?.user?.lastname}
              </NavLink>
              <p className="text-sm text-gray-500">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Post Caption */}
          {post.caption && (
            <div className="mb-4">
              <p className="text-gray-900 leading-relaxed">{post.caption}</p>
            </div>
          )}

          {/* Media Content */}
          {post.media?.type === "photo" && post.media?.url && (
            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={post.media.url}
                alt="Post media"
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {post.media?.type === "video" && post.media?.url && (
            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
              <video
                src={post.media.url}
                controls
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-4 py-3 border-b border-gray-200 mb-4">
            <button 
              onClick={toggleLike}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                liked ? 'bg-red-50 text-green-600' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span className="text-sm">{post.likesCount || 0}</span>
            </button>
            <button 
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{comments.length}</span>
            </button>
            <button 
              onClick={() => setSharePanelOpen(!sharePanelOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <Share className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </button>
          </div>

          {/* Share Panel */}
          {sharePanelOpen && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Share with</h4>
              <input
                type="text"
                value={shareSearch}
                onChange={(e) => setShareSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-3"
              />
              {shareSearch !== "" && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {results1.users?.map((u) => (
                    <label key={u._id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <img src={u.profilePic || '/dummy.png'} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-gray-900">{u.firstname} {u.lastname}</span>
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
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </label>
                  ))}
                  {results1.community?.map((u) => (
                    <label key={u._id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <img src={u.profilePic || '/dummyGroup.png'} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        <span className="text-gray-900">{u.name}</span>
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
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              )}
              <button
                onClick={sharePost}
                disabled={selectedUsers.length === 0}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
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