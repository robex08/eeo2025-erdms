import LoginFormCard from '../components/auth/LoginFormCard';

interface LoginPageProps {
  onLogin: (loginId: string, password: string) => void | Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export default function LoginPage({ onLogin, isLoading = false, error = null }: LoginPageProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#111216] px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(30,58,138,0.38),transparent_42%),radial-gradient(circle_at_90%_88%,rgba(5,150,105,0.22),transparent_40%)]"
      />

      <div className="relative w-full max-w-md animate-[fade-up_420ms_ease-out]">
        <p className="mb-3 text-center text-xs uppercase tracking-[0.28em] text-blue-200/70">EEO Mobile PWA</p>
        <LoginFormCard onLogin={onLogin} isLoading={isLoading} error={error} />
        <div className="mt-5 text-center text-xs text-slate-500">
          Bezpecne prostredi pro prehled objednavek, schvalovani a financni detail.
        </div>
      </div>
    </div>
  );
}
