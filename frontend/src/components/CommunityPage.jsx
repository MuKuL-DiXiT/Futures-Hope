import React, { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';
import LazyImage from "./LazyImage";

export default function CommunityProfile({ comId }) {
  const [community, setCommunity] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinStatus, setJoinstatus] = useState(null);
  const [account, setAccount] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

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
    const fetchCommunity = async () => {
      try {
        const res = await secureFetch(`/auth/community/${comId}`, { method: "GET" });
        const data = await res.json();
        setCommunity(data);
      } catch (error) {
        console.error('Failed to fetch community:', error);
      }
    };

    const fetchUser = async () => {
      try {
        const res = await secureFetch('/auth/extractUser', { method: "GET" });
        const data = await res.json();
        setUserId(data.user._id);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    const fetchStatus = async () => {
      try {
        const res = await secureFetch(`/auth/community/${comId}/status`, { method: "GET" });
        const data = await res.json();
        setJoinstatus(data.status);
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    };

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    const loadData = async () => {
      await Promise.all([fetchCommunity(), fetchUser(), fetchStatus()]);
      setIsLoading(false);
    };

    loadData();

    return () => {
      document.body.removeChild(script);
    };
  }, [comId]);

  const handleAccountChange = (e) => {
    setAccount(e.target.value);
  };

  const handleSubmitAccount = async (e) => {
    e.preventDefault();
    if (!account || !account.trim()) {
      toast.error('Please enter an account number');
      return;
    }
    try {
      await secureFetch(`/auth/community/${comId}/uploadAcc`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acc: account })
      });
      setAccount('');
      toast.success('Account number updated successfully!');
    } catch (err) {
      toast.error('Failed to update account number: ' + (err.message || 'An error occurred.'));
      console.error('Account update failed', err);
    }
  };

  const joinCommunity = async () => {
    try {
      await secureFetch(`/auth/community/${comId}/join`, { method: "POST" });
      toast.success(joinStatus === 'none' ? 'Joined community!' : 'Left community!');
    } catch (err) {
      toast.error('Failed to join/leave community: ' + (err.message || 'An error occurred.'));
      console.error('Failed to join community', err);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setPaymentLoading(true);

    try {
      // Step 1: Create order on backend
      const orderResponse = await secureFetch('/auth/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          communityId: comId,
        }),
      });

      if (!orderResponse.ok) {
        toast.error('Failed to create payment order');
        setPaymentLoading(false);
        return;
      }

      const orderData = await orderResponse.json();

      // Step 2: Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Futures Hope',
        description: `Donation to ${community.name}`,
        order_id: orderData.id,
        handler: async (response) => {
          try {
            // Step 3: Verify payment on backend
            const verifyResponse = await secureFetch('/auth/payment/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                communityId: comId,
                amount,
                message,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success('Payment successful! Thank you for your support.');
              setAmount('');
              setMessage('');
            } else {
              toast.error(verifyData.message || 'Payment verification failed');
            }
          } catch (error) {
            toast.error('Error verifying payment: ' + error.message);
            console.error('Payment verification error:', error);
          }
        },
        prefill: {
          name: community.creator.firstname + ' ' + community.creator.lastname,
          email: community.creator.email,
        },
        theme: {
          color: '#1e293b',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error('Error initiating payment: ' + error.message);
      console.error('Payment error:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-slate-900 dark:bg-slate-100 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-slate-700 dark:text-slate-300 text-xl font-semibold">Community not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      <ToastContainer /> {/* Toast container added here */}
      
      {/* Header/Hero Section */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            {/* Community Avatar */}
            <div className="flex-shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                <LazyImage
                  src={community.profilePic}
                  alt={community.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Community Info */}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
                {community.name}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-4 max-w-2xl">
                {community.description}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 sm:gap-4 mb-4">
                <div className="flex flex-col">
                  <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{community.members.length}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Members</span>
                </div>
                <div className="flex flex-col border-l border-slate-300 dark:border-slate-700 pl-3 sm:pl-4">
                  <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{community.moderators?.length || 0}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Moderators</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {(community.creator._id !== userId) && (
                  <button
                    className="px-4 py-2 text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors duration-200"
                    onClick={() => joinCommunity()}>
                    {joinStatus === 'none'
                      ? 'Join'
                      : joinStatus === 'pending'
                        ? 'Withdraw'
                        : 'Leave'}
                  </button>
                )}

                {(userId === community.creator._id) && (
                  <form onSubmit={handleSubmitAccount} className='flex items-center gap-2'>
                    <input
                      type="text"
                      placeholder="Enter bank account number"
                      value={account || ''}
                      onChange={handleAccountChange}
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    />
                    <button type="submit" className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      Save Account
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Creator Section */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Founder</h2>
            <div className="flex items-center gap-4">
              <img
                src={community.creator.profilePic || '/default-avatar.png'}
                alt={community.creator.firstname}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-0.5 truncate">
                  {community.creator.firstname} {community.creator.lastname}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate mb-2">{community.creator.email}</p>
                <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">Founder</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Section */}
        {(community.accNumber || userId === community.creator._id) && (
          <div className="mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Bank Account
              </h2>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                {community.accNumber ? (
                  <>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">Account Number</p>
                    <p className="text-lg font-mono font-bold text-slate-900 dark:text-white break-all">
                      {community.accNumber}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-500 italic">No account number added yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Donation Section */}
        {(userId !== community.creator._id) && (
          <div className="mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Support This Community
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Donation Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share a message of support..."
                    rows="3"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all resize-none"
                  />
                </div>

                <button
                  onClick={handleRazorpayPayment}
                  disabled={paymentLoading}
                  className="w-full px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading ? 'Processing...' : 'Donate Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Moderators Section */}
        {community.moderators?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Moderators ({community.moderators.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {community.moderators.map((mod) => (
                <div key={mod._id} className="bg-white dark:bg-slate-900 rounded-lg p-3 sm:p-4 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <img
                      src={mod.profilePic || '/default-avatar.png'}
                      alt={mod.firstname}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {mod.firstname}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{mod.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Section */}
        <div className="pb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Members ({community.members.length})
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {community.members.map((member) => (
              <div key={member._id} className="bg-white dark:bg-slate-900 rounded-md p-2 shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow text-center">
                <div className="relative inline-block mb-2">
                  <img
                    src={member.profilePic || '/default-avatar.png'}
                    alt={member.firstname}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-md mx-auto object-cover border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <h3 className="text-xs font-medium text-slate-900 dark:text-white line-clamp-1">
                  {member.firstname}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
