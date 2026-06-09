import { useSignIn, useSSO } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

// Preloads the browser for Android devices to reduce authentication load time
const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

export default function SignInScreen() {
  useWarmUpBrowser();
  const { signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!signIn || !email || !password) return;
    setLoading(true);
    setError("");
    try {
      const { error: signInError } = await signIn.password({
        emailAddress: email,
        password,
      });
      if (signInError) {
        setError(
          (signInError as { message?: string }).message ??
            "Sign in failed. Please try again."
        );
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: () => {
            router.replace("/(tabs)");
          },
        });
      } else {
        setError("Sign in could not be completed. Please try again.");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(
        clerkErr.errors?.[0]?.message ?? "Sign in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { createdSessionId, setActive: setSSOActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setSSOActive) {
        await setSSOActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      setError(
        clerkErr.errors?.[0]?.message ??
          "Google sign in failed. Please try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.brandRow}>
        <Image
          source={require("../assets/images/icon.png")}
          style={s.logo}
          contentFit="contain"
        />
        <View>
          <Text style={s.brandName}>CK Group</Text>
          <Text style={s.brandSub}>Spare Parts Management</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.heading}>Welcome back</Text>
        <Text style={s.subheading}>Sign in to your account</Text>

        {error ? (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <View style={s.inputGroup}>
          <Text style={s.label}>Email</Text>
          <View style={s.inputWrap}>
            <Feather name="mail" size={16} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Password</Text>
          <View style={s.inputWrap}>
            <Feather name="lock" size={16} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Your password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[s.signInBtn, loading && s.signInBtnDisabled]}
          onPress={handleSignIn}
          disabled={loading || !email || !password}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.signInBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity
          style={[s.googleBtn, googleLoading && s.signInBtnDisabled]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <>
              <Image
                source={{
                  uri: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg",
                }}
                style={s.googleIcon}
                contentFit="contain"
              />
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  function styles(c: typeof colors) {
    return StyleSheet.create({
      root: {
        flex: 1,
        backgroundColor: c.background,
        paddingHorizontal: 24,
        justifyContent: "center",
      },
      brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        marginBottom: 40,
        justifyContent: "center",
      },
      logo: {
        width: 52,
        height: 52,
        borderRadius: 12,
      },
      brandName: {
        fontSize: 24,
        fontFamily: "Inter_700Bold",
        color: c.foreground,
      },
      brandSub: {
        fontSize: 13,
        color: c.mutedForeground,
        fontFamily: "Inter_400Regular",
      },
      card: {
        backgroundColor: c.card,
        borderRadius: c.radius + 2,
        padding: 24,
        borderWidth: 1,
        borderColor: c.border,
      },
      heading: {
        fontSize: 22,
        fontFamily: "Inter_700Bold",
        color: c.foreground,
        marginBottom: 4,
      },
      subheading: {
        fontSize: 14,
        color: c.mutedForeground,
        fontFamily: "Inter_400Regular",
        marginBottom: 24,
      },
      errorBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: `${c.destructive}18`,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
      },
      errorText: {
        fontSize: 13,
        fontFamily: "Inter_400Regular",
        flex: 1,
      },
      inputGroup: {
        marginBottom: 16,
      },
      label: {
        fontSize: 13,
        fontFamily: "Inter_600SemiBold",
        color: c.foreground,
        marginBottom: 6,
      },
      inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: c.radius,
        backgroundColor: c.background,
        paddingHorizontal: 12,
        height: 46,
      },
      inputIcon: {
        marginRight: 8,
      },
      input: {
        flex: 1,
        color: c.foreground,
        fontFamily: "Inter_400Regular",
        fontSize: 15,
      },
      eyeBtn: {
        padding: 4,
        marginLeft: 8,
      },
      signInBtn: {
        backgroundColor: c.primary,
        borderRadius: c.radius,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
      },
      signInBtnDisabled: {
        opacity: 0.6,
      },
      signInBtnText: {
        color: "#fff",
        fontFamily: "Inter_600SemiBold",
        fontSize: 16,
      },
      dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginVertical: 20,
      },
      dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: c.border,
      },
      dividerText: {
        fontSize: 13,
        color: c.mutedForeground,
        fontFamily: "Inter_400Regular",
      },
      googleBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        backgroundColor: c.background,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: c.radius,
        height: 48,
      },
      googleIcon: {
        width: 18,
        height: 18,
      },
      googleBtnText: {
        color: c.foreground,
        fontFamily: "Inter_600SemiBold",
        fontSize: 15,
      },
    });
  }
}
