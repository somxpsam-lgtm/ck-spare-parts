import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListStockMovements } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Movement = {
  id: number;
  partId: number;
  partName?: string | null;
  type: string;
  quantity: number;
  notes?: string | null;
  whereUsed?: string | null;
  date?: string | null;
  createdAt: string;
};

function TypeBadge({ type, colors }: { type: string; colors: ReturnType<typeof useColors> }) {
  const cfg = {
    in: { label: "Stock In", color: colors.success, icon: "arrow-down-circle" as const },
    out: { label: "Used", color: colors.primary, icon: "arrow-up-circle" as const },
    adjustment: { label: "Adjust", color: colors.warning, icon: "refresh-cw" as const },
  }[type] ?? { label: type, color: colors.mutedForeground, icon: "activity" as const };

  return (
    <View style={[badgeStyles.wrap, { backgroundColor: `${cfg.color}18` }]}>
      <Feather name={cfg.icon} size={11} color={cfg.color} />
      <Text style={[badgeStyles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

function formatDate(m: Movement) {
  const d = m.date ?? m.createdAt;
  try {
    const dt = new Date(d);
    const today = new Date();
    const isToday = dt.toDateString() === today.toDateString();
    return isToday
      ? `Today, ${dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
      : dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export default function MovementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const { data: movements, isLoading, refetch } = useListStockMovements({ limit: 100 });

  const s = makeStyles(colors);
  const topInset = isWeb ? 67 : insets.top;

  const todayOut = (movements ?? []).filter((m) => {
    const d = m.date ?? m.createdAt;
    try { return new Date(d).toDateString() === new Date().toDateString() && m.type === "out"; } catch { return false; }
  });
  const todayIn = (movements ?? []).filter((m) => {
    const d = m.date ?? m.createdAt;
    try { return new Date(d).toDateString() === new Date().toDateString() && m.type === "in"; } catch { return false; }
  });

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.content, { paddingTop: topInset + 16, paddingBottom: insets.bottom + 100 + (isWeb ? 34 : 0) }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={() => (
        <>
          <Text style={s.pageTitle}>Material / Parts Used</Text>

          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.summaryValue, { color: colors.primary }]}>
                {todayOut.reduce((a, m) => a + m.quantity, 0)}
              </Text>
              <Text style={[s.summaryLabel, { color: colors.mutedForeground }]}>Today Out</Text>
              <Text style={[s.summaryCount, { color: colors.mutedForeground }]}>{todayOut.length} tx</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.summaryValue, { color: colors.success }]}>
                {todayIn.reduce((a, m) => a + m.quantity, 0)}
              </Text>
              <Text style={[s.summaryLabel, { color: colors.mutedForeground }]}>Today In</Text>
              <Text style={[s.summaryCount, { color: colors.mutedForeground }]}>{todayIn.length} tx</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.summaryValue, { color: colors.foreground }]}>
                {movements?.length ?? 0}
              </Text>
              <Text style={[s.summaryLabel, { color: colors.mutedForeground }]}>Total Records</Text>
              <Text style={[s.summaryCount, { color: colors.mutedForeground }]}>all time</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Recent Movements</Text>
        </>
      )}
      data={(movements ?? []) as Movement[]}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.cardRow}>
            <View style={s.cardLeft}>
              <Text style={[s.partName, { color: colors.foreground }]} numberOfLines={1}>
                {item.partName ?? "Unknown Part"}
              </Text>
              {item.whereUsed ? (
                <Text style={[s.whereUsed, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.whereUsed}
                </Text>
              ) : item.notes ? (
                <Text style={[s.whereUsed, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.notes}
                </Text>
              ) : null}
            </View>
            <View style={s.cardRight}>
              <Text style={[
                s.qty,
                { color: item.type === "in" ? colors.success : item.type === "out" ? colors.primary : colors.warning }
              ]}>
                {item.type === "out" ? "−" : "+"}{item.quantity}
              </Text>
            </View>
          </View>
          <View style={s.cardFooter}>
            <TypeBadge type={item.type} colors={colors} />
            <Text style={[s.date, { color: colors.mutedForeground }]}>{formatDate(item)}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={() =>
        isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <View style={s.empty}>
            <Feather name="repeat" size={36} color={colors.mutedForeground} />
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>No movements yet</Text>
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Record from the web app</Text>
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16 },
    pageTitle: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 24,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      alignItems: "center",
      gap: 2,
    },
    summaryValue: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
    },
    summaryLabel: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      textAlign: "center",
    },
    summaryCount: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 12,
    },
    card: {
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      gap: 10,
    },
    cardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
    },
    cardLeft: { flex: 1, gap: 3 },
    cardRight: { alignItems: "flex-end" },
    partName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    whereUsed: { fontSize: 12, fontFamily: "Inter_400Regular" },
    qty: { fontSize: 22, fontFamily: "Inter_700Bold" },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    date: { fontSize: 12, fontFamily: "Inter_400Regular" },
    empty: { alignItems: "center", paddingTop: 80, gap: 10 },
    emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  });
}
