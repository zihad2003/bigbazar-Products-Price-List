import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Plus, Trash2, Image as ImageIcon, Loader2, MessageCircle, 
  Facebook, Instagram, Music2, X, Lock, LogOut, Check, Tag, 
  PlayCircle, Edit3, Play 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- DATABASE INITIALIZATION ---
const supabaseUrl = 'https://dgdjjyxjnpzqqofdqxdp.supabase.co';
const supabaseAnonKey = 'sb_publishable_cjsjwayzjMDQLS98ra5gtA_H0jqjXbg';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- VIDEO PLAYER PARSER ---
const getEmbedUrl = (url) => {
  if (!url) return null;
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&t=0&autoplay=1`;
  }
  if (url.includes('tiktok.com')) {
    const videoId = url.match(/\/video\/(\d+)/)?.[1];
    return videoId ? `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1&rel=0&controls=0&loop=1` : null;
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
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const ADMIN_PASSWORD = "zihad2025";
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('bb_admin_auth') === 'true');
  const [passInput, setPassInput] = useState("");

  const params = new URLSearchParams(window.location.search);
  const currentView = params.get('view');
  const isAdminView = currentView === 'admin';

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setProducts(data || []);
    } catch (err) {
      console.error("Database Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!isAdmin || !formData.name || !formData.price || !formData.category) {
      alert("Please fill Name, Price, and Category");
      return;
    }
    
    try {
      setStatus("Syncing...");
      let imageUrls = editingId ? [...previews] : [];

      if (formData.imageFiles.length > 0) {
        for (const file of formData.imageFiles) {
          const fileName = `${Date.now()}-${file.name}`;
          await supabase.storage.from('product-images').upload(fileName, file);
          const url = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
          imageUrls.push(url);
        }
      }

      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        badge: formData.badge,
        video_url: formData.video_url,
        description: formData.description,
        image_url: imageUrls[0] || null,
        gallery: imageUrls
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([productData]);
        if (error) throw error;
      }
      
      alert("Success!");
      window.location.reload();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setStatus("");
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category,
      badge: product.badge || '',
      video_url: product.video_url || '',
      description: product.description || '',
      imageFiles: []
    });
    setPreviews(product.gallery || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sendOrder = (platform, product) => {
    const message = `🛍️ *NEW ORDER: BIG BAZAR* 🛍️\n\n📌 *Product:* ${product.name}\n💰 *Price:* ${product.price} BDT\n\n🖼️ *Photo:* ${product.image_url}`;
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => { setCopied(false); window.open(CONTACT.messenger, '_blank'); }, 1000);
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
            } else { alert("Wrong Password"); }
          }} className="space-y-4">
            <input type="password" value={passInput} onChange={(e) => setPassInput(e.target.value)} className="w-full p-4 rounded-xl bg-black text-white text-center outline-none border border-white/10" placeholder="Password" />
            <button type="submit" className="w-full bg-red-800 text-white font-black py-4 rounded-xl uppercase tracking-widest">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="pt-12 pb-6 px-6 bg-black sticky top-0 z-[100] border-b border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <h1 className="text-4xl font-black tracking-tighter italic uppercase">BIG<span className="text-red-700">BAZAR</span></h1>
          <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar w-full justify-center">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase transition-all ${activeCategory === cat ? 'bg-red-800 text-white shadow-lg' : 'bg-neutral-900 text-neutral-500 hover:text-white'}`}>{cat}</button>
            ))}
          </div>
          {isAdmin && isAdminView && (
            <button onClick={() => { setIsAdmin(false); localStorage.removeItem('bb_admin_auth'); }} className="mt-4 text-neutral-600 hover:text-red-600 flex items-center gap-1 text-[10px] font-bold uppercase"><LogOut size={12}/> Logout</button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 pb-48">
        {isAdmin && isAdminView && (
          <div className="bg-neutral-900/50 rounded-[2.5rem] p-8 mb-20 max-w-xl mx-auto border border-white/5 shadow-2xl">
            <h2 className="text-red-700 font-black uppercase text-xs mb-8 flex items-center gap-2 tracking-[0.3em] justify-center">
              <Tag size={14}/> {editingId ? 'Update Product' : 'Add To Catalog'}
            </h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div onClick={() => fileInputRef.current.click()} className="min-h-[150px] bg-black rounded-2xl flex flex-wrap gap-2 p-4 items-center justify-center cursor-pointer border border-white/5 hover:border-red-900/50 transition-all">
                 {previews.length > 0 ? previews.map((src, i) => (<img key={i} src={src} className="h-20 w-20 object-cover rounded-lg" alt="Preview" />)) : <div className="text-center text-neutral-600"><Camera size={32} className="mx-auto mb-2" /><p className="text-[10px] font-bold uppercase">Click to add photos</p></div>}
                 <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => {
                   const files = Array.from(e.target.files);
                   setFormData({...formData, imageFiles: files});
                   setPreviews(files.map(f => URL.createObjectURL(f)));
                 }} />
              </div>
              <input value={formData.video_url} onChange={(e) => setFormData({...formData, video_url: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/5 text-white outline-none" placeholder="TikTok / FB Reel URL" />
              <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/5 text-white outline-none" placeholder="Product Name" />
              <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/5 text-white outline-none min-h-[80px]" placeholder="Product Description" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/5 text-white outline-none" placeholder="Price (BDT)" />
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full p-4 rounded-xl bg-black border border-white/5 text-neutral-400 outline-none">
                  <option value="">Select Category</option>
                  {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-red-800 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg">{status || (editingId ? "Update Data" : "Post Product")}</button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(activeCategory === "All" ? products : products.filter(p => p.category === activeCategory)).map(product => (
            <div key={product.id} 
                 onClick={() => { if(!isAdminView) { setSelectedProduct(product); setIsPlaying(!!product.video_url); } }} 
                 className={`group bg-neutral-900/30 rounded-[2.5rem] p-3 border border-transparent transition-all relative ${!isAdminView ? 'hover:bg-neutral-900/50 cursor-pointer' : ''}`}>
              <div className="aspect-square bg-black rounded-2xl overflow-hidden mb-3 relative">
                <img src={product.image_url} className="w-full h-full object-contain" alt={product.name} />
                {product.video_url && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-700/90 p-3 rounded-full shadow-2xl border border-white/10 group-hover:scale-110 transition-transform"><Play fill="white" size={18} className="text-white ml-0.5" /></div>
                  </div>
                )}
              </div>
              <div className="px-1 text-center">
                <h4 className="font-bold text-neutral-300 text-[10px] uppercase truncate mb-0.5">{product.name}</h4>
                <p className="text-red-700 font-black text-[10px] italic">{product.price} BDT</p>
              </div>
              {isAdmin && isAdminView && (
                <div className="absolute top-4 right-4 flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="bg-black/90 p-2 rounded-full text-neutral-400 border border-white/5 shadow-lg"><Edit3 size={14} /></button>
                   <button onClick={(e) => { e.stopPropagation(); if(window.confirm("Delete?")) supabase.from('products').delete().eq('id', product.id).then(() => window.location.reload()); }} className="bg-black/90 p-2 rounded-full text-red-900 border border-white/5 shadow-lg"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-24 pt-16 border-t border-white/5 text-center pb-32 relative z-10">
          <h3 className="text-neutral-500 font-black text-[10px] uppercase tracking-[0.6em] mb-12 italic opacity-60">Connect With Us</h3>
          <div className="flex justify-center gap-8 mb-16 px-4">
            <a href={CONTACT.facebook} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group outline-none cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-lg transition-all duration-300 group-hover:bg-[#1877F2] group-hover:shadow-[0_0_20px_rgba(24,119,242,0.4)] group-hover:-translate-y-1 group-active:scale-90">
                <Facebook size={22} className="text-[#1877F2] group-hover:text-white transition-colors duration-300" />
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-white transition-colors">Facebook</span>
            </a>
            <a href={CONTACT.instagram} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group outline-none cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-lg transition-all duration-300 group-hover:bg-[#E4405F] group-hover:shadow-[0_0_20px_rgba(228,64,95,0.4)] group-hover:-translate-y-1 group-active:scale-90">
                <Instagram size={22} className="text-[#E4405F] group-hover:text-white transition-colors duration-300" />
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-white transition-colors">Instagram</span>
            </a>
            <a href={CONTACT.tiktok} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 group outline-none cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center border border-white/5 shadow-lg transition-all duration-300 group-hover:bg-white group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:-translate-y-1 group-active:scale-90">
                <Music2 size={22} className="text-white group-hover:text-black transition-colors duration-300" />
              </div>
              <span className="text-[7px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-white transition-colors">TikTok</span>
            </a>
          </div>
          <div className="space-y-3">
            <p className="text-[8px] font-black uppercase tracking-[0.5em] text-neutral-700 flex items-center justify-center gap-2">Engineered by <span className="text-red-700">Zihad</span> for Big Bazar</p>
            <p className="text-[6px] font-bold uppercase tracking-[0.3em] text-neutral-100/90">Bariarhat, Chattogram • 2025</p>
          </div>
        </div>
      </div>

      {selectedProduct && !isAdminView && (
        <div className="fixed inset-0 bg-black/98 z-[500] flex items-center justify-center p-4 backdrop-blur-xl transition-all duration-500">
          <div className="bg-neutral-950 border border-white/5 rounded-[3rem] max-w-sm w-full overflow-hidden relative shadow-2xl">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 z-[60] bg-black/50 text-white p-2 rounded-full hover:bg-red-700 transition-all"><X size={22}/></button>
            <div className="h-[520px] w-full bg-black relative flex items-center justify-center overflow-hidden">
                {selectedProduct.video_url && isPlaying ? (
                  <div className="w-full h-full scale-[1.06]">
                    <iframe src={getEmbedUrl(selectedProduct.video_url)} className="w-full h-full border-0" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
                  </div>
                ) : (
                  <img src={selectedProduct.image_url} className="w-full h-full object-contain" alt="Product" />
                )}
            </div>
            <div className="p-8 text-center bg-neutral-950/80 backdrop-blur-md">
              <h2 className="text-xl font-black text-white mb-1 uppercase italic tracking-tighter leading-tight">{selectedProduct.name}</h2>
              <p className="text-red-700 font-black text-lg mb-6 shadow-sm tracking-wide">{selectedProduct.price} BDT</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => sendOrder('whatsapp', selectedProduct)} className="bg-[#25D366] text-white py-4 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">WhatsApp</button>
                <button onClick={() => sendOrder('messenger', selectedProduct)} className="bg-[#0084FF] text-white py-4 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">Messenger</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}