import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthContext from './AuthContext';
import socialService from '../services/socialService';
import UserProfileModal from '../components/player/common/UserProfileModal';
import ChatWindow from '../components/player/common/ChatWindow';

export const ChatContext = createContext({
  openChat: () => {},
  closeChat: () => {},
  openProfile: () => {},
  closeProfile: () => {},
  activeChatFriend: null,
  activeProfileUser: null
});

export function ChatProvider({ children }) {
  const { user } = useContext(AuthContext);
  const currentUserId = user?.userId ?? user?.id ?? user?.user_id ?? 7;

  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [activeProfileUser, setActiveProfileUser] = useState(null);

  function openChat(friend) {
    if (!friend) return;
    setActiveChatFriend({
      id: friend.id || friend.user_id,
      user_id: friend.id || friend.user_id,
      name: friend.name || friend.username || friend.user_name || 'Friend',
      username: friend.name || friend.username || friend.user_name || 'Friend',
      avatar: friend.avatar,
      presence: friend.presence
    });
  }

  function closeChat() {
    setActiveChatFriend(null);
  }

  function openProfile(userOrName) {
    if (!userOrName) return;

    let target = userOrName;
    if (typeof userOrName === 'string' || typeof userOrName === 'number') {
      target = socialService.getUserFullProfile(userOrName);
    } else if (!userOrName.tierInfo || userOrName.pcp === undefined) {
      const full = socialService.getUserFullProfile(userOrName.id || userOrName.user_id || userOrName.name || userOrName.username);
      target = full || userOrName;
    }

    if (target) {
      setActiveProfileUser(target);
    }
  }

  function closeProfile() {
    setActiveProfileUser(null);
  }

  // Register bridge for any legacy onclick references
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.showUserProfile = (nameOrId) => {
        openProfile(nameOrId);
      };
    }
    return () => {
      if (typeof window !== 'undefined' && window.showUserProfile) {
        delete window.showUserProfile;
      }
    };
  }, []);

  return (
    <ChatContext.Provider
      value={{
        openChat,
        closeChat,
        openProfile,
        closeProfile,
        activeChatFriend,
        activeProfileUser
      }}
    >
      {children}

      {/* Global User Profile Modal Card */}
      <UserProfileModal
        isOpen={Boolean(activeProfileUser)}
        user={activeProfileUser}
        currentUserId={currentUserId}
        onClose={closeProfile}
        onMessage={(friend) => {
          closeProfile();
          openChat(friend);
        }}
      />

      {/* Global 1-on-1 Chat Window */}
      <ChatWindow
        isOpen={Boolean(activeChatFriend)}
        friend={activeChatFriend}
        currentUserId={currentUserId}
        onClose={closeChat}
      />
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}

export default ChatContext;
