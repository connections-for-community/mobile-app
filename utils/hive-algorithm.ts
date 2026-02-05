/**
 * Hive Algorithm - Social Graph & Community Building
 * 
 * This algorithm creates a "beehive" social network that:
 * 1. Pairs users based on shared event attendance
 * 2. Groups users with similar interests into "cells"
 * 3. Limits group sizes to maintain healthy community dynamics
 * 4. Calculates affinity scores between users
 */

// ==================== TYPES ====================

export type InterestCategory = 
  | 'arts_crafts'
  | 'cooking'
  | 'photography'
  | 'music'
  | 'fitness'
  | 'tech'
  | 'languages'
  | 'outdoors'
  | 'wellness'
  | 'gaming';

export interface HiveUser {
  id: string;
  name: string;
  avatar_url?: string;
  interests: InterestCategory[];
  eventsAttended: string[]; // Event IDs
  connectionStrength: number; // 0-1, how active in the hive
  joinedAt: string;
  hiveLevel: number; // 1-5, determines cell size
}

export interface HiveEvent {
  id: string;
  title: string;
  category: InterestCategory;
  attendees: string[]; // User IDs
  hostId: string;
  date: string;
}

export interface HiveCell {
  id: string;
  position: { x: number; y: number; z: number };
  type: 'user' | 'event' | 'group';
  data: HiveUser | HiveEvent | HiveGroup;
  connections: string[]; // IDs of connected cells
  size: number; // 1-3, visual size
  color: string;
  pulseIntensity: number; // 0-1, animation intensity
}

export interface HiveGroup {
  id: string;
  name: string;
  members: string[]; // User IDs
  sharedInterests: InterestCategory[];
  affinityScore: number; // 0-1
  maxSize: number; // Ethical limit
}

export interface HiveConnection {
  from: string;
  to: string;
  strength: number; // 0-1
  type: 'user-user' | 'user-event' | 'event-event';
}

export interface HiveData {
  cells: HiveCell[];
  connections: HiveConnection[];
  groups: HiveGroup[];
  currentUserCellId: string;
}

// ==================== CONSTANTS ====================

// Ethical group size limits
const MAX_GROUP_SIZE = 12; // Dunbar's number subdivision
const MIN_GROUP_SIZE = 3;
const MAX_DIRECT_CONNECTIONS = 8; // Prevent overwhelm

// Affinity thresholds
const HIGH_AFFINITY = 0.7;
const MEDIUM_AFFINITY = 0.4;
const LOW_AFFINITY = 0.2;

// Colors for different interest categories
export const INTEREST_COLORS: Record<InterestCategory, string> = {
  arts_crafts: '#FFB347',    // Peach
  cooking: '#FF6B6B',        // Coral
  photography: '#4ECDC4',    // Teal
  music: '#9B59B6',          // Purple
  fitness: '#2ECC71',        // Green
  tech: '#3498DB',           // Blue
  languages: '#E74C3C',      // Red
  outdoors: '#27AE60',       // Forest
  wellness: '#F39C12',       // Gold
  gaming: '#8E44AD',         // Violet
};

// ==================== MOCK DATA ====================

export const MOCK_USERS: HiveUser[] = [
  {
    id: 'user-1',
    name: 'You',
    interests: ['arts_crafts', 'photography', 'cooking'],
    eventsAttended: ['event-1', 'event-2', 'event-5'],
    connectionStrength: 0.8,
    joinedAt: '2025-06-15',
    hiveLevel: 3,
  },
  {
    id: 'user-2',
    name: 'Sarah Chen',
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    interests: ['arts_crafts', 'photography'],
    eventsAttended: ['event-1', 'event-2'],
    connectionStrength: 0.9,
    joinedAt: '2025-03-10',
    hiveLevel: 4,
  },
  {
    id: 'user-3',
    name: 'Mike Rodriguez',
    avatar_url: 'https://i.pravatar.cc/150?img=3',
    interests: ['cooking', 'outdoors'],
    eventsAttended: ['event-3', 'event-5'],
    connectionStrength: 0.6,
    joinedAt: '2025-08-20',
    hiveLevel: 2,
  },
  {
    id: 'user-4',
    name: 'Emma Liu',
    avatar_url: 'https://i.pravatar.cc/150?img=5',
    interests: ['photography', 'tech'],
    eventsAttended: ['event-2', 'event-4'],
    connectionStrength: 0.7,
    joinedAt: '2025-07-05',
    hiveLevel: 3,
  },
  {
    id: 'user-5',
    name: 'James Wilson',
    avatar_url: 'https://i.pravatar.cc/150?img=8',
    interests: ['fitness', 'outdoors'],
    eventsAttended: ['event-6', 'event-7'],
    connectionStrength: 0.5,
    joinedAt: '2025-09-12',
    hiveLevel: 2,
  },
  {
    id: 'user-6',
    name: 'Priya Patel',
    avatar_url: 'https://i.pravatar.cc/150?img=9',
    interests: ['arts_crafts', 'wellness'],
    eventsAttended: ['event-1', 'event-8'],
    connectionStrength: 0.75,
    joinedAt: '2025-05-28',
    hiveLevel: 3,
  },
  {
    id: 'user-7',
    name: 'Alex Kim',
    avatar_url: 'https://i.pravatar.cc/150?img=11',
    interests: ['tech', 'gaming'],
    eventsAttended: ['event-4', 'event-9'],
    connectionStrength: 0.4,
    joinedAt: '2025-10-01',
    hiveLevel: 1,
  },
  {
    id: 'user-8',
    name: 'Nina Garcia',
    avatar_url: 'https://i.pravatar.cc/150?img=16',
    interests: ['cooking', 'languages'],
    eventsAttended: ['event-3', 'event-10'],
    connectionStrength: 0.65,
    joinedAt: '2025-04-18',
    hiveLevel: 3,
  },
];

export const MOCK_EVENTS_HIVE: HiveEvent[] = [
  { id: 'event-1', title: 'Pottery Workshop', category: 'arts_crafts', attendees: ['user-1', 'user-2', 'user-6'], hostId: 'host-1', date: '2026-01-15' },
  { id: 'event-2', title: 'Street Photography', category: 'photography', attendees: ['user-1', 'user-2', 'user-4'], hostId: 'host-2', date: '2026-01-20' },
  { id: 'event-3', title: 'Italian Cooking', category: 'cooking', attendees: ['user-3', 'user-8'], hostId: 'host-3', date: '2026-01-25' },
  { id: 'event-4', title: 'App Development', category: 'tech', attendees: ['user-4', 'user-7'], hostId: 'host-4', date: '2026-02-01' },
  { id: 'event-5', title: 'Farm to Table', category: 'cooking', attendees: ['user-1', 'user-3'], hostId: 'host-3', date: '2026-02-05' },
  { id: 'event-6', title: 'Morning Yoga', category: 'fitness', attendees: ['user-5'], hostId: 'host-5', date: '2026-02-10' },
  { id: 'event-7', title: 'Trail Hiking', category: 'outdoors', attendees: ['user-5'], hostId: 'host-6', date: '2026-02-15' },
  { id: 'event-8', title: 'Meditation Circle', category: 'wellness', attendees: ['user-6'], hostId: 'host-7', date: '2026-02-20' },
];

// ==================== ALGORITHM FUNCTIONS ====================

/**
 * Calculate affinity score between two users based on:
 * - Shared events attended
 * - Overlapping interests
 * - Connection frequency
 */
export function calculateUserAffinity(user1: HiveUser, user2: HiveUser): number {
  // Shared events weight: 50%
  const sharedEvents = user1.eventsAttended.filter(e => user2.eventsAttended.includes(e));
  const maxEvents = Math.max(user1.eventsAttended.length, user2.eventsAttended.length, 1);
  const eventScore = sharedEvents.length / maxEvents;

  // Shared interests weight: 40%
  const sharedInterests = user1.interests.filter(i => user2.interests.includes(i));
  const maxInterests = Math.max(user1.interests.length, user2.interests.length, 1);
  const interestScore = sharedInterests.length / maxInterests;

  // Activity level compatibility: 10%
  const activityDiff = Math.abs(user1.connectionStrength - user2.connectionStrength);
  const activityScore = 1 - activityDiff;

  return (eventScore * 0.5) + (interestScore * 0.4) + (activityScore * 0.1);
}

/**
 * Calculate affinity between user and event
 */
export function calculateEventAffinity(user: HiveUser, event: HiveEvent): number {
  // Interest match: 60%
  const interestMatch = user.interests.includes(event.category) ? 1 : 0;

  // Friends attending: 40%
  const friendsAttending = event.attendees.filter(a => a !== user.id).length;
  const socialScore = Math.min(friendsAttending / 3, 1); // Cap at 3 friends

  return (interestMatch * 0.6) + (socialScore * 0.4);
}

/**
 * Group users based on affinity scores
 * Uses a clustering approach with ethical size limits
 */
export function createGroups(users: HiveUser[], events: HiveEvent[]): HiveGroup[] {
  const groups: HiveGroup[] = [];
  const assignedUsers = new Set<string>();

  // Create affinity matrix
  const affinityMatrix: Map<string, Map<string, number>> = new Map();
  
  for (const user1 of users) {
    affinityMatrix.set(user1.id, new Map());
    for (const user2 of users) {
      if (user1.id !== user2.id) {
        const affinity = calculateUserAffinity(user1, user2);
        affinityMatrix.get(user1.id)!.set(user2.id, affinity);
      }
    }
  }

  // Greedy clustering with size limits
  for (const user of users) {
    if (assignedUsers.has(user.id)) continue;

    // Find high-affinity connections
    const userAffinities = affinityMatrix.get(user.id)!;
    const candidates = Array.from(userAffinities.entries())
      .filter(([id, affinity]) => !assignedUsers.has(id) && affinity >= LOW_AFFINITY)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_GROUP_SIZE - 1);

    if (candidates.length >= MIN_GROUP_SIZE - 1) {
      const members = [user.id, ...candidates.map(c => c[0])];
      const groupUsers = users.filter(u => members.includes(u.id));
      
      // Calculate shared interests
      const allInterests = groupUsers.flatMap(u => u.interests);
      const interestCounts = allInterests.reduce((acc, i) => {
        acc[i] = (acc[i] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const sharedInterests = Object.entries(interestCounts)
        .filter(([_, count]) => count >= members.length * 0.5)
        .map(([interest]) => interest as InterestCategory);

      // Calculate average affinity
      let totalAffinity = 0;
      let count = 0;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          totalAffinity += affinityMatrix.get(members[i])?.get(members[j]) || 0;
          count++;
        }
      }
      const avgAffinity = count > 0 ? totalAffinity / count : 0;

      groups.push({
        id: `group-${groups.length + 1}`,
        name: generateGroupName(sharedInterests),
        members,
        sharedInterests,
        affinityScore: avgAffinity,
        maxSize: MAX_GROUP_SIZE,
      });

      members.forEach(m => assignedUsers.add(m));
    }
  }

  return groups;
}

/**
 * Generate a friendly group name based on interests
 */
function generateGroupName(interests: InterestCategory[]): string {
  const nameMap: Record<InterestCategory, string> = {
    arts_crafts: 'Creative Bees',
    cooking: 'Kitchen Hive',
    photography: 'Lens Collective',
    music: 'Melody Makers',
    fitness: 'Active Swarm',
    tech: 'Digital Drones',
    languages: 'Global Buzzers',
    outdoors: 'Nature Seekers',
    wellness: 'Zen Garden',
    gaming: 'Player Hive',
  };

  if (interests.length === 0) return 'New Colony';
  return nameMap[interests[0]] || 'Buzzing Group';
}

/**
 * Generate hexagonal positions for hive visualization
 * Uses axial coordinates converted to pixel positions
 */
export function generateHexPositions(
  cellCount: number,
  centerX: number,
  centerY: number,
  hexSize: number
): { x: number; y: number; z: number }[] {
  const positions: { x: number; y: number; z: number }[] = [];
  
  // Spiral outward from center
  let ring = 0;
  let index = 0;
  
  while (positions.length < cellCount) {
    if (ring === 0) {
      positions.push({ x: centerX, y: centerY, z: 0 });
      index++;
      ring++;
      continue;
    }
    
    // Generate positions for current ring
    let q = 0;
    let r = -ring;
    
    const directions = [
      [1, 0], [1, 1], [0, 1],
      [-1, 0], [-1, -1], [0, -1]
    ];
    
    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < ring; step++) {
        if (positions.length >= cellCount) break;
        
        // Convert axial to pixel coordinates
        const px = centerX + hexSize * (3/2 * q);
        const py = centerY + hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        const pz = ring * 0.1; // Slight depth based on ring
        
        positions.push({ x: px, y: py, z: pz });
        
        q += directions[side][0];
        r += directions[side][1];
      }
    }
    
    ring++;
  }
  
  return positions;
}

/**
 * Build the complete hive data structure
 */
export function buildHiveData(
  users: HiveUser[],
  events: HiveEvent[],
  currentUserId: string,
  screenWidth: number,
  screenHeight: number
): HiveData {
  const cells: HiveCell[] = [];
  const connections: HiveConnection[] = [];
  
  // Create groups
  const groups = createGroups(users, events);
  
  // Calculate positions
  const totalCells = users.length + events.length;
  const hexSize = Math.min(screenWidth, screenHeight) * 0.12;
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2.5;
  
  const positions = generateHexPositions(totalCells, centerX, centerY, hexSize);
  
  // Current user goes at center
  const currentUser = users.find(u => u.id === currentUserId);
  let posIndex = 0;
  
  // Add current user cell at center
  if (currentUser) {
    cells.push({
      id: currentUser.id,
      position: positions[posIndex++],
      type: 'user',
      data: currentUser,
      connections: [],
      size: 3, // Largest
      color: INTEREST_COLORS[currentUser.interests[0]] || INTEREST_COLORS.arts_crafts,
      pulseIntensity: 1,
    });
  }
  
  // Sort other users by affinity to current user
  const sortedUsers = users
    .filter(u => u.id !== currentUserId)
    .map(u => ({
      user: u,
      affinity: currentUser ? calculateUserAffinity(currentUser, u) : 0,
    }))
    .sort((a, b) => b.affinity - a.affinity);
  
  // Add user cells
  for (const { user, affinity } of sortedUsers) {
    if (posIndex >= positions.length) break;
    
    const size = affinity >= HIGH_AFFINITY ? 2.5 : affinity >= MEDIUM_AFFINITY ? 2 : 1.5;
    
    cells.push({
      id: user.id,
      position: positions[posIndex++],
      type: 'user',
      data: user,
      connections: [],
      size,
      color: INTEREST_COLORS[user.interests[0]] || INTEREST_COLORS.arts_crafts,
      pulseIntensity: affinity,
    });
    
    // Create connection to current user if affinity is high enough
    if (affinity >= LOW_AFFINITY) {
      connections.push({
        from: currentUserId,
        to: user.id,
        strength: affinity,
        type: 'user-user',
      });
    }
  }
  
  // Add event cells in remaining positions (interleaved)
  for (const event of events) {
    if (posIndex >= positions.length) break;
    
    const eventAffinity = currentUser ? calculateEventAffinity(currentUser, event) : 0.5;
    
    cells.push({
      id: event.id,
      position: positions[posIndex++],
      type: 'event',
      data: event,
      connections: event.attendees,
      size: 1.8,
      color: INTEREST_COLORS[event.category],
      pulseIntensity: eventAffinity,
    });
    
    // Connect event to its attendees
    for (const attendeeId of event.attendees) {
      connections.push({
        from: event.id,
        to: attendeeId,
        strength: 0.5,
        type: 'user-event',
      });
    }
  }
  
  // Create connections between users who attended same events
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const sharedEvents = users[i].eventsAttended.filter(
        e => users[j].eventsAttended.includes(e)
      );
      
      if (sharedEvents.length > 0) {
        const existingConnection = connections.find(
          c => (c.from === users[i].id && c.to === users[j].id) ||
               (c.from === users[j].id && c.to === users[i].id)
        );
        
        if (!existingConnection) {
          connections.push({
            from: users[i].id,
            to: users[j].id,
            strength: Math.min(sharedEvents.length / 3, 1),
            type: 'user-user',
          });
        }
      }
    }
  }
  
  return {
    cells,
    connections,
    groups,
    currentUserCellId: currentUserId,
  };
}

/**
 * Get recommended connections for a user
 */
export function getRecommendedConnections(
  user: HiveUser,
  allUsers: HiveUser[],
  limit: number = 5
): { user: HiveUser; affinity: number; reason: string }[] {
  return allUsers
    .filter(u => u.id !== user.id)
    .map(u => {
      const affinity = calculateUserAffinity(user, u);
      const sharedInterests = user.interests.filter(i => u.interests.includes(i));
      const sharedEvents = user.eventsAttended.filter(e => u.eventsAttended.includes(e));
      
      let reason = '';
      if (sharedEvents.length > 0) {
        reason = `${sharedEvents.length} shared event${sharedEvents.length > 1 ? 's' : ''}`;
      } else if (sharedInterests.length > 0) {
        reason = `Shares ${sharedInterests[0].replace('_', ' ')} interest`;
      } else {
        reason = 'Expanding your hive';
      }
      
      return { user: u, affinity, reason };
    })
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, limit);
}
