import React, { useState, useEffect } from 'react';
import SharePanel from './SharePanel';
import secureFetch from '../../utils/secureFetch';

/**
 * ShareContainer Component
 * 
 * Manages all share logic including:
 * - Search for users/communities to share with
 * - Selection management
 * - Share submission to backend
 * 
 * Props:
 * - isOpen: boolean - whether share panel is open
 * - onClose: function - callback when closing share panel
 * - postId: string - ID of post to share
 * - onShareSuccess: function - callback after successful share
 */
export default function ShareContainer({ isOpen, onClose, postId, onShareSuccess }) {
  const [shareSearch, setShareSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [results, setResults] = useState({ users: [], community: [] });
  const [loading, setLoading] = useState(false);

  // Search for users/communities
  useEffect(() => {
    const searchUsersForShare = async () => {
      if (shareSearch.trim() === '') {
        setResults({ users: [], community: [] });
        return;
      }
      try {
        const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${encodeURIComponent(shareSearch)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        setResults({
          users: data.users || [],
          community: data.community || [],
        });
      } catch (err) {
        console.error('Share search error:', err);
        setResults({ users: [], community: [] });
      }
    };

    const timeoutId = setTimeout(searchUsersForShare, 300);
    return () => clearTimeout(timeoutId);
  }, [shareSearch]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setShareSearch('');
      setSelectedUsers([]);
    }
  }, [isOpen]);

  // Handle share submission
  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);
    try {
      const res = await secureFetch(`/auth/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: selectedUsers.map((u) => u._id) }),
      });

      if (res.ok) {
        alert('Post shared successfully!');
        setSelectedUsers([]);
        setShareSearch('');
        onClose?.();
        onShareSuccess?.();
      } else {
        alert('Failed to share post');
      }
    } catch (err) {
      console.error('Share error:', err);
      alert('Error sharing post');
    } finally {
      setLoading(false);
    }
  };

  // Toggle user selection
  const toggleSelect = (u) => {
    setSelectedUsers((prev) => (
      prev.find((sel) => sel._id === u._id)
        ? prev.filter((sel) => sel._id !== u._id)
        : [...prev, u]
    ));
  };

  if (!isOpen) return null;

  return (
    <SharePanel
      shareSearch={shareSearch}
      setShareSearch={setShareSearch}
      results={results}
      selectedUsers={selectedUsers}
      toggleSelect={toggleSelect}
      onShare={handleShare}
    />
  );
}
