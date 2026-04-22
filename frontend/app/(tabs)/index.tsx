import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../../constants/Colors';
import PropertyCard from '../../components/PropertyCard';
import api from '../../constants/api';

const MOCK_PROPERTIES = [
  { id: 'm1', title: 'Modern Waterfront Villa', address: '1245 Ocean Blvd', city: 'West Palm Beach', state: 'FL', zipCode: '33401', price: '875000', listingType: 'sale', propertyType: 'house', bedrooms: 4, bathrooms: '3', sqft: 2800, yearBuilt: 2019, images: ['https://picsum.photos/seed/wpb1/800/600'], status: 'active', petFriendly: true, features: ['Pool', 'Waterfront', 'Smart Home'] },
  { id: 'm2', title: 'Downtown Luxury Condo', address: '500 S Rosemary Ave #1204', city: 'West Palm Beach', state: 'FL', zipCode: '33401', price: '525000', listingType: 'sale', propertyType: 'condo', bedrooms: 2, bathrooms: '2', sqft: 1450, yearBuilt: 2021, images: ['https://picsum.photos/seed/wpb2/800/600'], status: 'active', petFriendly: true, features: ['Gym', 'Rooftop Pool', 'Concierge'] },
  { id: 'm3', title: 'Charming Northwood Townhouse', address: '320 30th St', city: 'West Palm Beach', state: 'FL', zipCode: '33407', price: '3200', listingType: 'rent', propertyType: 'townhouse', bedrooms: 3, bathrooms: '2', sqft: 1800, yearBuilt: 2015, images: ['https://picsum.photos/seed/wpb3/800/600'], status: 'active', petFriendly: false, features: ['Patio', 'Washer/Dryer'] },
  { id: 'm4', title: 'El Cid Bungalow', address: '208 Magnolia Dr', city: 'West Palm Beach', state: 'FL', zipCode: '33405', price: '695000', listingType: 'sale', propertyType: 'house', bedrooms: 3, bathrooms: '2', sqft: 1650, yearBuilt: 1955, images: ['https://picsum.photos/seed/wpb4/800/600'], status: 'active', petFriendly: true, features: ['Historic District', 'Renovated Kitchen'] },
  { id: 'm5', title: 'Palm Beach Lakes Studio', address: '800 Village Blvd #210', city: 'West Palm Beach', state: 'FL', zipCode: '33409', price: '1850', listingType: 'rent', propertyType: 'apartment', bedrooms: 1, bathrooms: '1', sqft: 620, yearBuilt: 2010, images: ['https://picsum.photos/seed/wpb5/800/600'], status: 'active', petFriendly: false, features: ['Pool', 'Gym', 'Gated'] },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'sale' | 'rent'>('sale');
  const [search, setSearch] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { listing_type: activeTab };
      if (search) params.search = search;
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;
      const res = await api.get('/properties', { params });
      const results = res.data.properties || [];
      if (results.length === 0) {
        setProperties(MOCK_PROPERTIES.filter(p => p.listingType === activeTab));
      } else {
        setProperties(results);
      }
    } catch {
      setProperties(MOCK_PROPERTIES.filter(p => p.listingType === activeTab));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search, minPrice, maxPrice]);

  useEffect(() => { fetchProperties(); }, [activeTab]);

  const onRefresh = () => { setRefreshing(true); fetchProperties(); };

  const filtered = properties.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.address?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>CribAgents</Text>
          <Text style={styles.headerSub}>West Palm Beach, FL</Text>
        </View>
        <TouchableOpacity style={styles.agentBadge} onPress={() => router.push('/(tabs)/chat')}>
          <Ionicons name="chatbubbles" size={18} color={Colors.primary} />
          <Text style={styles.agentBadgeText}>AI Realtor</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['sale', 'rent'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'sale' ? '🏠 Buy' : '🔑 Rent'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textLight} style={{ marginRight: Spacing.xs }} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by address, city..."
            placeholderTextColor={Colors.textLight}
            onSubmitEditing={fetchProperties}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="options" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filtersTitle}>Price Range</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: Spacing.xs }]}
              value={minPrice}
              onChangeText={setMinPrice}
              placeholder="Min $"
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="Max $"
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.applyBtn} onPress={fetchProperties}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Properties */}
      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => router.push({ pathname: '/property/[id]', params: { id: item.id, data: JSON.stringify(item) } })}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyText}>No properties found</Text>
              <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  agentBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight + '15', borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6, gap: 4 },
  agentBadgeText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', backgroundColor: Colors.inputBg },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.textInverse },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs, backgroundColor: Colors.surface },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterBtn: { width: 42, height: 42, borderRadius: Radius.md, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  filtersPanel: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filtersTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: 14, color: Colors.text },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  applyBtnText: { color: Colors.textInverse, fontWeight: '600', fontSize: 13 },
  list: { padding: Spacing.lg, gap: Spacing.md },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  empty: { alignItems: 'center', paddingTop: Spacing.xl * 2, gap: Spacing.sm },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, color: Colors.textLight },
});
