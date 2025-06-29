import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Send, ArrowLeft, Trash } from "lucide-react";
import { NavLink } from 'react-router-dom';

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default function Messages() {
  const [panelStatus, setPanelStatus] = useState(false);
  const [chatData, setChatData] = useState({ chats: [], userId: null });
  const [loading, setLoading] = useState(false);
  const [chatOpened, setChatOpened] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [results, setResults] = useState([]);
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
      if (refresh.ok) {
        return fetch(url, { ...options, credentials: "include" });
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
    const fetchChatData = async () => {
      setLoading(true);
      try {
        const response = await secureFetch("/auth/chat", { method: "GET" });
        if (!response.ok) throw new Error(`Failed to fetch chat data`);
        const data = await response.json();
        setChatData(data);
      } catch (err) {
        console.error("Chat fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChatData();
  }, []);

  useEffect(() => {
    const handleReceiveMessage = (newMessage) => {
      if (newMessage.chat._id === chatOpened) {
        setChatMessages((prev) => [...prev, newMessage]);
      }
    };
    socket.on("receiveMessage", handleReceiveMessage);
    return () => socket.off("receiveMessage", handleReceiveMessage);
  }, [chatOpened]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const timeout = setTimeout(async () => {
        const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${searchTerm}`, { method: "GET" });
        const data = await res.json();
        setResults(data.users || []);
      }, 400);
      return () => clearTimeout(timeout);
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  const createChat = async (targetId) => {
    try {
      const res = await secureFetch(`/auth/chat/messages/${targetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId })
      });
      if (!res.ok) throw new Error("Could not start chat");
      const data = await res.json();
      socket.emit("joinRoom", data._id);
      setPanelStatus(true);
      setChatOpened(data._id);
      const otherUser = data.participants.find(p => p._id !== chatData.userId);
      setChatWith(data.isGroupChat ? data : otherUser);
      getMessages(data._id);
    } catch (err) {
      console.error("Create chat error:", err);
    }
  };

  const getMessages = async (chatId) => {
    try {
      setLoading(true);
      const res = await secureFetch(`/auth/chat/messages/${chatId}`, { method: "GET" });
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      setChatMessages(data.messages || []);
      setCommunity(data.community || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isOtherUser = (message) => {
    return chatWith?._id ? message.sender._id !== chatWith._id : message.sender._id !== currentUserId;
  };

  const parseTextWithLinks = (text) => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const parts = [];
    let lastIndex = 0;
    const matches = text.matchAll(urlRegex);
    for (const match of matches) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        parts.push({ text: text.slice(lastIndex, start), isLink: false });
      }
      parts.push({ text: match[0], isLink: true });
      lastIndex = end;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isLink: false });
    }
    return parts;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      {/* Sidebar */}
      <div className={`w-full md:w-1/3 overflow-y-auto bg-black/40 ${panelStatus ? 'hidden md:block' : ''}`}>
        <div className="p-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users..."
            className="w-full p-2 rounded bg-white/20 text-white placeholder-gray-300"
          />
        </div>

        {results.map((user) => (
          <div key={user._id} className="px-4 py-2 hover:bg-green-200 cursor-pointer" onClick={() => createChat(user._id)}>
            <div className="flex items-center gap-3">
              <img src={user.profilePic || "/default-avatar.png"} className="w-8 h-8 rounded-full object-cover" alt="" />
              <strong>{user.firstname} {user.lastname || user.username}</strong>
            </div>
          </div>
        ))}

        {chatData.chats.map((chat) => {
          const other = chat.isGroupChat ? chat : chat.participants.find(p => p._id !== chatData.userId);
          return (
            <div key={chat._id} className="px-4 py-2 hover:bg-green-100 cursor-pointer" onClick={() => {
              socket.emit("joinRoom", chat._id);
              setPanelStatus(true);
              setChatOpened(chat._id);
              setChatWith(other);
              getMessages(chat._id);
            }}>
              <div className="flex items-center gap-3">
                <img src={chat.isGroupChat ? chat.groupImage : other?.profilePic || "/default-avatar.png"} className="w-8 h-8 rounded-full" alt="" />
                <div>
                  <strong>{chat.isGroupChat ? chat.groupName : `${other.firstname} ${other.lastname || ""}`}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Area */}
      <div className={`flex-1 bg-white relative ${panelStatus ? '' : 'hidden md:block'}`}>
        {panelStatus && (
          <>
            <div className="flex items-center p-3 border-b bg-white/90">
              <button className="md:hidden mr-3" onClick={() => setPanelStatus(false)}><ArrowLeft /></button>
              {chatWith.groupName ? (
                <NavLink to={`/community/${community}`} className="flex items-center gap-3">
                  <img src={chatWith.groupImage} className="w-10 h-10 rounded-full" alt="" />
                  <strong>{chatWith.groupName}</strong>
                </NavLink>
              ) : (
                <NavLink to={`/people/${chatWith._id}`} className="flex items-center gap-3">
                  <img src={chatWith.profilePic || "/default-avatar.png"} className="w-10 h-10 rounded-full" alt="" />
                  <strong>{chatWith.firstname}</strong>
                </NavLink>
              )}
            </div>

            <div className="flex flex-col h-[calc(100vh-4rem)]">
              <div className="flex-1 overflow-y-auto p-4">
                {chatMessages.map((msg) => (
                  <div key={msg._id} className={`flex ${msg.sender._id === currentUserId ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div
                      className="max-w-xs p-2 bg-green-600 text-white rounded-lg relative"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (isOtherUser(msg)) setShowOptions(msg._id);
                      }}
                    >
                      {msg.deleted ? <i className="text-xs">This message was deleted *</i> : parseTextWithLinks(msg.content).map((part, idx) =>
                        part.isLink ? (
                          <a key={idx} href={part.text} className="underline text-blue-200" target="_blank" rel="noreferrer">{part.text}</a>
                        ) : (
                          <span key={idx}>{part.text}</span>
                        )
                      )}
                      {showOptions === msg._id && msg.sender._id === currentUserId && !msg.deleted && (
                        <div
                          onClick={() => {
                            socket.emit("deleteMessage", msg._id);
                            setShowOptions(null);
                          }}
                          className="absolute top-full mt-1 right-0 bg-white text-red-600 text-sm px-2 py-1 rounded shadow"
                        >
                          <Trash className="inline w-4 h-4 mr-1" /> Delete
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t flex items-center gap-2 bg-white">
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
                  className="flex-1 p-2 border rounded-full outline-none"
                />
                <button
                  onClick={() => {
                    if (!messageContent.trim()) return;
                    socket.emit("sendMessage", { chatId: chatOpened, content: messageContent });
                    setMessageContent("");
                  }}
                  className="text-white bg-green-600 px-4 py-2 rounded-full"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
