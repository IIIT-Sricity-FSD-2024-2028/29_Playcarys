/*
 * Concepts used: Context API (provider + custom hook), useState, useEffect with
 * cleanup (polling, window events), useRef, useCallback, useMemo.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo
} from 'react';
import AuthContext from './AuthContext';
import socialService from '../services/socialService';
import UserProfileModal from '../components/player/common/UserProfileModal';
import ChatWindow from '../components/player/common/ChatWindow';

const POLL_MS = 8000;

export const ChatContext = createContext({
  openChat: () => {},
  closeChat: () => {},
  openProfile: () => {},
  closeProfile: () => {},
  openFriendsPanel: () => {},
  refreshSocial: () => {},
  respondToRequest: async () => {},
  activeChatFriend: null,
  activeProfileUser: null,
  friends: [],
  incomingRequests: [],
  unreadTotal: 0,
  socialStatus: 'loading'
});

/**
 * One place that knows who the player's friends are, which friend requests are
 * waiting, and how many messages are unread — all from the SERVER.
 *
 * The navbar, the dashboard friends list and the chat window used to each work
 * this out from a copy of the database cached in localStorage, so they could
 * disagree with each other and with the server (a friend accepted on another
 * device never showed up, an unfriended player stayed in the list).
 */
export function ChatProvider({ children }) {
  const { user } = useContext(AuthContext);
  // No fallback id. The old `?? 7` meant that whenever the session had not
  // loaded yet, messages were sent as user 7 (Dragon Slayer).
  const currentUserId = user?.userId ?? user?.id ?? user?.user_id ?? null;
  const isPlayer = Boolean(currentUserId) && user?.role !== 'guest';

  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [activeProfileUser, setActiveProfileUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [socialStatus, setSocialStatus] = useState('loading'); // loading | ok | signin | error
  const activeChatRef = useRef(null);
  activeChatRef.current = activeChatFriend;

  const refreshSocial = useCallback(async () => {
    if (!isPlayer) return;
    try {
      const [friendRows, reqs] = await Promise.all([
        socialService.listFriends(currentUserId),
        socialService.listRequests(currentUserId)
      ]);
      setFriends(friendRows);
      setIncomingRequests(reqs.incoming);
      setSocialStatus('ok');

      // Someone was unfriended (from here or the other side) while their chat
      // was open: the window has nothing left to talk to.
      const open = activeChatRef.current;
      if (open && !friendRows.some((f) => String(f.id) === String(open.id))) {
        setActiveChatFriend(null);
      }
    } catch (err) {
      // 403 = no signed session (for example the dev fallback identity).
      setSocialStatus(err.status === 403 ? 'signin' : 'error');
    }
  }, [isPlayer, currentUserId]);

  // Load once, then keep fresh: poll while the tab is visible, and refresh at
  // once when anything in the app says the friends changed.
  useEffect(() => {
    if (!isPlayer) {
      setFriends([]);
      setIncomingRequests([]);
      return undefined;
    }
    refreshSocial();
    const timer = setInterval(() => {
      if (!document.hidden) refreshSocial();
    }, POLL_MS);
    window.addEventListener('friends-updated', refreshSocial);
    return () => {
      clearInterval(timer);
      window.removeEventListener('friends-updated', refreshSocial);
    };
  }, [isPlayer, refreshSocial]);

  function openChat(friend) {
    if (!friend) return;
    const id = friend.id || friend.user_id;
    // Prefer the server's copy of the friend so the header shows real presence.
    const known = friends.find((f) => String(f.id) === String(id));
    const src = known || friend;
    setActiveChatFriend({
      id,
      user_id: id,
      name: src.name || src.username || src.user_name || 'Friend',
      username: src.name || src.username || src.user_name || 'Friend',
      avatar: src.avatar,
      presence: src.presence
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

  /** Ask the navbar to slide its friends drawer open (it owns that state). */
  function openFriendsPanel() {
    window.dispatchEvent(new CustomEvent('open-friends-panel'));
  }

  /** Accept or decline a friend request, then bring every list up to date. */
  async function respondToRequest(requestId, action) {
    const result = await socialService.respondToRequest(requestId, currentUserId, action);
    await refreshSocial();
    window.dispatchEvent(new CustomEvent('friends-updated'));
    return result;
  }

  const unreadTotal = useMemo(
    () => friends.reduce((sum, f) => sum + (f.unread || 0), 0),
    [friends]
  );

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
        openFriendsPanel,
        refreshSocial,
        respondToRequest,
        activeChatFriend,
        activeProfileUser,
        friends,
        incomingRequests,
        unreadTotal,
        socialStatus
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
        onRead={refreshSocial}
      />
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}

export default ChatContext;
