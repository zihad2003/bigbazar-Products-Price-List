import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Trash2, Loader2, Facebook, Instagram, Music2, 
  X, Lock, LogOut, Tag, Edit3, Play, MessageCircle, Plus 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dgdjjyxjnpzqqofdqxdp.supabase.co';
const supabaseAnonKey = 'sb_publishable_cjsjwayzjMDQLS98ra5gtA_H0jqjXbg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const extractTikTokId = (url) => {
  if (!url) return null;
  const match = url.match(/\/video\/(\d+)/) || url.match(/v2\/(\d+)/) || url.match(/^(\d{15,25})$/);
  return match ? match[1] : null;
};

const getEmbedUrl = (url, isAutoPlay = true) => {
  if (!url) return null;
  const auto = isAutoPlay ? "1" : "0";
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&t=0&autoplay=${auto}&mute=1`;
  }
  const tiktokId = extractTikTokId(url);
  if (tiktokId) {
    return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=${auto}&mute=1&controls=0`;
  }
  return null; 
};

export default function ProductSheetApp() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [hoveredProductId, setHoveredProductId] = useState(null);
  
  const ADMIN_PASSWORD = "zihad2025";
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('bb_admin_auth') === 'true');
  const [passInput, setPassInput] = useState("");
  const params = new URLSearchParams(window.location.search);
  const isAdminView = params.get('view') === 'admin';

  const CONTACT = {
    whatsapp: "8801335945351",
    messenger: "https://m.me/109056644140792",
    instagram: "https://www.instagram.com/big_bazar_25/",
    facebook: "https://www.facebook.com/profile.php?id=100063541603515",
    tiktok: "https://www.tiktok.com/@big.bazar2"
  };

  const categories = ["All", "Men", "Women", "Kids (Girls)", "Kids (Boys)"];
  const [formData, setFormData] = useState({ name: '', price: '', category: '', badge: '', imageFiles: [], video_url: '', description: '' });
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setProducts(data || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const resolveVideo = async () => {
      if (selectedProduct?.video_url) {
        if (selectedProduct.video_url.includes('vt.tiktok.com')) {
          try {
            const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(selectedProduct.video_url)}`);
            const data = await res.json();
            const match = data.contents.match(/video\/(\d+)/) || data.contents.match(/v2\/(\d+)/);
            if (match) setEmbedUrl(`https://www.tiktok.com/embed/v2/${match[1]}?autoplay=1&mute=0`);
            else setEmbedUrl(getEmbedUrl(selectedProduct.video_url, true));
          } catch {
            setEmbedUrl(getEmbedUrl(selectedProduct.video_url, true));
          }
        } else {
          setEmbedUrl(getEmbedUrl(selectedProduct.video_url, true));
        }
      }
    };
    resolveVideo();
  }, [selectedProduct]);

  const handleEdit = (p) => {
    setEditingId(p.id);
    setFormData({ name: p.name, price: p.price, category: p.category, badge: p.badge || '', video_url: p.video_url || '', description: p.description || '', imageFiles: [] });
    setPreviews(p.gallery || (p.image_url ? [p.image_url] : []));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removePhoto = (index) => {
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    const newFiles = [...formData.imageFiles];
    newFiles.splice(index, 1);
    setFormData({...formData, imageFiles: newFiles});
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!isAdmin || !formData.name || !formData.price || !formData.category) return;
    try {
      setStatus("Syncing...");
      let imageUrls = previews.filter(src => typeof src === 'string' && src.startsWith('http'));
      if (formData.imageFiles.length > 0) {
        for (const file of formData.imageFiles) {
          const fileName = `${Date.now()}-${file.name}`;
          await supabase.storage.from('product-images').upload(fileName, file);
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          imageUrls.push(data.publicUrl);
        }
      }
      const payload = { 
        name: formData.name, 
        price: parseFloat(formData.price), 
        category: formData.category, 
        badge: formData.badge, 
        video_url: formData.video_url, 
        description: formData.description, 
        image_url: imageUrls[0] || null, 
        gallery: imageUrls 
      };
      if (editingId) await supabase.from('products').update(payload).eq('id', editingId);
      else await supabase.from('products').insert([payload]);
      window.location.reload();
    } catch (err) { alert(err.message); } finally { setStatus(""); }
  };

  const sendOrder = (platform, product) => {
    const message = `🛍️ *NEW ORDER: BIG BAZAR*\n\n📌 *Product:* ${product.name}\n💰 *Price:* ${product.price} BDT\n🏷️ *Category:* ${product.category}\n🖼️ *Link:* ${product.image_url || 'No Image'}\n\n_Confirm order?_`;
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`);
    } else {
      navigator.clipboard.writeText(message);
      window.open(CONTACT.messenger);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-red-700" size={40} /></div>;

  if (isAdminView && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="bg-neutral-900 border border-white/5 p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl">
          <Lock className="text-red-600 mx-auto mb-6" size={40} />
          <h2 className="text-2xl font-black text-white italic uppercase mb-8 tracking-tighter">Admin Access</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            if(passInput === ADMIN_PASSWORD) {
              setIsAdmin(true);
              localStorage.setItem('bb_admin_auth', 'true');
            } else { alert("Unauthorized"); }
          }} className="space-y-4">
            <input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full p-4 rounded-xl bg-black text-white text-center border border-white/10 outline-none" placeholder="Enter Admin Password" />
            <button type="submit" className="w-full bg-red-800 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-all">Unlock Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="pt-12 pb-6 px-6 bg-black sticky top-0 z-[100] border-b border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <h1 className="text-4xl font-black tracking-tighter italic uppercase text-center">BIG<span className="text-red-700">BAZAR</span></h1>
          {!isAdminView && (
            <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar w-full justify-center">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase transition-all ${activeCategory === cat ? 'bg-red-800 text-white shadow-lg' : 'bg-neutral-900 text-neutral-500 hover:text-white'}`}>{cat}</button>
              ))}
            </div>
          )}
          {isAdmin && isAdminView && (
            <button onClick={() => { setIsAdmin(false); localStorage.removeItem('bb_admin_auth'); }} className="mt-4 text-neutral-600 hover:text-red-600 flex items-center gap-1 text-[10px] font-bold uppercase"><LogOut size={12}/> Exit Admin</button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 pb-48">
        {isAdmin && isAdminView && (
          <div className="bg-neutral-900/50 rounded-[2.5rem] p-8 mb-20 max-w-xl mx-auto border border-white/5 shadow-2xl">
            <h2 className="text-red-700 font-black uppercase text-xs mb-8 flex items-center justify-center gap-2 tracking-[0.3em]"><Tag size={14}/> {editingId ? 'Update Existing Item' : 'Add To Shop Catalog'}</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="min-h-[180px] bg-black rounded-2xl p-4 border border-white/5 overflow-hidden">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-[3/4] group border border-white/10 rounded-xl overflow-hidden bg-neutral-900">
                      <img src={src} className="h-full w-full object-cover" alt="Preview" />
                      <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full z-10"><X size={10} /></button>
                      {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-red-800 text-[6px] font-black uppercase text-center py-1">Main Cover</div>}
                    </div>
                  ))}
                  <button type="button" onClick={() => fileInputRef.current.click()} className="aspect-[3/4] bg-neutral-900 rounded-xl flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-red-800 transition-all">
                    <Plus size={20} className="text-neutral-500" />
                  </button>
                </div>
                <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setFormData(prev => ({...prev, imageFiles: [...prev.imageFiles, ...files]}));
                  setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                }} />
              </div>

              <input value={formData.video_url} onChange={(e) => setFormData({...formData, video_url: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/10 text-white outline-none focus:border-red-800 transition-all" placeholder="TikTok Link or ID" />
              <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/10 text-white outline-none focus:border-red-800 transition-all" placeholder="Product Name" required />
              <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/10 text-white outline-none min-h-[80px] focus:border-red-800 transition-all" placeholder="Product Details..." />
              
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={formData.badge} 
                  onChange={(e) => setFormData({...formData, badge: e.target.value})} 
                  className="w-full p-4 rounded-xl bg-black border border-white/10 text-neutral-400 outline-none focus:border-red-800 transition-all"
                >
                  <option value="">No Badge</option>
                  <option value="New Arrival">New Arrival</option>
                  <option value="Best Seller">Best Seller</option>
                  <option value="Hot">Hot</option>
                  <option value="Sale">Sale</option>
                  <option value="Limited">Limited</option>
                </select>
                <select 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})} 
                  className="w-full p-4 rounded-xl bg-black border border-white/10 text-neutral-400 outline-none focus:border-red-800 transition-all" 
                  required
                >
                  <option value="">Category</option>
                  {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/10 text-white outline-none focus:border-red-800 transition-all" placeholder="Price (BDT)" required />

              <button type="submit" className="w-full bg-red-800 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-all">{status || (editingId ? "Save Changes" : "Post Product")}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', price:'', category:'', badge:'', imageFiles:[], video_url:'', description:''}); setPreviews([]); }} className="w-full py-2 text-neutral-500 font-black text-[10px] uppercase">Cancel Edit</button>}
            </form>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.filter(p => activeCategory === "All" || p.category === activeCategory).map(p => (
            <div 
              key={p.id} 
              onMouseEnter={() => setHoveredProductId(p.id)}
              onMouseLeave={() => setHoveredProductId(null)}
              onClick={() => { if(!isAdminView) { setSelectedProduct(p); setIsPlaying(!!p.video_url); } }} 
              className="bg-neutral-900/30 rounded-[2.5rem] p-3 relative cursor-pointer border border-transparent hover:border-white/5 transition-all group"
            >
              <div className="aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-3 relative">
                {p.badge && (
                  <div className="absolute top-3 left-3 z-20 bg-red-700 text-white text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg italic tracking-tighter">
                    {p.badge}
                  </div>
                )}
                {hoveredProductId === p.id && p.video_url ? (
                  <iframe src={getEmbedUrl(p.video_url, true)} className="w-full h-full border-0 pointer-events-none scale-[1.5]" />
                ) : p.image_url ? (
                  <img src={p.image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900"><Play fill="white" size={30} className="opacity-20" /></div>
                )}
                {p.video_url && <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity"><div className="bg-red-700/90 p-3 rounded-full"><Play fill="white" size={18} className="text-white ml-0.5" /></div></div>}
              </div>
              <div className="px-1 text-center">
                <h4 className="font-bold text-[10px] uppercase truncate text-neutral-300">{p.name}</h4>
                <p className="text-red-700 font-black text-[10px] italic">{p.price} BDT</p>
              </div>
              {isAdmin && isAdminView && (
                <div className="absolute top-4 right-4 flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="bg-black/90 p-2 rounded-full text-blue-500 border border-white/5 hover:bg-white"><Edit3 size={14} /></button>
                   <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Delete?")) supabase.from('products').delete().eq('id', p.id).then(() => window.location.reload()); }} className="bg-black/90 p-2 rounded-full text-red-900 border border-white/5 hover:bg-white"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-24 pt-16 border-t border-white/5 text-center pb-32 relative z-10">
          <h3 className="text-neutral-500 font-black text-[10px] uppercase tracking-[0.6em] mb-12 italic opacity-60">Connect With Us</h3>
          <div className="flex justify-center gap-8 mb-16 px-4">
            <a href={CONTACT.facebook} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-lg transition-all group-hover:bg-[#1877F2] group-hover:-translate-y-1"><Facebook size={22} className="text-[#1877F2] group-hover:text-white" /></div>
              <span className="text-[7px] font-black uppercase text-neutral-600">Facebook</span>
            </a>
            <a href={CONTACT.instagram} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-lg transition-all group-hover:bg-[#E4405F] group-hover:-translate-y-1"><Instagram size={22} className="text-[#E4405F] group-hover:text-white" /></div>
              <span className="text-[7px] font-black uppercase text-neutral-600">Instagram</span>
            </a>
            <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-lg transition-all group-hover:bg-[#25D366] group-hover:-translate-y-1"><MessageCircle size={22} className="text-[#25D366] group-hover:text-white" /></div>
              <span className="text-[7px] font-black uppercase text-neutral-600">WhatsApp</span>
            </a>
            <a href={CONTACT.tiktok} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-lg transition-all group-hover:bg-white group-hover:-translate-y-1"><Music2 size={22} className="text-white group-hover:text-black" /></div>
              <span className="text-[7px] font-black uppercase text-neutral-600">TikTok</span>
            </a>
          </div>
          <div className="space-y-3 text-neutral-700 font-bold uppercase tracking-widest text-center">
            <p className="text-[8px]">Engineered by <span className="text-red-700">Zihad</span> for Big Bazar</p>
            <p className="text-[6px]">Bariarhat, Chattogram • 2025</p>
          </div>
        </div>
      </div>

      {selectedProduct && !isAdminView && (
        <div className="fixed inset-0 bg-black/98 z-[500] flex items-center justify-center p-4 backdrop-blur-xl overflow-y-auto">
          <div className="bg-neutral-950 border border-white/5 rounded-[3rem] max-w-sm w-full my-auto overflow-hidden relative shadow-2xl">
            <button onClick={() => { setSelectedProduct(null); setIsPlaying(false); setEmbedUrl(null); }} className="absolute top-6 right-6 z-[60] bg-black/50 text-white p-2 rounded-full hover:bg-red-700 transition-all"><X size={22}/></button>
            <div className="h-[400px] w-full bg-black relative flex items-center justify-center overflow-hidden">
                {selectedProduct.video_url && isPlaying && embedUrl ? (
                  <iframe src={embedUrl} className="w-full h-full border-0 scale-[1.06]" allow="autoplay; encrypted-media" />
                ) : (
                  <img src={selectedProduct.image_url || "/api/placeholder/400/600"} className="w-full h-full object-contain p-4" alt="" />
                )}
            </div>
            <div className="p-8 text-center bg-neutral-950/80">
              <h2 className="text-xl font-black text-white mb-1 uppercase italic tracking-tighter">{selectedProduct.name}</h2>
              <p className="text-red-700 font-black text-lg mb-4">{selectedProduct.price} BDT</p>
              {selectedProduct.description && (
                <p className="text-neutral-400 text-[10px] mb-6 leading-relaxed uppercase font-bold whitespace-pre-line">
                  {selectedProduct.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <button onClick={() => sendOrder('whatsapp', selectedProduct)} className="bg-[#25D366] text-white py-4 rounded-[1.2rem] font-black text-[10px] uppercase">WhatsApp</button>
                <button onClick={() => sendOrder('messenger', selectedProduct)} className="bg-[#0084FF] text-white py-4 rounded-[1.2rem] font-black text-[10px] uppercase">Messenger</button>
              </div>

              <h4 className="text-[8px] font-black text-neutral-100 uppercase tracking-widest mb-4">Related Items</h4>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4">
                {products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).map(rp => (
                  <div key={rp.id} onClick={() => { setSelectedProduct(rp); setEmbedUrl(null); }} className="min-w-[80px] cursor-pointer">
                    <img src={rp.image_url} className="w-20 h-20 object-cover rounded-xl mb-1 opacity-60 hover:opacity-100 transition-opacity" alt="" />
                    <p className="text-[6px] font-bold text-neutral-500 truncate">{rp.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}