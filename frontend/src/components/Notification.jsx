import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Bell, CheckCircle, User2Icon, UserPlus, DollarSign } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from 'react-toastify';

export const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  transports: ["websocket"],
});

const Notification = () => {
  const [unseen, setUnseen] = useState([]);
  const [seen, setSeen] = useState([]);
  const [showSeen, setShowSeen] = useState(false); // Reinstated toggle
  const [bondRequests, setBondRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false); // Reinstated toggle
  const [communityJoinRequests, setCommunityJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false); // Reinstated toggle
  const [unverifiedPayments, setUnverifiedPayments] = useState([]);
  const [showPayments, setShowPayments] = useState(false); // Reinstated toggle

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

  const fetchAllNotificationData = async () => {
    try {
      const [
        notificationsRes,
        bondRequestsRes,
        joinRequestsRes,
        paymentsRes,
      ] = await Promise.all([
        secureFetch("/auth/notification"),
        secureFetch("/auth/bond/pending"),
        secureFetch("/auth/community/allRequests"),
        secureFetch("/auth/payment/unverified"),
      ]);

      const notificationsData = await notificationsRes.json();
      setUnseen(notificationsData.unseen);
      setSeen(notificationsData.seen);

      const bondRequestsData = await bondRequestsRes.json();
      setBondRequests(bondRequestsData);

      const joinRequestsData = await joinRequestsRes.json();
      setCommunityJoinRequests(joinRequestsData);

      const paymentsData = await paymentsRes.json();
      setUnverifiedPayments(paymentsData);

    } catch (error) {
      console.error("Error fetching notification data:", error);
      toast.error("Failed to load notifications.");
    }
  };

  useEffect(() => {
    fetchAllNotificationData();

    socket.on("notify", (n) => setUnseen((prev) => [n, ...prev]));
    return () => socket.off("notify");
  }, []);

  const setToSeen = async (id) => {
    try {
      await secureFetch(`/auth/notification/${id}`, { method: "PATCH" });
      setUnseen((prev) => prev.filter((n) => n._id !== id));
      setSeen((prev) => [...prev, unseen.find((n) => n._id === id)]);
    } catch (error) {
      console.error("Error marking notification as seen:", error);
      toast.error("Failed to mark as seen.");
    }
  };

  const acceptCommunityRequest = async (id) => {
    try {
      const res = await secureFetch(`/auth/community/accept/${id}`, { method: "POST" });
      if (res.ok) {
        toast.success("Community request accepted!");
        setCommunityJoinRequests((prev) => prev.filter((req) => req._id !== id));
      } else {
        toast.error("Failed to accept community request.");
      }
    } catch (error) {
      console.error("Error accepting community request:", error);
      toast.error("Failed to accept community request.");
    }
  };

  const verifyPayment = async (paymentId) => {
    console.log(`Confirming verification for payment ID: ${paymentId}`);
    try {
      const res = await secureFetch(`/auth/payment/verify/${paymentId}`, {
        method: "PATCH",
      });
      if (res.ok) {
        toast.success("Payment verified successfully!");
        setUnverifiedPayments((prev) => prev.filter((p) => p._id !== paymentId));
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to verify payment.");
      }
    } catch (error) {
      console.error(`Error verifying payment ${paymentId}:`, error);
      toast.error("Error verifying payment.");
    }
  };

  // Reinstated Section component
  const Section = ({ icon: Icon, label, toggle, show, children }) => (
    <div className="mt-6">
      <button
        className="text-sm text-blue-500 hover:underline flex items-center gap-2 mb-3" // Adjusted styling for button
        onClick={toggle}
      >
        <Icon className="w-4 h-4" />
        {show ? `Hide ${label}` : `Show ${label} (${children.length > 0 ? children.length : '0'})`} {/* Show count */}
      </button>
      {show && children}
    </div>
  );

  // Generic card for requests/payments/notifications
  const ActionCard = ({ user, community, amount, date, proofScreenshotUrl, actionButton, message, type = "notification" }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadows duration-200">
      {user && ( // Only render image if user object exists
        <NavLink to={user._id ? `/people/${user._id}` : '#'} className="flex-shrink-0">
          <img src={user.profilePic || "/default-avatar.png"} alt={user.firstname || "User"} className="w-10 h-10 rounded-full object-cover" />
        </NavLink>
      )}
      <div className="flex-1 flex flex-col">
        <p className="text-sm text-gray-800">
          {type === "bondRequest" && (
            <>
              <NavLink to={`/people/${user._id}`} className="font-semibold hover:underline">
                {user.firstname} {user.lastname}
              </NavLink>{" "}
              sent you a bond request.
            </>
          )}
          {type === "communityJoinRequest" && (
            <>
              <NavLink to={`/people/${user._id}`} className="font-semibold hover:underline">
                {user.firstname} {user.lastname}
              </NavLink>{" "}
              wants to join{" "}
              <NavLink to={`/community/${community._id}`} className="font-semibold hover:underline">
                {community.name}
              </NavLink>
              .
            </>
          )}
          {type === "payment" && (
            <>
              <span className="font-semibold">{user.firstname || 'Someone'}</span> donated{" "}
              <span className="font-semibold">₹{amount}</span> to{" "}
              <NavLink to={`/community/${community?._id || '#'}`} className="font-semibold hover:underline">
                {community?.name || 'Unknown Community'}
              </NavLink>
              .
            </>
          )}
          {type === "notification" && (
            <span dangerouslySetInnerHTML={{ __html: message }} />
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1">{new Date(date).toLocaleString()}</p>
        {proofScreenshotUrl && (
          <button
            onClick={() => window.open(proofScreenshotUrl, '_blank')}
            className="text-xs text-blue-500 hover:underline mt-2 text-left"
          >
            View Proof
          </button>
        )}
      </div>
      {actionButton && <div className="flex-shrink-0">{actionButton}</div>}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-transparent flex flex-col items-center p-4 pt-16 md:pt-8 pb-[80px] md:pb-8">
      <div className="w-full max-w-lg bg-white/30 rounded-xl shadow-lg overflow-hidden">
        {/* Header - Simple and Clean */}
        <div className="flex items-center justify-start p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Activity</h2>
        </div>

        <div className="p-5 space-y-6">

          {/* Incoming Payments Section */}
          <Section icon={DollarSign} label="Incoming Payments" toggle={() => setShowPayments(!showPayments)} show={showPayments}>
            <div className="space-y-3 mt-4">
              {unverifiedPayments.length === 0 ? (
                <p className="text-sm italic text-gray-500">No unverified payments.</p>
              ) : (
                unverifiedPayments.map((payment) => (
                  <ActionCard
                    key={payment._id}
                    user={{ firstname: payment.name, profilePic: "/default-avatar.png" }} // Use name for user in card
                    amount={payment.amount}
                    community={payment.community}
                    date={payment.createdAt}
                    proofScreenshotUrl={payment.proofScreenshotUrl}
                    type="payment"
                    actionButton={
                      <button
                        className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          verifyPayment(payment._id);
                        }}
                      >
                        Verify
                      </button>
                    }
                  />
                ))
              )}
            </div>
          </Section>

          {/* Community Join Requests Section */}
          <Section icon={UserPlus} label="Community Requests" toggle={() => setShowJoinRequests(!showJoinRequests)} show={showJoinRequests}>
            <div className="space-y-3 mt-4">
              {communityJoinRequests.length === 0 ? (
                <p className="text-sm italic text-gray-500">No pending community requests.</p>
              ) : (
                communityJoinRequests.map((req) => (
                  <ActionCard
                    key={req._id}
                    user={req.user}
                    community={req.community}
                    date={req.requestedAt}
                    type="communityJoinRequest"
                    actionButton={
                      <button
                        className="text-sm px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200"
                        onClick={() => acceptCommunityRequest(req._id)}
                      >
                        Accept
                      </button>
                    }
                  />
                ))
              )}
            </div>
          </Section>

          {/* Bond Requests Section */}
          <Section icon={User2Icon} label="Bond Requests" toggle={() => setShowRequests(!showRequests)} show={showRequests}>
            <div className="space-y-3 mt-4">
              {bondRequests.length === 0 ? (
                <p className="text-sm italic text-gray-500">No pending bond requests.</p>
              ) : (
                bondRequests.map((req) => (
                  <ActionCard
                    key={req._id}
                    user={req.requester}
                    date={req.createdAt}
                    type="bondRequest"
                  />
                ))
              )}
            </div>
          </Section>

          {/* Unseen Notifications Section - Always Visible */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-600" /> Unseen Notifications
            </h3>
            {unseen.length === 0 ? (
              <p className="text-sm italic text-gray-500">You're all caught up!</p>
            ) : (
              <ul className="space-y-3">
                {unseen.map((n) => (
                  <li key={n._id} onClick={() => setToSeen(n._id)} className="cursor-pointer">
                    <ActionCard
                      user={n.from}
                      date={n.createdAt}
                      message={n.message}
                      type="notification"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Seen Notifications Section - Toggable */}
          <Section icon={CheckCircle} label="Seen Notifications" toggle={() => setShowSeen(!showSeen)} show={showSeen}>
            <ul className="mt-4 space-y-3">
              {seen.length === 0 ? (
                <p className="text-sm italic text-gray-500">No seen notifications yet.</p>
              ) : (
                seen.map((n) => (
                  <li key={n._id}>
                    <ActionCard
                      user={n.from}
                      date={n.createdAt}
                      message={n.message}
                      type="notification"
                    />
                  </li>
                ))
              )}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default Notification;
