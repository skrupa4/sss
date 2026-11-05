import React, { useState } from 'react';
import Avatar from '/common/Avatar';
import EmojiPicker from '/common/EmojiPicker';

const PostCard = ({
  post,
  currentUser,
  onLike,
  onRepost,
  onDelete,
  onSendComment,
  activeComments,
  onToggleComments,
  onUserClick
}) => {
  const [commentText, setCommentText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);

  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;
    onSendComment(post.id, commentText);
    setCommentText('');
    setShowEmoji(false);
  };

  return (
    <div className="glass-card rounded-2xl md:rounded-[28px] p-4 md:p-6 transition-all border border-white/5 hover:border-white/10 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            username={post.username}
            avatarUrl={post.avatar_url}
            size="md"
            onClick={() => onUserClick(post.username)}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => onUserClick(post.username)}
                className="font-black text-xs md:text-[13px] uppercase tracking-tight text-white/90 cursor-pointer hover:text-[#ff2a5f] transition-colors"
              >
                {post.username}
              </span>
              {post.is_verified && (
                <span className="w-3.5 h-3.5 bg-[#ff2a5f] rounded-full flex items-center justify-center text-[7px] text-white font-bold">✓</span>
              )}
            </div>
            <p className="text-[9px] text-gray-500 font-black uppercase mt-0.5">
              {post.created_at ? new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Только что'}
            </p>
          </div>
        </div>

        {post.username === currentUser.username && (
          <button onClick={() => onDelete(post.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <p className="text-sm md:text-[15px] text-gray-200 leading-normal mb-5 whitespace-pre-wrap">{post.content}</p>

      <div className="flex items-center gap-6 pt-3 border-t border-white/5 text-gray-500">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase transition-colors ${post.likes > 0 ? 'text-[#ff2a5f]' : 'hover:text-white'}`}
        >
          <svg className="w-4 h-4" fill={post.likes > 0 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
          <span>{post.likes || 0}</span>
        </button>

        <button
          onClick={() => onToggleComments(post.id)}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase transition-colors ${activeComments ? 'text-white' : 'hover:text-white'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25-9 3.694-9 8.25c0 2.14.882 4.08 2.312 5.58.125.13.187.31.156.48l-.48 2.22c-.06.273.2.49.444.37l2.25-1.125c.15-.075.33-.075.48 0 1.05.525 2.22.825 3.45.825z" /></svg>
          <span>{post.comments_count || 0}</span>
        </button>

        <button
          onClick={() => onRepost(post.id)}
          className={`flex items-center gap-1.5 text-xs font-bold uppercase transition-colors ${post.reposts > 0 ? 'text-blue-400' : 'hover:text-white'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
          <span>{post.reposts || 0}</span>
        </button>
      </div>

      {activeComments && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {activeComments.map(c => (
              <div key={c.id} className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-black text-[#ff2a5f] uppercase">{c.username}</span>
                  <span className="text-[9px] text-gray-500">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-gray-300">{c.content}</p>
              </div>
            ))}
          </div>

          {showEmoji && <EmojiPicker onSelect={(e) => setCommentText(prev => prev + e)} />}

          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-2.5 h-10 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <input
              type="text"
              placeholder="Комментарий..."
              className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3 h-10 text-xs text-white outline-none focus:border-white/20"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
            />
            <button
              onClick={handleCommentSubmit}
              className="bg-white text-black h-10 px-4 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200"
            >
              ОК
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;