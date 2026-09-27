import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, FileDown, ShieldCheck, RefreshCw, KeyRound, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { Song } from '../types';
import { encodeSongVault } from '../songVault';
import { LEVEL_2_PASSWORD_HASH, verifyPasswordHash } from '../security';

interface SongVaultEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
}

export const SongVaultEditorModal: React.FC<SongVaultEditorModalProps> = ({
  isOpen,
  onClose,
  songs,
}) => {
  // 二级权限验证状态 (每次打开必须核验二级密码)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [secPassword, setSecPassword] = useState('');
  const [showSecPassword, setShowSecPassword] = useState(false);
  const [secErrorMessage, setSecErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const secInputRef = useRef<HTMLInputElement>(null);

  // 编辑器状态
  const [jsonText, setJsonText] = useState('');
  const [copiedCipher, setCopiedCipher] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsAuthorized(false);
      setSecPassword('');
      setSecErrorMessage('');
      setIsVerifying(false);
      setCopiedCipher(false);
      setCopiedRaw(false);
      setErrorMessage('');
      setSuccessInfo('');
      setJsonText(JSON.stringify(songs, null, 2));
      setTimeout(() => secInputRef.current?.focus(), 150);
    }
  }, [isOpen, songs]);

  if (!isOpen) return null;

  // 二级密码提交核验
  const handleVerifySecondary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecErrorMessage('');

    if (!secPassword) {
      setSecErrorMessage('请输入二级管理密码');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyPasswordHash(secPassword, LEVEL_2_PASSWORD_HASH);
      if (isValid) {
        setIsAuthorized(true);
        setSecPassword('');
        setSecErrorMessage('');
      } else {
        setSecErrorMessage('二级密码错误，请重新输入');
      }
    } catch {
      setSecErrorMessage('核验出错，请稍后重试');
    } finally {
      setIsVerifying(false);
    }
  };

  // 格式化 JSON
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setErrorMessage('');
    } catch (err: any) {
      setErrorMessage('JSON 语法有误：' + err.message);
    }
  };

  // 生成最新加密密文并复制
  const handleGenerateAndCopyCipher = async () => {
    setErrorMessage('');
    setSuccessInfo('');
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('歌曲数据必须是一个数组 []');
      }
      const cipher = encodeSongVault(parsed);
      await navigator.clipboard.writeText(cipher);
      setCopiedCipher(true);
      setSuccessInfo(`已生成 ${parsed.length} 首歌曲的加密密文并复制到剪贴板！可直接粘贴回 constants.ts`);
      setTimeout(() => setCopiedCipher(false), 3000);
    } catch (err: any) {
      setErrorMessage('生成失败：' + err.message);
    }
  };

  // 复制当前明文 JSON
  const handleCopyRawJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopiedRaw(true);
      setSuccessInfo('明文 JSON 已复制到剪贴板！可粘贴进 songs.raw.json');
      setTimeout(() => setCopiedRaw(false), 2500);
    } catch (err: any) {
      setErrorMessage('复制失败：' + err.message);
    }
  };

  // 下载 songs.raw.json
  const handleDownloadRawJson = () => {
    try {
      const blob = new Blob([jsonText], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'songs.raw.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage('下载失败：' + err.message);
    }
  };

  // 重新锁定
  const handleRelock = () => {
    setIsAuthorized(false);
    setSecPassword('');
    setTimeout(() => secInputRef.current?.focus(), 100);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      {/* 状态 1：未通过二级验证，展示二级密码核验卡片 */}
      {!isAuthorized ? (
        <div className="relative w-full max-w-sm bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-2xl z-10 animate-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="关闭"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <KeyRound size={24} />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              曲库管理二级密码验证
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[270px]">
              曲库明文助手包含全部音频与歌词的直链信息，需核验二级管理员密码方可访问。
            </p>
          </div>

          <form onSubmit={handleVerifySecondary} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                二级管理密码
              </label>
              <div className="relative">
                <input
                  ref={secInputRef}
                  type={showSecPassword ? 'text' : 'password'}
                  value={secPassword}
                  onChange={(e) => {
                    setSecPassword(e.target.value);
                    setSecErrorMessage('');
                  }}
                  placeholder="请输入二级管理密码"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecPassword(!showSecPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showSecPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {secErrorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg animate-in fade-in">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{secErrorMessage}</span>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck size={16} />
              <span>验证并进入</span>
            </button>
          </form>
        </div>
      ) : (
        /* 状态 2：已核验二级密码，展示曲库编辑器 */
        <div className="relative w-full max-w-4xl h-[85vh] max-h-[900px] min-h-[560px] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-200">
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between p-4 sm:px-6 sm:py-4 border-b border-white/10 bg-white/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-green-500/20 text-green-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>曲库明文维护与加密助手</span>
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    二级权限已验证
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  在此查看、批量修改明文歌曲信息，修改后可一键重新加密
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRelock}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-300 hover:text-amber-300 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 transition-all active:scale-95"
                title="重新锁定二级保护"
              >
                <Lock size={13} />
                <span>锁定退出</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                title="关闭"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* 中间编辑区域 (占满可用高度) */}
          <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 overflow-hidden bg-black/20">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-200">
                  歌曲明文 JSON 结构 (支持直接修改)
                </span>
                <span className="text-[11px] text-gray-500">
                  ({jsonText.split('\n').length} 行)
                </span>
              </div>
              <button
                onClick={handleFormat}
                className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg transition-colors active:scale-95"
                title="自动排版对齐"
              >
                <RefreshCw size={12} />
                <span>格式化对齐</span>
              </button>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setErrorMessage('');
              }}
              spellCheck={false}
              className="flex-1 w-full min-h-0 bg-black/60 border border-white/10 rounded-xl p-4 text-xs sm:text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-green-400/80 focus:ring-1 focus:ring-green-400/50 custom-scrollbar leading-relaxed"
              placeholder="歌曲 JSON 数组..."
            />

            {/* 状态提示 */}
            {errorMessage && (
              <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-xl shrink-0 animate-in fade-in">
                {errorMessage}
              </div>
            )}
            {successInfo && (
              <div className="mt-3 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3.5 py-2 rounded-xl shrink-0 animate-in fade-in">
                {successInfo}
              </div>
            )}
          </div>

          {/* 底部按钮栏 */}
          <div className="p-4 sm:px-6 sm:py-3.5 border-t border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyRawJson}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 text-gray-200 transition-all active:scale-95"
              >
                {copiedRaw ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span>复制明文 JSON</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadRawJson}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 text-gray-200 transition-all active:scale-95"
                title="下载为 songs.raw.json 保存到项目根目录"
              >
                <FileDown size={14} />
                <span>下载 raw.json</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerateAndCopyCipher}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black shadow-lg shadow-green-500/20 transition-all active:scale-95 ml-auto"
            >
              {copiedCipher ? <Check size={15} /> : <ShieldCheck size={15} />}
              <span>一键生成加密密文并复制</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
