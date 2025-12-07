import React from "react";
import { NavLink } from "react-router-dom";
import { Heart, Share2, MessageCircle, X } from "lucide-react";
import CommentSection from "./CommentSection";
import ShareContainer from "./ShareContainer";

export default function PostModal({
  isOpen,
  selectedPost,
  onClose,
  likedPosts = {},
  togglePostLike = () => {},
  activeCommentPost,
  setActiveCommentPost = () => {},
  activeSharePost,
  setActiveSharePost = () => {},
  comments = {},
  commentLoading = false,
  newCommentText = "",
  setNewCommentText = () => {},
  handleAddComment = () => {},
  replyingTo = null,
  startReply = () => {},
  replyText = "",
  setReplyText = () => {},
  handleReplySubmit = () => {},
  handleDeleteComment = () => {},
  currentUser = null,
}) {
  if (!isOpen || !selectedPost) return null;

  return (
    <div className="fixed inset-0 z-50 md:flex md:overflow-auto md:items-center md:justify-center sm:p-4 bg-black dark:bg-gray-800/90 bg-opacity-75 dark:bg-opacity-100 backdrop-blur-md transition-opacity">
      <div className="md:hidden w-screen h-screen bg-black flex flex-col relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200 flex items-center justify-center text-gray-800 transition-all"
        >
          <X size={20} />
        </button>
        <div 
          className="flex-1 flex items-center justify-center bg-black relative group"
        >
          {selectedPost.media?.url && (
            selectedPost.media.type === "photo" ? (
              <img
                src={selectedPost.media.url}
                alt="Post"
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                controls
                src={selectedPost.media.url}
                className="w-full h-full object-contain"
              />
            )
          )}
        </div>
        <div className="flex justify-around p-2 bg-black/80 backdrop-blur-sm border-t border-gray-700 flex-shrink-0">
          <button
            onClick={() => togglePostLike(selectedPost._id)}
            className="flex flex-col items-center text-gray-300 hover:text-red-500 transition-colors py-2"
          >
            <Heart className={`w-5 h-5 ${likedPosts[selectedPost._id] ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs mt-1">{selectedPost.likesCount}</span>
          </button>
          <button
            onClick={() => {
              setActiveCommentPost(selectedPost._id);
              setActiveSharePost(null);
            }}
            className="flex flex-col items-center text-gray-300 hover:text-red-500 transition-colors py-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs mt-1">{selectedPost.commentsCount}</span>
          </button>
          <button
            onClick={() => {
              setActiveSharePost(selectedPost._id);
              setActiveCommentPost(null);
            }}
            className="flex flex-col items-center text-white hover:text-blue-500 transition-colors py-2"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Comments overlay - slides in from bottom */}
        {activeCommentPost === selectedPost._id && (
          <div className="absolute inset-0 z-30 flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
              <h3 className="font-semibold text-white">Comments</h3>
              <button
                onClick={() => setActiveCommentPost(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <CommentSection
                postId={selectedPost._id}
                comments={comments[selectedPost._id] || []}
                currentUserId={currentUser?._id}
                newComment={newCommentText}
                setNewComment={setNewCommentText}
                addComment={handleAddComment}
                replyingTo={replyingTo}
                setReplyingTo={startReply}
                replyText={replyText}
                setReplyText={setReplyText}
                submitReply={(commentId) => handleReplySubmit(selectedPost._id, commentId)}
                handleDeleteComment={handleDeleteComment}
                loading={commentLoading}
              />
            </div>
          </div>
        )}

        {/* Share overlay - slides in from bottom */}
        {activeSharePost === selectedPost._id && (
          <div className="absolute inset-0 z-30 flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
              <h3 className="font-semibold text-white">Share Post</h3>
              <button
                onClick={() => setActiveSharePost(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              <ShareContainer
                isOpen={activeSharePost === selectedPost._id}
                onClose={() => setActiveSharePost(null)}
                postId={selectedPost._id}
              />
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Original side-by-side layout */}
      <div className="hidden md:flex relative flex-col overflow-auto md:flex-row bg-white dark:bg-black sm:rounded-2xl shadow-2xl w-full sm:w-[95vw] h-full sm:h-[90vh] max-w-6xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-all"
        >
          <X size={20} />
        </button>

        <div className="w-full md:w-3/5 flex items-center justify-center bg-black p-2 md:p-0">
          {selectedPost.media?.url && (
            selectedPost.media.type === "photo" ? (
              <img
                src={selectedPost.media.url}
                alt="Post"
                className="max-h-[30vh] sm:max-h-full max-w-full object-contain"
              />
            ) : (
              <video
                controls
                src={selectedPost.media.url}
                className="max-h-[30vh] sm:max-h-full max-w-full object-contain"
              />
            )
          )}
        </div>

        <div className="flex w-full md:w-2/5 overflow-y-auto flex-col h-full">
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
            <NavLink to={`/people/${selectedPost.user._id}`} className="flex items-center gap-3">
              <img src={selectedPost.user?.profilePic || '/dummy.png'} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
              <div>
                <span className="font-semibold text-gray-800 dark:text-white">{selectedPost.user.firstname} {selectedPost.user.lastname}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">@{selectedPost.user.username}</p>
              </div>
            </NavLink>
          </div>

          {selectedPost.caption && (
            <div className="p-3 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-800">
              {selectedPost.caption}
            </div>
          )}

          <div className="flex justify-around p-1 sm:p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => togglePostLike(selectedPost._id)}
              className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
            >
              <Heart className={`w-6 h-6 ${likedPosts[selectedPost._id] ? "fill-red-500 text-red-500" : ""}`} />
              <span className="text-xs mt-1">Like ({selectedPost.likesCount})</span>
            </button>
            <button
              onClick={() => {
                setActiveCommentPost(selectedPost._id);
                setActiveSharePost(null);
              }}
              className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-teal-500 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs mt-1">Comment ({selectedPost.commentsCount})</span>
            </button>
            <button
              onClick={() => {
                setActiveSharePost(selectedPost._id);
                setActiveCommentPost(null);
              }}
              className="flex flex-col items-center text-white hover:text-blue-500 transition-colors"
            >
              <Share2 className="w-6 h-6" />
              <span className="text-xs mt-1">Share</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-auto">
            {activeCommentPost === selectedPost._id && (
              <div className="flex-1 overflow-hidden">
                <CommentSection
                  postId={selectedPost._id}
                  comments={comments[selectedPost._id] || []}
                  currentUserId={currentUser?._id}
                  newComment={newCommentText}
                  setNewComment={setNewCommentText}
                  addComment={handleAddComment}
                  replyingTo={replyingTo}
                  setReplyingTo={startReply}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  submitReply={(commentId) => handleReplySubmit(selectedPost._id, commentId)}
                  handleDeleteComment={handleDeleteComment}
                  loading={commentLoading}
                />
              </div>
            )}

            {activeSharePost === selectedPost._id && (
              <div className="flex-1 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Share Post</h3>
                </div>
                <div className="p-4 overflow-y-auto">
                  <ShareContainer
                    isOpen={activeSharePost === selectedPost._id}
                    onClose={() => setActiveSharePost(null)}
                    postId={selectedPost._id}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
