import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, MessageCircleMore, User, Bell, Upload, TreePine, Sun, Moon, X } from 'lucide-react';
import secureFetch from "../utils/secureFetch";
import { useTheme } from "next-themes";


export default function Navbar({ onNotificationOpen, isNotificationOpen, onNotificationClose }) {
  const {theme, setTheme} = useTheme();
  const location = useLocation();
  const navclass = ({ isActive }) =>
    isActive
      ? "text-gray-900 dark:text-white flex items-center justify-center p-3 transition-colors duration-200"
      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center p-3 transition-colors duration-200";

  const mobileNavclass = ({ isActive }) =>
    isActive
      ? "text-gray-900 dark:text-white flex flex-col items-center gap-1 font-medium"
      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex flex-col items-center gap-1 transition-colors duration-200";

  const [unseenNotifications, setUnseenNotifications] = useState(0);
  const [unseenMessages, setUnseenMessages] = useState(0);

  const links = [
    { to: "/home", icon: <Home size={20} />, label: "Home" },
    { to: "/messages", icon: <MessageCircleMore size={20} />, label: "Messages" },
    { to: "/post", icon: <Upload size={20} />, label: "Create" },
    { onClick: onNotificationOpen, icon: <Bell size={20} />, label: "Notifications", isModal: true },
    { to: "/profile", icon: <User size={20} />, label: "Profile" }
  ];
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
      <div className="relative ">
        <span>{link.icon}</span>
        {(showNotifBadge || showMessageBadge) && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
    );
  };

  const renderNavItem = (link, index) => {
    if (link.isModal) {
      return (
        <button
          onClick={link.onClick}
          className={`w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-4 p-3 transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isNotificationOpen ? "text-gray-900 dark:text-white" : ""
          }`}
          key={index}
        >
          {renderIconWithBadge(link)}
          <span className="hidden lg:inline text-sm font-medium">{link.label}</span>
        </button>
      );
    }
    
    return (
      <NavLink
        to={link.to}
        className={({ isActive }) =>
          `w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-4 p-3 transition-colors duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${
            isActive ? "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800" : ""
          }`
        }
        key={index}
      >
        {renderIconWithBadge(link)}
        <span className="hidden lg:inline text-sm font-medium">{link.label}</span>
      </NavLink>
    );
  };

  return (
    <>
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 flex-col p-4 transition-colors duration-300">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
            <TreePine size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">FuturesHope</span>
        </div>
        <nav className="flex-1 space-y-2">
          {links.map((link, index) => renderNavItem(link, index))}
        </nav>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-4 p-3 rounded-lg border border-gray-400 dark:border-gray-600 transition-colors duration-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Sun
            className={`h-5 w-5 text-yellow-500 transition-all duration-300 ${
              theme === "light" ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
            }`}
          />
          <Moon
            className={`h-5 w-5 text-gray-200 absolute transition-all duration-300 ${
              theme === "dark" ? "opacity-100 rotate-0" : "opacity-0 rotate-90"
            }`}
          />
          <span className="text-sm font-medium">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>
      </div>
      <div className="hidden md:block w-64" />
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center h-16 md:hidden z-50 transition-colors duration-300">
        {links.map((link, index) => (
          link.isModal ? (
            <button
              onClick={link.onClick}
              className={`text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex flex-col items-center gap-1 transition-colors duration-200 ${
                isNotificationOpen ? "text-gray-900 dark:text-white" : ""
              }`}
              key={index}
            >
              {renderIconWithBadge(link)}
            </button>
          ) : (
            <NavLink to={link.to} className={mobileNavclass} key={index}>
              {renderIconWithBadge(link)}
            </NavLink>
          )
        ))}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-400 dark:border-gray-600 transition-colors duration-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Sun
            className={`h-5 w-5 text-yellow-500 transition-all duration-300 ${
              theme === "light" ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
            }`}
          />
          <Moon
            className={`h-5 w-5 text-gray-200 absolute transition-all duration-300 ${
              theme === "dark" ? "opacity-100 rotate-0" : "opacity-0 rotate-90"
            }`}
          />
        </button>
      </div>
    </>
  );
}
