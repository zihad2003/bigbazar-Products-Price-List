import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, LogOut, Package, Image as ImageIcon, Search, LayoutDashboard, ShoppingBag, Upload, Edit, X, Play, Menu, Check } from 'lucide-react';
import { resolveTikTokUrl } from '../utils/tiktok';
import ConfirmationModal from '../components/ConfirmationModal';
import UndoToast from '../components/UndoToast';

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', original_price: '', description: '', images: [], video_url: '', is_sale: false, is_hot: false, is_new: false, is_sold_out: false, category: 'Women' });
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [flashSale, setFlashSale] = useState({ active: false, percentage: 0, end_time: null, duration: 24 });
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null });
  const [undoState, setUndoState] = useState({ isActive: false, productId: null });
  const [contactInfo, setContactInfo] = useState({ whatsapp: '', facebook: '', tiktok: '', instagram: '' });
  const [heroBanner, setHeroBanner] = useState({ active: false, text: '', subtext: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    fetchProducts();
    fetchFlashSale();
    fetchBackEndSettings();
  }, []);

  // ... (fetchBackEndSettings, saveSettings) - keep exactly as is

  const fetchBackEndSettings = async () => {
    // Fetch Contact
    const { data: contactData } = await supabase.from('site_settings').select('value').eq('key', 'contact_info').single();
    if (contactData?.value) setContactInfo(contactData.value);

    // Fetch Hero Banner
    const { data: bannerData } = await supabase.from('site_settings').select('value').eq('key', 'hero_banner').single();
    if (bannerData?.value) setHeroBanner(bannerData.value);
  };

  const saveSettings = async () => {
    setLoading(true);

    // Save Contact Info
    const { error: contactError } = await supabase.from('site_settings').upsert({
      key: 'contact_info',
      value: contactInfo
    }, { onConflict: 'key' });

    // Save Hero Banner
    const { error: bannerError } = await supabase.from('site_settings').upsert({
      key: 'hero_banner',
      value: heroBanner
    }, { onConflict: 'key' });

    if (contactError || bannerError) {
      alert("Error saving settings: " + (contactError?.message || bannerError?.message));
    } else {
      alert("All settings saved successfully!");
    }
    setLoading(false);
  };


  const fetchFlashSale = async () => {
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'flash_sale').single();
    if (data?.value) {
      setFlashSale({ ...data.value, duration: 24 }); // Default duration if not saved
    }
  };

  const saveFlashSale = async (newSettings) => {
    setLoading(true);
    // Calculate end_time based on duration if activating
    let settingsToSave = { ...flashSale, ...newSettings };

    if (newSettings.active && !flashSale.active) {
      // activating
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + parseInt(settingsToSave.duration));
      settingsToSave.end_time = endDate.toISOString();
    } else if (!newSettings.active) {
      settingsToSave.end_time = null;
    }

    // Since we can't upsert seamlessly without ensuring row exists, we try insert first then update handled by logic or mapped ID?
    // We used key='flash_sale'.

    const payload = {
      key: 'flash_sale',
      value: {
        active: settingsToSave.active,
        percentage: parseInt(settingsToSave.percentage),
        end_time: settingsToSave.end_time
      }
    };

    const { error: upsertError } = await supabase.from('site_settings').upsert(payload, { onConflict: 'key' });

    if (upsertError) {
      alert("Error saving settings: " + upsertError.message + "\n\nIf the table 'site_settings' does not exist, please ask the developer to run the setup script.");
    } else {
      setFlashSale(settingsToSave);
      alert(settingsToSave.active ? "Flash Sale Activated!" : "Flash Sale Ended.");
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data || []);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else setSession(data.session);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    setLoading(true);
    const uploadedUrls = [];
    for (const file of files) {
      const path = `${Date.now()}-${file.name}`;
      const { data } = await supabase.storage.from('products').upload(path, file);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }
    }
    setForm({ ...form, images: [...form.images, ...uploadedUrls] });
    setLoading(false);
  };

  const startEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price,
      original_price: product.original_price || '',
      description: product.description,
      images: product.images || [],
      video_url: product.video_url || '',
      is_sale: product.is_sale || false,
      is_hot: product.is_hot || false,
      is_new: product.is_new || product.badge === 'New Arrival' || false,
      is_sold_out: product.is_sold_out || false,
      category: product.category || 'Women'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setForm({ name: '', price: '', original_price: '', description: '', images: [], video_url: '', is_sale: false, is_hot: false, is_new: false, is_sold_out: false, category: 'Women' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalVideoUrl = form.video_url;
    let autoThumbnail = null;

    if (finalVideoUrl) {
      // Resolve short links & get thumbnail in one go
      const tiktokData = await fetchTikTokData(finalVideoUrl);
      if (tiktokData) {
        if (tiktokData.canonical_url) finalVideoUrl = tiktokData.canonical_url;
        if (tiktokData.thumbnail) autoThumbnail = tiktokData.thumbnail;
      } else {
        // Fallback if fetchTikTokData fails (just resolve URL)
        const resolved = await resolveTikTokUrl(finalVideoUrl);
        if (resolved) finalVideoUrl = resolved;
      }
    }

    // Prepare images array - if no user upload, use TikTok thumbnail
    let finalImages = [...form.images];
    if (finalImages.length === 0 && autoThumbnail) {
      finalImages.push(autoThumbnail);
    }

    // Prepare data for Supabase
    const productData = {
      name: form.name,
      description: form.description,
      category: form.category,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      is_sale: form.is_sale,
      is_hot: form.is_hot,
      is_new: form.is_new,
      is_sold_out: form.is_sold_out,
      video_url: finalVideoUrl,
      images: finalImages, // Now saving the full array of images
      image_url: (finalImages && finalImages.length > 0) ? finalImages[0] : null // Keep for backward compatibility
    };

    let error;
    if (editingProduct) {
      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('products').insert([productData]);
      error = insertError;
    }

    if (error) alert(error.message);
    else {
      cancelEdit(); // Resets form and editing state
      fetchProducts();
    }
    setLoading(false);
  };

  const finalizeDelete = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Error deleting product: ' + error.message);
      fetchProducts();
    } else {
      fetchProducts();
    }
    // Only clear if the finalized ID matches the current undo state (to avoid race conditions if possible, though strict replace handles this)
    setUndoState(prev => prev.productId === id ? { isActive: false, productId: null } : prev);
  };

  const handleUndo = () => {
    setUndoState({ isActive: false, productId: null });
  };

  const executeDelete = async () => {
    if (!deleteConfirmation.id) return;

    // If there is currently an active undo, finalize it immediately before starting a new one
    if (undoState.isActive && undoState.productId) {
      await finalizeDelete(undoState.productId);
    }

    setUndoState({ isActive: true, productId: deleteConfirmation.id });
    setDeleteConfirmation({ isOpen: false, id: null });
  };

  const requestDelete = (id, e) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, id });
  };

  if (!session) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[url('/admin-bg.jpg')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      <form onSubmit={handleLogin} className="relative w-full max-w-md bg-black/50 p-12 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black italic tracking-tighter text-white mb-2">Admin Panel</h2>
          <p className="text-neutral-400 text-sm">Secure Access Required</p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[#ce112d] mb-2 block">Email Address</label>
            <input type="email" className="w-full bg-black/50 p-4 rounded-xl border border-white/10 text-white placeholder-neutral-600 focus:border-[#ce112d] focus:outline-none transition-colors" onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-[#ce112d] mb-2 block">Password</label>
            <input type="password" className="w-full bg-black/50 p-4 rounded-xl border border-white/10 text-white placeholder-neutral-600 focus:border-[#ce112d] focus:outline-none transition-colors" onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="w-full bg-gradient-to-r from-[#ce112d] to-red-800 py-4 rounded-xl font-bold uppercase tracking-widest text-white shadow-lg hover:shadow-red-900/40 transition-all active:scale-95 group">
            Unlock Dashboard
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex relative">
      {/* Mobile Menu Toggle - Overlay Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-[#ce112d] rounded-full shadow-2xl text-white"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar - Mobile Responsive */}
      <aside className={`w-64 border-r border-white/5 bg-black/95 backdrop-blur-xl fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8">
          <h1 className="text-2xl font-black italic tracking-tighter">
            <span className="text-white">BIG</span>
            <span className="text-[#ce112d]">BAZAR</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-[#ce112d] text-white shadow-lg shadow-red-900/20' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => { setActiveTab('promotions'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'promotions' ? 'bg-[#ce112d] text-white shadow-lg shadow-red-900/20' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}>
            <Package size={20} /> Flash Sale
          </button>
          <button onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-[#ce112d] text-white shadow-lg shadow-red-900/20' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={20} /> Settings
          </button>
          <button className="w-full flex items-center gap-3 p-4 rounded-xl text-sm font-bold text-neutral-400 hover:bg-white/5 hover:text-white transition-all">
            <ShoppingBag size={20} /> Orders <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full">Coming Soon</span>
          </button>
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 p-4 rounded-xl text-sm font-bold text-neutral-400 hover:bg-red-900/20 hover:text-red-500 transition-all">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-6 lg:p-12">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">Product Management</h2>
            <p className="text-neutral-400">Manage your inventory and live site content.</p>
          </div>
          <div className="flex items-center gap-4 bg-neutral-900/50 p-2 rounded-full border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ce112d] to-purple-600"></div>
            <span className="pr-4 text-sm font-bold text-white">Admin</span>
          </div>
        </header>

        {activeTab === 'settings' ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-neutral-900/50 backdrop-blur-md p-8 rounded-3xl border border-white/5">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black italic tracking-tighter mb-2">SITE <span className="text-[#ce112d]">SETTINGS</span></h2>
                <p className="text-neutral-400">Manage contact information and social links.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">WhatsApp Number</label>
                  <input value={contactInfo.whatsapp} placeholder="e.g. 8801..." className="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-white transition-colors" onChange={e => setContactInfo({ ...contactInfo, whatsapp: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Facebook Page ID</label>
                  <input value={contactInfo.facebook} placeholder="e.g. 1090..." className="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-white transition-colors" onChange={e => setContactInfo({ ...contactInfo, facebook: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">TikTok Profile Link</label>
                  <input value={contactInfo.tiktok} placeholder="https://tiktok.com/@..." className="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-white transition-colors" onChange={e => setContactInfo({ ...contactInfo, tiktok: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Instagram Profile Link</label>
                  <input value={contactInfo.instagram} placeholder="https://instagram.com/..." className="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-white transition-colors" onChange={e => setContactInfo({ ...contactInfo, instagram: e.target.value })} />
                </div>

                <div className="pt-8 border-t border-white/5">
                  <h3 className="text-xl font-bold mb-6 text-white italic">Hero <span className="text-[#ce112d]">Banner</span></h3>

                  <div className="bg-black/40 p-6 rounded-xl border border-white/10 mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">Activate Banner</h4>
                      <p className="text-[10px] text-neutral-500">Replaces "Exclusive Collection / Big Bazar" header text.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={heroBanner.active} onChange={e => setHeroBanner({ ...heroBanner, active: e.target.checked })} />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ce112d]"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Banner Headline</label>
                      <input value={heroBanner.text} placeholder="e.g. FLASH SALE" className="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-white transition-colors" onChange={e => setHeroBanner({ ...heroBanner, text: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Banner Subtext</label>
                      <input value={heroBanner.subtext} placeholder="e.g. 50% OFF" className="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-white transition-colors" onChange={e => setHeroBanner({ ...heroBanner, subtext: e.target.value })} />
                    </div>
                  </div>
                </div>

                <button onClick={saveSettings} disabled={loading} className="w-full py-4 bg-[#ce112d] hover:bg-[#a30d23] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-red-900/40 disabled:opacity-50">
                  {loading ? 'Saving Settings...' : 'Save All Settings'}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'promotions' ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-neutral-900/50 backdrop-blur-md p-8 rounded-3xl border border-white/5">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black italic tracking-tighter mb-2">FLASH <span className="text-[#ce112d]">SALE</span></h2>
                <p className="text-neutral-400">Run a store-wide sale for a limited time.</p>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-black/40 rounded-xl border border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white mb-1">Sale Status</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest ${flashSale.active ? 'text-green-500' : 'text-neutral-500'}`}>
                      {flashSale.active ? 'Active & Running' : 'Inactive'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={flashSale.active} onChange={e => saveFlashSale({ active: e.target.checked })} />
                    <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ce112d]"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Discount Percentage</label>
                    <div className="relative">
                      <input type="number" value={flashSale.percentage} min="0" max="100" className="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-xl font-bold transition-colors text-center" onChange={e => setFlashSale({ ...flashSale, percentage: e.target.value })} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Duration (Hours)</label>
                    <div className="relative">
                      <input type="number" value={flashSale.duration} min="1" className="w-full bg-black/40 p-4 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-xl font-bold transition-colors text-center" onChange={e => setFlashSale({ ...flashSale, duration: e.target.value })} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">HR</span>
                    </div>
                  </div>
                </div>

                {flashSale.active && flashSale.end_time && (
                  <div className="text-center p-4 bg-[#ce112d]/10 rounded-xl border border-[#ce112d]/20">
                    <p className="text-[#ce112d] text-xs font-bold uppercase tracking-widest mb-1">Ends At</p>
                    <p className="text-white font-mono text-lg">{new Date(flashSale.end_time).toLocaleString()}</p>
                  </div>
                )}

                <button onClick={() => saveFlashSale({ active: true })} disabled={flashSale.active} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {flashSale.active ? 'Update Settings' : 'Start Flash Sale'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

            {/* Product Form */}
            <div className="xl:col-span-1">
              <form onSubmit={handleSubmit} className="bg-neutral-900/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 sticky top-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${editingProduct ? 'bg-blue-500/10 text-blue-500' : 'bg-[#ce112d]/10 text-[#ce112d]'}`}>
                      {editingProduct ? <Edit size={20} /> : <Plus size={20} />}
                    </div>
                    <h3 className="font-bold text-lg">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                  </div>
                  {editingProduct && (
                    <button type="button" onClick={cancelEdit} className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white transition-colors flex items-center gap-1">
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Upload Media</label>
                    <div className="grid grid-cols-2 gap-3">
                      {form.images.map((url, i) => <img key={i} src={url} className="w-full aspect-square object-cover rounded-xl border border-white/10" alt="Preview" />)}
                      <label className={`aspect-square bg-black/40 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#ce112d] hover:bg-[#ce112d]/5 transition-all group ${form.images.length === 0 ? 'col-span-2 aspect-[2/1]' : ''}`}>
                        <Upload className="text-neutral-600 group-hover:text-[#ce112d] mb-2" />
                        <span className="text-xs text-neutral-500 group-hover:text-neutral-300">Click to upload</span>
                        <input type="file" multiple className="hidden" onChange={handleUpload} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Product Name</label>
                    <input required value={form.name} className="w-full bg-black/40 p-3 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-sm transition-colors" onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Price (BDT)</label>
                      <input required type="number" value={form.price} className="w-full bg-black/40 p-3 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-sm transition-colors" onChange={e => setForm({ ...form, price: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Regular Price</label>
                      <input type="number" placeholder="Optional" value={form.original_price} className="w-full bg-black/40 p-3 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-sm transition-colors" onChange={e => setForm({ ...form, original_price: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-black/40 p-3 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-sm transition-colors text-neutral-300">
                      <option value="Women">Women</option>
                      <option value="Men">Men</option>
                      <option value="Kids (Boys)">Kids (Boys)</option>
                      <option value="Kids (Girls)">Kids (Girls)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Description</label>
                    <textarea required value={form.description} className="w-full bg-black/40 p-3 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-sm h-24 transition-colors" onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block">Video URL</label>
                    <input value={form.video_url} placeholder="TikTok / Facebook Link" className="w-full bg-black/40 p-3 rounded-xl border border-white/10 focus:border-[#ce112d] focus:outline-none text-sm transition-colors" onChange={e => setForm({ ...form, video_url: e.target.value })} />
                    <p className="text-[10px] text-neutral-600 mt-2">Try pasting a TikTok short link! We'll auto-resolve it.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {['is_sale', 'is_new', 'is_hot', 'is_sold_out'].map(key => (
                      <div
                        key={key}
                        onClick={() => setForm({ ...form, [key]: !form[key] })}
                        className={`
                          cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between group select-none
                          ${form[key]
                            ? 'bg-[#ce112d]/10 border-[#ce112d] shadow-[0_0_15px_rgba(206,17,45,0.1)]'
                            : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'}
                        `}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${form[key] ? 'text-[#ce112d]' : 'text-neutral-500 group-hover:text-neutral-300'}`}>
                          {key.replace('is_', '').replace('_', ' ')}
                        </span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${form[key] ? 'bg-[#ce112d] border-[#ce112d]' : 'border-white/20 group-hover:border-white/40'}`}>
                          {form[key] && <Check size={12} className="text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button disabled={loading} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed ${editingProduct ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-[#ce112d] hover:bg-[#a30d23] text-white'}`}>
                    {loading ? 'Processing...' : (editingProduct ? 'Save Changes' : 'Publish Product')}
                  </button>
                </div>
              </form>
            </div>

            {/* Product List */}
            <div className="xl:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <Package className="text-neutral-500" size={20} />
                  Inventory <span className="text-sm bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">{products.length}</span>
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                  <input placeholder="Search products..." className="pl-10 pr-4 py-2 bg-neutral-900 rounded-full border border-white/5 text-sm focus:border-white/20 focus:outline-none hover:bg-neutral-800 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.filter(p => !(undoState.isActive && p.id === undoState.productId)).map(p => (
                  <div key={p.id} className="group bg-neutral-900/30 hover:bg-neutral-900 border border-white/5 hover:border-white/10 p-3 rounded-2xl flex items-center gap-4 transition-all hover:scale-[1.01] hover:shadow-xl">
                    <div className="w-20 h-20 rounded-xl bg-black border border-white/5 overflow-hidden relative">
                      {p.images?.[0] || p.image_url ? (
                        <img src={p.images?.[0] || p.image_url} className="w-full h-full object-cover" alt={p.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                          <ImageIcon size={20} className="text-neutral-600" />
                        </div>
                      )}
                      {p.video_url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg">
                            <Play size={14} fill="white" className="text-white ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-white truncate pr-2">{p.name}</h4>
                        <span className="text-[#ce112d] font-black text-xs">{p.price} ৳</span>
                      </div>
                      <p className="text-neutral-500 text-xs line-clamp-2 mb-2">{p.description}</p>
                      <div className="flex gap-2">
                        {p.is_sale && <span className="text-[10px] font-bold uppercase bg-red-500/10 text-red-500 px-2 rounded-full">Sale</span>}
                        {p.category && <span className="text-[10px] font-bold uppercase bg-white/5 text-neutral-400 px-2 rounded-full">{p.category}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 self-center">
                      <button onClick={() => startEdit(p)} className="p-2 rounded-lg hover:bg-blue-500/10 text-neutral-600 hover:text-blue-500 transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={(e) => requestDelete(p.id, e)} className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-600 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
          onConfirm={executeDelete}
          title="Delete Product"
          message="Are you sure you want to remove this product?"
        />

        <UndoToast
          isOpen={undoState.isActive}
          message="Product moved to trash."
          onUndo={handleUndo}
          onComplete={() => finalizeDelete(undoState.productId)}
        />
      </main>
    </div >
  );
}