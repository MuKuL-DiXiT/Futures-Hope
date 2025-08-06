import React, { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { Send, ArrowLeft, Trash } from "lucide-react";
import { NavLink, useLocation } from 'react-router-dom';

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default function Messages() {
  const location = useLocation();
  const initialChat = location.state?.chat;
  const [panelStatus, setPanelStatus] = useState(false);
  const [chatData, setChatData] = useState({ chats: [], userId: null });
  const [loading, setLoading] = useState(false);
  const [chatOpened, setChatOpened] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [results, setResults] = useState({ users: [], community: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [chatWith, setChatWith] = useState({});
  const [error, setError] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const currentUserId = chatData?.userId;
  const messagesEndRef = useRef(null);
  const [showOptions, setShowOptions] = useState(null);
  const timeoutRef = useRef(null);
  const [community, setCommunity] = useState("");


  async function secureFetch(path, options = {}) {
    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    const url = `${baseUrl}${path}`;
    let res = await fetch(url, { ...options, credentials: "include" });
    if (res.status === 401) {
      const refresh = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refresh.ok) return fetch(url, { ...options, credentials: "include" });
      await fetch(`${baseUrl}/auth/logout`, { method: "GET", credentials: "include" });
      throw new Error("Session expired. Logged out.");
    }
    return res;
  }

  useEffect(() => {
    const fetchChatData = async () => {
      setLoading(true);
      try {
        const response = await secureFetch("/auth/chat");
        if (!response.ok) throw new Error(`Failed to fetch chat data: ${response.status}`);
        const data = await response.json();
        setChatData(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChatData();
  }, []);

  useEffect(() => {
    if (initialChat && currentUserId) {
      socket.emit("joinRoom", initialChat._id);
      setPanelStatus(true);
      setChatOpened(initialChat._id);
      setChatWith(initialChat.participants.find((p) => p._id !== currentUserId));
      getMessages(initialChat._id);
    }
  }, [initialChat, currentUserId]);


  const createChat = async (targetId) => {
    setLoading(true);
    try {
      const response = await secureFetch(`/auth/chat/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId }),
      });
      if (response.ok) {
        const data = await response.json();
        socket.emit("joinRoom", data._id);
        setPanelStatus(true);
        setChatOpened(data._id);
        setChatWith(data.participants.find((p) => p._id !== currentUserId));
        getMessages(data._id);
      }
    } catch (error) {
      console.error("Couldn't create/fetch chat:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleReceiveMessage = (newMessage) => {
      if (newMessage.chat._id?.toString() === chatOpened?.toString()) {
        setChatMessages((prev) => [...prev, newMessage]);
      }
      setChatData(prevData => ({
        ...prevData,
        chats: prevData.chats.map(chat =>
          chat._id === newMessage.chat._id
            ? { ...chat, lastMessage: newMessage }
            : chat
        )
      }));
    };
    socket.on("receiveMessage", handleReceiveMessage);
    if (chatOpened) socket.emit("markAsSeen", { chatId: chatOpened });
    return () => socket.off("receiveMessage", handleReceiveMessage);
  }, [chatOpened, currentUserId]);

  const getMessages = async (chatId) => {
    setLoading(true);
    try {
      socket.emit("joinRoom", chatId);
      const response = await secureFetch(`/auth/chat/messages/${chatId}`);
      if (!response.ok) throw new Error(`Failed to fetch messages: ${response.status}`);
      const data = await response.json();
      setCommunity(data?.community);
      setChatMessages(data.messages || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = useCallback(async () => {
    if (!searchTerm.trim()) { // Only search if searchTerm is not empty or just whitespace
      setResults({ users: [], community: [] });
      return;
    }
    try {
      const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      setResults({
        users: Array.isArray(data.users) ? data.users : [],
        community: Array.isArray(data.community) ? data.community : [],
      });
    } catch (err) {
      console.error("Error in searchUsers:", err);
      setResults({ users: [], community: [] });
    }
  }, [searchTerm]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchUsers();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, searchUsers]);


  const deleteMessage = (messageId) => {
    socket.emit("deleteMessage", messageId);
    setShowOptions(null);
  };

  const parseTextWithLinks = (text) => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const parts = [];
    let lastIndex = 0;
    const matches = text.matchAll(urlRegex);
    for (const match of matches) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) parts.push({ text: text.slice(lastIndex, start), isLink: false });
      parts.push({ text: match[0], isLink: true });
      lastIndex = end;
    }
    if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), isLink: false });
    return parts;
  };

  const isUnread = (msg) => {
    if (!msg || typeof msg !== "object") return false;
    if (!Array.isArray(msg.readBy)) return true;
    return !msg.readBy?.some((r) => (r.user?._id || r.user) === currentUserId);
  };

  useEffect(() => {
    if (chatOpened) messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [chatMessages, chatOpened]);

  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!chatOpened) return;
      try {
        await secureFetch(`/auth/chat/markasread/${chatOpened}`, { method: "PATCH" });
      } catch (err) {
        console.error("Failed to mark messages as read:", err);
      }
    };
    markMessagesAsRead();
  }, [chatOpened, messageContent]);

  useEffect(() => {
    const handleMessageDeleted = ({ messageId }) => {
      setChatMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId ? { ...msg, deleted: true } : msg
        )
      );
    };
    socket.on("messageDeleted", handleMessageDeleted);
    return () => socket.off("messageDeleted", handleMessageDeleted);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".message-bubble")) { // Changed to message-bubble
        setShowOptions(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full px-0 sm:px-0 md:pl-[80px] md:pr-4 md:mx-auto md:max-w-screen-xl pt-0">
      {/* Left Panel: Chat List & Search Results */}
      {/* The panelStatus logic controls visibility on small screens */}
      <div className={`md:bg-white bg-transparent overflow-y-auto w-full md:w-1/3 ${panelStatus ? "hidden md:inline-block" : "inline-block"} flex flex-col gap-2 pt-3 pb-20 md:pb-0 md:pt-8 rounded-lg shadow-lg`}>
        <div className="flex items-center mb-4 px-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-full px-4 py-2 w-full outline-none bg-gray-100 text-gray-800 placeholder-gray-500 border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
          />
        </div>

        {/* Search Results Panel - Always shown when searchTerm is not empty */}
        {searchTerm.trim() && (
          <div className="mx-4 mb-5 min-h-60 bg-white border border-gray-200 rounded-lg shadow-sm max-h-60 overflow-y-auto">
            {(results.users.length > 0 || results.community.length > 0) ? (
              <>
                {results.users.map((res) => (
                  <div
                    key={res._id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <button className="flex gap-3 items-center w-full text-left" onClick={() => createChat(res._id)}>
                      <img src={res.profilePic || 'dummy.png' || "/default-avatar.png"} alt="Profile" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      <strong className="text-gray-800 text-base">{res.firstname} {res.lastname || ""}</strong>
                    </button>
                  </div>
                ))}
                {results.community.map((res) => (
                  <div
                    key={res._id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <button className="flex gap-3 items-center w-full text-left" onClick={() => createChat(res._id)}>
                      <img src={res.profilePic || 'dummyGroup.png' || "/default-avatar.png"} alt="Community" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      <strong className="text-gray-800 text-base">@{res.name} (Community)</strong>
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm">No users or communities found.</p>
            )}
          </div>
        )}

        {/* Existing Chat List */}
        <div className="px-4 space-y-2">
          {chatData?.chats?.map((chat) => {
            const otherUser = chat.isGroupChat ? null : chat.participants.find((p) => p._id !== chatData.userId);
            const lastMsg = chat.lastMessage || { content: "No messages yet.", deleted: false, sender: { _id: null } };
            const hasUnreadMessage = isUnread(lastMsg) && lastMsg?.sender._id !== chatData.userId;

            // Consistent truncation for last message
            const displayLastMessage = lastMsg.deleted
              ? "message deleted 🚫"
              : lastMsg.content.length > 35 // Truncate after 35 characters for consistency
                ? lastMsg.content.slice(0, 32) + "..."
                : lastMsg.content;

            return (
              <div
                key={chat._id}
                className={`rounded-lg transition-all duration-200 ${chatOpened === chat._id ? 'bg-amber-100/50 shadow-inner' : 'hover:bg-amber-100/20'
                  }`}
              >
                <button
                  onClick={() => {
                    socket.emit("joinRoom", chat._id);
                    setPanelStatus(true);
                    setChatOpened(chat._id);
                    getMessages(chat._id);
                    setChatWith(chat.isGroupChat ? chat : otherUser);
                  }}
                  className="flex items-center justify-start gap-4 text-gray-800 w-full p-3"
                >
                  <img
                    src={
                      chat.isGroupChat
                        ? chat.groupImage || 'dummyGroup.png'
                        : otherUser?.profilePic || 'dummy.png'
                    }
                    alt="Chat avatar"
                    className="w-12 h-12 rounded-full object-cover border border-gray-300 flex-shrink-0"
                  />
                  <div className="flex flex-col items-start overflow-hidden flex-grow">
                    <div className="flex items-center w-full">
                      <strong className="text-lg text-black truncate flex-grow text-left">
                        {chat.isGroupChat
                          ? chat.groupName
                          : `${otherUser?.firstname || ""} ${otherUser?.lastname || ""}`.trim()}
                      </strong>
                      {hasUnreadMessage && (
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full ml-2 flex-shrink-0"></span>
                      )}
                    </div>
                    <p
                      className={`text-sm truncate w-full text-left ${hasUnreadMessage
                          ? "font-bold text-gray-800"
                          : "text-gray-600"
                        }`}
                    >
                      {displayLastMessage}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

      </div>

      {/* Chat Window */}
      <div className={`flex-1 bg-white relative flex flex-col rounded-lg shadow-lg h-full ${panelStatus ? '' : 'hidden md:flex'}`}>
        {panelStatus && (
          <>
            {/* Chat Header - Fixed to top on small screens */}
            <div className="flex items-center p-4 border-b border-gray-200 bg-white shadow-sm rounded-t-lg fixed top-0 left-0 right-0 md:relative md:top-auto md:left-auto md:right-auto w-full z-20">
              <button className="md:hidden mr-3 text-gray-700 hover:text-gray-900" onClick={() => setPanelStatus(false)}><ArrowLeft size={24} /></button>
              {chatWith.groupName ? (
                <NavLink to={`/community/${community}`} className="flex items-center gap-3">
                  <img src={chatWith.groupImage || "/default-avatar.png"} className="w-11 h-11 rounded-full object-cover border border-gray-300" alt="Group avatar" />
                  <strong className="text-lg text-gray-800">{chatWith.groupName}</strong>
                </NavLink>
              ) : (
                <NavLink to={`/people/${chatWith._id}`} className="flex items-center gap-3">
                  <img src={chatWith.profilePic || 'dummy.png' || "/default-avatar.png"} className="w-11 h-11 rounded-full object-cover border border-gray-300" alt="User avatar" />
                  <strong className="text-lg text-gray-800">{chatWith.firstname} {chatWith.lastname || ""}</strong>
                </NavLink>
              )}
            </div>

            {/* Messages Area - Scrollable, with padding to account for fixed header and typing bar */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 pt-[64px] pb-[120px]">
              {chatMessages.map((msg) => (
                <div key={msg._id} className={`flex ${msg.sender._id === currentUserId ? 'justify-end' : 'justify-start'} mb-3`}>
                  <div
                    className={`message-bubble max-w-[80%] sm:max-w-xs md:max-w-sm p-3 rounded-xl relative shadow-md ${msg.sender._id === currentUserId ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'} break-words`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (msg.sender._id === currentUserId && !msg.deleted) {
                        setShowOptions(msg._id);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptions(null);
                    }}
                  >
                    {msg.deleted ? (
                      <i className="text-sm text-gray-500">This message was deleted 🚫</i>
                    ) : (
                      parseTextWithLinks(msg.content).map((part, idx) =>
                        part.isLink ? (
                          <a key={idx} href={part.text} className={`underline ${msg.sender._id === currentUserId ? 'text-blue-200' : 'text-blue-700'}`} target="_blank" rel="noreferrer">{part.text}</a>
                        ) : (
                          <span key={idx}>{part.text}</span>
                        )
                      )
                    )}
                    {showOptions === msg._id && msg.sender._id === currentUserId && !msg.deleted && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMessage(msg._id);
                        }}
                        className="absolute top-full mt-1 right-0 bg-white text-red-600 text-sm px-3 py-2 rounded-lg shadow-lg cursor-pointer hover:bg-red-50 transition-colors z-10"
                      >
                        <Trash className="inline w-4 h-4 mr-2" /> Delete
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Bar - Fixed to bottom on small screens, above mobile navbar */}
            <div className="p-4 flex items-center gap-3 rounded-b-lg fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto w-full z-20 bottom-[56px]">
              <input
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && messageContent.trim()) {
                    socket.emit("sendMessage", { chatId: chatOpened, content: messageContent });
                    setMessageContent("");
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 p-3 border border-gray-300 rounded-full bg-black/40 text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200"
              />
              <button
                onClick={() => {
                  if (!messageContent.trim()) return;
                  socket.emit("sendMessage", { chatId: chatOpened, content: messageContent });
                  setMessageContent("");
                }}
                className="text-white bg-green-600 px-5 py-3 rounded-full shadow-md hover:bg-green-700/40 transition-colors duration-200 flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
        {!panelStatus && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-lg">Select a chat to start messaging😇</p>
          </div>
        )}
      </div>
    </div>
  );
}