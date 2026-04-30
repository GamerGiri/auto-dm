/**
 * Login Page
 *
 * Premium landing/login with "Connect with Instagram" CTA.
 * Redirects to /api/instagram/connect for OAuth flow.
 */

import Link from "next/link";

export const metadata = {
  title: "Login — InstaReply",
  description: "Connect your Instagram account to start automating DMs.",
};

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center gradient-mesh overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-500/8 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-6 animate-pulse-glow">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            InstaReply
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-xs mx-auto">
            Automate Instagram DMs when someone comments a keyword on your post.
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-black/40">
          <div className="space-y-6">
            {/* Feature list */}
            <div className="space-y-3">
              {[
                { icon: "⚡", text: "Instant DMs on keyword comments" },
                { icon: "🔒", text: "Official Meta API — no ban risk" },
                { icon: "📊", text: "Track every DM in real-time" },
              ].map((feature) => (
                <div key={feature.text} className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className="text-base">{feature.icon}</span>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-6">
              {/* Connect Instagram Button */}
              <Link
                href="/api/instagram/connect"
                id="connect-instagram-btn"
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Connect with Instagram
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            <p className="text-xs text-center text-zinc-500">
              Requires an Instagram Business or Creator account
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-8">
          Open source · MIT License ·{" "}
          <a
            href="https://github.com/im-anishraj/instagram-comment-to-dm"
            className="text-zinc-400 hover:text-accent transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
