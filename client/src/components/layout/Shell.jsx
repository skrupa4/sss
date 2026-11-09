import MobileTopBar from './MobileTopBar';
import PushPrompt from './PushPrompt';
import Sidebar from './Sidebar';

export default function Shell({ children }) {
  return (
    <>
      <MobileTopBar />
      <div className="mx-auto flex min-h-screen w-full max-w-[1000px] items-start gap-6 px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 md:px-6 lg:pb-8 lg:pt-6">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <PushPrompt />
    </>
  );
}
