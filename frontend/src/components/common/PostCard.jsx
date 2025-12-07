import React from "react";
import { NavLink } from "react-router-dom";
import { Heart, MessageCircle, Share2, MoreVertical } from "lucide-react";
import LazyImage from "../LazyImage";

export default function PostCard({ post, children, onToggleLike, liked, onToggleComments, onToggleShare, expandedCaption, onToggleCaption }) {
  return (
    <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 transition-all duration-200 hover:shadow-sm">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-black">
        <NavLink to={`/people/${post.user._id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <LazyImage src={post.user?.profilePic || '/dummy.png'} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
          <div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{(post.user.firstname || '') + ' ' + (post.user.lastname || '')}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">@{post.user.username || 'user'}</p>
          </div>
        </NavLink>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Media */}
      {post.media?.url && (
        <div className="w-full bg-black">
          {post.media.type === "photo" ? (
            <LazyImage src={post.media.url} alt="Post" className="w-full object-cover max-h-96" />
          ) : (
            <video controls src={post.media.url} className="w-full object-cover max-h-96" />
          )}
        </div>
      )}

      {/* Actions & Caption */}
      <div className="px-4 py-3">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => onToggleLike?.(post._id)} 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group ${
              liked 
                ? 'text-red-500 bg-red-50 dark:bg-red-950/20' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
          >
            <Heart 
              className={`w-5 h-5 transition-transform duration-200 ${liked ? 'fill-current scale-110' : 'group-hover:scale-110'}`}
            />
            <span className="text-sm font-medium">{post.likesCount}</span>
          </button>

          <button 
            onClick={() => onToggleComments?.(post._id)} 
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all duration-200 group"
          >
            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-sm font-medium">{post.commentsCount}</span>
          </button>

          <button 
            onClick={() => onToggleShare?.(post._id)} 
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-all duration-200 group"
          >
            <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-sm font-medium">Share</span>
          </button>
        </div>

        <div className="mb-2">
          <p className="text-sm text-gray-900 dark:text-gray-100">
            <span className="font-semibold mr-2">{post.user.firstname + ' ' + post.user.lastname}</span>
            {expandedCaption || !post.caption ? post.caption : (post.caption.slice(0, 60) + (post.caption.length > 60 ? '...' : ''))}
            {post.caption && post.caption.length > 60 && (
              <button className="text-gray-500 dark:text-gray-400 ml-1 hover:text-gray-700 dark:hover:text-gray-200" onClick={() => onToggleCaption?.(post._id)}>
                {expandedCaption ? 'less' : 'more'}
              </button>
            )}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(post.createdAt).toLocaleString()}</p>
        </div>

        {/* children are expected to render comments / share panels when needed */}
        {children}
      </div>
    </div>
  );
}
