import { useState } from "react";
import { useWorkspace } from "./WorkspaceProvider";

export function LoginPanel({ onSubmit, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { theme, toggleTheme } = useWorkspace();
  const isDark = theme === "dark";

  return (
    <div className="login-shell">
      <div className="login-card">
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
        <p>Connectez-vous avec le nom ou l’email du compte utilisateur.</p>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(username, password);
          }}
        >
          <label>
            Nom d'utilisateur
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
