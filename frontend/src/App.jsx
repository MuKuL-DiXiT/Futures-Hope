import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './components/Landing';
import Signup from './components/Signup';
import Home from "./components/Home"
import Profile from "./components/Profile"
import Post from './components/Post';
import PeopleProfileWrapper from './components/PeopleProfileWrapper';
import Messages from './components/Messages';
import CreateCommunityForm from './components/CreateCommunityForm';
import Notification from './components/Notification';
import CommunityPageWrapper from './components/CommunityPageWrapper';
import SinglePost from './components/SinglePost';
import Connections from './components/Connections';
import BraveWarningBanner from './components/BraveWarningBanner';
import Edit from './components/Edit';
import NotificationPanel from './components/NotificationPanel';

// This component needs to be inside BrowserRouter
function Layout() {
  const location = useLocation();
  const showNavbar = location.pathname != ("/") && location.pathname != ("/signup");
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {!showNavbar && <BraveWarningBanner />}
      
      <div className="flex flex-col h-screen">
        {/* Instagram-style layout */}
        {showNavbar && (
          <Navbar 
            onNotificationOpen={() => setIsNotificationPanelOpen(true)}
            isNotificationOpen={isNotificationPanelOpen}
            onNotificationClose={() => setIsNotificationPanelOpen(false)}
          />
        )}
        
        <main className={`flex-1 overflow-y-auto ${showNavbar ? 'pb-16 md:pb-0 md:ml-64' : ''}`}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/home" element={<Home />} />
            <Route path="/Profile" element={<Profile />} />
            <Route path="/post" element={<Post />} />
            <Route path="/people/:id" element={<PeopleProfileWrapper />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/createCommunity" element={<CreateCommunityForm />} />
            <Route path="/notification" element={<Notification />} />
            <Route path="/community/:id" element={<CommunityPageWrapper />} />
            <Route path="/post/:postId" element={<SinglePost />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/edit" element={<Edit />} />
          </Routes>
        </main>
      </div>
      
      {/* Centralized NotificationPanel */}
      <NotificationPanel 
        isOpen={isNotificationPanelOpen} 
        onClose={() => setIsNotificationPanelOpen(false)} 
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
