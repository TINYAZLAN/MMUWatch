export type UserRole = 'viewer' | 'creator' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  faculty?: string;
  studentId?: string;
  username?: string;
  levelOfStudy?: string;
  subjects?: string[];
  subscriptions?: string[];
  watchHistory?: string[];
  savedVideos?: string[];
  likedVideos?: string[];
  likedComments?: string[];
  followers?: string[];
  followerCount?: number;
  following?: string[];
  followingCount?: number;
  awards?: number;
  joinedClubs?: string[];
  friends?: string[];
  isBusinessPartner?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  sellerName: string;
  sellerId: string;
  campus: 'Melaka' | 'Cyberjaya';
  imageURL: string;
  createdAt: any;
}

export interface VideoHighlight {
  time: number;
  label: string;
}

export interface VideoMetadata {
  id: string;
  videoId?: string;
  title: string;
  description: string;
  thumbnailURL: string;
  videoURL: string;
  creatorId: string;
  creatorName?: string;
  views: number;
  likes: number;
  likedBy?: string[];
  dislikes: number;
  category: string;
  createdAt: any;
  creatorFaculty?: string;
  tags?: string[];
  summary?: string;
  highlights?: VideoHighlight[];
  duration?: number;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName?: string;
  userPhoto?: string;
  text: string;
  createdAt: any;
  likes: number;
  likedBy?: string[];
  replies?: Comment[];
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  bannerURL?: string;
  profileURL?: string;
  followerCount: number;
  ownerId: string;
}

export interface Application {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  course: string;
  createdAt: string;
}

export interface ClubPost {
  id: string;
  clubName: string;
  title: string;
  content: string;
  imageURL?: string;
  creatorId: string;
  createdAt: any;
  tags?: string[];
}

export interface MMUEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  imageURL?: string;
  keyword: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export type SearchResultType = 'video' | 'event' | 'club';

export interface UnifiedSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  thumbnailURL?: string;
  imageURL?: string;
  createdAt: any;
  tags?: string[];
  // Specific fields
  videoId?: string;
  videoURL?: string;
  creatorName?: string;
  views?: number;
  likes?: number;
  date?: string;
  location?: string;
  clubName?: string;
  content?: string;
  keyword?: string;
}
