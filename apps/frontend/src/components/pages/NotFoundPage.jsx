import { Link } from "react-router-dom";
import { useWorkspace } from "../WorkspaceProvider";

export function NotFoundPage() {
  const { token, user } = useWorkspace();
  const homePath = user?.role === "accountant" ? "/cash-reports" : user?.role === "order_manager" || user?.role === "order_operator" ? "/orders" : "/dashboard";

  return (
    <main className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <span className="not-found-code">404</span>
        <span className="eyebrow">Page introuvable</span>
        <h1 id="not-found-title">Cette page n’existe pas</h1>
        <p>Le lien utilisé est incorrect ou la page a été déplacée.</p>
        <div className="not-found-actions">
          <Link className="primary-button" to={token ? homePath : "/login"}>
            {token ? "Retour à l’accueil" : "Se connecter"}
          </Link>
          <button type="button" className="secondary-button" onClick={() => window.history.back()}>
            Page précédente
          </button>
        </div>
      </section>
    </main>
  );
}
