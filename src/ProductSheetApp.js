import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Trash2, Loader2, Facebook, Instagram, Music2, 
  X, Lock, LogOut, Tag, Edit3, Play 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- INITIALIZATION ---
const supabaseUrl = 'https://dgdjjyxjnpzqqofdqxdp.supabase.co';
const supabaseAnonKey = 'sb_publishable_cjsjwayzjMDQLS98ra5gtA_H0jqjXbg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- VIDEO PLAYER PARSER (CSP SAFE) ---
const getEmbedUrl = (url) => {
  if (!url) return null;
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    // We use the official plugins/video.php endpoint which is iframe-safe
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&t=0&autoplay=1`;
  }
  if (url.includes('tiktok.com')) {
    const videoId = url.match(/\/video\/(\d+)/)?.[1];
    // v2 embed is cleaner and works with standard frame-src policies
    return videoId ? `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1` : null;
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
  const [formData, setFormData] = useState({ 
    name: '', price: '', category: '', badge: '', 
    imageFiles: [], video_url: '', description: '' 
  });
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // --- DYNAMIC SDK LOADER (CSP SAFE) ---
  useEffect(() => {
    // Safely inject Facebook SDK for any potential social plugins
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);
    }
  }, []);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Fetch Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!isAdmin || !formData.name || !formData.price || !formData.category) return;
    
    try {
      setStatus("Syncing...");
      let imageUrls = editingId ? [...previews] : [];

      if (formData.imageFiles.length > 0) {
        for (const file of formData.imageFiles) {
          const fileName = `${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          imageUrls.push(data.publicUrl);
        }
      }

      const productPayload = {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        badge: formData.badge,
        video_url: formData.video_url,
        description: formData.description,
        image_url: imageUrls[0] || null,
        gallery: imageUrls
      };

      const { error: dbError } = editingId 
        ? await supabase.from('products').update(productPayload).eq('id', editingId)
        : await supabase.from('products').insert([productPayload]);

      if (dbError) throw dbError;
      window.location.reload();
    } catch (error) {
      alert("System Error: " + error.message);
    } finally {
      setStatus("");
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      name: p.name, price: p.price, category: p.category, 
      badge: p.badge || '', video_url: p.video_url || '', 
      description: p.description || '', imageFiles: []
    });
    setPreviews(p.gallery || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sendOrder = (platform, product) => {
    const message = `🛍️ *NEW ORDER: BIG BAZAR*\n\n📌 *Product:* ${product.name}\n💰 *Price:* ${product.price} BDT\n\n🖼️ *Photo:* ${product.image_url}`;
    const encodedMsg = encodeURIComponent(message);
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodedMsg}`, '_blank');
    } else {
      navigator.clipboard.writeText(message).then(() => {
        window.open(CONTACT.messenger, '_blank');
      });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-red-700" size={40} />
    </div>
  );

  if (isAdminView && !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="bg-neutral-900 border border-white/5 p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl">
          <Lock className="text-red-600 mx-auto mb-6" size={40} />
          <h2 className="text-2xl font-black text-white italic uppercase mb-8">Admin Access</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            if(passInput === ADMIN_PASSWORD) {
              setIsAdmin(true);
              localStorage.setItem('bb_admin_auth', 'true');
            } else { alert("Unauthorized"); }
          }} className="space-y-4">
            <input 
              name="password"
              type="password" 
              value={passInput} 
              onChange={(e) => setPassInput(e.target.value)} 
              className="w-full p-4 rounded-xl bg-black text-white text-center border border-white/10 outline-none" 
              placeholder="Enter Password" 
            />
            <button type="submit" className="w-full bg-red-800 text-white font-black py-4 rounded-xl uppercase tracking-widest">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  const filteredProducts = activeCategory === "All" ? products : products.filter(p => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="pt-12 pb-6 px-6 bg-black sticky top-0 z-[100] border-b border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <h1 className="text-4xl font-black tracking-tighter italic uppercase">BIG<span className="text-red-700">BAZAR</span></h1>
          <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar w-full justify-center">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase transition-all flex-shrink-0 ${activeCategory === cat ? 'bg-red-800 text-white shadow-lg' : 'bg-neutral-900 text-neutral-500'}`}>{cat}</button>
            ))}
          </div>
          {isAdmin && isAdminView && (
            <button onClick={() => { setIsAdmin(false); localStorage.removeItem('bb_admin_auth'); }} className="mt-4 text-neutral-600 text-[10px] uppercase font-bold flex items-center gap-1 hover:text-red-600 transition-colors"><LogOut size={12}/> Logout</button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 pb-48 text-center">
        {isAdmin && isAdminView && (
          <div className="bg-neutral-900/50 rounded-[2.5rem] p-8 mb-20 max-w-xl mx-auto border border-white/5 shadow-2xl">
            <h2 className="text-red-700 font-black uppercase text-xs mb-8 flex items-center justify-center gap-2 tracking-[0.3em]"><Tag size={14}/> {editingId ? 'Modify' : 'Add To Catalog'}</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div onClick={() => fileInputRef.current?.click()} className="min-h-[150px] bg-black rounded-2xl flex flex-wrap gap-2 p-4 items-center justify-center cursor-pointer border border-white/5">
                 {previews.length > 0 ? previews.map((src, i) => (<img key={i} src={src} className="h-20 w-20 object-cover rounded-lg border border-white/10" alt="" />)) : <div className="text-center text-neutral-600"><Camera size={32} className="mx-auto mb-2" /><p className="text-[10px] font-bold uppercase">Photos</p></div>}
                 <input name="file_upload" type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => {
                   const files = Array.from(e.target.files || []);
                   setFormData(prev => ({...prev, imageFiles: files}));
                   setPreviews(files.map(f => URL.createObjectURL(f)));
                 }} />
              </div>
              <input name="video_url" value={formData.video_url} onChange={(e) => setFormData(prev => ({...prev, video_url: e.target.value}))} className="w-full p-4 rounded-xl bg-black border border-white/10 text-white outline-none" placeholder="TikTok / FB Video URL" />
              <input name="product_name" value={formData.name} onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} className="w-full p-4 rounded-xl bg-black border border-white/10 text-white outline-none" placeholder="Name" required />
              <textarea name="description" value={formData.description} onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))} className="w-full p-4 rounded-xl bg-black border border-white/10 text-white outline-none min-h-[80px]" placeholder="Details" />
              <div className="grid grid-cols-2 gap-4">
                <input name="price" type="number" value={formData.price} onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))} className="w-full p-4 rounded-xl bg-black border border-white/10 text-white outline-none" placeholder="Price" required />
                <select name="category" value={formData.category} onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))} className="w-full p-4 rounded-xl bg-black border border-white/10 text-neutral-400 outline-none" required>
                  <option value="">Category</option>
                  {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-red-800 text-white font-black py-4 rounded-xl uppercase tracking-widest hover:bg-red-700 transition-colors">{status || "Publish"}</button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          {filteredProducts.map(p => (
            <div key={p.id} onClick={() => { if(!isAdminView) { setSelectedProduct(p); setIsPlaying(!!p.video_url); } }} className="group bg-neutral-900/30 rounded-[2.5rem] p-3 border border-transparent transition-all relative hover:bg-neutral-900/50 cursor-pointer">
              <div className="aspect-square bg-black rounded-2xl overflow-hidden mb-3 relative">
                <img src={p.image_url} className="w-full h-full object-contain" alt={p.name} loading="lazy" />
                {p.video_url && <div className="absolute inset-0 flex items-center justify-center"><div className="bg-red-700/90 p-3 rounded-full shadow-2xl group-hover:scale-110 transition-transform"><Play fill="white" size={18} className="text-white ml-0.5" /></div></div>}
                {p.badge && <div className="absolute top-3 left-3 bg-red-700 text-white text-[7px] font-black px-2 py-1 rounded-full uppercase shadow-md">{p.badge}</div>}
              </div>
              <div className="px-1">
                <h4 className="font-bold text-neutral-300 text-[10px] uppercase truncate mb-0.5 tracking-tight">{p.name}</h4>
                <p className="text-red-700 font-black text-[10px] italic">{p.price} BDT</p>
              </div>
              {isAdmin && isAdminView && (
                <div className="absolute top-4 right-4 flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); handleEdit(p); }} className="bg-black/90 p-2 rounded-full text-neutral-400 border border-white/5 hover:text-white transition-colors"><Edit3 size={14} /></button>
                   <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Delete?")) supabase.from('products').delete().eq('id', p.id).then(() => window.location.reload()); }} className="bg-black/90 p-2 rounded-full text-red-900 border border-white/5 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-24 pt-16 border-t border-white/5 text-center pb-32">
          <div className="flex justify-center gap-10 mb-16 px-4">
            <a href={CONTACT.facebook} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 transition-all group-hover:bg-[#1877F2] group-hover:-translate-y-1"><Facebook size={22} className="text-[#1877F2] group-hover:text-white transition-colors" /></div>
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-white">Facebook</span>
            </a>
            <a href={CONTACT.instagram} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 transition-all group-hover:bg-[#E4405F] group-hover:-translate-y-1"><Instagram size={22} className="text-[#E4405F] group-hover:text-white transition-colors" /></div>
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-white">Instagram</span>
            </a>
            <a href={CONTACT.tiktok} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 transition-all group-hover:bg-white group-hover:-translate-y-1"><Music2 size={22} className="text-white group-hover:text-black transition-colors" /></div>
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-white">TikTok</span>
            </a>
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-neutral-700">Engineered by <span className="text-red-700">Zihad</span> for Big Bazar • 2025</p>
        </div>
      </div>

      {selectedProduct && !isAdminView && (
        <div className="fixed inset-0 bg-black/98 z-[500] flex items-center justify-center p-4 backdrop-blur-2xl transition-all duration-300">
          <div className="bg-neutral-950 border border-white/5 rounded-[3rem] max-w-sm w-full overflow-hidden relative shadow-2xl">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 z-[60] bg-black/50 text-white p-2 rounded-full hover:bg-red-700 transition-all"><X size={22}/></button>
            <div className="h-[520px] w-full bg-black relative flex items-center justify-center overflow-hidden">
                {selectedProduct.video_url && isPlaying ? (
                  <div className="w-full h-full scale-[1.06]">
                    <iframe 
                      title="Product Showcase"
                      src={getEmbedUrl(selectedProduct.video_url)} 
                      className="w-full h-full border-0" 
                      allowFullScreen 
                      allow="autoplay; encrypted-media; picture-in-picture"
                    ></iframe>
                  </div>
                ) : (
                  <img src={selectedProduct.image_url} className="w-full h-full object-contain p-4" alt="" />
                )}
            </div>
            <div className="p-10 text-center bg-gradient-to-t from-black to-neutral-950">
              <h2 className="text-xl font-black text-white mb-1 uppercase italic tracking-tighter leading-tight">{selectedProduct.name}</h2>
              <p className="text-red-700 font-black text-lg mb-8 tracking-widest">{selectedProduct.price} BDT</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => sendOrder('whatsapp', selectedProduct)} className="bg-[#25D366] text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">WhatsApp</button>
                <button onClick={() => sendOrder('messenger', selectedProduct)} className="bg-[#0084FF] text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">Messenger</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}