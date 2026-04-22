import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { colors, fonts, spacing, borderRadius, fontWeights, shadows } from '../utils/theme';
import api from '../utils/api';

const PROPERTY_TYPES = ['House', 'Condo', 'Townhouse', 'Apartment', 'Land'] as const;
const FEATURES = [
  'Pool',
  'Garage',
  'Waterfront',
  'Renovated',
  'Smart Home',
  'Gated',
  'Corner Lot',
  'Solar Panels',
  'Dock',
  'Fireplace',
] as const;

export default function ListPropertyScreen() {
  // Photos
  const [photos, setPhotos] = useState<string[]>([]);

  // Property info
  const [propertyType, setPropertyType] = useState('');
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('West Palm Beach');
  const [state, setState] = useState('FL');
  const [zip, setZip] = useState('');
  const [price, setPrice] = useState('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [sqft, setSqft] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [parking, setParking] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [petFriendly, setPetFriendly] = useState(false);

  const [pricingLoading, setPricingLoading] = useState(false);
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  };

  const handleAIPricing = async () => {
    if (!beds || !baths || !sqft || !zip) {
      Alert.alert('Missing Info', 'Please fill in beds, baths, sqft, and zip code first.');
      return;
    }
    setPricingLoading(true);
    try {
      const res = await api.post('/ai/pricing', {
        propertyType,
        beds: Number(beds),
        baths: Number(baths),
        sqft: Number(sqft),
        zip,
        features: selectedFeatures,
        listingType,
      });
      setPrice(String(res.data.suggestedPrice));
      Alert.alert('AI Suggestion', `Suggested price: $${res.data.suggestedPrice.toLocaleString()}`);
    } catch {
      Alert.alert('Error', 'Could not get AI pricing. Please try again.');
    } finally {
      setPricingLoading(false);
    }
  };

  const handleAIDescription = async () => {
    if (!propertyType || !beds || !baths) {
      Alert.alert('Missing Info', 'Please fill in property type, beds, and baths first.');
      return;
    }
    setDescriptionLoading(true);
    try {
      const res = await api.post('/ai/description', {
        propertyType,
        beds: Number(beds),
        baths: Number(baths),
        sqft: Number(sqft),
        features: selectedFeatures,
        city,
        state,
        listingType,
      });
      setDescription(res.data.description);
    } catch {
      Alert.alert('Error', 'Could not generate description. Please try again.');
    } finally {
      setDescriptionLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!street || !zip || !price || !beds || !baths || !sqft || !propertyType) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/properties', {
        address: street,
        city,
        state,
        zip,
        price: Number(price),
        listingType,
        propertyType: propertyType.toLowerCase(),
        beds: Number(beds),
        baths: Number(baths),
        sqft: Number(sqft),
        yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
        parking: parking ? Number(parking) : 0,
        petFriendly,
        features: selectedFeatures,
        description,
        images: photos,
      });
      Alert.alert('Success', 'Your property has been listed!');
    } catch {
      Alert.alert('Error', 'Could not list property. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const commissionRate = listingType === 'sale' ? 0.06 : 0;
  const estimatedCommission = price ? Number(price) * commissionRate : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Photo upload */}
      <Text style={styles.sectionTitle}>Photos</Text>
      <View style={styles.photoGrid}>
        {photos.map((uri, i) => (
          <View key={i} style={styles.photoThumb}>
            <Image source={{ uri }} style={styles.photoImage} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
              <Ionicons name="close-circle" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
          <Ionicons name="camera-outline" size={28} color={colors.textLight} />
          <Text style={styles.addPhotoText}>Add Photos</Text>
        </TouchableOpacity>
      </View>

      {/* Property type */}
      <Text style={styles.sectionTitle}>Property Type</Text>
      <View style={styles.chipRow}>
        {PROPERTY_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, propertyType === t && styles.chipActive]}
            onPress={() => setPropertyType(t)}
          >
            <Text style={[styles.chipText, propertyType === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Listing type toggle */}
      <Text style={styles.sectionTitle}>Listing Type</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, listingType === 'sale' && styles.toggleActive]}
          onPress={() => setListingType('sale')}
        >
          <Text style={[styles.toggleText, listingType === 'sale' && styles.toggleTextActive]}>
            For Sale
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, listingType === 'rent' && styles.toggleActive]}
          onPress={() => setListingType('rent')}
        >
          <Text style={[styles.toggleText, listingType === 'rent' && styles.toggleTextActive]}>
            For Rent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Address */}
      <Text style={styles.sectionTitle}>Address</Text>
      <TextInput style={styles.input} placeholder="Street Address" placeholderTextColor={colors.textLight} value={street} onChangeText={setStreet} />
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 2 }]} placeholder="City" placeholderTextColor={colors.textLight} value={city} onChangeText={setCity} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="State" placeholderTextColor={colors.textLight} value={state} onChangeText={setState} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="ZIP" placeholderTextColor={colors.textLight} value={zip} onChangeText={setZip} keyboardType="number-pad" />
      </View>

      {/* Price */}
      <Text style={styles.sectionTitle}>Price</Text>
      <View style={styles.priceRow}>
        <View style={[styles.inputContainer, { flex: 1 }]}>
          <Text style={styles.inputPrefix}>$</Text>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0, marginTop: 0 }]}
            placeholder={listingType === 'rent' ? 'Monthly Rent' : 'Asking Price'}
            placeholderTextColor={colors.textLight}
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />
        </View>
        <TouchableOpacity style={styles.aiButton} onPress={handleAIPricing} disabled={pricingLoading}>
          {pricingLoading ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color={colors.secondary} />
              <Text style={styles.aiButtonText}>AI Price</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Property details */}
      <Text style={styles.sectionTitle}>Details</Text>
      <View style={styles.row}>
        <LabelInput label="Beds" value={beds} onChangeText={setBeds} keyboardType="number-pad" />
        <LabelInput label="Baths" value={baths} onChangeText={setBaths} keyboardType="number-pad" />
        <LabelInput label="Sqft" value={sqft} onChangeText={setSqft} keyboardType="number-pad" />
      </View>
      <View style={styles.row}>
        <LabelInput label="Year Built" value={yearBuilt} onChangeText={setYearBuilt} keyboardType="number-pad" />
        <LabelInput label="Parking" value={parking} onChangeText={setParking} keyboardType="number-pad" />
      </View>

      {/* Features */}
      <Text style={styles.sectionTitle}>Features</Text>
      <View style={styles.chipRow}>
        {FEATURES.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, selectedFeatures.includes(f) && styles.chipActive]}
            onPress={() => toggleFeature(f)}
          >
            <Text style={[styles.chipText, selectedFeatures.includes(f) && styles.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <View style={styles.descriptionHeader}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TouchableOpacity style={styles.aiButtonSmall} onPress={handleAIDescription} disabled={descriptionLoading}>
          {descriptionLoading ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <>
              <Ionicons name="sparkles" size={14} color={colors.secondary} />
              <Text style={styles.aiButtonSmallText}>Generate AI Description</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.textarea}
        placeholder="Describe your property..."
        placeholderTextColor={colors.textLight}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      {/* Pet friendly */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Pet Friendly</Text>
        <Switch
          value={petFriendly}
          onValueChange={setPetFriendly}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor={colors.white}
        />
      </View>

      {/* Commission info */}
      {listingType === 'sale' && price ? (
        <View style={styles.commissionBox}>
          <Text style={styles.commissionTitle}>Estimated Commission (6%)</Text>
          <Text style={styles.commissionAmount}>${estimatedCommission.toLocaleString()}</Text>
        </View>
      ) : null}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.submitButtonText}>List Property</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Small helper ───────────────────────────────────────────────────────────

interface LabelInputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: TextInput['props']['keyboardType'];
}
function LabelInput({ label, value, onChangeText, keyboardType }: LabelInputProps) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textLight}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  sectionTitle: {
    fontSize: fonts.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addPhotoText: {
    fontSize: fonts.xs,
    color: colors.textLight,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fonts.sm,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  chipTextActive: {
    color: colors.white,
  },
  toggleRow: {
    flexDirection: 'row',
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
  },
  toggleText: {
    fontSize: fonts.base,
    fontWeight: fontWeights.medium,
    color: colors.textLight,
  },
  toggleTextActive: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputPrefix: {
    fontSize: fonts.lg,
    color: colors.textLight,
    fontWeight: fontWeights.medium,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    height: 44,
  },
  aiButtonText: {
    color: colors.secondary,
    fontSize: fonts.sm,
    fontWeight: fontWeights.semibold,
  },
  fieldLabel: {
    fontSize: fonts.sm,
    color: colors.textLight,
    fontWeight: fontWeights.medium,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  aiButtonSmallText: {
    color: colors.secondary,
    fontSize: fonts.xs,
    fontWeight: fontWeights.semibold,
  },
  textarea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fonts.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: fonts.md,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
  commissionBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  commissionTitle: {
    fontSize: fonts.base,
    color: colors.textLight,
  },
  commissionAmount: {
    fontSize: fonts.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fonts.lg,
    fontWeight: fontWeights.semibold,
  },
});
