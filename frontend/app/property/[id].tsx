import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../constants/api';

const { width } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id, data } = useLocalSearchParams<{ id: string; data: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const property = data ? JSON.parse(data) : null;

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Property not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: Colors.primary, marginTop: Spacing.md }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const price = parseInt(property.price || '0');
  const priceDisplay = property.listingType === 'rent'
    ? `$${price.toLocaleString()}/mo`
    : `$${price.toLocaleString()}`;

  const images: string[] = property.images?.length > 0
    ? property.images
    : [`https://picsum.photos/seed/${property.id}/800/600`];

  async function handleScheduleShowing() {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to schedule a showing.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    setLoading(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      await api.post('/showings', {
        propertyId: property.id,
        scheduledAt: tomorrow.toISOString(),
        notes: 'Scheduled via app',
      });
      Alert.alert('Showing Requested!', 'Rasha will confirm your showing within 24 hours. Check your profile for updates.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to schedule showing. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleMakeOffer() {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to make an offer.');
      return;
    }
    Alert.prompt(
      'Make an Offer',
      `Enter your offer price for ${property.address}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Offer',
          onPress: async (offerPrice) => {
            if (!offerPrice || isNaN(parseInt(offerPrice))) {
              Alert.alert('Invalid Price', 'Please enter a valid price.');
              return;
            }
            setLoading(true);
            try {
              await api.post('/transactions', {
                propertyId: property.id,
                offerPrice: offerPrice,
                type: property.listingType === 'rent' ? 'rental' : 'purchase',
              });
              Alert.alert('Offer Submitted!', 'Rasha will review your offer and get back to you. Check the Profile tab for updates.');
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'Failed to submit offer.';
              Alert.alert('Error', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      'plain-text',
      price.toString(),
      'numeric',
    );
  }

  function handleAskAI() {
    router.push({
      pathname: '/(tabs)/chat',
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={handleAskAI}>
          <Ionicons name="chatbubbles-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={[styles.image, { width }]} resizeMode="cover" />
          ))}
        </ScrollView>
        {images.length > 1 && (
          <View style={styles.imageDots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, activeImage === i && styles.dotActive]} />
            ))}
          </View>
        )}

        <View style={styles.content}>
          {/* Price & Status */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceDisplay}</Text>
            <View style={[styles.statusBadge, property.listingType === 'rent' ? styles.rentBadge : styles.saleBadge]}>
              <Text style={styles.statusText}>{property.listingType === 'rent' ? 'For Rent' : 'For Sale'}</Text>
            </View>
          </View>

          {/* Title & Address */}
          {property.title && <Text style={styles.title}>{property.title}</Text>}
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.address}>
              {property.address}{property.city ? `, ${property.city}` : ''}{property.state ? `, ${property.state}` : ''}{property.zipCode ? ` ${property.zipCode}` : ''}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {property.bedrooms != null && (
              <View style={styles.statBox}>
                <Ionicons name="bed-outline" size={22} color={Colors.primary} />
                <Text style={styles.statValue}>{property.bedrooms}</Text>
                <Text style={styles.statLabel}>Beds</Text>
              </View>
            )}
            {property.bathrooms != null && (
              <View style={styles.statBox}>
                <Ionicons name="water-outline" size={22} color={Colors.primary} />
                <Text style={styles.statValue}>{property.bathrooms}</Text>
                <Text style={styles.statLabel}>Baths</Text>
              </View>
            )}
            {property.sqft != null && (
              <View style={styles.statBox}>
                <Ionicons name="expand-outline" size={22} color={Colors.primary} />
                <Text style={styles.statValue}>{property.sqft.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Sq Ft</Text>
              </View>
            )}
            {property.yearBuilt != null && (
              <View style={styles.statBox}>
                <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
                <Text style={styles.statValue}>{property.yearBuilt}</Text>
                <Text style={styles.statLabel}>Built</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {property.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this property</Text>
              <Text style={styles.description}>{property.description}</Text>
            </View>
          ) : null}

          {/* Features */}
          {property.features && property.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features & Amenities</Text>
              <View style={styles.featuresGrid}>
                {property.features.map((f: string) => (
                  <View key={f} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
                {property.petFriendly && (
                  <View style={styles.featureItem}>
                    <Ionicons name="paw" size={16} color={Colors.gold} />
                    <Text style={styles.featureText}>Pet Friendly</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Agent Card */}
          <View style={styles.agentCard}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentAvatarText}>RR</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.agentName}>Rasha Rahaman</Text>
              <Text style={styles.agentTitle}>Licensed FL Realtor · CribAgents</Text>
              <Text style={styles.agentSub}>West Palm Beach · Commission: {property.listingType === 'rent' ? '1 month rent' : '1% of sale price'}</Text>
            </View>
          </View>

          {/* Spacer for bottom buttons */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={handleScheduleShowing}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Schedule Showing</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={handleMakeOffer}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {property.listingType === 'rent' ? 'Apply Now' : 'Make Offer'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: Colors.textSecondary },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  image: { height: 280 },
  imageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 16 },
  content: { padding: Spacing.lg },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  price: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  saleBadge: { backgroundColor: Colors.primary },
  rentBadge: { backgroundColor: Colors.gold },
  statusText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: Spacing.lg },
  address: { fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  featureText: { fontSize: 13, color: Colors.text },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '08',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    marginBottom: Spacing.lg,
  },
  agentAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  agentAvatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  agentName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  agentTitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  agentSub: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radius.md, paddingVertical: 14 },
  primaryBtn: { backgroundColor: Colors.primary },
  secondaryBtn: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
