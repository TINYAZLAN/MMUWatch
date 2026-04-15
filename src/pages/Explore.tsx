import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { VideoMetadata, UserProfile, MMUEvent, BuzzNews } from '../types';
import VideoCard from '../components/VideoCard';
import { Trophy, Star, Users, Award, Calendar, Play, PlusCircle, X, Loader2, ShoppingBag, MapPin, DollarSign, Store, Edit3, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { MMUText } from '../components/MMUText';
import { Product } from '../types';

const Explore: React.FC = () => {
  const { user, profile } = useAuth();
  const [topVideos, setTopVideos] = useState<VideoMetadata[]>([]);
  const [topCreators, setTopCreators] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<MMUEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [buzzNews, setBuzzNews] = useState<BuzzNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isEditingBuzz, setIsEditingBuzz] = useState(false);
  
  const [newBuzz, setNewBuzz] = useState({
    title: '',
    summary: '',
    imageURL: '',
    link: ''
  });
  const [newEvent, setNewEvent] = useState({
    title: '',
    organizer: '',
    prize: '',
    deadline: '',
    description: '',
    keyword: '',
    imageURL: ''
  });
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    campus: 'Cyberjaya' as 'Melaka' | 'Cyberjaya',
    imageURL: ''
  });

  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';
  const isBusinessPartner = profile?.isBusinessPartner || false;
  const canPostProduct = isAdmin || isBusinessPartner;

  const [videoFilter, setVideoFilter] = useState<'7 Days' | '1 Month' | 'All Time'>('All Time');

  useEffect(() => {
    setLoading(true);

    // Real-time Top Videos
    const videosQ = query(collection(db, 'videos'), orderBy('likes', 'desc'), limit(4));
    const unsubscribeVideos = onSnapshot(videosQ, (snapshot) => {
      const videoData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoMetadata));
      setTopVideos(videoData);
    }, (error) => {
      console.error("Error fetching top videos:", error);
    });

    // Real-time Top Creators
    const creatorsQ = query(collection(db, 'users'), orderBy('followerCount', 'desc'), limit(5));
    const unsubscribeCreators = onSnapshot(creatorsQ, (snapshot) => {
      const creatorsData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setTopCreators(creatorsData);
    }, (error) => {
      console.error("Error fetching top creators:", error);
    });

    // Real-time Events
    const eventsQ = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribeEvents = onSnapshot(eventsQ, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      if (eventsData.length === 0) {
        setEvents([
          {
            id: '1',
            title: "MMU Cinematic Arts Short Film Competition 2026",
            location: "Faculty of Cinematic Arts (FCA)",
            description: "RM 5,000 + Internship at Astro",
            date: "15th May 2026",
            imageURL: "https://picsum.photos/seed/film/800/400",
            keyword: "ShortFilm2026"
          },
          {
            id: '2',
            title: "Cyberjaya Campus Hiking Vlog Challenge",
            location: "MMU Outdoor Club",
            description: "GoPro Hero 12 + Camping Gear",
            date: "30th April 2026",
            imageURL: "https://picsum.photos/seed/hiking/800/400",
            keyword: "HikingVlog"
          }
        ]);
      } else {
        setEvents(eventsData as MMUEvent[]);
      }
    }, (error) => {
      console.error("Error fetching events:", error);
    });

    // Real-time Products
    const productsQ = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(8));
    const unsubscribeProducts = onSnapshot(productsQ, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      if (productsData.length === 0) {
        setProducts([
          { id: 'p1', name: 'MMU Limited Hoodie', price: 89, sellerName: 'MMU Store', sellerId: 'admin', campus: 'Cyberjaya', imageURL: 'https://picsum.photos/seed/hoodie/400/400', createdAt: new Date() },
          { id: 'p2', name: 'Smart Study Lamp', price: 45, sellerName: 'TechGadgets', sellerId: 'bp1', campus: 'Melaka', imageURL: 'https://picsum.photos/seed/lamp/400/400', createdAt: new Date() },
          { id: 'p3', name: 'MMU Lanyard 2026', price: 15, sellerName: 'SRC MMU', sellerId: 'admin', campus: 'Cyberjaya', imageURL: 'https://picsum.photos/seed/lanyard/400/400', createdAt: new Date() },
          { id: 'p4', name: 'Organic Coffee Beans', price: 35, sellerName: 'Campus Cafe', sellerId: 'bp2', campus: 'Melaka', imageURL: 'https://picsum.photos/seed/coffee/400/400', createdAt: new Date() },
        ]);
      } else {
        setProducts(productsData);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });

    // Real-time Buzz
    const buzzQ = query(collection(db, 'buzzNews'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribeBuzz = onSnapshot(buzzQ, (snapshot) => {
      const buzzData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BuzzNews));
      if (buzzData.length === 0) {
        setBuzzNews([
          { id: 'b1', title: 'MMU Ranks Top 10 in Asia', summary: 'Multimedia University has officially been ranked in the top 10 for tech universities in Asia.', imageURL: 'https://picsum.photos/seed/mmu1/800/400', createdAt: new Date() },
          { id: 'b2', title: 'New AI Lab Opens', summary: 'The new state-of-the-art AI lab is now open for all students in the Faculty of Computing.', imageURL: 'https://picsum.photos/seed/mmu2/800/400', createdAt: new Date() },
          { id: 'b3', title: 'Campus Festival 2026', summary: 'Get ready for the biggest campus festival this coming November. Early bird tickets available now!', imageURL: 'https://picsum.photos/seed/mmu3/800/400', createdAt: new Date() },
        ]);
      } else {
        setBuzzNews(buzzData);
      }
    }, (error) => {
      console.error("Error fetching buzz:", error);
    });

    return () => {
      unsubscribeVideos();
      unsubscribeCreators();
      unsubscribeEvents();
      unsubscribeProducts();
      unsubscribeBuzz();
    };
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        createdAt: serverTimestamp()
      });
      toast.success("Event added successfully!");
      setIsAddingEvent(false);
      setNewEvent({
        title: '',
        organizer: '',
        prize: '',
        deadline: '',
        description: '',
        keyword: '',
        imageURL: ''
      });
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast.success("Event deleted");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPostProduct || !user) return;

    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        price: Number(newProduct.price),
        sellerName: profile?.username || profile?.displayName || user.displayName || 'Business Partner',
        sellerId: user.uid,
        createdAt: serverTimestamp()
      });
      toast.success("Product listed successfully!");
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: '', campus: 'Cyberjaya', imageURL: '' });
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success("Product removed");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleAddBuzz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      await addDoc(collection(db, 'buzzNews'), {
        ...newBuzz,
        createdAt: serverTimestamp()
      });
      toast.success("Buzz news added successfully!");
      setIsEditingBuzz(false);
      setNewBuzz({ title: '', summary: '', imageURL: '', link: '' });
    } catch (error) {
      console.error("Error adding buzz news:", error);
      toast.error("Failed to add buzz news");
    }
  };

  const handleDeleteBuzz = async (buzzId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'buzzNews', buzzId));
      toast.success("Buzz news deleted");
    } catch (error) {
      console.error("Error deleting buzz news:", error);
      toast.error("Failed to delete buzz news");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
          <MMUText text="Explore MMU" />
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover ongoing competitions, top-performing creators, and the most liked videos across all faculties.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (70%) */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Events & Competitions */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Calendar className="text-primary" /> Events & Competitions
              </h2>
              {isAdmin && (
                <button 
                  onClick={() => setIsAddingEvent(true)}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors text-sm"
                >
                  <PlusCircle size={16} /> Add Event
                </button>
              )}
            </div>
            
            {/* 1 Large Featured Event */}
            {events.length > 0 && (
              <Link to={`/upload?tags=${events[0].keyword}`} className="block group relative rounded-3xl overflow-hidden shadow-lg border border-border">
                <img src={events[0].imageURL || `https://picsum.photos/seed/${events[0].id}/800/400`} alt={events[0].title} className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Featured</span>
                    <span className="text-sm font-medium text-white/80">{events[0].date}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black mb-2"><MMUText text={events[0].title} /></h3>
                  <p className="text-white/80 line-clamp-2 max-w-2xl"><MMUText text={events[0].description} /></p>
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.preventDefault(); handleDeleteEvent(events[0].id); }}
                    className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </Link>
            )}
            
            {/* 3 Smaller Events */}
            {events.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {events.slice(1, 4).map(event => (
                  <Link key={event.id} to={`/upload?tags=${event.keyword}`} className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all relative">
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      <img src={event.imageURL || `https://picsum.photos/seed/${event.id}/400/200`} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4 space-y-2">
                      <h4 className="font-bold line-clamp-2 group-hover:text-primary transition-colors"><MMUText text={event.title} /></h4>
                      <p className="text-xs text-muted-foreground line-clamp-2"><MMUText text={event.description} /></p>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.preventDefault(); handleDeleteEvent(event.id); }}
                        className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent Winners */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-500" />
              <h2 className="text-2xl font-black tracking-tight">Recent Winners</h2>
            </div>
            <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
               {[
                 { name: 'Ahmad Faizal', award: 'Best Short Film 2026' },
                 { name: 'Sarah Lim', award: 'Top Tech Innovator' },
                 { name: 'John Doe', award: 'Creative Design Award' },
                 { name: 'Alicia Tan', award: 'Outstanding Vlog' },
                 { name: 'Tech Club', award: 'Hackathon Champions' }
               ].map((winner, i) => (
                 <div key={i} className="min-w-[200px] snap-start bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-yellow-500/30 transition-all">
                   <div className="w-14 h-14 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
                     <Award className="text-yellow-500" size={28} />
                   </div>
                   <h4 className="font-black text-lg"><MMUText text={winner.name} /></h4>
                   <p className="text-sm text-muted-foreground mt-1"><MMUText text={winner.award} /></p>
                 </div>
               ))}
            </div>
          </section>

          {/* Featured Products */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <ShoppingBag className="text-primary" /> Featured Products
              </h2>
              {canPostProduct && (
                <button 
                  onClick={() => setIsAddingProduct(true)}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors text-sm"
                >
                  <PlusCircle size={16} /> Add Product
                </button>
              )}
            </div>
            <div className="flex overflow-x-auto gap-6 pb-4 snap-x hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
               {products.map(product => (
                 <div key={product.id} className="min-w-[240px] snap-start bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group relative">
                   <div className="relative h-48 bg-muted">
                     <img src={product.imageURL || `https://picsum.photos/seed/${product.id}/400/400`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                       <MapPin size={10} className="text-primary" /> {product.campus}
                     </div>
                   </div>
                   <div className="p-5 space-y-3">
                     <h4 className="font-bold line-clamp-2 leading-tight"><MMUText text={product.name} /></h4>
                     <div className="flex items-center justify-between pt-2">
                       <span className="text-xl font-black text-primary">RM {product.price}</span>
                       <button className="text-xs bg-muted px-4 py-2 rounded-full font-bold hover:bg-primary hover:text-white transition-colors">View</button>
                     </div>
                   </div>
                   {isAdmin && (
                     <button 
                       onClick={() => handleDeleteProduct(product.id)}
                       className="absolute top-3 right-3 bg-red-500/90 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-sm"
                     >
                       <X size={14} />
                     </button>
                   )}
                 </div>
               ))}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN (30%) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Hive Buzz */}
          <section className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Star className="text-yellow-500" /> Hive Buzz
              </h2>
              {isAdmin && (
                <button 
                  onClick={() => setIsEditingBuzz(true)} 
                  className="text-xs bg-muted text-foreground px-3 py-1.5 rounded-full font-bold hover:bg-muted/80 transition-colors flex items-center gap-1"
                >
                  <Edit3 size={12} /> Edit
                </button>
              )}
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              {buzzNews.slice(0, 5).map(news => (
                <div key={news.id} className="flex gap-4 group cursor-pointer relative bg-muted/30 p-3 rounded-2xl hover:bg-muted/80 transition-colors">
                  <img src={news.imageURL || `https://picsum.photos/seed/${news.id}/100/100`} alt={news.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-tight mb-1"><MMUText text={news.title} /></h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"><MMUText text={news.summary} /></p>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteBuzz(news.id); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <a 
              href="https://online.mmu.edu.my/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="mt-6 shrink-0 flex items-center justify-center gap-2 w-full text-center bg-primary text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <ExternalLink size={16} />
              Online Portal
            </a>
          </section>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (70%) */}
        <div className="lg:col-span-8 space-y-12">
          {/* Most Liked Videos */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Play className="text-primary" /> Most Liked Videos
              </h2>
              <div className="flex gap-2 bg-muted p-1 rounded-full border border-border w-fit">
                {['7 Days', '1 Month', 'All Time'].map(filter => (
                  <button 
                    key={filter} 
                    onClick={() => setVideoFilter(filter as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${videoFilter === filter ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex overflow-x-auto gap-6 pb-4 snap-x hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {topVideos.map(video => (
                <div key={video.id} className="min-w-[280px] md:min-w-[320px] snap-start">
                  <VideoCard video={video} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (30%) */}
        <div className="lg:col-span-4 space-y-8">
          {/* Top Creators */}
          <section className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2 mb-6">
              <Users className="text-blue-500" /> Top Creators
            </h2>
            <div className="space-y-3">
              {topCreators.map((creator, index) => (
                <div 
                  key={creator.uid} 
                  className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${
                    index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20 shadow-sm' : 
                    index < 3 ? 'bg-muted/50' : 'hover:bg-muted'
                  }`}
                >
                  <div className={`font-black text-lg w-8 text-center ${
                    index === 0 ? 'text-yellow-500 text-2xl' : 
                    index === 1 ? 'text-slate-400' : 
                    index === 2 ? 'text-amber-700' : 'text-muted-foreground'
                  }`}>
                    {index === 0 ? '👑' : `#${index + 1}`}
                  </div>
                  <img src={creator.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.uid}`} alt={creator.username} className="w-12 h-12 rounded-full border-2 border-background shadow-sm object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate text-sm"><MMUText text={creator.username || creator.displayName || 'Anonymous'} /></h4>
                    <p className="text-xs text-muted-foreground font-medium">{creator.followerCount || 0} followers</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      {isAddingEvent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-3xl p-8 border border-border shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsAddingEvent(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black mb-6">Add New Event</h2>
            <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Event Title</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Organizer</label>
                <input 
                  type="text" 
                  value={newEvent.organizer}
                  onChange={e => setNewEvent({...newEvent, organizer: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Date / Deadline</label>
                <input 
                  type="text" 
                  value={newEvent.deadline}
                  onChange={e => setNewEvent({...newEvent, deadline: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Prize / Reward</label>
                <input 
                  type="text" 
                  value={newEvent.prize}
                  onChange={e => setNewEvent({...newEvent, prize: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Tag Keyword</label>
                <input 
                  type="text" 
                  value={newEvent.keyword}
                  onChange={e => setNewEvent({...newEvent, keyword: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Image URL</label>
                <input 
                  type="url" 
                  value={newEvent.imageURL}
                  onChange={e => setNewEvent({...newEvent, imageURL: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Description</label>
                <textarea 
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all resize-none"
                  rows={3}
                  required
                />
              </div>
              <div className="md:col-span-2 mt-4">
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors">
                  Publish Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddingProduct && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-xl rounded-3xl p-8 border border-border shadow-2xl relative">
            <button 
              onClick={() => setIsAddingProduct(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black mb-6">List New Product</h2>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Product Name</label>
                <input 
                  type="text" 
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Price (RM)</label>
                  <input 
                    type="number" 
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Campus</label>
                  <select 
                    value={newProduct.campus}
                    onChange={e => setNewProduct({...newProduct, campus: e.target.value as any})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="Cyberjaya">Cyberjaya</option>
                    <option value="Melaka">Melaka</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Image URL</label>
                <input 
                  type="url" 
                  value={newProduct.imageURL}
                  onChange={e => setNewProduct({...newProduct, imageURL: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="mt-4">
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors">
                  List Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditingBuzz && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-3xl p-8 border border-border shadow-2xl relative">
            <button 
              onClick={() => setIsEditingBuzz(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black mb-6">Add Buzz News</h2>
            <form onSubmit={handleAddBuzz} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Title</label>
                <input 
                  type="text" 
                  value={newBuzz.title}
                  onChange={e => setNewBuzz({...newBuzz, title: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Summary</label>
                <textarea 
                  value={newBuzz.summary}
                  onChange={e => setNewBuzz({...newBuzz, summary: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all resize-none"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Image URL</label>
                <input 
                  type="url" 
                  value={newBuzz.imageURL}
                  onChange={e => setNewBuzz({...newBuzz, imageURL: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Link (Optional)</label>
                <input 
                  type="url" 
                  value={newBuzz.link}
                  onChange={e => setNewBuzz({...newBuzz, link: e.target.value})}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="mt-4">
                <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors">
                  Publish News
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Explore;
