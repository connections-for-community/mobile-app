import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';

// Initialize Google Sign-In
// You need to get these IDs from Google Cloud Console
GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true, 
});

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // For Supabase, we need the ID token
    // If userInfo.idToken is null, we might need to use userInfo.user.id
    if (userInfo.data?.idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });

      if (error) throw error;
      return data;
    } else {
        throw new Error('No ID token present!');
    }

  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      // User cancelled the login flow
      return null;
    } else if (error.code === statusCodes.IN_PROGRESS) {
      // Operation (e.g. sign in) is in progress already
      return null;
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      // Play services not available or outdated
      throw new Error('Play services not available');
    } else {
      // some other error happened
      throw error;
    }
  }
}

export async function signInWithApple() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
        });
        
        if (error) throw error;
        return data;
    } else {
        throw new Error('No identityToken received from Apple');
    }

  } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // Handle user cancellation
        return null;
      }
      throw e;
  }
}

// Facebook is best handled via browser flow in Supabase + Expo for simplicity,
// unless you need the Native SDK features.
export async function signInWithFacebook() {
    // This will open a browser window for OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
            redirectTo: 'connectionsmobile://auth/callback' 
        }
    });
    
    if (error) throw error;
    return data;
}
