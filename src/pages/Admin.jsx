import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Plus, Trash2, LogOut, Image as ImageIcon, Search,
  Settings, ShoppingBag, Edit, X, Play, Check,
  AlertCircle, Instagram, CheckCircle2, Clock, Upload, Save, Download
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
  const [activeTab, setActiveTab] = useState('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'error' });
  const [orders, setOrders] = useState([]);
  const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const [form, setForm] = useState({
    name: '', price: '', original_price: '', description: '',
    images: [], video_url: '', is_sale: false, is_hot: false,
    is_new: false, is_sold_out: false, category: 'Women',
    status: 'pending', platform_id: '', serial_no: '',
    available_sizes: [], available_colors: []
  });

  const [siteSettings, setSiteSettings] = useState({
    hero_banner: { title: '', subtitle: '', image_url: '' },
    contact_info: { whatsapp: '', facebook: '', instagram: '' },
    main_slides: []
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchProducts();
    fetchOrders();
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

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
    else fetchOrders();
  };
  const deleteOrder = async (id) => {
    setConfirmation({
      isOpen: true,
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order? This action cannot be undone.',
      onConfirm: async () => {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
        else fetchOrders();
      }
    });
  };

  const fetchSiteSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*');
    const settings = {
      hero_banner: { title: '5% FLAT DISCOUNT', subtitle: 'FOR THE 10K FAMILY ON FACEBOOK PAGE', image_url: null },
      contact_info: { whatsapp: '', facebook: '', instagram: '' },
      main_slides: []
    };

    if (data) {
      const banner = data.find(s => s.key === 'hero_banner')?.value;
      const contact = data.find(s => s.key === 'contact_info')?.value;
      const slides = data.find(s => s.key === 'main_slides')?.value;
      if (banner) settings.hero_banner = banner;
      if (contact) settings.contact_info = contact;
      if (slides) settings.main_slides = Array.isArray(slides) ? slides : [];
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
      setAlertModal({ isOpen: true, title: 'Instagram Error', message: "Could not extract Instagram ID. Please check the URL format.", type: 'error' });
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
    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
    else setAlertModal({ isOpen: true, title: 'Success', message: "Hero Banner Updated!", type: 'success' });
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
      setAlertModal({ isOpen: true, title: 'Upload Failed', message: "Upload failed. Make sure 'assets' bucket exists and is public.", type: 'error' });
    } else {
      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      if (target === 'banner') {
        setSiteSettings({ ...siteSettings, hero_banner: { ...siteSettings.hero_banner, image_url: data.publicUrl } });
      } else if (target === 'slider') {
        setSiteSettings({ ...siteSettings, main_slides: [...(siteSettings.main_slides || []), { id: Date.now(), image: data.publicUrl }] });
      } else {
        setForm({ ...form, images: [...(form.images || []), data.publicUrl] });
        setPreviewImage(data.publicUrl);
      }
    }
    setLoading(false);
  };

  const deleteProduct = async (id) => {
    setConfirmation({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to permanently delete this product from the inventory?',
      onConfirm: async () => {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
        else fetchProducts();
      }
    });
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      setAlertModal({ isOpen: true, title: 'Export Failed', message: 'No orders found to export.', type: 'error' });
      return;
    }

    const headers = [
      "Date", "Product", "Price", "Customer", "Phone", "Address",
      "Area", "Charge", "Total", "Size", "Color", "Last 4 Digits", "Status", "Note"
    ];

    const rows = orders.map(o => [
      new Date(o.created_at).toLocaleString(),
      o.product_name,
      o.product_price,
      o.customer_name,
      o.customer_phone,
      `"${(o.customer_address || '').replace(/"/g, '""')}"`,
      o.delivery_area,
      o.delivery_charge,
      o.total_amount,
      o.size || '',
      o.color || '',
      o.last_four_digits,
      o.status,
      `"${(o.customer_note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BigBazar_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setForm({
      name: '', price: '', original_price: '', description: '',
      images: [], video_url: '', is_sale: false, is_hot: false,
      is_new: false, is_sold_out: false, category: 'Women',
      status: 'pending', platform_id: '', serial_no: '',
      available_sizes: [], available_colors: []
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
      {/* Sidebar - Fixed Position */}
      <aside className="w-full lg:w-64 lg:h-screen lg:sticky lg:top-0 border-r border-white/5 p-6 flex flex-col justify-between shrink-0 bg-black z-20">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-[#ce112d]" />
            <h1 className="text-xl font-black italic uppercase">BIG<span className="text-[#ce112d]">BAZAR</span></h1>
          </div>
          <nav className="space-y-2">
            {['orders', 'pending', 'published', 'add', 'settings'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full flex items-center gap-3 p-4 rounded-xl uppercase text-[10px] font-black tracking-widest transition-all ${activeTab === tab ? 'bg-[#ce112d] shadow-lg shadow-red-900/20' : 'hover:bg-white/5 text-neutral-500'}`}>
                {tab === 'add' ? <Plus size={16} /> : tab === 'settings' ? <Settings size={16} /> : tab === 'pending' ? <Clock size={16} /> : tab === 'orders' ? <ShoppingBag size={16} /> : <CheckCircle2 size={16} />}
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 p-4 text-neutral-600 hover:text-white transition-all mt-auto border-t border-white/5 pt-6">
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

            {/* Slider Management Section */}
            <div className="space-y-8 pt-12 border-t border-white/5">
              <div>
                <h3 className="text-xl font-black italic uppercase">Home Slider <span className="text-[#ce112d]">Images</span></h3>
                <p className="text-neutral-500 text-[10px] mt-1 uppercase font-bold tracking-widest">Add images for the main page carousel (স্লাইডার ইমেজ যোগ করুন)</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {siteSettings.main_slides?.map((slide, i) => (
                  <div key={slide.id || i} className="relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-white/5 group">
                    <img src={slide.image} className="w-full h-full object-cover" alt="" />
                    <button
                      type="button"
                      onClick={() => setSiteSettings({ ...siteSettings, main_slides: siteSettings.main_slides.filter((_, idx) => idx !== i) })}
                      className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <label className="aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 hover:border-[#ce112d]/50 transition-all text-neutral-500">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <Plus size={16} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">Add Slide</span>
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'slider')} />
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await supabase.from('site_settings').upsert({ key: 'main_slides', value: siteSettings.main_slides }, { onConflict: 'key' });
                    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
                    else setAlertModal({ isOpen: true, title: 'Success', message: "Slider Updated Successfully!", type: 'success' });
                    setLoading(false);
                  }}
                  className="flex items-center gap-2 bg-[#ce112d] px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Slider'}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'add' ? (
          <form onSubmit={handleProductSubmit} className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <h2 className="text-3xl font-black italic uppercase">{editingProduct ? 'Edit' : 'New'} <span className="text-[#ce112d]">Product</span></h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Video URL (Instagram)</label>
                  <input value={form.video_url} onBlur={handleVideoBlur} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" placeholder="https://..." onChange={e => setForm({ ...form, video_url: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Main Product Photo (ফটো আপলোড করুন)</label>
                  <label className="flex items-center gap-3 w-full bg-neutral-950 border border-white/5 p-4 rounded-xl cursor-pointer hover:bg-white/5 transition-all text-neutral-500">
                    <div className="w-10 h-10 rounded-full bg-[#ce112d]/10 flex items-center justify-center text-[#ce112d]">
                      <Plus size={18} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Click to Upload Photo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'product')} />
                  </label>
                </div>
              </div>
              <div className="aspect-[9/16] bg-neutral-900 rounded-3xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                {previewImage ? (
                  <div className="relative w-full h-full">
                    <img src={previewImage} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-[#ce112d] transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <VideoPlayer src={form.video_url} priority={true} />
                )}
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
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-4 block tracking-widest">Product Photo Gallery (মেইন ফটো গ্যালারি)</label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-4">
                  {form.images?.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group bg-neutral-900">
                      <img
                        src={img}
                        className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500"
                        onClick={() => setPreviewImage(img)}
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}
                        className="absolute bottom-1.5 right-1.5 p-1.5 bg-black/80 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#ce112d] transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 hover:border-[#ce112d]/50 transition-all text-neutral-500 hover:text-white">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <Plus size={16} />
                    </div>
                    <span className="text-[9px] font-black uppercase">Add Photo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'product')} />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Category</label>
                <select value={form.category} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl text-white font-bold" onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option>Men</option>
                  <option>Women</option>
                  <option>Kids (Boys)</option>
                  <option>Kids (Girls)</option>
                </select>
              </div>

              {/* Variants Section */}
              <div className="space-y-6 pt-4 border-t border-white/5">
                <h3 className="text-sm font-black italic uppercase text-[#ce112d]">Variants & Availability</h3>

                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Available Sizes (Select from dropdown, click to toggle Stock)</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.available_sizes?.map((size, idx) => {
                      const name = typeof size === 'object' ? size.name : size;
                      const isAvailable = typeof size === 'object' ? (size.is_available ?? true) : true;

                      return (
                        <div key={idx} className="group relative">
                          <span
                            onClick={() => {
                              const newSizes = [...form.available_sizes];
                              newSizes[idx] = { name, is_available: !isAvailable };
                              setForm({ ...form, available_sizes: newSizes });
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2 cursor-pointer transition-all border ${isAvailable ? 'bg-[#ce112d]/10 text-[#ce112d] border-transparent' : 'bg-neutral-800 text-neutral-500 border-white/10 opacity-60'}`}
                          >
                            {name}
                            {!isAvailable && <span className="text-[8px] opacity-50">(OFF)</span>}
                            <X
                              size={12}
                              className="hover:scale-125 hover:text-white transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                setForm({ ...form, available_sizes: form.available_sizes.filter((_, i) => i !== idx) });
                              }}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <select
                    className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl text-xs text-white font-bold"
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        const custom = prompt('Enter custom size name:');
                        if (custom) {
                          const formatted = custom.trim().toUpperCase();
                          if (formatted && !form.available_sizes?.some(s => (typeof s === 'object' ? s.name : s) === formatted)) {
                            setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: formatted, is_available: true }] });
                          }
                        }
                      } else if (val && !form.available_sizes?.some(s => (typeof s === 'object' ? s.name : s) === val)) {
                        setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: val, is_available: true }] });
                      }
                    }}
                  >
                    <option value="" disabled>-- Select Size --</option>
                    <optgroup label="Standard">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'].map(s => (
                        <option key={s} value={s} disabled={form.available_sizes?.some(sz => (typeof sz === 'object' ? sz.name : sz) === s)}>{s}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Numeric">
                      {['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'].map(s => (
                        <option key={s} value={s} disabled={form.available_sizes?.some(sz => (typeof sz === 'object' ? sz.name : sz) === s)}>{s}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Custom">
                      <option value="__custom__">✏️ Type Custom Size...</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Available Colors (Click swatch to toggle Stock)</label>
                  <div className="flex flex-wrap gap-4 mb-3">
                    {form.available_colors?.map((rawColor, idx) => {
                      const color = typeof rawColor === 'object' ? rawColor : { name: rawColor, is_available: true, image: null, hex: null };
                      const isAvailable = color.is_available ?? true;

                      return (
                        <div key={idx} className="flex flex-col gap-3 max-w-[200px]">
                          {/* Color Tag with round swatch */}
                          <div
                            onClick={() => {
                              const updatedColors = [...form.available_colors];
                              const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null };
                              updatedColors[idx] = { ...normalized, is_available: !isAvailable };
                              setForm({ ...form, available_colors: updatedColors });
                            }}
                            className={`relative px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border cursor-pointer transition-all ${isAvailable ? (color.image ? 'bg-[#ce112d]/20 text-white border-[#ce112d]' : 'bg-white/10 text-white border-white/20') : 'bg-neutral-900 text-neutral-600 border-white/5 opacity-40'}`}
                          >
                            <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" style={{ backgroundColor: color.hex || '#888' }} />
                            {color.name}
                            {!isAvailable && <span className="text-[8px] opacity-50">(OFF)</span>}
                            <X
                              size={12}
                              className="ml-1 hover:text-[#ce112d] transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setForm({ ...form, available_colors: form.available_colors.filter((_, i) => i !== idx) });
                              }}
                            />
                          </div>

                          {/* Hex color picker */}
                          <div className="flex items-center gap-2 px-1">
                            <input
                              type="color"
                              value={color.hex || '#888888'}
                              onChange={(e) => {
                                const updatedColors = [...form.available_colors];
                                const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null };
                                updatedColors[idx] = { ...normalized, hex: e.target.value };
                                setForm({ ...form, available_colors: updatedColors });
                              }}
                              className="w-8 h-8 rounded-full cursor-pointer border-2 border-white/10 bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
                            />
                            <span className="text-[9px] font-mono text-neutral-500 uppercase">{color.hex || '#888'}</span>
                          </div>

                          {/* Image Association */}
                          {form.images?.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-neutral-950 rounded-2xl border border-white/5">
                              {form.images.map((img, i) => (
                                <div
                                  key={i}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const updatedColors = [...form.available_colors];
                                    const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null };
                                    const newImage = normalized.image === img ? null : img;
                                    updatedColors[idx] = { ...normalized, image: newImage };
                                    setForm({ ...form, available_colors: updatedColors });
                                    if (newImage) setPreviewImage(newImage);
                                  }}
                                  className={`relative w-14 h-14 rounded-xl overflow-hidden transition-all border-2 cursor-pointer flex-shrink-0 ${color.image === img ? 'border-[#ce112d] scale-110 shadow-[0_0_20px_rgba(206,17,45,0.4)]' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                                >
                                  <img src={img} className="w-full h-full object-cover" />
                                  {color.image === img && (
                                    <div className="absolute inset-0 bg-[#ce112d]/10 flex items-center justify-center">
                                      <Check size={16} className="text-white drop-shadow-lg" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Size stock for this color */}
                          {form.available_sizes?.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase text-neutral-600 tracking-widest ml-1">Sizes in stock:</label>
                              <div className="flex flex-wrap gap-1.5 p-3 bg-neutral-950 rounded-2xl border border-white/5">
                                {form.available_sizes.map((s, sIdx) => {
                                  const sName = typeof s === 'object' ? s.name : s;
                                  const isSelected = color.sizes?.includes(sName);
                                  return (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const updatedColors = [...form.available_colors];
                                        const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null, sizes: [] };
                                        const currentSizes = normalized.sizes || [];
                                        const newSizes = currentSizes.includes(sName)
                                          ? currentSizes.filter(name => name !== sName)
                                          : [...currentSizes, sName];
                                        updatedColors[idx] = { ...normalized, sizes: newSizes };
                                        setForm({ ...form, available_colors: updatedColors });
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border ${isSelected ? 'bg-[#ce112d]/20 border-[#ce112d] text-white' : 'bg-black/40 border-white/5 text-neutral-700 hover:text-neutral-400'}`}
                                    >
                                      {sName}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Add New Color */}
                  <div className="flex gap-2">
                    <input
                      id="newColorName"
                      type="text"
                      placeholder="Color Name (e.g. Red)"
                      className="flex-1 bg-neutral-950 border border-white/5 p-4 rounded-xl text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          const hexInput = document.getElementById('newColorHex');
                          const hex = hexInput?.value || '#888888';
                          if (val && !form.available_colors?.some(c => (typeof c === 'object' ? c.name : c) === val)) {
                            const formatted = val.charAt(0).toUpperCase() + val.slice(1);
                            setForm({ ...form, available_colors: [...(form.available_colors || []), { name: formatted, image: null, is_available: true, hex, sizes: [] }] });
                            e.target.value = '';
                            if (hexInput) hexInput.value = '#888888';
                          }
                        }
                      }}
                    />
                    <input
                      id="newColorHex"
                      type="color"
                      defaultValue="#888888"
                      className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-white/10 bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-xl [&::-webkit-color-swatch]:border-0"
                    />
                  </div>
                  <p className="text-[9px] text-neutral-600 font-bold mt-2 ml-1">Type name + pick color, then press Enter</p>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={form.is_sold_out}
                    onChange={e => setForm({ ...form, is_sold_out: e.target.checked })}
                    className="w-5 h-5 rounded bg-neutral-900 border-white/10 text-[#ce112d] focus:ring-[#ce112d]"
                  />
                  <label className="text-xs font-black uppercase text-white tracking-widest cursor-pointer">Sold Out (অর্ডার বন্ধ করুন)</label>
                </div>
              </div>
              <div className="flex gap-4">
                <button className="flex-1 bg-[#ce112d] py-4 rounded-2xl font-black uppercase tracking-widest">Save {editingProduct ? 'Changes' : 'Product'}</button>
                <button type="button" onClick={cancelEdit} className="px-6 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">Cancel</button>
              </div>
            </div>
          </form>
        ) : activeTab === 'orders' ? (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black italic uppercase">Order <span className="text-[#ce112d]">Details</span></h2>
                <p className="text-neutral-500 text-xs mt-2 uppercase font-bold tracking-widest">{orders.length} Total Orders</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#ce112d] hover:border-[#ce112d] hover:text-white transition-all group"
              >
                <Download size={16} className="text-[#ce112d] group-hover:text-white" />
                Export to CSV
              </button>
            </div>

            <div className="overflow-x-auto no-scrollbar pb-10">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase text-neutral-500 tracking-widest">
                    <th className="pb-4 pr-4">Date</th>
                    <th className="pb-4 pr-4">Product / Item</th>
                    <th className="pb-4 pr-4">Customer</th>
                    <th className="pb-4 pr-4">Phone</th>
                    <th className="pb-4 pr-4">Address</th>
                    <th className="pb-4 pr-4">Char.</th>
                    <th className="pb-4 pr-4">Total</th>
                    <th className="pb-4 pr-4">Variants</th>
                    <th className="pb-4 pr-4">Pmt</th>
                    <th className="pb-4 pr-4">Note</th>
                    <th className="pb-4 pr-4">Status</th>
                    <th className="pb-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(() => {
                    const productMap = {};
                    products.forEach(p => productMap[p.id] = p);

                    return orders.map(o => {
                      const product = productMap[o.product_id];
                      let productThumb = product?.image_url || product?.images?.[0];

                      // Instagram Thumbnail Logic fallback
                      if (!productThumb && product?.video_url) {
                        const match = product.video_url.match(/\/(reels|reel|p)\/([a-zA-Z0-9_-]+)/);
                        const id = match ? match[2] : null;
                        if (id) productThumb = `https://images.weserv.nl/?url=instagram.com/p/${id}/media/?size=l`;
                      }

                      return (
                        <tr key={o.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-6 pr-4 text-xs font-bold text-neutral-400">
                            {new Date(o.created_at).toLocaleDateString()}<br />
                            <span className="text-[10px] opacity-50">{new Date(o.created_at).toLocaleTimeString()}</span>
                          </td>
                          <td className="py-6 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-16 bg-neutral-900 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 relative group-hover:border-[#ce112d]/30 transition-all">
                                {productThumb ? (
                                  <img src={productThumb} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-neutral-800">
                                    <ImageIcon size={20} />
                                  </div>
                                )}
                                {product?.serial_no && (
                                  <div className="absolute top-0 right-0 bg-[#ce112d] text-white text-[7px] font-black px-1 rounded-bl">#{product.serial_no}</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-white truncate max-w-[140px] leading-tight">{o.product_name}</p>
                                <p className="text-[10px] text-neutral-500 font-bold mt-1 uppercase italic">৳{o.product_price}</p>
                                {product?.serial_no && (
                                  <p className="text-[8px] text-[#ce112d] font-black mt-0.5 tracking-widest uppercase">SL NO: {product.serial_no}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-6 pr-4">
                            <p className="text-xs font-black text-white">{o.customer_name}</p>
                            <p className="text-[10px] text-neutral-400 opacity-60 font-medium">Customer</p>
                          </td>
                          <td className="py-6 pr-4 text-xs font-black text-[#ce112d]">{o.customer_phone}</td>
                          <td className="py-6 pr-4">
                            <p className="text-[10px] text-neutral-400 font-black uppercase mb-1">{o.delivery_area}</p>
                            <p className="text-[10px] text-neutral-500 max-w-[150px] font-medium leading-relaxed" title={o.customer_address}>{o.customer_address}</p>
                          </td>
                          <td className="py-6 pr-4 text-xs font-bold text-neutral-400">৳{o.delivery_charge}</td>
                          <td className="py-6 pr-4">
                            <p className="text-xs font-black text-white">৳{o.total_amount}</p>
                            <p className="text-[8px] text-neutral-600 font-black uppercase tracking-tighter mt-1">Total Paid/Due</p>
                          </td>
                          <td className="py-6 pr-4">
                            <div className="flex flex-col gap-1.5">
                              {o.size && <span className="text-[8px] font-black bg-[#ce112d]/10 text-[#ce112d] px-2 py-1 rounded tracking-widest border border-[#ce112d]/10 uppercase self-start">SIZE: {o.size}</span>}
                              {o.color && <span className="text-[8px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded text-white tracking-widest uppercase self-start">COLOR: {o.color}</span>}
                            </div>
                          </td>
                          <td className="py-6 pr-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black ${o.last_four_digits === 'COD' ? 'bg-green-500/20 text-green-500 border border-green-500/10' : 'bg-blue-500/20 text-blue-500 border border-blue-500/10'}`}>
                              {o.last_four_digits}
                            </span>
                          </td>
                          <td className="py-6 pr-4">
                            <div className="max-w-[120px]">
                              <p className="text-[10px] text-neutral-500 font-bold leading-relaxed line-clamp-2 italic" title={o.customer_note}>
                                {o.customer_note || "—"}
                              </p>
                            </div>
                          </td>
                          <td className="py-6 pr-4">
                            <select
                              value={o.status}
                              onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                              className={`bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:border-[#ce112d] cursor-pointer transition-all ${o.status === 'Pending' ? 'text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]' :
                                o.status === 'Shipped' ? 'text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' :
                                  o.status === 'Delivered' ? 'text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' :
                                    'text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Canceled">Canceled</option>
                            </select>
                          </td>
                          <td className="py-6">
                            <button onClick={() => deleteOrder(o.id)} className="p-3 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              {orders.length === 0 && !loading && (
                <div className="py-20 text-center space-y-4">
                  <ShoppingBag className="mx-auto text-neutral-800" size={48} />
                  <p className="text-neutral-500 text-sm font-bold">No orders found.</p>
                </div>
              )}
            </div>
          </div>
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
                      {p.is_sold_out && (
                        <div className="absolute top-4 left-4 bg-[#ce112d] px-3 py-1 rounded-full text-[10px] font-black text-white uppercase italic">Sold Out</div>
                      )}
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
                        <button
                          onClick={() => supabase.from('products').update({ is_sold_out: !p.is_sold_out }).eq('id', p.id).then(fetchProducts)}
                          className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${p.is_sold_out ? 'bg-[#ce112d] text-white' : 'bg-white/5 text-neutral-400 hover:text-[#ce112d]'}`}
                          title={p.is_sold_out ? "Mark as Available" : "Mark as Sold Out"}
                        >
                          {p.is_sold_out ? "STOCK" : "SO"}
                        </button>
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
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
      />
    </div>
  );
}
