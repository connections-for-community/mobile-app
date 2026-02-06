import { useMemo, useRef } from 'react';
import { Animated, PanResponder, useWindowDimensions } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/context/auth-context';

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.2;

export function SwipeTabs({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;

  const isInstructor = user?.user_metadata?.role === 'instructor';
  const tabOrder = useMemo(() => {
    const order = ['home', 'discover', 'events'];
    if (isInstructor) order.push('create');
    order.push('messages', 'profile');
    return order;
  }, [isInstructor]);

  const currentTab = segments[0] === '(tabs)' ? segments[1] : null;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (!currentTab) return false;
        const dx = Math.abs(gesture.dx);
        const dy = Math.abs(gesture.dy);
        return dx > 20 && dx > dy;
      },
      onPanResponderMove: (_, gesture) => {
        if (!currentTab) return;
        translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (!currentTab) return;
        const { dx, vx } = gesture;
        const shouldNavigate =
          Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(vx) >= SWIPE_VELOCITY;

        const currentIndex = tabOrder.indexOf(currentTab);
        if (currentIndex === -1) return;

        const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
        const nextTab = tabOrder[nextIndex];
        if (!nextTab || !shouldNavigate) {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          return;
        }

        const target = dx < 0 ? -width : width;
        Animated.timing(translateX, {
          toValue: target,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          translateX.setValue(0);
          router.replace(`/(tabs)/${nextTab}`);
        });
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{ flex: 1, transform: [{ translateX }] }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}
