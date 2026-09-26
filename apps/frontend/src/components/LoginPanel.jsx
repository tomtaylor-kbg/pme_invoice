import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { ToastViewport } from "./ui";

export function LoginPanel({ onSubmit, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const { theme, toggleTheme, toasts, dismissToast, notifyError, workspaceSettings } = useWorkspace();
  const isDark = theme === "dark";
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    if (prevLoadingRef.current && !loading && error) {
      notifyError("Connexion impossible", error);
    }
    prevLoadingRef.current = loading;
  }, [loading, error, notifyError]);

  return (
    <div className="login-shell">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <main className="login-card">
        <aside className="login-side-panel">
          <div className="login-side-decoration" aria-hidden="true" />
          <div className="login-side-brand">
            {workspaceSettings.logoDataUrl && <img className="login-logo" src={workspaceSettings.logoDataUrl} alt={`Logo ${workspaceSettings.companyName || "de l’entreprise"}`} />}
            <strong>{workspaceSettings.companyName || "Facturation Interne"}</strong>
            <p>Gestion de votre activité</p>
          </div>
          <nav className="login-tabs" aria-label="Navigation de connexion">
            <button className={activeTab === "login" ? "active" : ""} type="button" onClick={() => setActiveTab("login")}>Connexion</button>
            <button className={activeTab === "help" ? "active" : ""} type="button" onClick={() => setActiveTab("help")}>Aide</button>
          </nav>
        </aside>

        <section className="login-main-panel">
          <button
            className="ghost-button theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
            title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" className="theme-toggle-icon" aria-hidden="true">
                <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="theme-toggle-icon" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            )}
          </button>

          {activeTab === "login" ? <div className="login-main-content">
            <div className="login-user-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
            </div>
            <h1>Connexion</h1>
            <p className="login-intro">Connectez-vous à votre espace de travail.</p>
            <form className="login-form" onSubmit={(event) => { event.preventDefault(); onSubmit(username, password); }}>
              <label htmlFor="login-username">Nom d’utilisateur</label>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></svg>
                <input id="login-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} />
              </div>
              <label htmlFor="login-password">Mot de passe</label>
              <div className="login-input-wrap">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <button className="login-forgot-link" type="button" onClick={() => setActiveTab("help")}>Mot de passe oublié ?</button>
              <button className="primary-button login-submit" type="submit" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </div> : <div className="login-main-content login-help-content">
            <div className="login-user-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-1.2 1.1-2 1.4-2 3M12 17.5v.1" /></svg>
            </div>
            <h1>Besoin d’aide ?</h1>
            <p className="login-intro">Pour réinitialiser votre mot de passe ou obtenir de l’aide, contactez l’administrateur de l’application.</p>
            {workspaceSettings.email && <a className="login-help-contact" href={`mailto:${workspaceSettings.email}`}>{workspaceSettings.email}</a>}
          </div>}
        </section>
      </main>
    </div>
  );
}
