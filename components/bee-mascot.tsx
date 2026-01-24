import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

// Autumn/peach color palette matching the app theme
const COLORS = {
  body: '#FFB347',      // Peach - main body
  bodyDark: '#E69138',  // Darker peach for stripes
  face: '#FFF5E6',      // Cream for face area
  cheeks: '#FFCBA4',    // Blush color
  eyes: '#131f24',      // Dark matching app background
  eyeWhite: '#FFFFFF',
  wings: 'rgba(255, 243, 224, 0.7)', // Translucent cream
  antenna: '#E69138',
};

interface BeeMascotProps {
  size?: number;
  style?: any;
}

export function BeeMascot({ size = 150, style }: BeeMascotProps) {
  // Animation values
  const bounce = useSharedValue(0);
  const rotate = useSharedValue(0);
  const wingFlap = useSharedValue(0);
  const blink = useSharedValue(0);
  const wave = useSharedValue(0);

  useEffect(() => {
    // Idle bounce animation (continuous)
    bounce.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Subtle rotation/wobble
    rotate.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(3, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Wing flapping
    wingFlap.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Blinking animation (every few seconds)
    const startBlinking = () => {
      blink.value = withRepeat(
        withDelay(
          3000,
          withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(0, { duration: 100 })
          )
        ),
        -1,
        false
      );
    };
    startBlinking();

    // Occasional wave animation
    wave.value = withRepeat(
      withDelay(
        5000,
        withSequence(
          withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
          withTiming(0.8, { duration: 100 }),
          withTiming(1, { duration: 100 }),
          withTiming(0.8, { duration: 100 }),
          withTiming(1, { duration: 100 }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
        )
      ),
      -1,
      false
    );
  }, []);

  // Animated styles
  const bodyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const leftWingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(wingFlap.value, [0, 1], [-15, -35])}deg` },
      { scaleY: interpolate(wingFlap.value, [0, 1], [1, 0.9]) },
    ],
  }));

  const rightWingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(wingFlap.value, [0, 1], [15, 35])}deg` },
      { scaleY: interpolate(wingFlap.value, [0, 1], [1, 0.9]) },
    ],
  }));

  const leftEyeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(blink.value, [0, 1], [1, 0.1]) }],
  }));

  const rightEyeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(blink.value, [0, 1], [1, 0.1]) }],
  }));

  const rightArmAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(wave.value, [0, 1], [30, -20])}deg` },
    ],
  }));

  const scale = size / 150;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View style={[styles.beeBody, bodyAnimatedStyle, { transform: [{ scale }] }]}>
        {/* Wings */}
        <Animated.View style={[styles.leftWing, leftWingAnimatedStyle]} />
        <Animated.View style={[styles.rightWing, rightWingAnimatedStyle]} />

        {/* Main body */}
        <View style={styles.bodyOuter}>
          {/* Stripes */}
          <View style={styles.stripe1} />
          <View style={styles.stripe2} />
          <View style={styles.stripe3} />
          
          {/* Face area */}
          <View style={styles.face}>
            {/* Eyes */}
            <View style={styles.eyeContainer}>
              <View style={styles.eyeWhiteLeft}>
                <Animated.View style={[styles.pupilLeft, leftEyeAnimatedStyle]} />
              </View>
              <View style={styles.eyeWhiteRight}>
                <Animated.View style={[styles.pupilRight, rightEyeAnimatedStyle]} />
              </View>
            </View>
            
            {/* Cheeks */}
            <View style={styles.leftCheek} />
            <View style={styles.rightCheek} />
            
            {/* Smile */}
            <View style={styles.smile} />
          </View>
        </View>

        {/* Antennae */}
        <View style={styles.antennaContainer}>
          <View style={styles.leftAntenna}>
            <View style={styles.antennaBall} />
          </View>
          <View style={styles.rightAntenna}>
            <View style={styles.antennaBall} />
          </View>
        </View>

        {/* Arms/Hands */}
        <View style={styles.leftArm}>
          <View style={styles.hand} />
        </View>
        <Animated.View style={[styles.rightArm, rightArmAnimatedStyle]}>
          <View style={styles.hand} />
        </Animated.View>

        {/* Legs */}
        <View style={styles.leftLeg}>
          <View style={styles.foot} />
        </View>
        <View style={styles.rightLeg}>
          <View style={styles.foot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  beeBody: {
    width: 120,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyOuter: {
    width: 100,
    height: 110,
    backgroundColor: COLORS.body,
    borderRadius: 50,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    alignItems: 'center',
    // Add shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  stripe1: {
    position: 'absolute',
    top: 40,
    width: '100%',
    height: 12,
    backgroundColor: COLORS.bodyDark,
  },
  stripe2: {
    position: 'absolute',
    top: 60,
    width: '100%',
    height: 12,
    backgroundColor: COLORS.bodyDark,
  },
  stripe3: {
    position: 'absolute',
    top: 80,
    width: '100%',
    height: 12,
    backgroundColor: COLORS.bodyDark,
  },
  face: {
    position: 'absolute',
    top: 8,
    width: 80,
    height: 50,
    backgroundColor: COLORS.face,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: -5,
  },
  eyeWhiteLeft: {
    width: 22,
    height: 26,
    backgroundColor: COLORS.eyeWhite,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  eyeWhiteRight: {
    width: 22,
    height: 26,
    backgroundColor: COLORS.eyeWhite,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pupilLeft: {
    width: 14,
    height: 16,
    backgroundColor: COLORS.eyes,
    borderRadius: 8,
    marginLeft: 2,
  },
  pupilRight: {
    width: 14,
    height: 16,
    backgroundColor: COLORS.eyes,
    borderRadius: 8,
    marginRight: 2,
  },
  leftCheek: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 14,
    height: 8,
    backgroundColor: COLORS.cheeks,
    borderRadius: 7,
    opacity: 0.8,
  },
  rightCheek: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 14,
    height: 8,
    backgroundColor: COLORS.cheeks,
    borderRadius: 7,
    opacity: 0.8,
  },
  smile: {
    position: 'absolute',
    bottom: 10,
    width: 20,
    height: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: COLORS.eyes,
  },
  // Wings
  leftWing: {
    position: 'absolute',
    left: -5,
    top: 20,
    width: 35,
    height: 50,
    backgroundColor: COLORS.wings,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 179, 71, 0.3)',
    transformOrigin: 'right center',
  },
  rightWing: {
    position: 'absolute',
    right: -5,
    top: 20,
    width: 35,
    height: 50,
    backgroundColor: COLORS.wings,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 179, 71, 0.3)',
    transformOrigin: 'left center',
  },
  // Antennae
  antennaContainer: {
    position: 'absolute',
    top: -15,
    flexDirection: 'row',
    gap: 30,
  },
  leftAntenna: {
    width: 3,
    height: 20,
    backgroundColor: COLORS.antenna,
    borderRadius: 2,
    transform: [{ rotate: '-20deg' }],
    alignItems: 'center',
  },
  rightAntenna: {
    width: 3,
    height: 20,
    backgroundColor: COLORS.antenna,
    borderRadius: 2,
    transform: [{ rotate: '20deg' }],
    alignItems: 'center',
  },
  antennaBall: {
    position: 'absolute',
    top: -5,
    width: 10,
    height: 10,
    backgroundColor: COLORS.body,
    borderRadius: 5,
  },
  // Arms
  leftArm: {
    position: 'absolute',
    left: 5,
    top: 55,
    width: 12,
    height: 25,
    backgroundColor: COLORS.body,
    borderRadius: 6,
    transform: [{ rotate: '-30deg' }],
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rightArm: {
    position: 'absolute',
    right: 5,
    top: 55,
    width: 12,
    height: 25,
    backgroundColor: COLORS.body,
    borderRadius: 6,
    transformOrigin: 'center top',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hand: {
    width: 14,
    height: 14,
    backgroundColor: COLORS.body,
    borderRadius: 7,
    marginBottom: -4,
  },
  // Legs
  leftLeg: {
    position: 'absolute',
    left: 25,
    bottom: -10,
    width: 12,
    height: 20,
    backgroundColor: COLORS.body,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rightLeg: {
    position: 'absolute',
    right: 25,
    bottom: -10,
    width: 12,
    height: 20,
    backgroundColor: COLORS.body,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  foot: {
    width: 16,
    height: 10,
    backgroundColor: COLORS.bodyDark,
    borderRadius: 8,
    marginBottom: -2,
  },
});
