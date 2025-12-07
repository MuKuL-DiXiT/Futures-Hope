import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import secureFetch from "../utils/secureFetch";
import { Heart, MessageCircle, Share, Trash } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import PostCard from "./common/PostCard";
import CommentSection from "./common/CommentSection";
import SharePanel from "./common/SharePanel";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto bg-white dark:bg-black min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto bg-white dark:bg-black min-h-screen">
        
        {/* Header */}
        <div className="sticky top-0 md:top-8 lg:top-4 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Post</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">by {post?.user?.firstname || "Unknown"}</p>
            </div>
          </div>
        </div>

        <PostCard
          post={post}
          liked={liked}
          onToggleLike={() => toggleLike()}
          onToggleComments={() => fetchComments()}
          onToggleShare={() => setSharePanelOpen((s) => !s)}
          expandedCaption={false}
          onToggleCaption={() => {}}
        >
          {/* Render share panel inside post card when requested */}
          {sharePanelOpen && (
            <SharePanel
              shareSearch={shareSearch}
              setShareSearch={setShareSearch}
              results={results1}
              selectedUsers={selectedUsers}
              toggleSelect={(u) => {
                setSelectedUsers((prev) => (
                  prev.find((x) => x._id === u._id) ? prev.filter((x) => x._id !== u._id) : [...prev, u]
                ));
              }}
              onShare={() => sharePost()}
            />
          )}

          {/* Comments section */}
          <CommentSection
            postId={post._id}
            comments={comments}
            userData={userData}
            newComment={newComment}
            setNewComment={setNewComment}
            addComment={addComment}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyText={replyText}
            setReplyText={setReplyText}
            submitReply={submitReply}
            handleDeleteComment={handleDeleteComment}
            loading={false}
          />
        </PostCard>
      </div>
      
    </div>
  );
}