import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";
import { ToastViewport } from "./ui";

export function LoginPanel({ onSubmit, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      <div className="login-card">
        {workspaceSettings.logoDataUrl && <div className="login-logo-wrap">
          <img className="login-logo" src={workspaceSettings.logoDataUrl} alt={`Logo ${workspaceSettings.companyName || "de l’entreprise"}`} />
        </div>}
        <div className="login-card-head">
          <div className="brand">
            <span className="brand-mark" />
            <div>
              <strong>Facturation Interne</strong>
              <p>Accès au tableau de bord</p>
            </div>
          </div>
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
        </div>

        <h1>Connexion</h1>
        <p>Connectez-vous avec votre identifiant et votre mot de passe.</p>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(username, password);
          }}
        >
          <label>
            Nom d’utilisateur
            <input autoComplete="username" placeholder="" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Mot de passe
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
