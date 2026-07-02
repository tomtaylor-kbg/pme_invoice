import { useState } from "react";

export function LoginPanel({ onSubmit, loading, error }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <strong>Facturation Interne</strong>
            <p>Accès au tableau de bord</p>
          </div>
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
