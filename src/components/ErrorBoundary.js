import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";

/**
 * Top-level error boundary. Catches any uncaught render-time exception
 * (e.g. a bad input that slips past validation) and shows a friendly
 * recovery screen instead of crashing the whole app. Critical for a
 * payments app expected to serve 10,000+ users per day.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.warn("JunubBTC caught render error:", error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error?.message || this.state.error || "");
    return (
      <View style={styles.wrap}>
        <ScrollView contentContainerStyle={styles.inner}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            JunubBTC hit an unexpected error. No payment has been sent. Tap
            below to return to the app and try again.
          </Text>
          {msg ? <Text style={styles.detail}>{msg}</Text> : null}
          <Pressable style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnText}>Return to app</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0B0E14" },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#F2A900",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },
  body: { color: "#E6EAF2", fontSize: 14, lineHeight: 20, marginBottom: 12 },
  detail: {
    color: "#7A8597",
    fontSize: 12,
    fontFamily: "Courier",
    marginBottom: 24,
  },
  btn: {
    backgroundColor: "#F2A900",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#0B0E14", fontWeight: "800", fontSize: 14 },
});
