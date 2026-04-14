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
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Explore <span className="text-primary">MMU</span></h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover ongoing competitions, top-performing creators, and the most liked videos across all faculties.
        </p>
      </div>

      {/* Buzz Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="text-yellow-500" size={28} />
            <h2 className="text-3xl font-black tracking-tight">Buzz</h2>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://online.mmu.edu.my/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <ExternalLink size={18} />
              Online Portal
            </a>
            {isAdmin && (
              <button 
                onClick={() => setIsEditingBuzz(true)}
                className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-full font-bold hover:bg-muted/80 transition-colors"
              >
                <Edit3 size={18} />
                Change News
              </button>
            )}
          </div>
        </div>

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
                    required
                    type="text" 
                    value={newBuzz.title}
                    onChange={e => setNewBuzz({...newBuzz, title: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. MMU Ranks Top 10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Summary</label>
                  <textarea 
                    required
                    rows={3}
                    value={newBuzz.summary}
                    onChange={e => setNewBuzz({...newBuzz, summary: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary resize-none"
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Image URL</label>
                  <input 
                    type="text" 
                    value={newBuzz.imageURL}
                    onChange={e => setNewBuzz({...newBuzz, imageURL: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Link (Optional)</label>
                  <input 
                    type="text" 
                    value={newBuzz.link}
                    onChange={e => setNewBuzz({...newBuzz, link: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-colors mt-4 shadow-xl shadow-primary/20"
                >
                  Publish News
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {buzzNews.map(news => (
            <div key={news.id} className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm group hover:shadow-xl transition-all duration-300 flex flex-col">
              <div className="h-48 relative overflow-hidden">
                <img referrerPolicy="no-referrer"   
                  src={news.imageURL || `https://picsum.photos/seed/buzz-${news.id}/800/400`} 
                  alt={news.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {isAdmin && (
                  <button 
                    onClick={() => handleDeleteBuzz(news.id)}
                    className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg"
                    title="Delete News"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-black tracking-tight leading-tight mb-3">{news.title}</h3>
                <p className="text-muted-foreground text-sm flex-1">{news.summary}</p>
                {news.link && (
                  <a href={news.link} target="_blank" rel="noopener noreferrer" className="mt-4 text-primary font-bold text-sm hover:underline flex items-center gap-1">
                    Read More <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Events & Competitions */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="text-primary" size={28} />
            <h2 className="text-3xl font-black tracking-tight">Events & Competitions</h2>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsAddingEvent(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <PlusCircle size={20} />
              Add Event
            </button>
          )}
        </div>

        {isAddingEvent && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-2xl rounded-3xl p-8 border border-border shadow-2xl relative">
              <button 
                onClick={() => setIsAddingEvent(false)}
                className="absolute top-6 right-6 text-muted-foreground hover:text-foreground"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black mb-6">Add New Event</h2>
              <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Event Title</label>
                  <input 
                    required
                    type="text" 
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. MMU Short Film Competition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Organizer</label>
                  <input 
                    required
                    type="text" 
                    value={newEvent.organizer}
                    onChange={e => setNewEvent({...newEvent, organizer: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. FCA Faculty"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Deadline</label>
                  <input 
                    required
                    type="text" 
                    value={newEvent.deadline}
                    onChange={e => setNewEvent({...newEvent, deadline: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. 15th May 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Main Prize</label>
                  <input 
                    required
                    type="text" 
                    value={newEvent.prize}
                    onChange={e => setNewEvent({...newEvent, prize: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. RM 5,000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Required Keyword</label>
                  <input 
                    required
                    type="text" 
                    value={newEvent.keyword}
                    onChange={e => setNewEvent({...newEvent, keyword: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="e.g. ShortFilm2026"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Image URL</label>
                  <input 
                    type="text" 
                    value={newEvent.imageURL}
                    onChange={e => setNewEvent({...newEvent, imageURL: e.target.value})}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary"
                    placeholder="https://..."
                  />
                </div>
                <button 
                  type="submit"
                  className="col-span-2 bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-colors mt-4 shadow-xl shadow-primary/20"
                >
                  Create Event
                </button>
              </form>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event.id} className="bg-card rounded-3xl overflow-hidden border border-border shadow-sm group hover:shadow-xl transition-all duration-300">
              <div className="h-48 relative overflow-hidden">
                <img referrerPolicy="no-referrer"   
                  src={event.imageURL || `https://picsum.photos/seed/event-${event.id}/800/400`} 
                  alt={event.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute top-4 right-4 flex gap-2">
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteEvent(event.id)}
                      className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all shadow-lg"
                      title="Delete Event"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-black tracking-tight leading-tight">{event.title}</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-black">Organizer</span>
                    <p className="font-bold">{(event as any).organizer || event.location}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-black">Main Prize</span>
                    <p className="font-bold text-yellow-500 flex items-center gap-1"><Award size={14} /> {(event as any).prize || event.description}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-black">Deadline</span>
                    <p className="font-bold flex items-center gap-1"><Calendar size={14} /> {(event as any).deadline || event.date}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-black">Required Keyword</span>
                    <p className="font-bold text-primary">{event.keyword}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Link to="/upload" className="block text-center w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl transition-all shadow-lg shadow-primary/10">
                    Submit Your Video
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Awards & Winners */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-2">
            <Award className="text-yellow-500" size={24} />
            <h3 className="text-2xl font-black tracking-tight">Recent Awards & Winners</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Best FYP Presentation 2025", winner: "Sarah Lim", category: "FCI", date: "Dec 2025" },
              { title: "MMU E-Sports Champion", winner: "Team Alpha", category: "Clubs", date: "Nov 2025" },
              { title: "Top Content Creator", winner: "Ahmad Faizal", category: "FCM", date: "Oct 2025" }
            ].map((award, i) => (
              <div key={i} className="bg-card border border-border rounded-3xl p-5 flex items-start gap-4 hover:bg-muted transition-colors shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="text-yellow-500" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">{award.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1.5">Winner: <span className="text-foreground font-bold">{award.winner}</span></p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">{award.category} • {award.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Up-and-coming Products */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-primary" size={24} />
              <h3 className="text-2xl font-black tracking-tight">Up-and-coming Products</h3>
            </div>
            {canPostProduct && (
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="flex items-center gap-2 bg-mmu-blue text-white px-4 py-2 rounded-full font-bold hover:bg-mmu-blue/90 transition-colors shadow-lg shadow-mmu-blue/20 text-sm"
              >
                <PlusCircle size={18} />
                List Product
              </button>
            )}
          </div>

          {isAddingProduct && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card w-full max-w-md rounded-3xl p-8 border border-border shadow-2xl relative">
                <button onClick={() => setIsAddingProduct(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
                  <X size={24} />
                </button>
                <h2 className="text-2xl font-black mb-6">List New Product</h2>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Product Name</label>
                    <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary" placeholder="e.g. MMU Hoodie" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Price (RM)</label>
                      <input required type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary" placeholder="e.g. 89" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Campus</label>
                      <select value={newProduct.campus} onChange={e => setNewProduct({...newProduct, campus: e.target.value as any})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary appearance-none">
                        <option value="Cyberjaya">Cyberjaya</option>
                        <option value="Melaka">Melaka</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Image URL</label>
                    <input type="text" value={newProduct.imageURL} onChange={e => setNewProduct({...newProduct, imageURL: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary" placeholder="https://..." />
                  </div>
                  <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-colors mt-4 shadow-xl shadow-primary/20">
                    List Product
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="relative group bg-card rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="aspect-square relative overflow-hidden">
                  <img referrerPolicy="no-referrer" 
                    src={product.imageURL || `https://picsum.photos/seed/product-${product.id}/400/400`} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  
                  {/* Hover Popup */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-white text-center">
                    <div className="space-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex items-center justify-center gap-1 text-2xl font-black">
                        <DollarSign size={20} className="text-green-400" />
                        {product.price}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-80">
                          <Store size={12} />
                          {product.sellerName}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-80">
                          <MapPin size={12} />
                          {product.campus}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="absolute top-3 right-3 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-all shadow-lg z-10 opacity-0 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="p-4 text-center">
                  <h4 className="font-black text-sm truncate">{product.name}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Most Liked Videos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <Star className="text-yellow-500" size={28} />
            <h2 className="text-3xl font-black tracking-tight">Most Liked Videos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video bg-muted rounded-2xl animate-pulse" />
              ))
            ) : (
              topVideos.map(video => (
                <VideoCard key={video.id} video={video} />
              ))
            )}
          </div>
        </div>

        {/* Top Creators */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Users className="text-primary" size={28} />
            <h2 className="text-3xl font-black tracking-tight">Top Creators</h2>
          </div>
          <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
              ))
            ) : (
              topCreators.map((creator, i) => (
                <Link to={`/channel/${creator.uid}`} key={creator.uid} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center font-black text-lg text-white shadow-lg shadow-primary/20">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate group-hover:text-primary transition-colors">{creator.username || creator.displayName}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{creator.faculty} • {creator.levelOfStudy}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary">{creator.followerCount || creator.followers?.length || 0}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Followers</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Explore;
