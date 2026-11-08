import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { ToastProvider } from './context/ToastContext';
import { useRoute } from './utils/router';
import Shell from './components/layout/Shell';
import { Spinner } from './components/ui/Spinner';
import AuthPage from './pages/AuthPage';
import ClanPage from './pages/ClanPage';
import ClansPage from './pages/ClansPage';
import FeedPage from './pages/FeedPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import PremiumPage from './pages/PremiumPage';
import AdminPage from './pages/AdminPage';
import CoinsPage from './pages/CoinsPage';

function Pages() {
  const { user } = useAuth();
  const { page, param } = useRoute();

  switch (page) {
    case 'profile': return <ProfilePage key={param || user.username} username={param || user.username} />;
    case 'messages': return <MessagesPage peer={param} />;
    case 'notifications': return <NotificationsPage />;
    case 'following': return <FeedPage mode="following" />;
    case 'premium': return <PremiumPage />;
    case 'coins': return <CoinsPage />;
    case 'admin': return <AdminPage />;
    case 'clans': return param ? <ClanPage key={param} id={param} /> : <ClansPage />;
    default: return <FeedPage />;
  }
}

function Gate() {
  const { user, booting } = useAuth();
  if (booting) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner label="Подключаемся…" /></div>;
  }
  if (!user) return <AuthPage />;
  return (
    <RealtimeProvider>
      <Shell><Pages /></Shell>
    </RealtimeProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DialogProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </DialogProvider>
    </ToastProvider>
  );
}
