import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';
import { Property } from '../utils/store';

interface PropertyCardProps {
  property: Property;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: colors.success,
  pending: colors.warning,
  sold: colors.error,
  rented: colors.info,
};

export default function PropertyCard({ property, onPress }: PropertyCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const imageUri =
    property.images[0] || `https://picsum.photos/seed/${property.id}/400/300`;

  const formatPrice = () => {
    if (property.listingType === 'rent') {
      return `$${property.price.toLocaleString()}/mo`;
    }
    return `$${property.price.toLocaleString()}`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} />
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[property.status] }]}>
          <Text style={styles.statusText}>{property.status.toUpperCase()}</Text>
        </View>
        {/* Favorite */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => setIsFavorite(!isFavorite)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? colors.error : colors.white}
          />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.price}>{formatPrice()}</Text>
        <Text style={styles.address} numberOfLines={1}>
          {property.address}, {property.city}, {property.state} {property.zip}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="bed-outline" size={14} color={colors.textLight} />
            <Text style={styles.statText}>{property.beds} Beds</Text>
          </View>
          <Text style={styles.statDivider}>|</Text>
          <View style={styles.stat}>
            <Ionicons name="water-outline" size={14} color={colors.textLight} />
            <Text style={styles.statText}>{property.baths} Baths</Text>
          </View>
          <Text style={styles.statDivider}>|</Text>
          <View style={styles.stat}>
            <Ionicons name="resize-outline" size={14} color={colors.textLight} />
            <Text style={styles.statText}>{property.sqft.toLocaleString()} sqft</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.base,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fonts.xs,
    fontWeight: fontWeights.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: spacing.md,
  },
  price: {
    fontSize: fonts.xl,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  address: {
    fontSize: fonts.sm,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: fonts.sm,
    color: colors.textLight,
    fontWeight: fontWeights.medium,
  },
  statDivider: {
    fontSize: fonts.sm,
    color: colors.border,
  },
});
