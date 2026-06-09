import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useListParts } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Part = {
  id: number;
  name: string;
  modelNumber: string;
  category: string;
  condition: "new" | "used";
  quantity: number;
  unitPrice: number;
  totalValue: number;
  lowStockThreshold: number;
};

function StockBadge({ qty, threshold, colors }: { qty: number; threshold: number; colors: ReturnType<typeof useColors> }) {
  const isOut = qty === 0;
  const isLow = !isOut && qty <= threshold;
  const color = isOut ? colors.destructive : isLow ? colors.warning : colors.success;
  const label = isOut ? "Out" : isLow ? "Low" : "OK";
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: `${color}18` }]}>
      <View style={[badgeStyles.dot, { backgroundColor: color }]} />
      <Text style={[badgeStyles.text, { color }]}>{qty} · {label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});

export default function PartsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [search, setSearch] = useState("");

  const { data: allParts, isLoading, refetch } = useListParts({ includeDeleted: false });

  const filtered = (allParts ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.modelNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const s = makeStyles(colors);
  const topInset = isWeb ? 67 : insets.top;

  const renderItem = ({ item }: { item: Part }) => (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.75}
      onPress={() => Haptics.selectionAsync()}
    >
      <View style={s.cardTop}>
        <View style={s.cardInfo}>
          <Text style={[s.partName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[s.modelNumber, { color: colors.mutedForeground }]}>{item.modelNumber}</Text>
        </View>
        <StockBadge qty={item.quantity} threshold={item.lowStockThreshold} colors={colors} />
      </View>
      <View style={s.cardBottom}>
        <View style={[s.categoryBadge, { backgroundColor: colors.muted }]}>
          <Text style={[s.categoryText, { color: colors.mutedForeground }]}>{item.category}</Text>
        </View>
        <View style={[s.conditionBadge, { backgroundColor: item.condition === "new" ? `${colors.success}18` : `${colors.warning}18` }]}>
          <Text style={[s.conditionText, { color: item.condition === "new" ? colors.success : colors.warning }]}>
            {item.condition === "new" ? "New" : "Used"}
          </Text>
        </View>
        <Text style={[s.price, { color: colors.mutedForeground }]}>
          ${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ea
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[s.root, { paddingTop: topInset }]}>
      <View style={[s.searchBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[s.searchInput, { color: colors.foreground }]}
          placeholder="Search parts, model, category..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.countRow}>
        <Text style={[s.countText, { color: colors.mutedForeground }]}>
          {isLoading ? "Loading..." : `${filtered.length} part${filtered.length !== 1 ? "s" : ""}`}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 100 + (isWeb ? 34 : 0) }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() =>
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={s.empty}>
              <Feather name="box" size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No parts found</Text>
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
                {search ? `No results for "${search}"` : "Add parts from the web app"}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 14,
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
    },
    countRow: {
      paddingHorizontal: 18,
      paddingBottom: 8,
    },
    countText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    card: {
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      gap: 10,
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
    },
    cardInfo: {
      flex: 1,
      gap: 2,
    },
    partName: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    modelNumber: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    cardBottom: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    categoryText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    conditionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    conditionText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    price: {
      marginLeft: "auto",
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    empty: {
      alignItems: "center",
      paddingTop: 80,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
  });
}
