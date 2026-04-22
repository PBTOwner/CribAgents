import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';

const PROPERTY_TYPES = ['house', 'condo', 'townhouse', 'apartment', 'land'];
const LISTING_TYPES = ['sale', 'rent'];
const STEPS = ['Basic Info', 'Details', 'Description', 'Review'];

export default function ListPropertyScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [propertyType, setPropertyType] = useState('house');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('West Palm Beach');
  const [state, setState] = useState('FL');
  const [zipCode, setZipCode] = useState('');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [sqft, setSqft] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [petFriendly, setPetFriendly] = useState(false);
  const [parkingSpaces, setParkingSpaces] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('');

  function canProceed() {
    if (step === 0) return address.trim() && price.trim();
    if (step === 1) return bedrooms.trim() || sqft.trim();
    return true;
  }

  async function handleSubmit() {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to list a property.');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        title: `${bedrooms}BR ${propertyType.replace('_', ' ')} in ${city}`,
        listingType,
        propertyType,
        address,
        city,
        state,
        zipCode: zipCode || undefined,
        price,
        description: description || undefined,
        features: features ? features.split(',').map(f => f.trim()).filter(Boolean) : undefined,
      };
      if (bedrooms) payload.bedrooms = parseInt(bedrooms);
      if (bathrooms) payload.bathrooms = parseFloat(bathrooms);
      if (sqft) payload.sqft = parseInt(sqft);
      if (yearBuilt) payload.yearBuilt = parseInt(yearBuilt);
      if (parkingSpaces) payload.parkingSpaces = parseInt(parkingSpaces);
      payload.petFriendly = petFriendly;

      await api.post('/properties', payload);
      Alert.alert('Listed!', 'Your property has been listed successfully. Rasha will review it shortly.', [
        { text: 'OK', onPress: resetForm },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to list property. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStep(0);
    setListingType('sale');
    setPropertyType('house');
    setAddress('');
    setCity('West Palm Beach');
    setState('FL');
    setZipCode('');
    setPrice('');
    setBedrooms('');
    setBathrooms('');
    setSqft('');
    setYearBuilt('');
    setPetFriendly(false);
    setParkingSpaces('');
    setDescription('');
    setFeatures('');
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );

  const inputStyle = styles.input;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>List Your Property</Text>
        <Text style={styles.headerSub}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Field label="Listing Type">
              <View style={styles.chipRow}>
                {LISTING_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, listingType === t && styles.chipActive]}
                    onPress={() => setListingType(t as any)}>
                    <Text style={[styles.chipText, listingType === t && styles.chipTextActive]}>
                      {t === 'sale' ? 'For Sale' : 'For Rent'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
            <Field label="Property Type">
              <View style={styles.chipRow}>
                {PROPERTY_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, propertyType === t && styles.chipActive]}
                    onPress={() => setPropertyType(t)}>
                    <Text style={[styles.chipText, propertyType === t && styles.chipTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
            <Field label="Street Address">
              <TextInput style={inputStyle} value={address} onChangeText={setAddress}
                placeholder="123 Main St" placeholderTextColor={Colors.textLight} />
            </Field>
            <View style={styles.row}>
              <View style={{ flex: 2, marginRight: Spacing.xs }}>
                <Field label="City">
                  <TextInput style={inputStyle} value={city} onChangeText={setCity}
                    placeholder="West Palm Beach" placeholderTextColor={Colors.textLight} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="ZIP">
                  <TextInput style={inputStyle} value={zipCode} onChangeText={setZipCode}
                    placeholder="33401" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
                </Field>
              </View>
            </View>
            <Field label={listingType === 'rent' ? 'Monthly Rent ($)' : 'Asking Price ($)'}>
              <TextInput style={inputStyle} value={price} onChangeText={setPrice}
                placeholder={listingType === 'rent' ? '2500' : '450000'}
                placeholderTextColor={Colors.textLight} keyboardType="numeric" />
            </Field>
          </View>
        )}

        {step === 1 && (
          <View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.xs }}>
                <Field label="Bedrooms">
                  <TextInput style={inputStyle} value={bedrooms} onChangeText={setBedrooms}
                    placeholder="3" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Bathrooms">
                  <TextInput style={inputStyle} value={bathrooms} onChangeText={setBathrooms}
                    placeholder="2" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
                </Field>
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.xs }}>
                <Field label="Sq Ft">
                  <TextInput style={inputStyle} value={sqft} onChangeText={setSqft}
                    placeholder="1800" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Year Built">
                  <TextInput style={inputStyle} value={yearBuilt} onChangeText={setYearBuilt}
                    placeholder="2005" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
                </Field>
              </View>
            </View>
            <Field label="Parking Spaces">
              <TextInput style={inputStyle} value={parkingSpaces} onChangeText={setParkingSpaces}
                placeholder="2" placeholderTextColor={Colors.textLight} keyboardType="numeric" />
            </Field>
            <Field label="Pet Friendly">
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{petFriendly ? 'Yes' : 'No'}</Text>
                <Switch value={petFriendly} onValueChange={setPetFriendly}
                  trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                  thumbColor={petFriendly ? Colors.primary : Colors.textLight} />
              </View>
            </Field>
          </View>
        )}

        {step === 2 && (
          <View>
            <Field label="Description">
              <TextInput style={[inputStyle, { height: 120, textAlignVertical: 'top' }]}
                value={description} onChangeText={setDescription}
                placeholder="Describe your property... (location, upgrades, unique features)"
                placeholderTextColor={Colors.textLight} multiline />
            </Field>
            <Field label="Features (comma-separated)">
              <TextInput style={inputStyle} value={features} onChangeText={setFeatures}
                placeholder="Pool, Garage, Updated Kitchen, Waterfront View"
                placeholderTextColor={Colors.textLight} />
            </Field>
          </View>
        )}

        {step === 3 && (
          <View style={styles.review}>
            <Text style={styles.reviewTitle}>Review Your Listing</Text>
            <View style={styles.reviewCard}>
              {[
                ['Type', `${listingType === 'sale' ? 'For Sale' : 'For Rent'} — ${propertyType}`],
                ['Address', `${address}, ${city}, ${state} ${zipCode}`],
                ['Price', listingType === 'rent' ? `$${price}/mo` : `$${parseInt(price || '0').toLocaleString()}`],
                ['Bedrooms', bedrooms || '—'],
                ['Bathrooms', bathrooms || '—'],
                ['Sq Ft', sqft || '—'],
                ['Year Built', yearBuilt || '—'],
                ['Pet Friendly', petFriendly ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <View key={k} style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>{k}</Text>
                  <Text style={styles.reviewValue}>{v}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.reviewNote}>
              Rasha Rahaman will review your listing before it goes live. Commission: 1% of sale price (or 1 month's rent).
            </Text>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
              onPress={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.nextBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={styles.nextBtnText}>Submit Listing</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  progressBar: { height: 3, backgroundColor: Colors.border },
  progressFill: { height: 3, backgroundColor: Colors.primary },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  fieldGroup: { marginBottom: Spacing.md },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: 15, color: Colors.text },
  row: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textInverse },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  switchLabel: { fontSize: 15, color: Colors.text },
  review: {},
  reviewTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  reviewCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  reviewKey: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  reviewValue: { fontSize: 13, color: Colors.text, fontWeight: '500', textAlign: 'right', maxWidth: '60%' },
  reviewNote: { marginTop: Spacing.md, fontSize: 12, color: Colors.textSecondary, lineHeight: 18, backgroundColor: Colors.gold + '20', borderRadius: Radius.sm, padding: Spacing.sm },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl },
  backBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backBtnText: { fontSize: 15, color: Colors.textSecondary },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { color: Colors.textInverse, fontSize: 15, fontWeight: '700' },
  submitBtn: { backgroundColor: Colors.success, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: 14, minWidth: 140, alignItems: 'center' },
});
