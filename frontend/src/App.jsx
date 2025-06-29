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

// This component needs to be inside BrowserRouter
function Layout() {
  const location = useLocation();
  const showNavbar = location.pathname != ("/" || "/signup");

  return (
    <div className="flex">
      <div>
        {showNavbar && (
          <>
            <Navbar />
          </>
        )}
      </div>
      <BraveWarningBanner />
      <Routes >
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
      </Routes>
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
