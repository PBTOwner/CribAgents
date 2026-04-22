import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';
import { HomeStackParamList } from '../navigation/MainNavigator';
import { Property } from '../utils/store';

type DetailRoute = RouteProp<HomeStackParamList, 'PropertyDetail'>;
type DetailNav = NativeStackNavigationProp<HomeStackParamList, 'PropertyDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<DetailNav>();
  const { property } = route.params;

  const scrollRef = useRef<ScrollView>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Use multiple placeholder images for carousel
  const images =
    property.images.length > 0
      ? property.images
      : [
          `https://picsum.photos/seed/${property.id}a/800/600`,
          `https://picsum.photos/seed/${property.id}b/800/600`,
          `https://picsum.photos/seed/${property.id}c/800/600`,
        ];

  const handleImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveImageIndex(index);
  };

  const formatPrice = (price: number, type: string) =>
    type === 'rent'
      ? `$${price.toLocaleString()}/mo`
      : `$${price.toLocaleString()}`;

  const statusColor: Record<string, string> = {
    active: colors.success,
    pending: colors.warning,
    sold: colors.error,
    rented: colors.info,
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
          >
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.carouselImage} />
            ))}
          </ScrollView>
          {/* Dots indicator */}
          <View style={styles.dotsRow}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeImageIndex && styles.dotActive]}
              />
            ))}
          </View>
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusColor[property.status] }]}>
            <Text style={styles.statusText}>{property.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Price and address */}
          <Text style={styles.price}>{formatPrice(property.price, property.listingType)}</Text>
          <Text style={styles.address}>
            {property.address}, {property.city}, {property.state} {property.zip}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatItem icon="bed-outline" label={`${property.beds} Beds`} />
            <StatItem icon="water-outline" label={`${property.baths} Baths`} />
            <StatItem icon="resize-outline" label={`${property.sqft.toLocaleString()} sqft`} />
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.primaryButton}>
              <Ionicons name="calendar-outline" size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>Schedule Showing</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Make Offer</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{property.description}</Text>
          </View>

          {/* Features */}
          {property.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featuresGrid}>
                {property.features.map((feat) => (
                  <View key={feat} style={styles.featureChip}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.featureText}>{feat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Property details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            <View style={styles.detailsGrid}>
              <DetailRow label="Property Type" value={property.propertyType} />
              <DetailRow label="Year Built" value={String(property.yearBuilt)} />
              <DetailRow label="Parking" value={`${property.parking} spots`} />
              <DetailRow label="Pet Friendly" value={property.petFriendly ? 'Yes' : 'No'} />
              <DetailRow label="Listing Type" value={property.listingType === 'sale' ? 'For Sale' : 'For Rent'} />
            </View>
          </View>

          {/* Map */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: property.latitude,
                  longitude: property.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: property.latitude,
                    longitude: property.longitude,
                  }}
                  title={property.title}
                />
              </MapView>
            </View>
          </View>

          {/* Contact / AI */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => navigation.navigate('AIChat', { propertyContext: property })}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.secondary} />
              <Text style={styles.aiButtonText}>Ask AI About This Property</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statText}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 280,
    resizeMode: 'cover',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 20,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fonts.xs,
    fontWeight: fontWeights.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  content: {
    padding: spacing.base,
  },
  price: {
    fontSize: fonts['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  address: {
    fontSize: fonts.base,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.base,
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fonts.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fonts.base,
    fontWeight: fontWeights.semibold,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: fonts.base,
    fontWeight: fontWeights.semibold,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fonts.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: fonts.base,
    color: colors.textLight,
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  featureText: {
    fontSize: fonts.sm,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  detailsGrid: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: fonts.base,
    color: colors.textLight,
  },
  detailValue: {
    fontSize: fonts.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
    textTransform: 'capitalize',
  },
  mapContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    height: 200,
  },
  map: {
    flex: 1,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.base,
    marginBottom: spacing['2xl'],
  },
  aiButtonText: {
    color: colors.secondary,
    fontSize: fonts.md,
    fontWeight: fontWeights.semibold,
  },
});
