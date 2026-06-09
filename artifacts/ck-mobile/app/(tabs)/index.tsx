import { useClerk } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useGetDashboardSummary,
  useGetRecentActivity,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function StatCard({
  label,
  value,
  icon,
  color,
  colors,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    minWidth: "47%",
    gap: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const router = useRouter();
  const isWeb = false;

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading, refetch: refetchActivity } = useGetRecentActivity({ limit: 20 });

  const isRefreshing = false;
  const onRefresh = () => { refetchSummary(); refetchActivity(); };

  const s = makeStyles(colors);

  const formatValue = (n: number) =>
    n >= 1000000
      ? `${(n / 1000000).toFixed(1)}M`
      : n >= 1000
      ? `${(n / 1000).toFixed(1)}K`
      : `${n}`;

  const getActivityIcon = (type: string): keyof typeof Feather.glyphMap => {
    switch (type) {
      case "stock_in": return "arrow-down-circle";
      case "stock_out": return "arrow-up-circle";
      case "created": return "plus-circle";
      case "updated": return "edit-2";
      case "deleted": return "trash-2";
      default: return "activity";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "stock_in": return colors.success;
      case "stock_out": return colors.primary;
      case "created": return colors.success;
      case "deleted": return colors.destructive;
      default: return colors.mutedForeground;
    }
  };

  const topInset = isWeb ? 67 : insets.top;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[s.content, { paddingTop: topInset + 16, paddingBottom: insets.bottom + 24 + (isWeb ? 34 : 0) }]}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={() => (
        <>
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>CK Group</Text>
              <Text style={s.subGreeting}>Inventory Dashboard</Text>
            </View>
            <TouchableOpacity
              onPress={() => signOut()}
              style={[s.signOutBtn, { borderColor: colors.border }]}
            >
              <Feather name="log-out" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={s.statsGrid}>
            {summaryLoading ? (
              <View style={[s.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <>
                <View style={s.statsRow}>
                  <StatCard label="Total Parts" value={summary?.totalParts ?? 0} icon="box" color={colors.primary} colors={colors} />
                  <StatCard label="Stock Value" value={`$${formatValue(summary?.totalValue ?? 0)}`} icon="dollar-sign" color={colors.success} colors={colors} />
                </View>
                <View style={s.statsRow}>
                  <StatCard label="Low Stock" value={summary?.lowStockCount ?? 0} icon="alert-triangle" color={colors.warning} colors={colors} />
                  <StatCard label="Out of Stock" value={summary?.outOfStockCount ?? 0} icon="x-circle" color={colors.destructive} colors={colors} />
                </View>
              </>
            )}
          </View>

          <Text style={s.sectionTitle}>Recent Activity</Text>
        </>
      )}
      data={activity ?? []}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View style={[s.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.activityIconWrap, { backgroundColor: `${getActivityColor(item.type)}18` }]}>
            <Feather name={getActivityIcon(item.type)} size={16} color={getActivityColor(item.type)} />
          </View>
          <View style={s.activityText}>
            <Text style={[s.activityDesc, { color: colors.foreground }]} numberOfLines={2}>{item.description}</Text>
            <Text style={[s.activityTime, { color: colors.mutedForeground }]}>
              {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={() =>
        activityLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={s.empty}>
            <Feather name="activity" size={32} color={colors.mutedForeground} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No activity yet</Text>
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      gap: 0,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    greeting: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    subGreeting: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    signOutBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    statsGrid: {
      gap: 10,
      marginBottom: 24,
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
    },
    loadingBox: {
      height: 100,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 12,
    },
    activityItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
    },
    activityIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    activityText: {
      flex: 1,
      gap: 3,
    },
    activityDesc: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      lineHeight: 20,
    },
    activityTime: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    empty: {
      alignItems: "center",
      paddingVertical: 40,
      gap: 10,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
  });
}
