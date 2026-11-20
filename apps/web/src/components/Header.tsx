'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Camera,
  History,
  TrendingUp,
  Clock,
  Users,
  Settings,
  Volume2,
  ZoomIn,
  ZoomOut,
  HeartPulse,
  UserCheck,
  LogOut,
  Pill,
  Sparkles,
  Bot,
} from 'lucide-react';
import { useElderlyPreferences } from './ElderlyPreferencesContext';
import { api } from '../lib/api';
import { UserProfile } from '../lib/types';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { fontScale, setFontScale, ttsEnabled, setTtsEnabled, stopSpeech, isSpeaking } = useElderlyPreferences();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const user = api.getCurrentUser();
    setCurrentUser(user);
  }, [pathname]);

  const handleLogout = () => {
    if (confirm('Bác hoặc bạn có chắc muốn đăng xuất tài khoản này?')) {
      api.logout();
      setCurrentUser(null);
      router.push('/login');
    }
  };

  const navLinks = [
    { href: '/', label: 'Trang chủ', icon: HeartPulse },
    { href: '/scan', label: 'Quét phiếu', icon: Camera },
    { href: '/ai-chat', label: 'Bác Sĩ AI', icon: Sparkles },
    { href: '/history', label: 'Lịch sử', icon: History },
    { href: '/trends', label: 'Xu hướng', icon: TrendingUp },
    { href: '/medications', label: 'Lịch thuốc', icon: Clock },
    { href: '/care', label: 'Người thân', icon: Users },
    { href: '/settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#DDEEEB] shadow-sm">
      {/* Top Banner with Elderly Accessibility Controls */}
      <div className="bg-[#073F46] text-white px-4 py-2 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate">
              MediRead AI — Trợ lý y tế thông minh & Lịch uống thuốc cho người cao tuổi
            </span>
          </div>

          {/* Accessibility Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg whitespace-nowrap">
              <span className="text-xs text-emerald-100 mr-1 hidden sm:inline">Cỡ chữ:</span>
              <button
                type="button"
                onClick={() => setFontScale(Math.max(0.9, Number((fontScale - 0.1).toFixed(2))))}
                className="px-2 py-1 hover:bg-white/20 rounded flex items-center justify-center text-xs font-bold transition"
                title="Giảm cỡ chữ"
              >
                <ZoomOut className="w-3.5 h-3.5 mr-0.5 shrink-0" /> A-
              </button>
              <span className="text-xs font-bold px-1.5 min-w-[44px] text-center">
                {Math.round(fontScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setFontScale(Math.min(1.45, Number((fontScale + 0.1).toFixed(2))))}
                className="px-2 py-1 hover:bg-white/20 rounded flex items-center justify-center text-xs font-bold transition"
                title="Tăng cỡ chữ"
              >
                <ZoomIn className="w-3.5 h-3.5 mr-0.5 shrink-0" /> A+
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isSpeaking) stopSpeech();
                setTtsEnabled(!ttsEnabled);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                ttsEnabled ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-300'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>{ttsEnabled ? (isSpeaking ? 'Đang đọc...' : 'Giọng đọc: Bật') : 'Giọng đọc: Tắt'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 min-h-[72px] py-2.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#073F46] to-[#0B6B73] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition shrink-0">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xl sm:text-2xl font-black text-[#073F46] tracking-tight leading-none whitespace-nowrap">
                MediRead <span className="text-[#0B6B73]">AI</span>
              </span>
              <span className="text-xs text-[#5B6B77] font-medium leading-tight mt-1 hidden sm:block whitespace-nowrap">
                Đọc đơn thuốc & Phiếu xét nghiệm
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Items (xl and up) */}
          <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold transition text-sm whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#DDEEEB] text-[#073F46] border border-[#0B6B73]/20 shadow-sm'
                      : 'text-[#5B6B77] hover:text-[#0B6B73] hover:bg-[#F2F8F7]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0B6B73]' : 'text-[#8A8A8A]'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Account / Auth Section */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition"
                  title="Nhấp để đổi tài khoản"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#073F46] to-[#0B6B73] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                    {currentUser.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden md:flex flex-col items-start justify-center">
                    <span className="text-xs font-bold text-[#073F46] leading-tight truncate max-w-[140px]">
                      {currentUser.full_name}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 mt-0.5 rounded bg-[#DDEEEB] text-[#073F46] leading-none whitespace-nowrap">
                      {currentUser.role === 'caregiver' ? 'Chăm sóc' : 'Người bệnh'}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-rose-600 rounded-lg transition shrink-0"
                  title="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-[#0B6B73] text-white px-3.5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#073F46] transition whitespace-nowrap shrink-0"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Đăng nhập / Đăng ký</span>
                <span className="sm:hidden">Tài khoản</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Scrollable Sub-Nav for Mobile, Tablet & Laptop (< xl) */}
      <div className="xl:hidden border-t border-[#DDEEEB]/70 bg-[#F8FAFA]">
        <nav className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition text-xs sm:text-sm whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#073F46] text-white shadow-sm'
                    : 'bg-white text-[#5B6B77] border border-[#DDEEEB] hover:text-[#0B6B73]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-300' : 'text-[#8A8A8A]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
