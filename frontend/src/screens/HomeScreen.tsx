import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import PropertyCard from '../components/PropertyCard';
import FilterBar from '../components/FilterBar';
import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';
import { useStore, Property } from '../utils/store';
import { HomeStackParamList } from '../navigation/MainNavigator';

type HomeNav = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

// Mock data for illustration
const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Modern Waterfront Villa',
    address: '1245 Ocean Blvd',
    city: 'West Palm Beach',
    state: 'FL',
    zip: '33401',
    price: 875000,
    listingType: 'sale',
    propertyType: 'house',
    beds: 4,
    baths: 3,
    sqft: 2800,
    yearBuilt: 2019,
    parking: 2,
    petFriendly: true,
    description: 'Stunning waterfront villa with panoramic ocean views.',
    features: ['Pool', 'Waterfront', 'Smart Home', 'Renovated Kitchen'],
    images: ['https://picsum.photos/seed/house1/800/600'],
    status: 'active',
    latitude: 26.7153,
    longitude: -80.0534,
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: '2',
    title: 'Downtown Luxury Condo',
    address: '500 S Rosemary Ave #1204',
    city: 'West Palm Beach',
    state: 'FL',
    zip: '33401',
    price: 525000,
    listingType: 'sale',
    propertyType: 'condo',
    beds: 2,
    baths: 2,
    sqft: 1450,
    yearBuilt: 2021,
    parking: 1,
    petFriendly: true,
    description: 'Luxury condo in the heart of downtown West Palm Beach.',
    features: ['Gym', 'Rooftop Pool', 'Concierge', 'City Views'],
    images: ['https://picsum.photos/seed/condo1/800/600'],
    status: 'active',
    latitude: 26.7112,
    longitude: -80.0575,
    createdAt: '2026-04-12T14:00:00Z',
  },
  {
    id: '3',
    title: 'Cozy Townhouse in Northwood',
    address: '320 30th St',
    city: 'West Palm Beach',
    state: 'FL',
    zip: '33407',
    price: 3200,
    listingType: 'rent',
    propertyType: 'townhouse',
    beds: 3,
    baths: 2,
    sqft: 1800,
    yearBuilt: 2015,
    parking: 2,
    petFriendly: false,
    description: 'Charming townhouse in the trendy Northwood Village area.',
    features: ['Patio', 'Washer/Dryer', 'Updated Appliances'],
    images: ['https://picsum.photos/seed/town1/800/600'],
    status: 'active',
    latitude: 26.7320,
    longitude: -80.0560,
    createdAt: '2026-04-15T09:00:00Z',
  },
  {
    id: '4',
    title: 'Spacious Family Home',
    address: '4521 Flagler Dr',
    city: 'West Palm Beach',
    state: 'FL',
    zip: '33405',
    price: 1250000,
    listingType: 'sale',
    propertyType: 'house',
    beds: 5,
    baths: 4,
    sqft: 3600,
    yearBuilt: 2017,
    parking: 3,
    petFriendly: true,
    description: 'Elegant family home on Flagler Drive with Intracoastal views.',
    features: ['Pool', 'Dock', 'Intracoastal Views', 'Home Office', 'Wine Cellar'],
    images: ['https://picsum.photos/seed/house2/800/600'],
    status: 'pending',
    latitude: 26.6950,
    longitude: -80.0450,
    createdAt: '2026-04-08T11:00:00Z',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { properties, propertiesLoading, filters, setFilters, fetchProperties } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Use mock data as fallback
  const displayProperties =
    properties.length > 0
      ? properties
      : MOCK_PROPERTIES.filter((p) => p.listingType === filters.listingType);

  useEffect(() => {
    fetchProperties();
  }, [filters.listingType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  }, []);

  const handlePropertyPress = (property: Property) => {
    navigation.navigate('PropertyDetail', { property });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Location header */}
      <View style={styles.locationRow}>
        <Ionicons name="location" size={20} color={colors.secondary} />
        <Text style={styles.locationText}>West Palm Beach, FL</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={showFilters ? colors.white : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Toggle: Buy / Rent */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, filters.listingType === 'sale' && styles.toggleActive]}
          onPress={() => setFilters({ listingType: 'sale' })}
        >
          <Text
            style={[
              styles.toggleText,
              filters.listingType === 'sale' && styles.toggleTextActive,
            ]}
          >
            Buy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, filters.listingType === 'rent' && styles.toggleActive]}
          onPress={() => setFilters({ listingType: 'rent' })}
        >
          <Text
            style={[
              styles.toggleText,
              filters.listingType === 'rent' && styles.toggleTextActive,
            ]}
          >
            Rent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expandable filters */}
      {showFilters && <FilterBar onClose={() => setShowFilters(false)} />}

      {/* Property list */}
      {propertiesLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropertyCard property={item} onPress={() => handlePropertyPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="home-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No properties found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  locationText: {
    fontSize: fonts.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fonts.base,
    color: colors.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  toggleText: {
    fontSize: fonts.base,
    fontWeight: fontWeights.medium,
    color: colors.textLight,
  },
  toggleTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fonts.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  emptySubtext: {
    fontSize: fonts.base,
    color: colors.textLight,
  },
});
