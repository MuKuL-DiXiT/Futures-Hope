import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Bell, CheckCircle, User2Icon, UserPlus } from "lucide-react";
import { NavLink } from "react-router-dom";
export const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  transports: ["websocket"], 
});

const Notification = () => {
  const [unseen, setUnseen] = useState([]);
  const [seen, setSeen] = useState([]);
  const [showSeen, setShowSeen] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);

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
    const fetchNotifications = async () => {
      const res = await secureFetch("/auth/notification", {
        credentials: "include",
      });
      const data = await res.json();
      setUnseen(data.unseen);
      setSeen(data.seen);
    };

    const fetchRequests = async () => {
      const res = await secureFetch("/auth/bond/pending", {
        credentials: "include",
      });
      const data = await res.json();
      setRequests(data);
    };

    const fetchJoinRequests = async () => {
      const res = await secureFetch("/auth/community/allRequests", {
        method: "GET"
      });
      const data = await res.json();
      setJoinRequests(data);
    };

    fetchNotifications();
    fetchRequests();
    fetchJoinRequests();

    socket.on("notify", (n) => setUnseen((prev) => [n, ...prev]));
    return () => socket.off("notify");
  }, []);

  const setToSeen = async (id) => {
    await secureFetch(`/auth/notification/${id}`, {
      method: "PATCH",
    });
  };

  const acceptRequest = async (id) => {
    await secureFetch(`/auth/community/accept/${id}`, {
      method: "POST",
    });
    const res = await secureFetch("/auth/community/allRequests", {
      credentials: "include",
    });
    const data = await res.json();
    setJoinRequests(data);
  };

  const Section = ({ icon: Icon, label, toggle, show, children }) => (
    <div className="mt-6">
      <button
        className="text-sm text-green-700 hover:underline flex items-center gap-2"
        onClick={toggle}
      >
        <Icon className="w-4 h-4" />
        {show ? `Hide ${label}` : `Show ${label}`}
      </button>
      {show && children}
    </div>
  );

  const RequestCard = ({ user, date, onAccept }) => (
    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-green-200 hover:shadow-lg">
      <NavLink to={`/people/${user._id}`} className="flex items-start gap-3 flex-1">
        <img src={user.profilePic} alt="" className="w-10 h-10 rounded-full object-cover" />
        <div>
          <p className="text-sm text-white">{user.firstname} {user.lastname}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date(date).toLocaleString()}</p>
        </div>
      </NavLink>
      {onAccept && (
        <button className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg" onClick={onAccept}>Accept</button>
      )}
    </div>
  );

  return (
    <div className="bg-teal-950/80 rounded-2xl shadow-2xl max-w-3xl mx-auto mt-10 p-6 text-white">
      <div className="flex items-center gap-3 mb-6 border-b pb-3 border-green-400">
        <Bell className="text-green-500 w-6 h-6" />
        <h2 className="text-2xl font-bold tracking-wide">Notifications Center</h2>
      </div>

      <Section icon={UserPlus} label="Join requests" toggle={() => setShowJoinRequests(!showJoinRequests)} show={showJoinRequests}>
        <div className="space-y-3 mt-4">
          {joinRequests.map((n) => (
            <RequestCard key={n._id} user={n.user} date={n.requestedAt} onAccept={() => acceptRequest(n._id)} />
          ))}
        </div>
      </Section>

      <Section icon={User2Icon} label="Bond requests" toggle={() => setShowRequests(!showRequests)} show={showRequests}>
        <div className="space-y-3 mt-4">
          {requests.map((n) => (
            <RequestCard key={n._id} user={n.requester} date={n.createdAt} />
          ))}
        </div>
      </Section>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Unseen Notifications</h3>
        {unseen.length === 0 ? (
          <p className="text-sm italic text-green-300">You're all caught up!</p>
        ) : (
          <ul className="space-y-4">
            {unseen.map((n) => (
              <li key={n._id} onMouseEnter={() => setToSeen(n._id)} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-green-300">
                <img src={n.from?.profilePic} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs mt-1 text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Section icon={CheckCircle} label="seen notifications" toggle={() => setShowSeen(!showSeen)} show={showSeen}>
        <ul className="mt-4 space-y-4">
          {seen.map((n) => (
            <li key={n._id} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-green-200">
              <img src={n.from?.profilePic} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1">
                <p className="text-sm">{n.message}</p>
                <p className="text-xs mt-1 text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

export default Notification;