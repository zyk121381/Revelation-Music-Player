import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Eye, EyeOff, X, ShieldAlert } from 'lucide-react';
import { LEVEL_1_PASSWORD_HASH, verifyPasswordHash } from '../security';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessUnlock: () => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessUnlock,
}) => {
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputPassword('');
      setErrorMessage('');
      setIsVerifying(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!inputPassword) {
      setErrorMessage('请输入管理员密码');
      return;
    }

    setIsVerifying(true);

    try {
      const isValid = await verifyPasswordHash(inputPassword, LEVEL_1_PASSWORD_HASH);
      if (isValid) {
        onSuccessUnlock();
        onClose();
      } else {
        setErrorMessage('密码错误，请重新输入');
      }
    } catch {
      setErrorMessage('校验出错，请重试');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative w-full max-w-sm bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-200">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="关闭"
        >
          <X size={18} />
        </button>

        {/* 顶部图标与标题 */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/20 to-emerald-500/10 border border-green-500/30 flex items-center justify-center text-green-400 mb-3 shadow-[0_0_20px_rgba(74,222,128,0.2)]">
            <Lock size={24} />
          </div>
          <h3 className="text-lg font-bold text-white tracking-wide">
            解锁隐藏歌曲
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-[260px]">
            请输入管理员密码以查看被隐藏的曲目。
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              管理员密码
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="请输入管理员密码"
                className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-400/80 focus:ring-1 focus:ring-green-400/50 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg animate-in fade-in">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-semibold text-sm rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Unlock size={16} />
            <span>验证并显示</span>
          </button>
        </form>
      </div>
    </div>
  );
};
