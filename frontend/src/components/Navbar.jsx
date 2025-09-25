import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, MessageCircleMore, User, Bell, Upload, TreePine } from 'lucide-react';
import axios from 'axios';

export default function Navbar() {
  const navclass = ({ isActive }) =>
    isActive
      ? "text-gray-900 flex items-center justify-center p-3 transition-colors duration-200"
      : "text-gray-600 hover:text-gray-900 flex items-center justify-center p-3 transition-colors duration-200";

  const mobileNavclass = ({ isActive }) =>
    isActive
      ? "text-gray-900 flex flex-col items-center gap-1 font-medium"
      : "text-gray-500 hover:text-gray-900 flex flex-col items-center gap-1 transition-colors duration-200";

  const [unseenNotifications, setUnseenNotifications] = useState(0);
  const [unseenMessages, setUnseenMessages] = useState(0);

  const links = [
    { to: "/home", icon: <Home size={20} />, label: "Home" },
    { to: "/messages", icon: <MessageCircleMore size={20} />, label: "Messages" },
    { to: "/post", icon: <Upload size={20} />, label: "Create" },
    { to: "/notification", icon: <Bell size={20} />, label: "Notifications" },
    { to: "/profile", icon: <User size={20} />, label: "Profile" }
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
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Instagram-style Header (Desktop) */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
            <TreePine size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 hidden lg:block">FuturesHope</span>
        </div>

        {/* Navigation Icons */}
        <div className="flex items-center gap-8">
          {links.map((link, index) => (
            <NavLink to={link.to} className={navclass} key={index}>
              {renderIconWithBadge(link)}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Add padding to body content */}
      <div className="hidden md:block pt-16" />

      {/* Instagram-style Bottom Navigation (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 md:hidden z-50">
        {links.map((link, index) => (
          <NavLink to={link.to} className={mobileNavclass} key={index}>
            {renderIconWithBadge(link)}
          </NavLink>
        ))}
      </div>
    </>
  );
}
