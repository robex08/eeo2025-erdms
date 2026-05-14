import type { PropsWithChildren } from 'react';

export default function AppFrame({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#111216] text-gray-200 selection:bg-blue-500/30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,58,138,0.32),transparent_46%),radial-gradient(circle_at_bottom_left,rgba(5,150,105,0.18),transparent_40%)]"
      />
      <div className="relative mx-auto w-full max-w-2xl px-3 py-4 sm:px-4 sm:py-5">{children}</div>
    </div>
  );
}
