import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { listItems, request } from "../api";
import { InvoiceRows, InvoiceSummary, Loading, SectionTitle } from "../components/Common";
import { PaginationControls } from "../components/PaginationControls";
import { useThemeStyles } from "../styles";

export function InvoicesScreen({ apiUrl, token, onInvoicePress }) {
  const styles = useThemeStyles();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("all");
  useEffect(() => {
    setLoading(true);
    Promise.all([
      request(apiUrl, `/api/invoices?page=${page}&pageSize=20`, { token }),
      request(apiUrl, "/api/invoices/summary", { token })
    ]).then(([list, invoiceSummary]) => {
      setItems(listItems(list));
      setPagination(list.pagination || null);
      setSummary(invoiceSummary);
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, [apiUrl, token, page]);
  if (loading) return <Loading />;
  const visibleItems = currency === "all" ? items : items.filter((invoice) => (invoice.currency || "USD") === currency);
  return <ScrollView contentContainerStyle={styles.content}><SectionTitle title="Factures" />{error ? <Text style={styles.error}>{error}</Text> : <><InvoiceSummary summary={summary} /><View style={styles.currencyFilters}>{["all", "USD", "CDF"].map((value) => { const active = currency === value; return <Pressable key={value} onPress={() => setCurrency(value)} style={[styles.currencyFilter, active && styles.currencyFilterActive]}><Text style={[styles.currencyFilterText, active && styles.currencyFilterTextActive]}>{value === "all" ? "Toutes" : value}</Text></Pressable>; })}</View><Text style={styles.subtitle}>Page {pagination?.page || page} · {visibleItems.length} facture(s) affichée(s)</Text><InvoiceRows invoices={visibleItems} empty="Aucune facture à afficher dans cette devise." onInvoicePress={onInvoicePress} /><PaginationControls pagination={pagination} onPrevious={() => setPage((current) => Math.max(1, current - 1))} onNext={() => setPage((current) => current + 1)} /></>}</ScrollView>;
}
