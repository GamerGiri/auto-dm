"use client";

/**
 * Settings Page
 *
 * Instagram connection info, plan display, disconnect.
 */

import { useState } from "react";

export default function SettingsPage() {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (!confirm("Disconnect your Instagram account? All automations will stop working.")) return;
    setDisconnecting(true);
    // TODO: Wire to disconnect API in Phase 3
    setTimeout(() => setDisconnecting(false), 1500);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Instagram Connection */}
      <section className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
          Instagram Connection
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Connection Status</p>
              <p className="text-xs text-muted mt-0.5">Your Instagram account link</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Connected
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Account</p>
              <p className="text-xs text-muted mt-0.5">Your linked Instagram profile</p>
            </div>
            <span className="text-sm text-muted">@your_account</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Token Expires</p>
              <p className="text-xs text-muted mt-0.5">Auto-refresh runs daily</p>
            </div>
            <span className="text-sm text-muted">~60 days</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-error hover:bg-error/10 border border-error/20 hover:border-error/40 transition-all disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting..." : "Disconnect Account"}
          </button>
        </div>
      </section>

      {/* Plan */}
      <section className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
          Your Plan
        </h2>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-accent/15">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/15 text-accent">
            <span className="text-lg font-bold">F</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Free Plan</p>
            <p className="text-xs text-muted mt-0.5">1 automation · 100 DMs/month</p>
          </div>
          <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors">
            Upgrade
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {[
            { plan: "PRO", price: "$19/mo", features: "10 automations · 2,000 DMs/month" },
            { plan: "AGENCY", price: "$49/mo", features: "Unlimited automations · 10,000 DMs/month" },
          ].map((tier) => (
            <div key={tier.plan} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{tier.plan}</p>
                <p className="text-xs text-muted">{tier.features}</p>
              </div>
              <span className="text-sm font-semibold text-muted">{tier.price}</span>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          About
        </h2>
        <div className="space-y-2 text-sm text-muted">
          <p>InstaReply v0.1.0</p>
          <p>Open source · MIT License</p>
          <a
            href="https://github.com/im-anishraj/instagram-comment-to-dm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            GitHub Repository
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}
