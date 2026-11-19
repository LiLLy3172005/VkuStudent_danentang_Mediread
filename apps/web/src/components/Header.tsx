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
    { href: '/history', label: 'Lịch sử', icon: History },
    { href: '/trends', label: 'Xu hướng', icon: TrendingUp },
    { href: '/medications', label: 'Lịch thuốc', icon: Clock },
    { href: '/care', label: 'Người thân & Chăm sóc', icon: Users },
    { href: '/settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#DDEEEB] shadow-sm">
      {/* Top Banner with Elderly Accessibility Controls */}
      <div className="bg-[#073F46] text-white px-4 py-1.5 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>MediRead AI — Trợ lý y tế thông minh & Lịch uống thuốc cho người cao tuổi</span>
        </div>

        {/* Accessibility Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg">
            <span className="text-xs text-emerald-100 mr-1">Cỡ chữ:</span>
            <button
              onClick={() => setFontScale(Math.max(0.9, fontScale - 0.1))}
              className="p-1 hover:bg-white/20 rounded elderly-tap-target flex items-center justify-center text-xs font-bold"
              title="Giảm cỡ chữ"
            >
              <ZoomOut className="w-4 h-4 mr-0.5" /> A-
            </button>
            <span className="text-xs font-bold px-1">{Math.round(fontScale * 100)}%</span>
            <button
              onClick={() => setFontScale(Math.min(1.5, fontScale + 0.1))}
              className="p-1 hover:bg-white/20 rounded elderly-tap-target flex items-center justify-center text-xs font-bold"
              title="Tăng cỡ chữ"
            >
              <ZoomIn className="w-4 h-4 mr-0.5" /> A+
            </button>
          </div>

          <button
            onClick={() => {
              if (isSpeaking) stopSpeech();
              setTtsEnabled(!ttsEnabled);
            }}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold transition ${
              ttsEnabled ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-300'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            {ttsEnabled ? (isSpeaking ? 'Đang đọc...' : 'Đọc giọng nói: Bật') : 'Giọng nói: Tắt'}
          </button>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#073F46] to-[#0B6B73] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div>
              <span className="text-2xl font-black text-[#073F46] tracking-tight">
                MediRead <span className="text-[#0B6B73]">AI</span>
              </span>
              <p className="text-xs text-[#5B6B77] font-medium">Đọc đơn thuốc & Phiếu xét nghiệm thông minh</p>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition text-base elderly-tap-target ${
                    isActive
                      ? 'bg-[#DDEEEB] text-[#073F46] border border-[#0B6B73]/20 shadow-sm'
                      : 'text-[#5B6B77] hover:text-[#0B6B73] hover:bg-[#F2F8F7]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#0B6B73]' : 'text-[#8A8A8A]'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Account / Auth Section */}
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-50 transition elderly-tap-target"
                  title="Nhấp để đổi tài khoản"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#073F46] to-[#0B6B73] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {currentUser.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-xs font-bold text-[#073F46] leading-tight line-clamp-1 max-w-[130px]">
                      {currentUser.full_name}
                    </p>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#DDEEEB] text-[#073F46]">
                      {currentUser.role === 'caregiver' ? 'Chăm sóc' : 'Người bệnh'}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-rose-600 rounded-lg transition"
                  title="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-[#0B6B73] text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-[#073F46] transition elderly-tap-target"
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng nhập / Đăng ký</span>
                <span className="sm:hidden">Tài khoản</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
