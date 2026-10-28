import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { formatAmount, request } from "../api";
import { Loading, SectionTitle } from "../components/Common";
import { PaginationControls } from "../components/PaginationControls";
import { listItems } from "../api";
import { useThemeStyles } from "../styles";

function Totals({ title, totals = {} }) {
  const styles = useThemeStyles();
  return <View style={styles.reportCard}><Text style={styles.reportTitle}>{title}</Text>{Object.entries(totals).length ? Object.entries(totals).map(([currency, amount]) => <View style={styles.reportRow} key={currency}><Text style={styles.muted}>{currency}</Text><Text style={styles.rowAmount}>{formatAmount(amount, currency)}</Text></View>) : <Text style={styles.muted}>Aucun mouvement enregistré.</Text>}</View>;
}

export function CashScreen({ apiUrl, token }) {
  const styles = useThemeStyles();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyPagination, setHistoryPagination] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    Promise.all([
      request(apiUrl, "/api/cash-register/active", { token }),
      request(apiUrl, `/api/cash-register/reports/daily?date=${today}`, { token }),
      request(apiUrl, `/api/cash-register/reports/monthly?month=${month}`, { token }),
      request(apiUrl, `/api/cash-register/reports/history?page=${historyPage}&pageSize=20`, { token })
    ]).then(([session, daily, monthly, history]) => {
      setData({ session, daily, monthly, history: listItems(history) });
      setHistoryPagination(history.pagination || null);
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [apiUrl, token, historyPage]);
  if (loading) return <Loading />;
  if (error) return <ScrollView contentContainerStyle={styles.content}><Text style={styles.error}>{error}</Text></ScrollView>;
  return <ScrollView contentContainerStyle={styles.content}><SectionTitle title="Caisse et rapports" /><View style={styles.heroCard}><Text style={styles.cardLabel}>Session active</Text><Text style={styles.heroAmount}>{data?.session ? "Ouverte" : "Fermée"}</Text><Text style={styles.muted}>{data?.session ? `Devise principale : ${data.session.currency || "USD"}` : "Aucune session de caisse ouverte."}</Text></View><SectionTitle title="Synthèse du jour" /><Totals title="Encaissements" totals={data?.daily?.inTotals} /><Totals title="Sorties" totals={data?.daily?.outTotals} /><Totals title="Solde net" totals={data?.daily?.netTotals} /><SectionTitle title="Synthèse du mois" /><Totals title="Mouvements du mois" totals={data?.monthly?.netTotals} /><SectionTitle title="Anciens rapports" />{data?.history?.length ? data.history.map((report) => <View style={styles.listRow} key={report.id}><View style={styles.rowBody}><Text style={styles.rowTitle}>{report.date}</Text><Text style={styles.muted}>{report.operator?.name || "Session clôturée"}</Text></View><Text style={styles.rowAmount}>{Object.entries(report.closingBalances || {}).map(([currency, amount]) => `${formatAmount(amount, currency)}`).join(" · ")}</Text></View>) : <Text style={styles.muted}>Aucun ancien rapport.</Text>}<PaginationControls pagination={historyPagination} onPrevious={() => setHistoryPage((current) => Math.max(1, current - 1))} onNext={() => setHistoryPage((current) => current + 1)} /></ScrollView>;
}
