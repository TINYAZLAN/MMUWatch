import { Home, Users, Calendar, TrendingUp } from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { icon: Home, label: 'Home', id: 'home' },
  { icon: Users, label: 'Clubs', id: 'clubs' },
  { icon: Calendar, label: 'All Events', id: 'events' },
  { icon: TrendingUp, label: 'Trending', id: 'trending' },
];

export const UPCOMING_EVENTS = [
  { id: 1, title: 'Career Fair', date: 'This Fri, 2 PM', type: 'Career' },
  { id: 2, title: 'Club Recruitment', date: 'Sat, 10 AM', type: 'Campus' },
  { id: 3, title: 'Hackathon Finals', date: 'Sun, 1 PM', type: 'Tech' },
];

export const HOT_TOPICS = [
  '#Hiking', '#Photography', '#Gaming', '#Assignments', '#ExamWeek', '#AlumniTalk', '#WebDev'
];

export const SUGGESTED_CLUBS = [
  { id: 1, name: 'Robotics Society', members: 120 },
  { id: 2, name: 'Photography Club', members: 85 },
  { id: 3, name: 'ESports Team', members: 340 },
];

export const MOCK_POSTS = [
  {
    id: 'p1',
    author: {
      name: 'Sarah Jenkins',
      handle: '@sarahj_cs',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      role: 'Computer Science Y2'
    },
    timeAgo: '2 hours ago',
    content: 'Just finished my first React Native app for the mobile computing assignment! It was tough but the documentation really helped. Anyone else struggling with the Redux setup?',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
    stats: {
      upvotes: 124,
      comments: 18,
      shares: 3
    },
    isUpvoted: true
  },
  {
    id: 'p2',
    author: {
      name: 'Michael Chen',
      handle: '@mike_designs',
      avatar: 'https://i.pravatar.cc/150?u=mike',
      role: 'Creative Multimedia Y3'
    },
    timeAgo: '5 hours ago',
    content: 'Looking for 2 more members for the upcoming Campus Hackathon. We have a backend dev and a UI designer. Need someone good with frontend (React/Next.js) or presentation skills! DM me if interested 🚀',
    stats: {
      upvotes: 89,
      comments: 24,
      shares: 12
    },
    isUpvoted: false
  },
  {
    id: 'p3',
    author: {
      name: 'MMU Tech Society',
      handle: '@mmutechsosc',
      avatar: 'https://i.pravatar.cc/150?u=techsoc',
      role: 'Official Club',
      isOfficial: true
    },
    timeAgo: '1 day ago',
    content: 'Registration for the Annual Tech Symposium is now OPEN! 🚨\n\nJoin us this weekend for talks from industry leaders, hands-on workshops, and networking sessions. Free pizza for early registrants 🍕',
    stats: {
      upvotes: 342,
      comments: 56,
      shares: 89
    },
    isUpvoted: false
  }
];
