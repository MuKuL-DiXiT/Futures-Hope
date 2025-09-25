import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Bell, CheckCircle, User, UserPlus, DollarSign, Users, MessageSquare, Heart, ChevronDown, ChevronUp, Clock, Check } from "lucide-react";
import { NavLink } from "react-router-dom";

export const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  transports: ["websocket"],
});

const Notification = () => {
  const [unseen, setUnseen] = useState([]);
  const [seen, setSeen] = useState([]);
  const [showSeen, setShowSeen] = useState(false);
  const [bondRequests, setBondRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [communityJoinRequests, setCommunityJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [unverifiedPayments, setUnverifiedPayments] = useState([]);
  const [showPayments, setShowPayments] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const fetchAllNotificationData = async () => {
    setLoading(true);
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
      setUnseen(notificationsData.unseen || []);
      setSeen(notificationsData.seen || []);

      const bondRequestsData = await bondRequestsRes.json();
      setBondRequests(Array.isArray(bondRequestsData) ? bondRequestsData : []);

      const joinRequestsData = await joinRequestsRes.json();
      setCommunityJoinRequests(Array.isArray(joinRequestsData) ? joinRequestsData : []);

      const paymentsData = await paymentsRes.json();
      setUnverifiedPayments(Array.isArray(paymentsData) ? paymentsData : []);

    } catch (error) {
      console.error("Error fetching notification data:", error);
    } finally {
      setLoading(false);
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
      const notification = unseen.find((n) => n._id === id);
      if (notification) {
        setUnseen((prev) => prev.filter((n) => n._id !== id));
        setSeen((prev) => [notification, ...prev]);
      }
    } catch (error) {
      console.error("Error marking notification as seen:", error);
    }
  };

  const acceptBondRequest = async (requestId) => {
    try {
      await secureFetch(`/auth/bond/accept/${requestId}`, { method: "PATCH" });
      setBondRequests((prev) => prev.filter((req) => req._id !== requestId));
    } catch (error) {
      console.error("Error accepting bond request:", error);
    }
  };

  const rejectBondRequest = async (requestId) => {
    try {
      await secureFetch(`/auth/bond/reject/${requestId}`, { method: "DELETE" });
      setBondRequests((prev) => prev.filter((req) => req._id !== requestId));
    } catch (error) {
      console.error("Error rejecting bond request:", error);
    }
  };

  const verifyPayment = async (paymentId) => {
    try {
      await secureFetch(`/auth/payment/verify/${paymentId}`, { method: "PATCH" });
      setUnverifiedPayments((prev) => prev.filter((p) => p._id !== paymentId));
    } catch (error) {
      console.error("Error verifying payment:", error);
    }
  };

  // Notification Item Component
  const NotificationItem = ({ notification, isUnseen }) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'like': return <Heart className="w-4 h-4 text-red-500" />;
        case 'comment': return <MessageSquare className="w-4 h-4 text-blue-500" />;
        case 'bond': return <Users className="w-4 h-4 text-green-500" />;
        default: return <Bell className="w-4 h-4 text-gray-500" />;
      }
    };

    return (
      <div 
        onClick={() => isUnseen && setToSeen(notification._id)}
        className={`flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
          isUnseen 
            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
            : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">
              {new Date(notification.createdAt).toLocaleDateString()}
            </span>
            {isUnseen && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                New
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Request Item Component  
  const RequestItem = ({ request, type, onAccept, onReject }) => {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
        <NavLink to={`/people/${request.requester?._id || request._id}`} className="flex-shrink-0">
          <img 
            src={request.requester?.profilePic || request.profilePic || '/dummy.png'} 
            alt="" 
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" 
          />
        </NavLink>
        
        <div className="flex-1 min-w-0">
          <NavLink 
            to={`/people/${request.requester?._id || request._id}`} 
            className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
          >
            {request.requester?.firstname || request.firstname} {request.requester?.lastname || request.lastname}
          </NavLink>
          <p className="text-sm text-gray-500 mt-1">
            {type === 'bond' ? 'Wants to bond with you' : `Wants to join ${request.community?.name}`}
          </p>
          <span className="text-xs text-gray-400">
            {new Date(request.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onAccept(request._id)}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => onReject(request._id)}
            className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    );
  };

  // Section Component
  const Section = ({ icon: Icon, title, count, isOpen, onToggle, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {count > 0 && (
              <span className="text-sm text-gray-500">{count} item{count !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {count}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-gray-100">
          <div className="p-4 space-y-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto bg-white min-h-screen">
        
        {/* Header */}
        <div className="sticky top-0 md:top-8 lg:top-4 z-10 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">Stay updated with your activities</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            
            {/* Unverified Payments */}
            <Section
              icon={DollarSign}
              title="Payment Verifications"
              count={unverifiedPayments.length}
              isOpen={showPayments}
              onToggle={() => setShowPayments(!showPayments)}
            >
              {unverifiedPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No payments to verify</p>
                </div>
              ) : (
                unverifiedPayments.map((payment) => (
                  <div key={payment._id} className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">₹{payment.amount}</p>
                      <p className="text-sm text-gray-600">From {payment.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {payment.proofScreenshotUrl && (
                        <button
                          onClick={() => window.open(payment.proofScreenshotUrl, '_blank')}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Proof
                        </button>
                      )}
                      <button
                        onClick={() => verifyPayment(payment._id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                ))
              )}
            </Section>

            {/* Bond Requests */}
            <Section
              icon={UserPlus}
              title="Bond Requests"
              count={bondRequests.length}
              isOpen={showRequests}
              onToggle={() => setShowRequests(!showRequests)}
            >
              {bondRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No bond requests</p>
                </div>
              ) : (
                bondRequests.map((request) => (
                  <RequestItem
                    key={request._id}
                    request={request}
                    type="bond"
                    onAccept={acceptBondRequest}
                    onReject={rejectBondRequest}
                  />
                ))
              )}
            </Section>

            {/* Community Join Requests */}
            <Section
              icon={Users}
              title="Community Requests"
              count={communityJoinRequests.length}
              isOpen={showJoinRequests}
              onToggle={() => setShowJoinRequests(!showJoinRequests)}
            >
              {communityJoinRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No join requests</p>
                </div>
              ) : (
                communityJoinRequests.map((request) => (
                  <RequestItem
                    key={request._id}
                    request={request}
                    type="community"
                    onAccept={acceptBondRequest}
                    onReject={rejectBondRequest}
                  />
                ))
              )}
            </Section>

            {/* New Notifications */}
            {unseen.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                  <Clock className="w-4 h-4" />
                  New Notifications
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                    {unseen.length}
                  </span>
                </h3>
                {unseen.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    isUnseen={true}
                  />
                ))}
              </div>
            )}

            {/* Previous Notifications */}
            {seen.length > 0 && (
              <Section
                icon={Check}
                title="Previous Notifications"
                count={seen.length}
                isOpen={showSeen}
                onToggle={() => setShowSeen(!showSeen)}
              >
                {seen.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    isUnseen={false}
                  />
                ))}
              </Section>
            )}

            {/* Empty State */}
            {unseen.length === 0 && seen.length === 0 && bondRequests.length === 0 && 
             communityJoinRequests.length === 0 && unverifiedPayments.length === 0 && (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-500">You have no new notifications</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notification;