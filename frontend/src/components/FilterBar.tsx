import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, fonts, spacing, borderRadius, fontWeights } from '../utils/theme';
import { useStore } from '../utils/store';

interface FilterBarProps {
  onClose: () => void;
}

const PROPERTY_TYPES = ['House', 'Condo', 'Townhouse', 'Apartment', 'Land'] as const;
const BED_OPTIONS = ['1', '2', '3', '4', '5+'] as const;
const BATH_OPTIONS = ['1', '2', '3', '4+'] as const;

export default function FilterBar({ onClose }: FilterBarProps) {
  const { filters, setFilters, fetchProperties } = useStore();

  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() || '');
  const [beds, setBeds] = useState(filters.beds?.toString() || '');
  const [baths, setBaths] = useState(filters.baths?.toString() || '');
  const [propertyType, setPropertyType] = useState(filters.propertyType || '');

  const handleApply = () => {
    setFilters({
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      beds: beds ? Number(beds.replace('+', '')) : undefined,
      baths: baths ? Number(baths.replace('+', '')) : undefined,
      propertyType: propertyType || undefined,
    });
    fetchProperties();
    onClose();
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setBeds('');
    setBaths('');
    setPropertyType('');
    setFilters({
      minPrice: undefined,
      maxPrice: undefined,
      beds: undefined,
      baths: undefined,
      propertyType: undefined,
    });
    fetchProperties();
    onClose();
  };

  return (
    <View style={styles.container}>
      {/* Price range */}
      <Text style={styles.label}>Price Range</Text>
      <View style={styles.priceRow}>
        <TextInput
          style={styles.priceInput}
          placeholder="Min"
          placeholderTextColor={colors.textLight}
          value={minPrice}
          onChangeText={setMinPrice}
          keyboardType="number-pad"
        />
        <Text style={styles.priceDash}>-</Text>
        <TextInput
          style={styles.priceInput}
          placeholder="Max"
          placeholderTextColor={colors.textLight}
          value={maxPrice}
          onChangeText={setMaxPrice}
          keyboardType="number-pad"
        />
      </View>

      {/* Bedrooms */}
      <Text style={styles.label}>Bedrooms</Text>
      <View style={styles.optionsRow}>
        {BED_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionChip, beds === opt && styles.optionChipActive]}
            onPress={() => setBeds(beds === opt ? '' : opt)}
          >
            <Text style={[styles.optionText, beds === opt && styles.optionTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bathrooms */}
      <Text style={styles.label}>Bathrooms</Text>
      <View style={styles.optionsRow}>
        {BATH_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionChip, baths === opt && styles.optionChipActive]}
            onPress={() => setBaths(baths === opt ? '' : opt)}
          >
            <Text style={[styles.optionText, baths === opt && styles.optionTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Property type */}
      <Text style={styles.label}>Property Type</Text>
      <View style={styles.optionsRow}>
        {PROPERTY_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeChip, propertyType === type.toLowerCase() && styles.typeChipActive]}
            onPress={() =>
              setPropertyType(propertyType === type.toLowerCase() ? '' : type.toLowerCase())
            }
          >
            <Text
              style={[
                styles.typeChipText,
                propertyType === type.toLowerCase() && styles.typeChipTextActive,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: fonts.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceDash: {
    fontSize: fonts.lg,
    color: colors.textLight,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionChip: {
    width: 44,
    height: 36,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: fonts.sm,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  optionTextActive: {
    color: colors.white,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: fonts.xs,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  typeChipTextActive: {
    color: colors.white,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: fonts.base,
    color: colors.textLight,
    fontWeight: fontWeights.medium,
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: fonts.base,
    color: colors.white,
    fontWeight: fontWeights.semibold,
  },
});
