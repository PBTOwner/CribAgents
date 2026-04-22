import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import PropertyDetailScreen from '../screens/PropertyDetailScreen';
import AIChatScreen from '../screens/AIChatScreen';
import ListPropertyScreen from '../screens/ListPropertyScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import DocumentViewerScreen from '../screens/DocumentViewerScreen';
import ESignatureScreen from '../screens/ESignatureScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors, fonts } from '../utils/theme';
import { Property } from '../utils/store';

// ── Param lists ────────────────────────────────────────────────────────────

export type HomeStackParamList = {
  HomeMain: undefined;
  PropertyDetail: { property: Property };
  AIChat: { propertyContext?: Property } | undefined;
};

export type ChatStackParamList = {
  ChatMain: undefined;
};

export type ListStackParamList = {
  ListMain: undefined;
};

export type DocsStackParamList = {
  DocsMain: undefined;
  DocumentViewer: { documentId: string; title: string };
  ESignature: { documentId: string; title: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  ListProperty: undefined;
  Documents: undefined;
  Profile: undefined;
};

// ── Stack Navigators ───────────────────────────────────────────────────────

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{ headerTitle: 'Property Details' }}
      />
      <HomeStack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{ headerTitle: 'AI Assistant' }}
      />
    </HomeStack.Navigator>
  );
}

const ChatStack = createNativeStackNavigator<ChatStackParamList>();
function ChatStackNavigator() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen
        name="ChatMain"
        component={AIChatScreen}
        options={{
          headerTitle: 'AI Assistant',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
    </ChatStack.Navigator>
  );
}

const ListStack = createNativeStackNavigator<ListStackParamList>();
function ListStackNavigator() {
  return (
    <ListStack.Navigator>
      <ListStack.Screen
        name="ListMain"
        component={ListPropertyScreen}
        options={{
          headerTitle: 'List Property',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
    </ListStack.Navigator>
  );
}

const DocsStack = createNativeStackNavigator<DocsStackParamList>();
function DocsStackNavigator() {
  return (
    <DocsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <DocsStack.Screen
        name="DocsMain"
        component={DocumentsScreen}
        options={{ headerTitle: 'Documents' }}
      />
      <DocsStack.Screen
        name="DocumentViewer"
        component={DocumentViewerScreen}
        options={({ route }) => ({ headerTitle: route.params.title })}
      />
      <DocsStack.Screen
        name="ESignature"
        component={ESignatureScreen}
        options={{ headerTitle: 'Sign Document' }}
      />
    </DocsStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{
          headerTitle: 'Profile',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
    </ProfileStack.Navigator>
  );
}

// ── Tab Navigator ──────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: fonts.xs,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'ListProperty':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Documents':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Chat" component={ChatStackNavigator} />
      <Tab.Screen
        name="ListProperty"
        component={ListStackNavigator}
        options={{ tabBarLabel: 'List' }}
      />
      <Tab.Screen name="Documents" component={DocsStackNavigator} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
