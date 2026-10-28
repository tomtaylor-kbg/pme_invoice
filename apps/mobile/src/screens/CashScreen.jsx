import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { formatAmount, request } from "../api";
import { ListRow, Loading, SectionTitle } from "../components/Common";
import { PaginationControls } from "../components/PaginationControls";
import { listItems } from "../api";
import { useThemeStyles } from "../styles";

function CashSummary({ daily }) { const styles = useThemeStyles(); const currencies = [...new Set([...Object.keys(daily?.inTotals || {}), ...Object.keys(daily?.outTotals || {}), ...Object.keys(daily?.netTotals || {})])]; return <View style={styles.reportCard}><Text style={styles.reportTitle}>Synthèse du jour</Text>{currencies.length ? currencies.map((currency) => <View key={currency} style={styles.cashCurrencyBlock}><Text style={styles.cashCurrencyTitle}>{currency}</Text><View style={styles.reportRow}><Text style={styles.muted}>Encaissements</Text><Text style={styles.rowAmount}>{formatAmount(daily.inTotals?.[currency] || 0, currency)}</Text></View><View style={styles.reportRow}><Text style={styles.muted}>Sorties</Text><Text style={styles.rowAmount}>{formatAmount(daily.outTotals?.[currency] || 0, currency)}</Text></View><View style={[styles.reportRow, styles.cashNetRow]}><Text style={styles.cashNetLabel}>Solde net</Text><Text style={styles.cashNetAmount}>{formatAmount(daily.netTotals?.[currency] || 0, currency)}</Text></View></View>) : <Text style={styles.muted}>Aucun mouvement enregistré.</Text>}</View>; }

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
  return <ScrollView contentContainerStyle={styles.content}><SectionTitle title="Caisse et rapports" /><View style={styles.heroCard}><Text style={styles.cardLabel}>Session active</Text><Text style={styles.heroAmount}>{data?.session ? "Ouverte" : "Fermée"}</Text><Text style={styles.muted}>{data?.session ? `Devise principale : ${data.session.currency || "USD"}` : "Aucune session de caisse ouverte."}</Text></View><CashSummary daily={data?.daily} /><View style={styles.reportCard}><Text style={styles.reportTitle}>Solde net du mois</Text>{Object.entries(data?.monthly?.netTotals || {}).map(([currency, amount]) => <View style={styles.reportRow} key={currency}><Text style={styles.muted}>{currency}</Text><Text style={styles.cashNetAmount}>{formatAmount(amount, currency)}</Text></View>)}</View><SectionTitle title="Anciens rapports" />{data?.history?.length ? data.history.map((report) => <ListRow key={report.id} title={report.date} subtitle={report.operator?.name || "Session clôturée"} right={<Text style={styles.rowAmount}>{Object.entries(report.closingBalances || {}).map(([currency, amount]) => `${formatAmount(amount, currency)}`).join(" · ")}</Text>} />) : <Text style={styles.muted}>Aucun ancien rapport.</Text>}<PaginationControls pagination={historyPagination} onPrevious={() => setHistoryPage((current) => Math.max(1, current - 1))} onNext={() => setHistoryPage((current) => current + 1)} /></ScrollView>;
}
