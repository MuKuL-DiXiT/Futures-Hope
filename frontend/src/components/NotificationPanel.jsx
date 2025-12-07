import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Bell, CheckCircle, User, UserPlus, DollarSign, Users, MessageSquare, Heart, ChevronDown, ChevronUp, Clock, Check, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import secureFetch from "../utils/secureFetch";

export const socket = io(import.meta.env.VITE_BACKEND_URL, {
  withCredentials: true,
  transports: ["websocket"],
});

const NotificationPanel = ({ isOpen, onClose }) => {
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
    if (isOpen) {
      fetchAllNotificationData();
      socket.on("notify", (n) => setUnseen((prev) => [n, ...prev]));
    }
    return () => socket.off("notify");
  }, [isOpen]);

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
        className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
          isUnseen 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(notification.createdAt).toLocaleDateString()}
            </span>
            {isUnseen && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                New
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const RequestItem = ({ request, type, onAccept, onReject }) => {
    return (
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all duration-200">
        <NavLink to={`/people/${request.requester?._id || request._id}`} className="flex-shrink-0">
          <img 
            src={request.requester?.profilePic || request.profilePic || '/dummy.png'} 
            alt="" 
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700" 
          />
        </NavLink>
        
        <div className="flex-1 min-w-0">
          <NavLink 
            to={`/people/${request.requester?._id || request._id}`} 
            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
          >
            {request.requester?.firstname || request.firstname} {request.requester?.lastname || request.lastname}
          </NavLink>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {type === 'bond' ? 'Wants to bond with you' : `Wants to join ${request.community?.name}`}
          </p>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => onAccept(request._id)}
            className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => onReject(request._id)}
            className="px-2 py-1 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    );
  };

  const Section = ({ icon: Icon, title, count, isOpen, onToggle, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
            {count > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{count} item{count !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {count}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <div className="p-3 space-y-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity duration-200"
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-900 z-50 flex flex-col shadow-2xl overflow-hidden max-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Unverified Payments */}
              <Section
                icon={DollarSign}
                title="Payment Verifications"
                count={unverifiedPayments.length}
                isOpen={showPayments}
                onToggle={() => setShowPayments(!showPayments)}
              >
                {unverifiedPayments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <p className="text-xs">No payments to verify</p>
                  </div>
                ) : (
                  unverifiedPayments.map((payment) => (
                    <div key={payment._id} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/40 rounded-lg flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">₹{payment.amount}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">From {payment.name}</p>
                      </div>
                      <button
                        onClick={() => verifyPayment(payment._id)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
                      >
                        Verify
                      </button>
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
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <p className="text-xs">No bond requests</p>
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
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <p className="text-xs">No join requests</p>
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
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm">
                    <Clock className="w-4 h-4" />
                    New
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-0.5 rounded-full">
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
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">All caught up!</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">You have no new notifications</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
