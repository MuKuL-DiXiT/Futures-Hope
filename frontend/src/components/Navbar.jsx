import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, MessageCircleMore, User, Bell, Upload } from 'lucide-react';
import axios from 'axios';

export default function Navbar() {
  const navclass = ({ isActive }) =>
    isActive
      ? "text-green-700 flex items-center gap-3 font-semibold font-sans"
      : "text-white flex items-center gap-3 hover:text-gray-300 font-sans";

  const [unseenNotifications, setUnseenNotifications] = useState(0);
  const [unseenMessages, setUnseenMessages] = useState(0);

  const links = [
    { to: "/home", icon: <Home />, label: "Home" },
    { to: "/messages", icon: <MessageCircleMore />, label: "Messages" },
    { to: "/post", icon: <Upload />, label: "Create" },
    { to: "/notification", icon: <Bell />, label: "Notifications" },
    { to: "/profile", icon: <User />, label: "Profile" }
  ];

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
    const fetchUnseenCount = async () => {
      try {
        const res = await secureFetch("/auth/notification/unseenCount", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        setUnseenNotifications(data?.notifications ?? 0);
        setUnseenMessages(data?.messages ?? 0);
      } catch (err) {
        console.error("Error fetching unseen count", err);
      }
    };

    fetchUnseenCount();
    const interval = setInterval(fetchUnseenCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderIconWithBadge = (link) => {
    const showNotifBadge = link.label === "Notifications" && unseenNotifications > 0;
    const showMessageBadge = link.label === "Messages" && unseenMessages > 0;
    const badgeCount = link.label === "Notifications" ? unseenNotifications : unseenMessages;

    return (
      <div className="relative">
        <span>{link.icon}</span>
        {(showNotifBadge || showMessageBadge) && (
          <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {badgeCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col bg-transparent">

        {/* Tree logo (desktop only) */}
        <img
          src="../public/tree.webp"
          alt=""
          width={50}
          className="ml-1 mt-8 hidden md845:inline fixed"
        />

        {/* Mobile bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/40 rounded-t-md shadow-sm flex justify-around items-center h-14 md845:hidden z-50">
          {links.map((link, index) => (
            <NavLink to={link.to} className={navclass} key={index}>
              <span className="text-xl">
                {renderIconWithBadge(link)}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Desktop sidebar nav */}
        {/* Added z-50 to ensure it's above other content */}
        <div className="mt-6 hidden md845:flex bg-transparent md845:justify-evenly md845:flex-col md845:fixed md845:h-screen md845:gap-6 md845:py-10 sm:px-4 md845:border-r w-20 z-50">
          {links.map((link, index) => (
            <NavLink to={link.to} className={navclass} key={index}>
              <span className="text-2xl">
                {renderIconWithBadge(link)}
              </span>
            </NavLink>
          ))}
        </div>

      </div>
    </>
  );
}
