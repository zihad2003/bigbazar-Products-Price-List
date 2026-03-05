import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Plus, Trash2, LogOut, Image as ImageIcon, Search,
  Settings, ShoppingBag, Edit, X, Play, Check,
  AlertCircle, Instagram, CheckCircle2, Clock, Upload, Save, Download,
  Sun, Moon, Star, RotateCcw, Archive, MessageSquare, Users, Menu, Copy, ExternalLink
} from 'lucide-react';
import { Pencil } from 'lucide-react';
import { extractInstagramId, fetchInstagramData } from '../utils/instagram';
import { formatColorName } from '../utils/colorNames';
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
  const [reviews, setReviews] = useState([]);
  const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [siteTheme, setSiteTheme] = useState('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setAlertModal({
      isOpen: true,
      title: "Copied!",
      message: `${label} copied to clipboard.`,
      type: "success"
    });
    setTimeout(() => {
      setAlertModal(prev => ({ ...prev, isOpen: false }));
    }, 1200);
  };

  const [form, setForm] = useState({
    name: '', price: '', original_price: '', description: '',
    images: [], video_url: '', is_sale: false, is_hot: false,
    is_new: false, is_sold_out: false, category: 'Women',
    status: 'pending', platform_id: '', serial_no: '',
    available_sizes: [], available_colors: [], stock_count: ''
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
    fetchReviews();
    fetchSiteSettings();

    // Fetch total site visitor count from Supabase
    supabase.from('site_settings').select('value').eq('key', 'visitor_count').single()
      .then(({ data }) => setVisitorCount(data?.value || 0))
      .catch(() => 0);
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setProducts(data || []);
    setLoading(false);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    setOrders(data || []);
    setLoading(false);
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setReviews(data || []);
  };

  const updateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
    else fetchOrders();
  };

  const updateOrderNote = async (id, currentNote) => {
    const newNote = prompt('অর্ডার নোট আপডেট করুন:', currentNote || '');
    if (newNote !== null) {
      const { error } = await supabase.from('orders').update({ customer_note: newNote }).eq('id', id);
      if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
      else fetchOrders();
    }
  };

  const toggleAdvancePayment = async (id, currentStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ is_advance_paid: !currentStatus })
      .eq('id', id);

    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
    else fetchOrders();
  };

  // Soft delete — moves to 'Deleted' status instead of permanent delete
  const deleteOrder = async (id) => {
    setConfirmation({
      isOpen: true,
      title: 'Delete Order',
      message: 'অর্ডারটি ডিলিটেড সেকশনে সরানো হবে। পরে Undo করা যাবে।',
      onConfirm: async () => {
        const { error } = await supabase.from('orders').update({ status: 'Deleted' }).eq('id', id);
        if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
        else fetchOrders();
      }
    });
  };

  // Undo — restore deleted order back to Pending
  const restoreOrder = async (id) => {
    const { error } = await supabase.from('orders').update({ status: 'Pending' }).eq('id', id);
    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
    else {
      fetchOrders();
      setAlertModal({ isOpen: true, title: 'Restored!', message: 'অর্ডারটি সফলভাবে পুনরুদ্ধার করা হয়েছে।', type: 'success' });
    }
  };

  // Permanent delete
  const permanentDeleteOrder = async (id) => {
    setConfirmation({
      isOpen: true,
      title: 'Permanent Delete',
      message: 'এই অর্ডারটি চিরতরে মুছে ফেলা হবে। এটি আর ফেরানো যাবে না!',
      onConfirm: async () => {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
        else fetchOrders();
      }
    });
  };

  const emptyBin = async () => {
    setConfirmation({
      isOpen: true,
      title: 'Empty Bin',
      message: 'আপনি কি নিশ্চিত যে আপনি সবগুলি ডিলিটেড অর্ডার চিরতরে মুছে ফেলতে চান?',
      onConfirm: async () => {
        const { error } = await supabase.from('orders').delete().eq('status', 'Deleted');
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
      const themeData = data.find(s => s.key === 'site_theme')?.value;
      if (themeData?.mode) setSiteTheme(themeData.mode);
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
      const { data: maxSerialData } = await supabase
        .from('products')
        .select('serial_no')
        .order('serial_no', { ascending: false })
        .limit(1);

      const maxSerial = maxSerialData && maxSerialData.length > 0 ? maxSerialData[0].serial_no : 0;
      finalSerialNo = maxSerial + 1;
    }

    const productData = {
      ...form,
      price: parseFloat(form.price) || 0,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      serial_no: parseInt(finalSerialNo),
      stock_count: form.stock_count !== '' ? parseInt(form.stock_count) : null,
      // platform_id can be null; video_url & description must stay as empty string (DB NOT NULL)
      platform_id: form.platform_id || null,
      video_url: form.video_url || '',
      description: form.description || '',
      image_url: (form.images && form.images.length > 0) ? form.images[0] : (form.image_url || null),
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
        // Extract the column name from the error message for a clearer message
        const colMatch = error.message?.match(/column "(\w+)"/);
        const colName = colMatch ? colMatch[1] : null;
        message = colName
          ? `The field "${colName}" is required. Please fill it in.`
          : "Please make sure all required fields (name, price) are filled in.";
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

  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const uploadSingleFile = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `assets/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, file, {
      cacheControl: '31536000',
      upsert: false
    });
    if (uploadError) {
      console.error(uploadError);
      return null;
    }
    const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileUpload = async (e, target) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    setUploadProgress({ current: 0, total: files.length });

    if (target === 'banner') {
      // Banner only uses single file
      const url = await uploadSingleFile(files[0]);
      if (url) {
        setSiteSettings(prev => ({ ...prev, hero_banner: { ...prev.hero_banner, image_url: url } }));
      } else {
        setAlertModal({ isOpen: true, title: 'Upload Failed', message: "Upload failed. Make sure 'assets' bucket exists and is public.", type: 'error' });
      }
    } else if (target === 'slider') {
      // Slider supports multiple
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const url = await uploadSingleFile(files[i]);
        if (url) uploadedUrls.push({ id: Date.now() + i, image: url });
      }
      if (uploadedUrls.length > 0) {
        setSiteSettings(prev => ({ ...prev, main_slides: [...(prev.main_slides || []), ...uploadedUrls] }));
      }
      if (uploadedUrls.length < files.length) {
        setAlertModal({ isOpen: true, title: 'Partial Upload', message: `${files.length - uploadedUrls.length} of ${files.length} files failed to upload.`, type: 'error' });
      }
    } else {
      // Product gallery supports multiple
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress({ current: i + 1, total: files.length });
        const url = await uploadSingleFile(files[i]);
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        setForm(prev => ({ ...prev, images: [...(prev.images || []), ...uploadedUrls] }));
        setPreviewImage(uploadedUrls[uploadedUrls.length - 1]);
      }
      if (uploadedUrls.length < files.length) {
        setAlertModal({ isOpen: true, title: 'Partial Upload', message: `${files.length - uploadedUrls.length} of ${files.length} files failed to upload.`, type: 'error' });
      }
    }

    setUploadProgress({ current: 0, total: 0 });
    setLoading(false);
    // Reset the input so the same files can be re-selected if needed
    e.target.value = '';
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
    setPreviewImage(null);
    setPreviewVideo(null);
    setForm({
      name: '', price: '', original_price: '', description: '',
      images: [], video_url: '', is_sale: false, is_hot: false,
      is_new: false, is_sold_out: false, category: 'Women',
      status: 'pending', platform_id: '', serial_no: '',
      available_sizes: [], available_colors: [], stock_count: ''
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
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-black border-b border-white/5 sticky top-0 z-[60] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-[#ce112d] w-5 h-5" />
          <h1 className="text-lg font-black italic uppercase">BIG<span className="text-[#ce112d]">BAZAR</span></h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-white/5 rounded-xl transition-all"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Position */}
      <aside className={`fixed lg:sticky top-0 left-0 w-64 h-[100dvh] lg:h-screen border-r border-white/5 px-6 pt-24 pb-6 lg:py-6 flex flex-col justify-between shrink-0 bg-black z-50 transition-transform duration-300 lg:translate-x-0 overflow-y-auto no-scrollbar ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full'}`}>
        <div className="space-y-8">
          <div className="hidden lg:flex items-center gap-3">
            <ShoppingBag className="text-[#ce112d]" />
            <h1 className="text-xl font-black italic uppercase">BIG<span className="text-[#ce112d]">BAZAR</span></h1>
          </div>
          <nav className="space-y-1.5">
            {[
              { id: 'orders', icon: <ShoppingBag size={16} />, label: 'Orders', count: orders.filter(o => o.status !== 'Deleted').length },
              { id: 'deleted', icon: <Archive size={16} />, label: 'Deleted', count: orders.filter(o => o.status === 'Deleted').length },
              { id: 'reviews', icon: <Star size={16} />, label: 'Reviews', count: reviews.length },
              { id: 'pending', icon: <Clock size={16} />, label: 'Pending', count: products.filter(p => p.status === 'pending' && !p.is_sold_out).length },
              { id: 'published', icon: <CheckCircle2 size={16} />, label: 'Published', count: products.filter(p => p.status === 'published' && !p.is_sold_out).length },
              { id: 'soldout', icon: <AlertCircle size={16} />, label: 'Sold Out', count: products.filter(p => p.is_sold_out).length },
              { id: 'add', icon: <Plus size={16} />, label: 'Add' },
              { id: 'settings', icon: <Settings size={16} />, label: 'Settings' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#ce112d] shadow-lg shadow-red-900/20' : 'hover:bg-white/5 text-neutral-500'}`}
              >
                {tab.icon}
                <span className="uppercase">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/5'}`}>{tab.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <button
          onClick={() => {
            supabase.auth.signOut();
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center gap-3 p-4 text-neutral-600 hover:text-white transition-all mt-auto border-t border-white/5 pt-6"
        >
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
                  <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleFileUpload(e, 'slider')} />
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

            {/* Theme Mode Section */}
            <div className="space-y-8 pt-12 border-t border-white/5">
              <div>
                <h3 className="text-xl font-black italic uppercase">Site <span className="text-[#ce112d]">Theme</span></h3>
                <p className="text-neutral-500 text-[10px] mt-1 uppercase font-bold tracking-widest">Choose Light or Dark mode for customers</p>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setSiteTheme('dark')}
                  className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all ${siteTheme === 'dark' ? 'border-[#ce112d] bg-[#ce112d]/5' : 'border-white/10 hover:border-white/20'}`}
                >
                  <Moon size={28} className={siteTheme === 'dark' ? 'text-[#ce112d]' : 'text-neutral-600'} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${siteTheme === 'dark' ? 'text-white' : 'text-neutral-500'}`}>Dark Mode</span>
                </button>
                <button type="button" onClick={() => setSiteTheme('light')}
                  className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all ${siteTheme === 'light' ? 'border-[#ce112d] bg-[#ce112d]/5' : 'border-white/10 hover:border-white/20'}`}
                >
                  <Sun size={28} className={siteTheme === 'light' ? 'text-[#ce112d]' : 'text-neutral-600'} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${siteTheme === 'light' ? 'text-white' : 'text-neutral-500'}`}>Light Mode</span>
                </button>
              </div>
              <button type="button" disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const { error } = await supabase.from('site_settings').upsert({ key: 'site_theme', value: { mode: siteTheme } }, { onConflict: 'key' });
                  if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
                  else setAlertModal({ isOpen: true, title: 'Success', message: `Theme set to ${siteTheme === 'dark' ? 'Dark' : 'Light'} Mode!`, type: 'success' });
                  setLoading(false);
                }}
                className="flex items-center gap-2 bg-[#ce112d] px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Save size={18} /> {loading ? 'Saving...' : 'Save Theme'}
              </button>
            </div>

          </div>
        ) : activeTab === 'add' ? (
          <form onSubmit={handleProductSubmit} className="max-w-2xl space-y-8">
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
              {(previewImage || form.video_url) && (
                <div className={`grid gap-4 ${previewImage && form.video_url ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-sm mx-auto w-full'}`}>
                  {previewImage && (
                    <div className="aspect-[4/5] bg-neutral-900 rounded-3xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                      <img src={previewImage} className="w-full h-full object-cover object-top" />
                      <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-[#ce112d] transition-colors z-[10]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {form.video_url && (
                    <div className="aspect-[4/5] bg-neutral-900 rounded-3xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                      <VideoPlayer src={form.video_url} priority={true} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Price</label>
                <input value={form.price} className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black uppercase text-neutral-500 block tracking-widest">Stock Count (খালি = unlimited)</label>
                  {form.available_colors?.some(c => c.sizes?.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        let total = 0;
                        form.available_colors.forEach(c => {
                          c.sizes?.forEach(s => {
                            total += (parseInt(s.stock) || 0);
                          });
                        });
                        setForm({ ...form, stock_count: total.toString() });
                      }}
                      className="text-[8px] font-black uppercase bg-[#ce112d]/10 text-[#ce112d] px-2 py-1 rounded-md hover:bg-[#ce112d] hover:text-white transition-all"
                    >
                      Sync Total from Variants
                    </button>
                  )}
                </div>
                <input type="number" min="0" value={form.stock_count} placeholder="e.g. 10" className="w-full bg-neutral-950 border border-white/5 p-4 rounded-xl" onChange={e => setForm({ ...form, stock_count: e.target.value })} />
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
                    <span className="text-[9px] font-black uppercase">{uploadProgress.total > 0 ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : 'Add Photos'}</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleFileUpload(e, 'product')} />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 mb-3 block tracking-widest">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Men', label: 'Men' },
                    { id: 'Women', label: 'Women' },
                    { id: 'Kids (Boys)', label: 'Boys' },
                    { id: 'Kids (Girls)', label: 'Girls' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm({ ...form, category: cat.id })}
                      className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${form.category === cat.id ? 'bg-[#ce112d] border-[#ce112d] text-white shadow-lg shadow-red-900/20' : 'bg-neutral-900 border-white/5 text-neutral-500 hover:border-white/10 hover:text-white'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variants Section */}
              <div className="space-y-6 pt-4 border-t border-white/5">
                <h3 className="text-sm font-black italic uppercase text-[#ce112d]">Variants & Availability</h3>

                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 mb-3 block tracking-widest">Available Sizes (Tap to add/remove, click tag to toggle stock)</label>

                  {/* Standard Sizes */}
                  <p className="text-[9px] font-bold uppercase text-neutral-600 mb-2 tracking-widest">Standard</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'].map(s => {
                      const isSelected = form.available_sizes?.some(sz => (typeof sz === 'object' ? sz.name : sz) === s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setForm({ ...form, available_sizes: form.available_sizes.filter(sz => (typeof sz === 'object' ? sz.name : sz) !== s) });
                            } else {
                              setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: s, is_available: true }] });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all border ${isSelected ? 'bg-[#ce112d] text-white border-[#ce112d] shadow-lg shadow-red-900/20' : 'bg-neutral-900 text-neutral-400 border-white/5 hover:border-white/20 hover:text-white'}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  {/* Numeric Sizes */}
                  <p className="text-[9px] font-bold uppercase text-neutral-600 mb-2 tracking-widest">Numeric</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'].map(s => {
                      const isSelected = form.available_sizes?.some(sz => (typeof sz === 'object' ? sz.name : sz) === s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setForm({ ...form, available_sizes: form.available_sizes.filter(sz => (typeof sz === 'object' ? sz.name : sz) !== s) });
                            } else {
                              setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: s, is_available: true }] });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all border ${isSelected ? 'bg-[#ce112d] text-white border-[#ce112d] shadow-lg shadow-red-900/20' : 'bg-neutral-900 text-neutral-400 border-white/5 hover:border-white/20 hover:text-white'}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const custom = prompt('Enter custom size name:');
                        if (custom) {
                          const formatted = custom.trim().toUpperCase();
                          if (formatted && !form.available_sizes?.some(s => (typeof s === 'object' ? s.name : s) === formatted)) {
                            setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: formatted, is_available: true }] });
                          }
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all border border-dashed border-white/10 text-neutral-500 hover:border-[#ce112d]/50 hover:text-[#ce112d]"
                    >
                      <span className="flex items-center gap-1"><Pencil size={11} /> Custom</span>
                    </button>
                  </div>

                  {/* Numeric (1-15) */}
                  <p className="text-[9px] font-bold uppercase text-neutral-600 mb-2 tracking-widest">Numeric (1-15)</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'].map(s => {
                      const isSelected = form.available_sizes?.some(sz => (typeof sz === 'object' ? sz.name : sz) === s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setForm({ ...form, available_sizes: form.available_sizes.filter(sz => (typeof sz === 'object' ? sz.name : sz) !== s) });
                            } else {
                              setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: s, is_available: true }] });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all border ${isSelected ? 'bg-[#ce112d] text-white border-[#ce112d] shadow-lg shadow-red-900/20' : 'bg-neutral-900 text-neutral-400 border-white/5 hover:border-white/20 hover:text-white'}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected sizes with stock toggle */}
                  {form.available_sizes?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-white/5">
                      <span className="text-[9px] font-bold uppercase text-neutral-600 tracking-widest self-center mr-1">Stock:</span>
                      {form.available_sizes.map((size, idx) => {
                        const name = typeof size === 'object' ? size.name : size;
                        const isAvailable = typeof size === 'object' ? (size.is_available ?? true) : true;
                        return (
                          <span
                            key={idx}
                            onClick={() => {
                              const newSizes = [...form.available_sizes];
                              newSizes[idx] = { name, is_available: !isAvailable };
                              setForm({ ...form, available_sizes: newSizes });
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all border ${isAvailable ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-neutral-800 text-neutral-500 border-white/10 opacity-60'}`}
                          >
                            {name}
                            {!isAvailable && <span className="text-[8px] opacity-50">(OFF)</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Available Colors (Click swatch to toggle Stock)</label>
                  <div className="flex flex-wrap gap-4 mb-3">
                    {form.available_colors?.map((rawColor, idx) => {
                      const color = typeof rawColor === 'object' ? rawColor : { name: rawColor, is_available: true, image: null, hex: null };
                      const isAvailable = color.is_available ?? true;

                      return (
                        <div key={idx} className="flex flex-col sm:flex-row gap-6 p-4 bg-white/5 border border-white/10 rounded-2xl w-full">
                          <div className="flex-1 space-y-4">
                            {/* Color Tag with round swatch */}
                            <div
                              onClick={() => {
                                const newName = prompt('Enter new color name:', color.name);
                                if (newName) {
                                  const updatedColors = [...form.available_colors];
                                  const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null };
                                  updatedColors[idx] = { ...normalized, name: newName };
                                  setForm({ ...form, available_colors: updatedColors });
                                }
                              }}
                              className={`w-max relative px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border cursor-pointer transition-all ${isAvailable ? (color.image ? 'bg-[#ce112d]/20 text-white border-[#ce112d]' : 'bg-white/10 text-white border-white/20') : 'bg-neutral-900 text-neutral-600 border-white/5 opacity-40'}`}
                              title="Click to rename"
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
                            <button
                              type="button"
                              onClick={() => {
                                const updatedColors = [...form.available_colors];
                                const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null };
                                updatedColors[idx] = { ...normalized, is_available: !isAvailable };
                                setForm({ ...form, available_colors: updatedColors });
                              }}
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isAvailable ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-neutral-900 text-neutral-600 border border-white/5'}`}
                            >
                              {isAvailable ? 'In Stock' : 'Out of Stock'}
                            </button>

                            {/* Hex color picker */}
                            <div>
                              <label className="text-[9px] font-black uppercase text-neutral-500 tracking-widest block mb-2">Base Hex Color</label>
                              <div className="flex items-center gap-3 px-1">
                                <div className="relative group cursor-pointer w-10 h-10">
                                  <div
                                    className="absolute inset-0 rounded-full border-2 border-white/10 shadow-inner flex items-center justify-center transition-transform hover:scale-105 pointer-events-none"
                                    style={{ backgroundColor: color.hex || '#888888' }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" /></svg>
                                  </div>
                                  <input
                                    id={`existingColorHex-${idx}`}
                                    type="color"
                                    value={color.hex || '#888888'}
                                    onClick={async (e) => {
                                      if (window.EyeDropper) {
                                        e.preventDefault();
                                        try {
                                          const dropper = new window.EyeDropper();
                                          const { sRGBHex } = await dropper.open();
                                          const updatedColors = [...form.available_colors];
                                          const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null };

                                          const suggested = formatColorName(sRGBHex);
                                          const newName = confirm(`Rename color to "${suggested}"?`) ? suggested : normalized.name;

                                          updatedColors[idx] = { ...normalized, hex: sRGBHex, name: newName };
                                          setForm({ ...form, available_colors: updatedColors });
                                        } catch (err) { console.log(err); }
                                      }
                                    }}
                                    onChange={(e) => {
                                      const updatedColors = [...form.available_colors];
                                      const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null };
                                      updatedColors[idx] = { ...normalized, hex: e.target.value };
                                      setForm({ ...form, available_colors: updatedColors });
                                    }}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[12px] font-mono text-white uppercase font-black">{color.hex || '#888888'}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const suggested = formatColorName(color.hex || '#888888');
                                        const updatedColors = [...form.available_colors];
                                        const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null };
                                        updatedColors[idx] = { ...normalized, name: suggested };
                                        setForm({ ...form, available_colors: updatedColors });
                                      }}
                                      className="p-1 text-neutral-500 hover:text-[#ce112d] transition-colors"
                                      title="Suggest name from color"
                                    >
                                      <RotateCcw size={10} />
                                    </button>
                                  </div>
                                  <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest leading-tight">Click to Sample</span>
                                </div>
                              </div>
                            </div>

                            {/* Size stock for this color */}
                            {form.available_sizes?.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-white/5">
                                <label className="text-[8px] font-black uppercase text-neutral-500 tracking-widest ml-1">Sizes in stock:</label>
                                <div className="flex flex-wrap gap-2 p-3 bg-neutral-950/50 rounded-xl border border-white/5">
                                  {form.available_sizes.map((s, sIdx) => {
                                    const sName = typeof s === 'object' ? s.name : s;
                                    const sObj = color.sizes?.find(sz => (typeof sz === 'object' ? sz.name : sz) === sName);
                                    const isSelected = !!sObj;
                                    const variantStock = typeof sObj === 'object' ? (sObj.stock ?? 0) : 0;

                                    return (
                                      <div key={sIdx} className="flex flex-col gap-1.5 p-2 bg-black/20 rounded-lg border border-white/5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            const updatedColors = [...form.available_colors];
                                            const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { name: updatedColors[idx], is_available: true, image: null, hex: null, sizes: [] };
                                            const currentSizes = normalized.sizes || [];
                                            const isFound = currentSizes.some(sz => (typeof sz === 'object' ? sz.name : sz) === sName);

                                            const newSizes = isFound
                                              ? currentSizes.filter(sz => (typeof sz === 'object' ? sz.name : sz) !== sName)
                                              : [...currentSizes, { name: sName, stock: 0, sku: '' }];

                                            updatedColors[idx] = { ...normalized, sizes: newSizes };
                                            setForm({ ...form, available_colors: updatedColors });
                                          }}
                                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border ${isSelected ? 'bg-[#ce112d]/20 border-[#ce112d] text-white' : 'bg-black/40 border-white/5 text-neutral-700 hover:text-neutral-400'}`}
                                        >
                                          {sName}
                                        </button>
                                        {isSelected && (
                                          <div className="space-y-1">
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[7px] font-black uppercase text-neutral-600 ml-0.5 tracking-tighter">Stock</label>
                                              <input
                                                type="number"
                                                placeholder="Stk"
                                                value={variantStock}
                                                onChange={(e) => {
                                                  const updatedColors = [...form.available_colors];
                                                  const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { ...color, sizes: [] };
                                                  const newSizes = (normalized.sizes || []).map(sz => {
                                                    const szName = typeof sz === 'object' ? sz.name : sz;
                                                    if (szName === sName) {
                                                      return { ...sz, stock: parseInt(e.target.value) || 0 };
                                                    }
                                                    return sz;
                                                  });
                                                  updatedColors[idx] = { ...normalized, sizes: newSizes };
                                                  setForm({ ...form, available_colors: updatedColors });
                                                }}
                                                className="w-14 bg-black/60 border border-white/10 rounded-md py-1 px-1.5 text-[8px] font-black text-white text-center outline-none focus:border-[#ce112d]"
                                              />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                              <label className="text-[7px] font-black uppercase text-neutral-600 ml-0.5 tracking-tighter">SKU</label>
                                              <input
                                                type="text"
                                                placeholder="SKU"
                                                value={typeof sObj === 'object' ? (sObj.sku || '') : ''}
                                                onChange={(e) => {
                                                  const updatedColors = [...form.available_colors];
                                                  const normalized = typeof updatedColors[idx] === 'object' ? updatedColors[idx] : { ...color, sizes: [] };
                                                  const newSizes = (normalized.sizes || []).map(sz => {
                                                    const szName = typeof sz === 'object' ? sz.name : sz;
                                                    if (szName === sName) {
                                                      return { ...sz, sku: e.target.value };
                                                    }
                                                    return sz;
                                                  });
                                                  updatedColors[idx] = { ...normalized, sizes: newSizes };
                                                  setForm({ ...form, available_colors: updatedColors });
                                                }}
                                                className="w-14 bg-black/60 border border-white/10 rounded-md py-1 px-1.5 text-[7px] font-black text-white text-center outline-none focus:border-[#ce112d] uppercase"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right Side: Image Association */}
                          {form.images?.length > 0 && (
                            <div className="sm:w-48 shrink-0 space-y-2 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-6">
                              <label className="text-[9px] font-black uppercase text-neutral-500 tracking-widest block mb-1">Variant Image</label>
                              <div className="flex flex-wrap gap-2">
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
                                    className={`relative w-12 h-12 rounded-xl overflow-hidden transition-all border-2 cursor-pointer flex-shrink-0 ${color.image === img ? 'border-[#ce112d] scale-110 shadow-[0_0_15px_rgba(206,17,45,0.4)]' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                                  >
                                    <img src={img} className="w-full h-full object-cover" />
                                    {color.image === img && (
                                      <div className="absolute inset-0 bg-[#ce112d]/10 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-lg"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <p className="text-[8px] text-neutral-600 font-bold mt-2">Use the color picker dropper to sample directly from these images.</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Add New Color — Pick hex first, auto-suggest name */}
                  <div className="p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1.5"><Plus size={12} /> Add New Color</p>
                      {form.images?.length > 0 && (
                        <p className="text-[8px] font-black uppercase text-neutral-600 tracking-widest flex items-center gap-1">Sample from photos below <ChevronDown size={10} /></p>
                      )}
                    </div>

                    {/* Photo Quick-Select for Sampling */}
                    {form.images?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pb-2 border-b border-white/5">
                        {form.images.map((img, i) => (
                          <div key={i} className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 opacity-80 hover:opacity-100 transition-opacity">
                            <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      {/* Step 1: Color Picker */}
                      <div className="relative group cursor-pointer w-16 h-16 shrink-0">
                        <div
                          id="newColorHexDisplay"
                          className="absolute inset-0 rounded-2xl border-2 border-white/10 shadow-inner flex items-center justify-center transition-transform hover:scale-105 pointer-events-none"
                          style={{ backgroundColor: '#888888' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" /></svg>
                        </div>
                        <input
                          id="newColorHex"
                          type="color"
                          defaultValue="#888888"
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          onChange={(e) => {
                            const hex = e.target.value;
                            document.getElementById('newColorHexDisplay').style.backgroundColor = hex;
                            // Auto-suggest name
                            const nameInput = document.getElementById('newColorName');
                            if (nameInput) nameInput.value = formatColorName(hex);
                          }}
                          onClick={async (e) => {
                            if (window.EyeDropper) {
                              e.preventDefault();
                              try {
                                const dropper = new window.EyeDropper();
                                const { sRGBHex } = await dropper.open();
                                e.target.value = sRGBHex;
                                document.getElementById('newColorHexDisplay').style.backgroundColor = sRGBHex;
                                // Auto-suggest name
                                const nameInput = document.getElementById('newColorName');
                                if (nameInput) nameInput.value = formatColorName(sRGBHex);
                              } catch (err) { console.log(err); }
                            }
                          }}
                        />
                      </div>

                      {/* Step 2: Auto-suggested name (editable) */}
                      <div className="flex-1 space-y-1">
                        <label className="text-[8px] font-black uppercase text-neutral-600 tracking-widest">① Pick color (use picker on photos) → ② Name auto-fills</label>
                        <input
                          id="newColorName"
                          type="text"
                          placeholder="কালার পিক করুন..."
                          className="w-full bg-neutral-950 border border-white/5 p-3 rounded-xl text-sm font-bold"
                        />
                      </div>

                      {/* Step 3: Add button */}
                      <button
                        type="button"
                        onClick={() => {
                          const nameInput = document.getElementById('newColorName');
                          const hexInput = document.getElementById('newColorHex');
                          const val = nameInput?.value?.trim();
                          const hex = hexInput?.value || '#888888';
                          if (val && !form.available_colors?.some(c => (typeof c === 'object' ? c.name : c) === val)) {
                            setForm({ ...form, available_colors: [...(form.available_colors || []), { name: val, image: null, is_available: true, hex, sizes: [] }] });
                            nameInput.value = '';
                            hexInput.value = '#888888';
                            document.getElementById('newColorHexDisplay').style.backgroundColor = '#888888';
                          }
                        }}
                        className="shrink-0 px-5 py-3 bg-[#ce112d] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-900/20"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-[8px] text-neutral-600 font-bold ml-1">কালার পিক করলে নাম অটো আসবে • নাম এডিট করতে পারবেন • তারপর Add চাপুন</p>
                  </div>
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
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase text-neutral-500 tracking-widest bg-white/5 py-1 px-3 rounded-full">
                    <ShoppingBag size={12} className="text-[#ce112d]" />
                    {orders.filter(o => o.status !== 'Deleted').length} Orders
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-500 py-1 px-3 rounded-full">
                    Total: ৳{orders.filter(o => o.status !== 'Deleted').reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 py-1 px-3 rounded-full">
                    <Users size={12} />
                    {visitorCount} Visitors
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#ce112d] hover:border-[#ce112d] hover:text-white transition-all group"
                >
                  <Download size={16} className="text-[#ce112d] group-hover:text-white" />
                  Export to CSV
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-neutral-950 border border-white/5 p-6 rounded-3xl space-y-2">
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Total Active Revenue</p>
                <p className="text-2xl font-black text-[#ce112d]">৳{orders.filter(o => o.status !== 'Deleted').reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0)}</p>
              </div>
              <div className="bg-neutral-950 border border-white/5 p-6 rounded-3xl space-y-2">
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Pending Orders</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-black text-white">{orders.filter(o => o.status === 'Pending').length}</p>
                  <Clock size={20} className="text-yellow-500 mb-1 opacity-50" />
                </div>
              </div>
              <div className="bg-neutral-950 border border-white/5 p-6 rounded-3xl space-y-2">
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Completed Items</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-black text-white">{orders.filter(o => o.status === 'Delivered').length}</p>
                  <CheckCircle2 size={20} className="text-green-500 mb-1 opacity-50" />
                </div>
              </div>
            </div>

            <div className="hidden lg:block overflow-x-auto no-scrollbar pb-10">
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

                    return orders.filter(o => o.status !== 'Deleted').map(o => {
                      const product = productMap[o.product_id];
                      let productThumb = product?.image_url || product?.images?.[0];

                      if (!productThumb && product?.video_url) {
                        const match = product.video_url.match(/\/(reels|reel|p)\/([a-zA-Z0-9_-]+)/);
                        const id = match ? match[2] : null;
                        if (id) productThumb = `https://images.weserv.nl/?url=instagram.com/p/${id}/media/?size=l`;
                      }

                      return (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
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
                            <div className="flex flex-col gap-1.5">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-black w-max ${o.last_four_digits === 'COD' ? 'bg-green-500/20 text-green-500 border border-green-500/10' : 'bg-blue-500/20 text-blue-500 border border-blue-500/10'}`}>
                                {o.last_four_digits}
                              </span>
                              <button
                                onClick={() => toggleAdvancePayment(o.id, o.is_advance_paid)}
                                className={`px-2 py-1 rounded-full text-[8px] font-black w-max uppercase tracking-tighter transition-all flex items-center gap-1 ${o.is_advance_paid ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-neutral-800 text-neutral-500 border border-white/5 opacity-50 hover:opacity-100'}`}
                                title={o.is_advance_paid ? "Click to Unmark" : "Click to Mark as Paid"}
                              >
                                {o.is_advance_paid ? <Check size={8} /> : null}
                                {o.is_advance_paid ? 'Adv Paid' : 'Mark Paid'}
                              </button>
                            </div>
                          </td>
                          <td className="py-6 pr-4">
                            <button
                              onClick={() => updateOrderNote(o.id, o.customer_note)}
                              className="max-w-[120px] text-left transition-all hover:bg-white/5 p-2 rounded-xl border border-transparent hover:border-white/5 group"
                              title="Click to add/edit note"
                            >
                              <p className={`text-[10px] font-bold leading-relaxed line-clamp-2 italic ${o.customer_note ? 'text-neutral-300' : 'text-neutral-700'}`} title={o.customer_note}>
                                {o.customer_note || "Add Note"}
                              </p>
                            </button>
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
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-2 pb-20">
              {(() => {
                const productMap = {};
                products.forEach(p => productMap[p.id] = p);

                return orders.filter(o => o.status !== 'Deleted').map(o => {
                  const product = productMap[o.product_id];
                  let productThumb = product?.image_url || product?.images?.[0];

                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="bg-neutral-950 border border-white/5 rounded-2xl p-3 flex gap-3 items-start relative hover:border-[#ce112d]/30 transition-all cursor-pointer"
                    >
                      <div className="w-14 h-20 bg-neutral-900 rounded-lg overflow-hidden shrink-0 relative">
                        {productThumb && <img src={productThumb} className="w-full h-full object-cover" alt="" />}
                        {product?.serial_no && (
                          <div className="absolute top-0 right-0 bg-[#ce112d] text-white text-[6px] font-black px-1 rounded-bl">#{product.serial_no}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="text-[10px] font-black text-white truncate pr-2">{o.customer_name}</p>
                          <select
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            className={`bg-neutral-900 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-black uppercase outline-none ${o.status === 'Pending' ? 'text-yellow-500' : o.status === 'Shipped' ? 'text-blue-500' : o.status === 'Delivered' ? 'text-green-500' : 'text-red-500'}`}
                          >
                            <option value="Pending">Pend</option>
                            <option value="Shipped">Ship</option>
                            <option value="Delivered">Deliv</option>
                            <option value="Canceled">Canc</option>
                          </select>
                        </div>
                        <p className="text-[9px] text-[#ce112d] font-black">৳{o.total_amount}</p>
                        <p className="text-[8px] text-neutral-500 truncate leading-tight">{o.delivery_area} • {o.customer_phone}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {o.is_advance_paid ? (
                            <span className="text-[6px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shadow-lg shadow-green-500/20">
                              <Check size={6} /> Paid
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAdvancePayment(o.id, o.is_advance_paid);
                              }}
                              className="text-[6px] font-black bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded uppercase border border-white/5"
                            >
                              Mark Paid
                            </button>
                          )}
                          {o.size && <span className="text-[6px] font-black bg-white/5 text-neutral-400 px-1 py-0.5 rounded uppercase">S:{o.size}</span>}
                          {o.color && <span className="text-[6px] font-black bg-white/5 text-neutral-400 px-1 py-0.5 rounded uppercase">{o.color}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteOrder(o.id)} className="absolute bottom-3 right-3 p-1.5 text-neutral-700 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
            {orders.filter(o => o.status !== 'Deleted').length === 0 && !loading && (
              <div className="py-20 text-center space-y-4">
                <ShoppingBag className="mx-auto text-neutral-800" size={48} />
                <p className="text-neutral-500 text-sm font-bold">No orders found.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'deleted' ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black italic uppercase">Deleted <span className="text-[#ce112d]">Orders</span></h2>
                <p className="text-neutral-500 text-xs mt-2 uppercase font-bold tracking-widest">{orders.filter(o => o.status === 'Deleted').length} ডিলিটেড অর্ডার</p>
              </div>
              {orders.filter(o => o.status === 'Deleted').length > 0 && (
                <button
                  onClick={emptyBin}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={16} /> Empty Bin
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const productMap = {};
                products.forEach(p => productMap[p.id] = p);

                return orders.filter(o => o.status === 'Deleted').map(o => {
                  const product = productMap[o.product_id];
                  let productThumb = product?.image_url || product?.images?.[0];

                  return (
                    <div key={o.id} className="bg-neutral-950 border border-white/5 rounded-[24px] overflow-hidden p-5 space-y-4 opacity-75 hover:opacity-100 transition-all border-dashed">
                      <div className="flex justify-between items-start">
                        <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
                          {new Date(o.created_at).toLocaleDateString()} • {new Date(o.created_at).toLocaleTimeString()}
                        </div>
                        <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[9px] font-black uppercase rounded-lg">Deleted</span>
                      </div>

                      <div className="flex gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="w-16 h-20 bg-neutral-900 rounded-xl overflow-hidden flex-shrink-0 relative">
                          {productThumb ? (
                            <img src={productThumb} className="w-full h-full object-cover grayscale" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-800">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-white leading-tight mb-1">{o.product_name}</p>
                          <p className="text-sm font-black text-neutral-500 mt-2">৳{o.total_amount}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="font-black text-white">{o.customer_name}</p>
                          <p className="text-neutral-500 font-bold">{o.customer_phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase text-neutral-600 mb-1">{o.delivery_area}</p>
                          <p className="text-[9px] text-neutral-500 line-clamp-2">{o.customer_address}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button onClick={() => restoreOrder(o.id)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/10 text-green-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 transition-all">
                          <RotateCcw size={14} /> Undo
                        </button>
                        <button onClick={() => permanentDeleteOrder(o.id)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {orders.filter(o => o.status === 'Deleted').length === 0 && (
              <div className="py-20 text-center space-y-4">
                <Archive className="mx-auto text-neutral-800" size={48} />
                <p className="text-neutral-500 text-sm font-bold">কোনো ডিলিটেড অর্ডার নেই।</p>
              </div>
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-neutral-950 border border-white/5 p-8 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4">
                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.3em]">Avg Rating</p>
                <div className="flex items-end gap-1">
                  <span className="text-6xl font-black italic">{reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'}</span>
                  <span className="text-2xl font-black text-[#ce112d] mb-2">/5</span>
                </div>
                <div className="flex gap-1 text-[#ce112d]">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={20} fill={s <= (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) ? 'currentColor' : 'none'} className={s <= (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) ? 'opacity-100' : 'opacity-20'} />
                  ))}
                </div>
                <p className="text-[10px] font-bold text-neutral-600 uppercase">Based on {reviews.length} reviews</p>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-neutral-950 border border-white/5 p-8 rounded-[40px] space-y-4">
                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-[0.3em] mb-6">Rating Distribution</p>
                {[5, 4, 3, 2, 1].map(stars => {
                  const count = reviews.filter(r => r.rating === stars).length;
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-4">
                      <span className="text-xs font-black text-neutral-500 w-4">{stars}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#ce112d] transition-all duration-1000" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-neutral-600 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-xl font-black italic uppercase tracking-widest text-neutral-500 border-b border-white/5 pb-4">Recent <span className="text-white">Feedback</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {reviews.map(r => (
                  <div key={r.id} className="bg-neutral-950 border border-white/5 rounded-2xl p-5 space-y-3 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={16} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-700'} />
                        ))}
                      </div>
                      <span className="text-[10px] text-neutral-600 font-bold">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-neutral-300 leading-relaxed italic">"{r.comment}"</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold">{r.customer_name || 'Anonymous'}</p>
                      {r.product_name && <p className="text-[9px] text-neutral-600 font-bold uppercase truncate max-w-[120px]">{r.product_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {reviews.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <Star className="mx-auto text-neutral-800" size={48} />
                  <p className="text-neutral-500 text-sm font-bold">এখনো কোনো রিভিউ আসেনি।</p>
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

            <div className="space-y-4">
              {products.filter(p => {
                const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
                if (activeTab === 'soldout') return p.is_sold_out && matchesSearch;
                if (activeTab === 'pending' || activeTab === 'published') {
                  return p.status === activeTab && !p.is_sold_out && matchesSearch;
                }
                return false;
              }).map(p => {
                let displayImage = p.image_url || p.images?.[0];
                if (!displayImage && p.video_url) {
                  const match = p.video_url.match(/\/(reels|reel|p)\/([a-zA-Z0-9_-]+)/);
                  const id = match ? match[2] : null;
                  if (id) displayImage = `https://images.weserv.nl/?url=instagram.com/p/${id}/media/?size=l`;
                }
                if (!displayImage || displayImage.includes('via.placeholder')) {
                  displayImage = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&q=80&w=1000';
                }

                return (
                  <div key={p.id} className="group flex items-center gap-3 bg-neutral-950 border border-white/5 rounded-xl p-2.5 hover:border-[#ce112d]/30 transition-all">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden shrink-0 bg-neutral-900 relative cursor-pointer" onClick={() => p.video_url ? setPreviewVideo(p.video_url) : null}>
                      <img src={displayImage} className="w-full h-full object-cover" loading="lazy" />
                      {p.is_sold_out && <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center"><span className="text-[7px] font-black text-white uppercase">Sold</span></div>}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold truncate">{p.name}</h4>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[#ce112d] text-xs font-black shrink-0">৳{p.price}</span>
                          <span className={`text-[6px] px-1 py-0.5 rounded-[4px] font-black uppercase tracking-wider ${p.status === 'published' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
                            {p.status === 'published' ? 'Live' : 'Draft'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {p.serial_no && <span className="text-[7px] font-bold text-neutral-600">#{p.serial_no}</span>}
                        {p.stock_count !== null && (
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${p.stock_count <= 5 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>S:{p.stock_count}</span>
                        )}
                        {p.available_colors?.length > 0 && <span className="text-[7px] font-bold bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">{p.available_colors.length}C</span>}
                        {p.platform_id && <span className="text-[7px] font-bold bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">{p.platform_id}</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(p)} className="flex flex-col items-center gap-1 p-1.5 min-w-[36px] rounded-lg bg-white/5 hover:bg-[#ce112d] transition-all" title="Edit">
                        <Edit size={12} />
                        <span className="text-[6px] font-black uppercase tracking-tighter">Edit</span>
                      </button>

                      {(activeTab === 'pending' || (activeTab === 'soldout' && p.status === 'pending')) && (
                        <button
                          onClick={() => setConfirmation({
                            isOpen: true,
                            title: 'Publish Product',
                            message: 'Are you sure you want to Publish this product to the main site?',
                            onConfirm: () => supabase.from('products').update({ status: 'published' }).eq('id', p.id).then(fetchProducts)
                          })}
                          className="flex flex-col items-center gap-1 p-1.5 min-w-[36px] rounded-lg bg-[#ce112d]/10 text-[#ce112d] hover:bg-[#ce112d] hover:text-white transition-all"
                        >
                          <CheckCircle2 size={12} />
                          <span className="text-[6px] font-black uppercase tracking-tighter">Live</span>
                        </button>
                      )}

                      {(activeTab === 'published' || (activeTab === 'soldout' && p.status === 'published')) && (
                        <button
                          onClick={() => setConfirmation({
                            isOpen: true,
                            title: 'Unpublish Product',
                            message: 'Are you sure you want to move this product back to Pending/Drafts?',
                            onConfirm: () => supabase.from('products').update({ status: 'pending' }).eq('id', p.id).then(fetchProducts)
                          })}
                          className="flex flex-col items-center gap-1 p-1.5 min-w-[36px] rounded-lg bg-white/5 hover:bg-yellow-500/20 text-neutral-400 hover:text-yellow-500 transition-all"
                        >
                          <Clock size={12} />
                          <span className="text-[6px] font-black uppercase tracking-tighter">Draft</span>
                        </button>
                      )}

                      <button
                        onClick={() => supabase.from('products').update({ is_sold_out: !p.is_sold_out }).eq('id', p.id).then(fetchProducts)}
                        className={`flex flex-col items-center gap-1 p-1.5 min-w-[36px] rounded-lg transition-all ${p.is_sold_out ? 'bg-[#ce112d] text-white shadow-lg shadow-red-900/40' : 'bg-white/5 text-neutral-500 hover:text-red-400'}`}
                        title={p.is_sold_out ? 'Mark Available' : 'Mark Sold Out'}
                      >
                        <ShoppingBag size={12} />
                        <span className="text-[6px] font-black uppercase tracking-tighter">{p.is_sold_out ? 'Sold' : 'Stock'}</span>
                      </button>

                      <button onClick={() => deleteProduct(p.id)} className="flex flex-col items-center gap-1 p-1.5 min-w-[36px] rounded-lg bg-white/5 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 transition-all">
                        <Trash2 size={12} />
                        <span className="text-[6px] font-black uppercase tracking-tighter">Del</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
        }
      </main >

      {/* Video Preview Modal */}
      {
        previewVideo && (
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
        )
      }
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setSelectedOrder(null)}>
          <div className="relative w-full max-w-lg bg-neutral-950 rounded-[32px] overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-transparent via-[#ce112d] to-transparent opacity-50" />

            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black italic uppercase">Order <span className="text-[#ce112d]">Details</span></h3>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
                    {new Date(selectedOrder.created_at).toLocaleDateString('bn-BD')} • {new Date(selectedOrder.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all">
                  <X size={20} className="text-neutral-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Product Section */}
                <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-16 h-20 bg-neutral-900 rounded-xl overflow-hidden shrink-0 border border-white/10">
                    {(() => {
                      const p = products.find(pr => pr.id === selectedOrder.product_id);
                      const thumb = p?.image_url || p?.images?.[0];
                      return thumb ? <img src={thumb} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="m-auto text-neutral-800" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white">{selectedOrder.product_name}</p>
                    <div className="flex gap-2 mt-1">
                      {selectedOrder.size && <span className="text-[8px] font-black bg-[#ce112d]/10 text-[#ce112d] px-1.5 py-0.5 rounded uppercase">Size: {selectedOrder.size}</span>}
                      {selectedOrder.color && <span className="text-[8px] font-black bg-white/10 text-white px-1.5 py-0.5 rounded uppercase">Color: {selectedOrder.color}</span>}
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <p className="text-[#ce112d] font-black text-xs">৳{selectedOrder.product_price}</p>
                      <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Subtotal</p>
                    </div>
                  </div>
                </div>

                {/* Customer Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
                    <div className="min-w-0">
                      <p className="text-[8px] font-black uppercase text-neutral-600 mb-1 tracking-widest">Customer Name</p>
                      <p className="text-sm font-bold text-white truncate">{selectedOrder.customer_name}</p>
                    </div>
                    <button onClick={() => copyToClipboard(selectedOrder.customer_name, "Name")} className="p-2.5 bg-white/5 hover:bg-[#ce112d] rounded-lg transition-all text-neutral-500 hover:text-white">
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
                    <div className="min-w-0">
                      <p className="text-[8px] font-black uppercase text-neutral-600 mb-1 tracking-widest">Phone Number</p>
                      <p className="text-sm font-black text-[#ce112d]">{selectedOrder.customer_phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={`tel:${selectedOrder.customer_phone}`} className="p-2.5 bg-white/5 hover:bg-green-500 rounded-lg transition-all text-neutral-500 hover:text-white">
                        <ExternalLink size={14} />
                      </a>
                      <button onClick={() => copyToClipboard(selectedOrder.customer_phone, "Phone")} className="p-2.5 bg-white/5 hover:bg-[#ce112d] rounded-lg transition-all text-neutral-500 hover:text-white">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
                    <div className="min-w-0 pr-4">
                      <p className="text-[8px] font-black uppercase text-neutral-600 mb-1 tracking-widest">Delivery Address ({selectedOrder.delivery_area})</p>
                      <p className="text-xs font-medium text-neutral-300 leading-relaxed">{selectedOrder.customer_address}</p>
                    </div>
                    <button onClick={() => copyToClipboard(selectedOrder.customer_address, "Address")} className="p-2.5 bg-white/5 hover:bg-[#ce112d] rounded-lg transition-all text-neutral-500 hover:text-white shrink-0 mt-1">
                      <Copy size={14} />
                    </button>
                  </div>

                  {selectedOrder.customer_note && (
                    <div className="flex items-start justify-between p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10">
                      <div className="min-w-0 pr-4">
                        <p className="text-[8px] font-black uppercase text-yellow-500/60 mb-1 tracking-widest">Customer Note</p>
                        <p className="text-xs font-medium text-yellow-500/80 leading-relaxed italic">{selectedOrder.customer_note}</p>
                      </div>
                      <button onClick={() => copyToClipboard(selectedOrder.customer_note, "Note")} className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500 rounded-lg transition-all text-yellow-500/50 hover:text-white shrink-0 mt-1">
                        <Copy size={14} />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black uppercase text-neutral-600 mb-1 tracking-widest">Delivery Charge</p>
                      <p className="text-sm font-black text-white">৳{selectedOrder.delivery_charge || 0}</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="min-w-0">
                        <p className="text-[8px] font-black uppercase text-neutral-600 mb-1 tracking-widest">Sender Number</p>
                        <p className="text-sm font-black text-[#ce112d]">{selectedOrder.last_four_digits || 'N/A'}</p>
                      </div>
                      <button onClick={() => copyToClipboard(selectedOrder.last_four_digits, "Sender Number")} className="p-2 bg-white/5 hover:bg-[#ce112d] rounded-lg transition-all text-neutral-500 hover:text-white">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      toggleAdvancePayment(selectedOrder.id, selectedOrder.is_advance_paid);
                      setSelectedOrder({ ...selectedOrder, is_advance_paid: !selectedOrder.is_advance_paid });
                    }}
                    className={`flex-1 p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${selectedOrder.is_advance_paid ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-neutral-900 border-white/10 text-neutral-500 hover:border-white/20'}`}
                  >
                    <span className="text-[14px] font-black italic">৳{selectedOrder.total_amount}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">{selectedOrder.is_advance_paid ? 'Advance Paid' : 'Mark as Paid'}</span>
                  </button>
                  <div className={`flex-1 p-3 rounded-2xl border flex flex-col items-center justify-center font-black uppercase tracking-widest ${selectedOrder.status === 'Delivered' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-[#ce112d]/10 border-[#ce112d]/20 text-[#ce112d]'}`}>
                    <span className="text-[14px] italic">{selectedOrder.status}</span>
                    <span className="text-[8px]">Status</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
      />
    </div >
  );
}
