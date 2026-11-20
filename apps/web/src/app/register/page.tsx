'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login?mode=register');
  }, [router]);

  return (
    <div className="p-12 text-center font-bold text-[#073F46]">
      Đang chuyển đến trang đăng ký hồ sơ mới...
    </div>
  );
}
