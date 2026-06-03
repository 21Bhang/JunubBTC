import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Home as HomeIcon,
  Wallet as WalletIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
} from "lucide-react-native";

import HomeScreen from "./src/screens/HomeScreen";
import WalletScreen from "./src/screens/WalletScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SendScreen from "./src/screens/SendScreen";
import ReceiveScreen from "./src/screens/ReceiveScreen";
import ScanScreen from "./src/screens/ScanScreen";
import PayMerchantScreen from "./src/screens/PayMerchantScreen";
import ProcessingScreen from "./src/screens/ProcessingScreen";
import SendMoneyScreen from "./src/screens/SendMoneyScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ErrorBoundary from "./src/components/ErrorBoundary";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0B0E14" },
        headerTintColor: "#F2A900",
        tabBarStyle: { backgroundColor: "#0B0E14", borderTopColor: "#1A1F2B" },
        tabBarActiveTintColor: "#F2A900",
        tabBarInactiveTintColor: "#7A8597",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <WalletIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <HistoryIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#0B0E14" },
            headerTintColor: "#F2A900",
          }}
        >
          <Stack.Screen
            name="Root"
            component={Tabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Send" component={SendScreen} />
          <Stack.Screen name="Receive" component={ReceiveScreen} />
          <Stack.Screen name="Scan" component={ScanScreen} />
          <Stack.Screen
            name="PayMerchant"
            component={PayMerchantScreen}
            options={{ title: "Pay Merchant" }}
          />
          <Stack.Screen
            name="Processing"
            component={ProcessingScreen}
            options={{ title: "Processing", headerBackVisible: false }}
          />
          <Stack.Screen
            name="SendMoney"
            component={SendMoneyScreen}
            options={{ title: "Send Money" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
