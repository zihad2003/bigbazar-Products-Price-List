import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Plus, Trash2, LogOut, Image as ImageIcon, Search,
  Settings, ShoppingBag, Edit, X, Play, Check,
  AlertCircle, Instagram, CheckCircle2, Clock, Upload, Save
} from 'lucide-react';
import { extractInstagramId, fetchInstagramData } from '../utils/instagram';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';
import VideoPlayer from '../components/VideoPlayer';

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'error' });

  const [form, setForm] = useState({
    name: '', price: '', original_price: '', description: '',
    images: [], video_url: '', is_sale: false, is_hot: false,
    is_new: false, is_sold_out: false, category: 'Women',
    status: 'pending', platform_id: '', serial_no: ''
  });

  const [siteSettings, setSiteSettings] = useState({
    hero_banner: { title: '', subtitle: '', image_url: '' },
    contact_info: { whatsapp: '', facebook: '', instagram: '' }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchProducts();
    fetchSiteSettings();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const fetchSiteSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*');
    const settings = {
      hero_banner: { title: '5% FLAT DISCOUNT', subtitle: 'FOR THE 10K FAMILY ON FACEBOOK PAGE', image_url: null },
      contact_info: { whatsapp: '', facebook: '', instagram: '' }
    };

    if (data) {
      const banner = data.find(s => s.key === 'hero_banner')?.value;
      const contact = data.find(s => s.key === 'contact_info')?.value;
      if (banner) settings.hero_banner = banner;
      if (contact) settings.contact_info = contact;
    }
    setSiteSettings(settings);
  };

  const handleVideoBlur = async () => {
    if (!form.video_url || (!form.video_url.includes('instagram.com') && !form.video_url.includes('instagr.am'))) return;
    setLoading(true);
    const data = await fetchInstagramData(form.video_url);
    if (data) {
      setForm(prev => ({
        ...prev,
        platform_id: data.platform_id,
        images: data.thumbnail ? [data.thumbnail] : prev.images,
        description: prev.description || data.caption
      }));
    } else {
      alert("Could not extract Instagram ID. Please check the URL format.");
    }
    setLoading(false);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Auto-increment Serial Number Calculation
    let finalSerialNo = form.serial_no;
    if (!editingProduct) {
      const maxSerial = products.reduce((max, p) => (p.serial_no > max ? p.serial_no : max), 0);
      finalSerialNo = maxSerial + 1;
    }

    const productData = {
      ...form,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      serial_no: parseInt(finalSerialNo)
    };

    let error;
    if (editingProduct) {
      const { error: err } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('products').insert([productData]);
      error = err;
    }

    if (error) {
      console.error("Detailed Error:", error);
      let message = "Oops! Something went wrong while saving the product.";
      let title = "Error!";

      if (error.message?.includes("duplicate key") || error.code === '23505') {
        title = "Duplicate Entry";
        message = "It looks like this product (or serial number) already exists in the system.";
      } else if (error.message?.includes("null value") || error.code === '23502') {
        title = "Missing Details";
        message = "Please make sure all required fields are filled in.";
      } else if (error.message?.includes("network")) {
        title = "Connection Error";
        message = "Network error. Please check your internet connection and try again.";
      }

      setAlertModal({ isOpen: true, title, message, type: 'error' });
    } else {
      setAlertModal({
        isOpen: true,
        title: "Success!",
        message: editingProduct ? "Product updated successfully!" : "New product added successfully!",
        type: 'success'
      });
      cancelEdit();
      fetchProducts();
    }
    setLoading(false);
  };

  const handleBannerUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('site_settings').upsert({ key: 'hero_banner', value: siteSettings.hero_banner }, { onConflict: 'key' });
    if (error) alert(error.message);
    else alert("Hero Banner Updated!");
    setLoading(false);
  };

  const handleFileUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `assets/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      alert("Upload failed. Make sure 'assets' bucket exists and is public.");
    } else {
      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      if (target === 'banner') {
        setSiteSettings({ ...siteSettings, hero_banner: { ...siteSettings.hero_banner, image_url: data.publicUrl } });
      } else {
        setForm({ ...form, images: [data.publicUrl] });
      }
    }
    setLoading(false);
  };

  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchProducts();
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setForm({
      name: '', price: '', original_price: '', description: '',
      images: [], video_url: '', is_sale: false, is_hot: false,
      is_new: false, is_sold_out: false, category: 'Women',
      status: 'pending', platform_id: '', serial_no: ''
    });
  };

  const startEdit = (p) => {
    setEditingProduct(p);
    setForm(p);
    setActiveTab('add');
  };

  if (!session) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <form onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAlertModal({
            isOpen: true,
            title: "Login Failed",
            message: error.message || "Invalid login credentials. Please try again.",
            type: "error"
          });
        }
      }} className="w-full max-w-md space-y-8 bg-neutral-950 p-10 rounded-3xl border border-white/5">
        <h2 className="text-3xl font-black italic text-center">ADMIN <span className="text-[#ce112d]">LOGIN</span></h2>
        <div className="space-y-4">
          <input type="email" placeholder="Email" className="w-full bg-black border border-white/5 p-4 rounded-xl" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full bg-black border border-white/5 p-4 rounded-xl" onChange={e => setPassword(e.target.value)} />
          <button className="w-full bg-[#ce112d] py-4 rounded-xl font-black uppercase tracking-widest">Enter Dashboard</button>
        </div>
      </form>

      {/* Alert Modal for Login failures */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 border-r border-white/5 p-6 space-y-8">
        <div className="flex items-center gap-3">
          <ShoppingBag className="text-[#ce112d]" />
          <h1 className="text-xl font-black italic">BIG<span className="text-[#ce112d]">BAZAR</span></h1>
        </div>
        <nav className="space-y-2">
          {['pending', 'published', 'add', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full flex items-center gap-3 p-4 rounded-xl uppercase text-[10px] font-black tracking-widest transition-all ${activeTab === tab ? 'bg-[#ce112d] shadow-lg shadow-red-900/20' : 'hover:bg-white/5 text-neutral-500'}`}>
              {tab === 'add' ? <Plus size={16} /> : tab === 'settings' ? <Settings size={16} /> : tab === 'pending' ? <Clock size={16} /> : <CheckCircle2 size={16} />}
              {tab}
            </button>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 p-4 text-neutral-600 hover:text-white transition-all">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto no-scrollbar">
        {activeTab === 'settings' ? (
          <div className="max-w-2xl space-y-12">
            <div>
              <h2 className="text-3xl font-black italic uppercase">Site <span className="text-[#ce112d]">Settings</span></h2>
              <p className="text-neutral-500 text-xs mt-2 uppercase font-bold tracking-widest">Manage Banner & Announcements</p>
            </div>

            <form onSubmit={handleBannerUpdate} className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">Hero Banner Background (.png / .jpg)</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 bg-neutral-900 rounded-xl overflow-hidden border border-white/5">
                    {siteSettings.hero_banner.image_url && <img src={siteSettings.hero_banner.image_url} className="w-full h-full object-cover" />}
                  </div>
                  <label className="cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-[10px] font-black uppercase border border-white/10 flex items-center gap-2">
                    <Upload size={14} /> Change Image
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'banner')} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest mb-2 block">Banner Title</label>
                  <input value={siteSettings.hero_banner.title} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" onChange={e => setSiteSettings({ ...siteSettings, hero_banner: { ...siteSettings.hero_banner, title: e.target.value } })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 tracking-widest mb-2 block">Banner Subtitle</label>
                  <input value={siteSettings.hero_banner.subtitle} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" onChange={e => setSiteSettings({ ...siteSettings, hero_banner: { ...siteSettings.hero_banner, subtitle: e.target.value } })} />
                </div>
              </div>

              <button className="flex items-center gap-2 bg-[#ce112d] px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all">
                <Save size={18} /> Update Banner
              </button>
            </form>
          </div>
        ) : activeTab === 'add' ? (
          <form onSubmit={handleProductSubmit} className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <h2 className="text-3xl font-black italic uppercase">{editingProduct ? 'Edit' : 'New'} <span className="text-[#ce112d]">Product</span></h2>
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Video URL (Instagram)</label>
                <input value={form.video_url} onBlur={handleVideoBlur} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" placeholder="https://..." onChange={e => setForm({ ...form, video_url: e.target.value })} />
              </div>
              <div className="aspect-[9/16] bg-neutral-950 rounded-3xl overflow-hidden border border-white/5 relative">
                <VideoPlayer src={form.video_url} priority={true} />
              </div>
            </div>
            <div className="space-y-6 pt-12">
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Price</label>
                <input value={form.price} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Name</label>
                <input value={form.name} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Description / Customer Details</label>
                <textarea rows="4" value={form.description} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl resize-none" placeholder="Enter product details..." onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Category</label>
                <select value={form.category} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option>Men</option>
                  <option>Women</option>
                  <option>Kids (Boys)</option>
                  <option>Kids (Girls)</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button className="flex-1 bg-[#ce112d] py-4 rounded-2xl font-black uppercase tracking-widest">Save {editingProduct ? 'Changes' : 'Product'}</button>
                <button type="button" onClick={cancelEdit} className="px-6 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">Cancel</button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-12">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black italic uppercase">{activeTab} <span className="text-[#ce112d]">Feed</span></h2>
                <p className="text-neutral-500 text-xs mt-2 uppercase font-bold tracking-widest">{products.filter(p => p.status === activeTab).length} Items Loaded</p>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-neutral-950 border border-white/5 pl-10 pr-4 py-2 rounded-full text-xs" placeholder="Search..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.filter(p => p.status === activeTab && p.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                // Dynamic thumbnail logic to ensure preview shows in Admin
                let displayImage = p.image_url || p.images?.[0];
                if (!displayImage && p.video_url) {
                  const match = p.video_url.match(/\/(reels|reel|p)\/([a-zA-Z0-9_-]+)/);
                  const id = match ? match[2] : null;
                  if (id) displayImage = `https://images.weserv.nl/?url=instagram.com/p/${id}/media/?size=l`;
                }
                // Fallback
                if (!displayImage || displayImage.includes('via.placeholder')) {
                  displayImage = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&q=80&w=1000';
                }

                return (
                  <div key={p.id} className="group bg-neutral-950 border border-white/5 rounded-3xl overflow-hidden hover:border-[#ce112d]/40 transition-all">
                    <div className="aspect-[9/16] bg-black relative">
                      <img src={displayImage} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-all duration-700" loading="lazy" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                        {/* Play/Preview Button */}
                        <button
                          onClick={() => setPreviewVideo(p.video_url)}
                          className="bg-white text-black p-4 rounded-full shadow-xl hover:scale-110 transition-transform"
                        >
                          <Play size={20} fill="currentColor" />
                        </button>
                        <button onClick={() => startEdit(p)} className="bg-[#ce112d] p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"><Edit size={20} /></button>
                      </div>
                      <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-[10px] font-black text-[#ce112d]">#{p.serial_no}</div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold truncate max-w-[150px]">{p.name}</h4>
                        <p className="text-[#ce112d] font-black">৳{p.price}</p>
                      </div>
                      <div className="flex gap-2">
                        {activeTab === 'pending' && (
                          <button onClick={() => supabase.from('products').update({ status: 'published' }).eq('id', p.id).then(fetchProducts)} className="flex-1 bg-[#ce112d] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                            Publish Now
                          </button>
                        )}
                        {activeTab === 'published' && (
                          <button onClick={() => supabase.from('products').update({ status: 'pending' }).eq('id', p.id).then(fetchProducts)} className="flex-1 bg-neutral-800 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                            Unpublish
                          </button>
                        )}
                        <button onClick={() => deleteProduct(p.id)} className="p-3 border border-white/5 rounded-xl hover:bg-red-900/20 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewVideo(null)}>
          <div className="relative w-full max-w-sm bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
            >
              <X size={20} />
            </button>
            <div className="aspect-[9/16]">
              <VideoPlayer src={previewVideo} isActive={true} priority={true} />
            </div>
          </div>
        </div>
      )}
      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
