import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Send, ArrowLeft, Trash, DotIcon } from "lucide-react";
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
  const [messageCache, setMessageCache] = useState({});
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
    const fetchChatData = async () => {
      setLoading(true);
      try {
        const response = await secureFetch("/auth/chat", {
          method: "GET",
        });

        if (!response.ok) throw new Error(`Failed to fetch chat data: ${response.status}`);

        const data = await response.json();
        setChatData(data);
        console.log("Chat data fetched successfully:", data);
      } catch (error) {
        console.error("Error fetching chat data:", error);
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
      } else {
        console.log("📨 Message for another chat:", newMessage.chat._id);
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.emit("markAsSeen", { chatId: chatOpened });

    return () => socket.off("receiveMessage", handleReceiveMessage);
  }, [chatOpened]);

  const getMessages = async (chatId) => {
    setLoading(true);
    setError(null);
    try {
      socket.emit("joinRoom", chatId);
      const response = await secureFetch(`/auth/chat/messages/${chatId}`, {
        method: "GET",
      });
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
    const res = await secureFetch(`/auth/posts/searchShare/bonds?query=${searchTerm}`, {
      method: "GET",
    });
    const data = await res.json();
    setResults(data.users);
  };

  useEffect(() => {
    searchUsers();
  }, [searchTerm]);

  const createChat = async (targetId) => {
    setLoading(true);
    try {
      const response = await secureFetch(`/auth/chat/messages/${targetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId }),
      });

      if (response.ok) {
        const data = await response.json();
        socket.emit("joinRoom", data._id);
        setPanelStatus(true);
        setChatOpened(data._id);
        setChatWith(data.participants.find((p) => p._id !== targetId));
        getMessages(data._id);
      }
    } catch (error) {
      console.error("Couldn't create/fetch chat:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractMessage = async (mid) => {
    const response = await secureFetch(`/auth/chat/extractmessage/${mid}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to extract message: ${response.status}`);
    }

    const data = await response.json();
    return data;
  };



  useEffect(() => {
    if (chatOpened) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [chatMessages, chatOpened]);

  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!chatOpened) return;

      try {
        await secureFetch(`/auth/chat/markasread/${chatOpened}`, {
          method: "PATCH",
        });

        console.log(
          chatWith.groupName
            ? `Marked group chat "${chatWith.groupName}" as read`
            : `Marked personal chat with ${chatWith.firstname} as read`
        );
      } catch (err) {
        console.error("Failed to mark messages as read:", err);
      }
    };

    markMessagesAsRead();
  }, [chatOpened]);


  useEffect(() => {
    const handleMessageDeleted = ({ messageId }) => {
      setChatMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId ? { ...msg, deleted: true, deletedAt: new Date() } : msg
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
  function parseTextWithLinks(text) {
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
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full md845:w-5/6 md845:ml-32 pt-0 md:pt-0">
      {/* Chat Panel List */}
      <div className={`md:bg-black/50 bg-transparent  overflow-y-auto w-full md:w-1/3 ${panelStatus ? "hidden md:inline-block" : ""} flex flex-col overflow-y-auto gap-2 pt-3 pb-20 md:pb-0 md:pt-8`}>
        <div className="flex justify-center items-center mb-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className=" rounded-lg px-3 py-1 w-2/3 outline-none bg-black/50 text-white placeholder-gray-400"
          />
        </div>

        {results.length > 0 && (
          <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md shadow-black mb-5 shadow-md w-4/5 self-center">
            {results.map((res) => (
              <div
                key={res._id}
                className="flex items-center gap-2 p-2 hover:bg-green-100 cursor-pointer hover:shadow-black hover:shadow-lg hover:rounded-lg"
              >
                <button className="flex gap-3 items-center" onClick={() => createChat(res._id)}>
                  <img src={res.profilePic} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <strong>{res.firstname} {res.lastname || ""}</strong>
                </button>
              </div>
            ))}
          </div>
        )}

        {chatData?.chats?.map((chat) => {
          const otherUser = chat.isGroupChat
            ? null
            : chat.participants.find((p) => p._id !== chatData.userId);
          const lastMsg = chat.lastMessage || "----";
          return (
            <div key={chat._id} className="px-3">
              <button
                onClick={() => {
                  socket.emit("joinRoom", chat._id);
                  setPanelStatus(true);
                  setChatOpened(chat._id);
                  getMessages(chat._id);
                  setChatWith(chat.isGroupChat ? chat : otherUser);
                }}
                className="flex items-center justify-start gap-4 md:text-white w-full"
              >
                <img
                  src={chat.isGroupChat ? chat.groupImage : otherUser?.profilePic}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex flex-col gap-1 items-start">
                  <strong>
                    {chat.isGroupChat
                      ? chat.groupName
                      : `${otherUser?.firstname || ""} ${otherUser?.lastname || ""}`.trim()}
                  </strong>
                  <p className="text-xs text-wrap md:text-white">
                    {typeof lastMsg === "object" && lastMsg.readBy?.length === 2
                      ? lastMsg.content
                      : (
                        <span className="flex items-center justify-center text-red-600 gap-1">
                          <span className="text-4xl leading-none">•</span>
                          <span className="text-white text-xs">new message</span>
                        </span>
                      )
                    }
                  </p>

                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Chat Window */}
      <div className={`relative min-h-screen bg-black/10 rounded-lg overflow-hidden flex-1 ${panelStatus ? "md:block" : "hidden md:block"}`}>
        {panelStatus && (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-white/50 border-b shadow-sm">
              <button
                className="md:hidden text-black"
                onClick={() => setPanelStatus(false)}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              {chatWith.groupImage ? (
                <NavLink to={`/community/${community}`} className="flex items-center gap-5"><img src={chatWith.groupImage} alt="" className="w-10 h-10 rounded-full" />
                  <strong>{chatWith.groupName}</strong></NavLink>

              ) : (
                <NavLink to={`/people/${chatWith._id}`} className="flex items-center gap-5"> <img src={chatWith?.profilePic} alt="" className="w-10 h-10 rounded-full" />
                  <strong>{chatWith?.firstname || chatWith?.username} {chatWith?.lastname || ""}</strong>
                </NavLink>
              )
              }
            </div>

            {/* Chat area */}
            <div className="relative flex flex-col gap-2 h-[calc(100vh-4rem)]"> {/* Adjust height if needed */}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 pb-20">
                {chatOpened &&
                  chatMessages.map((message) => {
                    const isMine = message.sender._id === currentUserId;


                    const handleLongPressStart = (id) => {
                      timeoutRef.current = setTimeout(() => {
                        setShowOptions(id);
                      }, 500);
                    };

                    const handleLongPressEnd = () => {
                      clearTimeout(timeoutRef.current);
                    };

                    const handleRightClick = (e, id) => {
                      e.preventDefault();
                      setShowOptions(id);
                    };



                    return (
                      <div
                        key={message._id}
                        className={`relative flex ${isMine ? "justify-end" : "justify-start"} felx-wrap text-wrap items-center gap-2`}
                        onContextMenu={(e) => (message.sender != chatWith._id) ? handleRightClick(e, message._id) : null}
                        onTouchStart={() => (message.sender != chatWith._id) ? handleLongPressStart(message._id) : null}
                        onTouchEnd={(message.sender != chatWith._id) ? handleLongPressEnd : null}
                      >
                        {!isMine && (
                          <img
                            src={message.sender.profilePic}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="p-2 rounded-lg max-w-xs my-2 bg-green-700 relative">
                          {message.deleted ? (
                            <i className="text-sm text-white/40">This message was deleted *</i>
                          ) : (
                            <>
                              <p className="break-words whitespace-pre-wrap">
                                {parseTextWithLinks(message.content).map((part, idx) =>
                                  part.isLink ? (
                                    <a
                                      key={idx}
                                      href={part.text}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-300 underline break-all"
                                    >
                                      {part.text}
                                    </a>
                                  ) : (
                                    <span key={idx}>{part.text}</span>
                                  )
                                )}
                              </p>
                              {message.reactions?.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {message.reactions.map((r, idx) => (
                                    <span key={idx} className="text-sm">
                                      {r.emoji}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {/* Delete Option Panel */}
                          {showOptions === message._id && !message.deleted && (
                            <div
                              className={`absolute -bottom-8 right-0 bg-transparent  shadow-md text-red-600 px-2 py-1 text-md rounded z-50 cursor-pointer `}
                              onClick={() => {
                                socket.emit("deleteMessage", message._id);
                                setShowOptions(null);
                              }}
                            >
                              {(isMine) && <span className="flex gap-2 items-center"><Trash />Delete</span>}
                            </div>
                          )}
                        </div>
                        {isMine && (
                          <img
                            src={message.sender.profilePic}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                      </div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              {/* Sticky Message Input */}
              <div className="sticky bottom-16 md845:bottom-5 left-0 right-0 rounded-full px-4 py-2 bg-black/40 backdrop-blur-md w-full flex justify-between items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageContent}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      socket.emit("sendMessage", {
                        chatId: chatOpened,
                        content: messageContent,
                      });
                      setMessageContent("");
                    }
                  }}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="rounded-lg px-3 py-1 w-2/3 bg-transparent focus:outline-none"
                />
                {messageContent !== "" && (
                  <button
                    className="flex text-lg bg-transparent text-black px-4 py-2 rounded-full gap-2 items-center"
                    onClick={() => {
                      socket.emit("sendMessage", {
                        chatId: chatOpened,
                        content: messageContent,
                      });
                      setMessageContent("");
                    }}
                  >
                    send <Send className="w-6 h-6 text-black" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}