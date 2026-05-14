import type { PropsWithChildren } from 'react';

export default function MobileViewport({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl bg-[#111216] text-gray-200">
      {children}
    </div>
  );
}
