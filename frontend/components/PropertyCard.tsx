import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../constants/Colors';

interface Property {
  id: string;
  title?: string;
  address: string;
  city?: string;
  state?: string;
  price: string;
  listingType: 'sale' | 'rent';
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: string | number;
  sqft?: number;
  images?: string[];
  status?: string;
  petFriendly?: boolean;
  features?: string[];
}

interface Props {
  property: Property;
  onPress: () => void;
}

export default function PropertyCard({ property, onPress }: Props) {
  const imageUri = property.images?.[0] || `https://picsum.photos/seed/${property.id}/800/600`;
  const price = parseInt(property.price || '0');
  const priceDisplay = property.listingType === 'rent'
    ? `$${price.toLocaleString()}/mo`
    : `$${price.toLocaleString()}`;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        <View style={[styles.badge, property.listingType === 'rent' ? styles.badgeRent : styles.badgeSale]}>
          <Text style={styles.badgeText}>{property.listingType === 'rent' ? 'For Rent' : 'For Sale'}</Text>
        </View>
        {property.petFriendly && (
          <View style={styles.petBadge}>
            <Ionicons name="paw" size={12} color={Colors.gold} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.price}>{priceDisplay}</Text>
        {property.title && (
          <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
        )}
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.address} numberOfLines={1}>
            {property.address}{property.city ? `, ${property.city}` : ''}
          </Text>
        </View>

        <View style={styles.stats}>
          {property.bedrooms != null && (
            <View style={styles.stat}>
              <Ionicons name="bed-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{property.bedrooms} bd</Text>
            </View>
          )}
          {property.bathrooms != null && (
            <View style={styles.stat}>
              <Ionicons name="water-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{property.bathrooms} ba</Text>
            </View>
          )}
          {property.sqft != null && (
            <View style={styles.stat}>
              <Ionicons name="expand-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{property.sqft.toLocaleString()} sqft</Text>
            </View>
          )}
        </View>

        {property.features && property.features.length > 0 && (
          <View style={styles.features}>
            {property.features.slice(0, 3).map(f => (
              <View key={f} style={styles.featureChip}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
            {property.features.length > 3 && (
              <View style={styles.featureChip}>
                <Text style={styles.featureText}>+{property.features.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 200 },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeSale: { backgroundColor: Colors.primary },
  badgeRent: { backgroundColor: Colors.gold },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  petBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { padding: Spacing.md },
  price: { fontSize: 20, fontWeight: '800', color: Colors.primary, marginBottom: 2 },
  title: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: Spacing.sm },
  address: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  stats: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  featureChip: {
    backgroundColor: Colors.primaryLight + '15',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  featureText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
});
