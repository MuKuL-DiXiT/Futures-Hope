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
  }, [chatOpened]);

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

  const searchUsers = async () => {
    if (!searchTerm) return setResults([]);
    const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${searchTerm}`);
    const data = await res.json();
    setResults(data.users || data);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchUsers();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

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
      if (!e.target.closest(".message-block")) {
        setShowOptions(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full md:pl-32 pt-0 md:pt-0">
      <div className={`md:bg-black/50 bg-transparent overflow-y-auto w-full md:w-1/3 ${panelStatus ? "hidden md:inline-block" : ""} flex flex-col gap-2 pt-3 pb-20 md:pb-0 md:pt-8`}>
        <div className="flex justify-center items-center mb-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg px-3 py-1 w-2/3 outline-none bg-black/50 text-white placeholder-gray-400"
          />
        </div>

        {searchTerm && results?.length > 0 && (
          <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md shadow-black mb-5 shadow-md w-4/5 self-center bg-amber-50">
            {results.map((res) => (
              <div
                key={res._id}
                className="flex items-center gap-2 p-2 hover:bg-green-100 cursor-pointer hover:shadow-black hover:shadow-lg hover:rounded-lg"
              >
                <button className="flex gap-3 items-center" onClick={() => createChat(res._id)}>
                  <img src={res.profilePic} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <strong className="text-amber-800">{res.firstname} {res.lastname || ""}</strong>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* existing chat list */}
        <div className="px-3">
          {chatData?.chats?.map((chat) => {
            const otherUser = chat.isGroupChat ? null : chat.participants.find((p) => p._id !== chatData.userId);
            const lastMsg = chat.lastMessage || "----";
            const hasUnreadMessage = isUnread(lastMsg);

            return (
              <div key={chat._id}>
                <button
                  onClick={() => {
                    socket.emit("joinRoom", chat._id);
                    setPanelStatus(true);
                    setChatOpened(chat._id);
                    getMessages(chat._id);
                    setChatWith(chat.isGroupChat ? chat : otherUser);
                  }}
                  className="flex items-center justify-start gap-4 text-white w-full p-2 hover:bg-amber-100 hover:text-black rounded-lg transition"
                >
                  <img
                    src={chat.isGroupChat ? chat.groupImage : otherUser?.profilePic}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex flex-col gap-1 items-start">
                    <strong className="text-md text-amber-800">
                      {chat.isGroupChat ? chat.groupName : `${otherUser?.firstname || ""} ${otherUser?.lastname || ""}`.trim()}
                    </strong>
                    <p className="text-xs text-wrap text-amber-700">
                      {(hasUnreadMessage  && (lastMsg.sender!=chatData.userId))? (
                        <span className="flex items-center justify-center text-red-600 gap-1">
                          <span className="text-4xl leading-none">•</span>
                          <span className="text-xs">new message</span>
                        </span>
                      ) : (
                        typeof lastMsg === "object" ? lastMsg.content : lastMsg
                      )}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Window */}
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
                        if (msg.sender._id === currentUserId && !msg.deleted) {
                          setShowOptions(msg._id);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {msg.deleted ? (
                        <i className="text-xs">This message was deleted</i>
                      ) : (
                        parseTextWithLinks(msg.content).map((part, idx) =>
                          part.isLink ? (
                            <a key={idx} href={part.text} className="underline text-blue-200" target="_blank" rel="noreferrer">{part.text}</a>
                          ) : (
                            <span key={idx}>{part.text}</span>
                          )
                        )
                      )}
                      {showOptions === msg._id && msg.sender._id === currentUserId && !msg.deleted && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            socket.emit("deleteMessage", msg._id);
                            setShowOptions(null);
                          }}
                          className="absolute top-full mt-1 right-0 bg-white text-red-600 text-sm px-2 py-1 rounded shadow cursor-pointer hover:bg-gray-100 z-10"
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
                  className="flex-1 p-2 border rounded-full bg-black/40 mb-8 outline-none"
                />
                <button
                  onClick={() => {
                    if (!messageContent.trim()) return;
                    socket.emit("sendMessage", { chatId: chatOpened, content: messageContent });
                    setMessageContent("");
                  }}
                  className="text-white bg-green-600 px-4 mb-8 py-2 rounded-full"
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