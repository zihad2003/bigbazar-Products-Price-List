import { useState, useEffect, useMemo } from 'react';
import { bigBazarApi } from '../api/client';
import { setToken, API_URL } from '../api/client';
import {
  Plus, Trash2, LogOut, Image as ImageIcon, Search,
  Settings, ShoppingBag, Edit, X, Play, Check,
  AlertCircle, Instagram, CheckCircle2, Clock, Upload, Save, Download, Package, Box,
  Sun, Moon, Star, RotateCcw, Archive, MessageSquare, Users, User, Phone, MapPin, Truck, ShieldCheck, Pipette, Menu, Copy, ExternalLink,
  Pencil, ChevronDown, ArrowRight, ArrowLeft, Video
} from 'lucide-react';
import { extractInstagramId, fetchInstagramData } from '../utils/instagram';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { formatColorName, getColorName, COLOR_MAP } from '../utils/colorNames';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import AlertModal from '../components/modals/AlertModal';
import VideoPlayer from '../components/VideoPlayer';
import ModeratorEntry from '../components/ModeratorEntry';

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
  const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Delete' });
  const [siteTheme, setSiteTheme] = useState('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingCodes, setPendingCodes] = useState([]);

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

  const [formStep, setFormStep] = useState(1);
  const [form, setForm] = useState({
    name: '', price: '', original_price: '', description: '',
    images: [], video_url: '', is_sale: false, is_hot: false,
    is_new: false, is_sold_out: false, is_exclusive: false, category: 'Women',
    status: 'published', platform_id: '', serial_no: '',
    available_sizes: [], available_colors: [], stock_count: ''
  });

  const [siteSettings, setSiteSettings] = useState({
    hero_banner: { title: '', subtitle: '', image_url: '' },
    contact_info: { whatsapp: '', facebook: '', instagram: '' },
    main_slides: [],
    category_visibility: { show_new: true, show_sale: true, show_exclusive: true },
    announcement: {
      enabled: false,
      title_bn: 'গুরুত্বপূর্ণ বিজ্ঞপ্তি',
      title_en: 'Important Notice',
      message_bn: 'প্রিয় গ্রাহক, Big Bazar-এর সাথে থাকার জন্য ধন্যবাদ! বর্তমানে আমাদের ইনবক্সে মেসেজের চাপ অনেক বেশি থাকায় রিপ্লাই দিতে সাময়িক বিলম্ব হচ্ছে। আপনার শপিং অভিজ্ঞতা আরও সহজ ও দ্রুত করতে, অনুগ্রহ করে ওয়েবসাইট থেকেই সরাসরি অর্ডার করুন।',
      message_en: 'Dear customer, thanks for staying with Big Bazar! Currently, due to a high volume of messages, replies may be delayed. To make your shopping easier and faster, please order directly from the website.',
      footer_bn: 'Website থেকে অর্ডার করুন — দ্রুত ও সহজ!',
      footer_en: 'Order from Website — Fast & Easy!'
    }
  });

  useEffect(() => {
    bigBazarApi.auth.getSession().then(({ data: { session } }) => setSession(session));
    bigBazarApi.auth.onAuthStateChange((_event, session) => setSession(session));
    fetchProducts();
    fetchOrders();
    fetchReviews();
    fetchSiteSettings();

    // Fetch total site visitor count from bigBazarApi
    bigBazarApi.from('site_settings').select('value').eq('key', 'visitor_count').single()
      .then(({ data }) => setVisitorCount(data?.value || 0))
      .catch(() => 0);
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await bigBazarApi
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setProducts(data || []);
    setLoading(false);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await bigBazarApi
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    setOrders(data || []);
    setLoading(false);
  };

  const fetchReviews = async () => {
    const { data } = await bigBazarApi
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setReviews(data || []);
  };

  const updateOrderStatus = async (id, status) => {
    setConfirmation({
      isOpen: true,
      title: 'Update Order Status',
      message: `আপনি কি পরিবর্তন করে "${status}" করতে চান?`,
      confirmText: 'Update Status',
      onConfirm: async () => {
        const { error } = await bigBazarApi.from('orders').update({ status }).eq('id', id);
        if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
        else {
          fetchOrders();
          if (selectedOrder?.id === id) {
            setSelectedOrder({ ...selectedOrder, status });
          }
        }
      }
    });
  };

  const updateOrderNote = async (id, currentNote) => {
    const newNote = prompt('অর্ডার নোট আপডেট করুন:', currentNote || '');
    if (newNote !== null) {
      const { error } = await bigBazarApi.from('orders').update({ customer_note: newNote }).eq('id', id);
      if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
      else {
        fetchOrders();
        if (selectedOrder?.id === id) {
          setSelectedOrder({ ...selectedOrder, customer_note: newNote });
        }
      }
    }
  };

  const togglePaymentStatus = async (order, targetStatus) => {
    // If targetStatus matches current, reset to Unpaid
    const nextStatus = order.payment_status === targetStatus ? 'Unpaid' : targetStatus;

    setConfirmation({
      isOpen: true,
      title: 'Update Payment Status',
      message: `পেমেন্ট স্ট্যাটাস "${nextStatus}" করতে চান?`,
      confirmText: 'Update Payment',
      onConfirm: async () => {
        const { error } = await bigBazarApi
          .from('orders')
          .update({
            payment_status: nextStatus,
            is_advance_paid: nextStatus !== 'Unpaid'
          })
          .eq('id', order.id);

        if (error) {
          // Fallback for older schemas without payment_status column
          const { error: fallbackError } = await bigBazarApi
            .from('orders')
            .update({ is_advance_paid: nextStatus !== 'Unpaid' })
            .eq('id', order.id);

          if (fallbackError) {
            setAlertModal({ isOpen: true, title: 'Error', message: fallbackError.message, type: 'error' });
          } else {
            fetchOrders();
            if (selectedOrder?.id === order.id) {
              setSelectedOrder({ ...selectedOrder, is_advance_paid: nextStatus !== 'Unpaid' });
            }
          }
        } else {
          fetchOrders();
          if (selectedOrder?.id === order.id) {
            setSelectedOrder({ ...selectedOrder, payment_status: nextStatus, is_advance_paid: nextStatus !== 'Unpaid' });
          }
        }
      }
    });
  };

  const toggleAdvancePayment = async (id, currentStatus) => {
    // Kept for backward compatibility if needed elsewhere, but redirecting to new logic
    const order = orders.find(o => o.id === id);
    if (order) togglePaymentStatus(order, 'Advance Paid');
  };

  // Soft delete — moves to 'Deleted' status instead of permanent delete
  const deleteOrder = async (id) => {
    setConfirmation({
      isOpen: true,
      title: 'Delete Order',
      message: 'অর্ডারটি ডিলিটেড সেকশনে সরানো হবে। পরে Undo করা যাবে।',
      confirmText: 'Trash',
      onConfirm: async () => {
        const { error } = await bigBazarApi.from('orders').update({ status: 'Deleted' }).eq('id', id);
        if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
        else {
          fetchOrders();
          if (selectedOrder?.id === id) {
            setSelectedOrder({ ...selectedOrder, status: 'Deleted' });
          }
        }
      }
    });
  };

  // Undo — restore deleted order back to Pending
  const restoreOrder = async (id) => {
    setConfirmation({
      isOpen: true,
      title: 'Restore Order',
      message: 'আপনি কি এই অর্ডারটি পুনরুদ্ধার করতে চান?',
      confirmText: 'Restore Order',
      onConfirm: async () => {
        const { error } = await bigBazarApi.from('orders').update({ status: 'Pending' }).eq('id', id);
        if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
        else {
          fetchOrders();
          setAlertModal({ isOpen: true, title: 'Restored!', message: 'অর্ডারটি সফলভাবে পুনরুদ্ধার করা হয়েছে।', type: 'success' });
        }
      }
    });
  };

  // Permanent delete
  const permanentDeleteOrder = async (id) => {
    setConfirmation({
      isOpen: true,
      title: 'Permanent Delete',
      message: 'এই অর্ডারটি চিরতরে মুছে ফেলা হবে। এটি আর ফেরানো যাবে না!',
      confirmText: 'Delete Forever',
      onConfirm: async () => {
        const { error } = await bigBazarApi.from('orders').delete().eq('id', id);
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
      confirmText: 'Empty All',
      onConfirm: async () => {
        const { error } = await bigBazarApi.from('orders').delete().eq('status', 'Deleted');
        if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
        else fetchOrders();
      }
    });
  };

  const fetchSiteSettings = async () => {
    const { data } = await bigBazarApi.from('site_settings').select('*');
    const settings = {
      hero_banner: { title: '5% FLAT DISCOUNT', subtitle: 'FOR THE 10K FAMILY ON FACEBOOK PAGE', image_url: null },
      contact_info: { whatsapp: '', facebook: '', instagram: '' },
      main_slides: [],
      category_visibility: { show_new: true, show_sale: true, show_exclusive: true },
      announcement: {
        enabled: false,
        title_bn: 'গুরুত্বপূর্ণ বিজ্ঞপ্তি',
        title_en: 'Important Notice',
        message_bn: 'প্রিয় গ্রাহক, Big Bazar-এর সাথে থাকার জন্য ধন্যবাদ! বর্তমানে আমাদের ইনবক্সে মেসেজের চাপ অনেক বেশি থাকায় রিপ্লাই দিতে সাময়িক বিলম্ব হচ্ছে। আপনার শপিং অভিজ্ঞতা আরও সহজ ও দ্রুত করতে, অনুগ্রহ করে ওয়েবসাইট থেকেই সরাসরি অর্ডার করুন।',
        message_en: 'Dear customer, thanks for staying with Big Bazar! Currently, due to a high volume of messages, replies may be delayed. To make your shopping easier and faster, please order directly from the website.',
        footer_bn: 'Website থেকে অর্ডার করুন — দ্রুত ও সহজ!',
        footer_en: 'Order from Website — Fast & Easy!'
      }
    };

    if (data) {
      const banner = data.find(s => s.key === 'hero_banner')?.value;
      const contact = data.find(s => s.key === 'contact_info')?.value;
      const slides = data.find(s => s.key === 'main_slides')?.value;
      const announcement = data.find(s => s.key === 'announcement')?.value;
      if (banner) settings.hero_banner = banner;
      if (contact) settings.contact_info = contact;
      if (slides) settings.main_slides = Array.isArray(slides) ? slides : [];
      if (announcement) settings.announcement = announcement;
      const themeData = data.find(s => s.key === 'site_theme')?.value;
      if (themeData?.mode) setSiteTheme(themeData.mode);
      const catVis = data.find(s => s.key === 'category_visibility')?.value;
      if (catVis) settings.category_visibility = catVis;
    }
    setSiteSettings(settings);
  };

  const fetchPendingCodes = async () => {
    const token = localStorage.getItem('bb_auth_token');
    try {
      const res = await fetch(`${API_URL}/api/auth/pending-codes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setPendingCodes(json.codes || []);
    } catch { setPendingCodes([]); }
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
      const { data: maxSerialData } = await bigBazarApi
        .from('products')
        .select('serial_no')
        .order('serial_no', { ascending: false })
        .limit(1);

      const maxSerial = maxSerialData && maxSerialData.length > 0 ? maxSerialData[0].serial_no : 0;
      finalSerialNo = maxSerial + 1;
    }

    const { _newColorHex, _newColorName, _colorSuggestions, ...formData } = form;
    const productData = {
      ...formData,
      price: parseFloat(form.price) || 0,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      serial_no: parseInt(finalSerialNo),
      stock_count: form.stock_count !== '' ? parseInt(form.stock_count) : null,
      is_exclusive: form.is_exclusive || false,
      // platform_id can be null; video_url & description must stay as empty string (DB NOT NULL)
      platform_id: form.platform_id || null,
      video_url: form.video_url || '',
      description: form.description || '',
      image_url: (form.images && form.images.length > 0) ? form.images[0] : (form.image_url || null),
    };

    let error;
    if (editingProduct) {
      const { error: err } = await bigBazarApi.from('products').update(productData).eq('id', editingProduct.id);
      error = err;
    } else {
      const { error: err } = await bigBazarApi.from('products').insert([productData]);
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
    const { error } = await bigBazarApi.from('site_settings').upsert({ key: 'hero_banner', value: siteSettings.hero_banner }, { onConflict: 'key' });
    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
    else setAlertModal({ isOpen: true, title: 'Success', message: "Hero Banner Updated!", type: 'success' });
    setLoading(false);
  };

  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const uploadSingleFile = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `assets/${fileName}`;

    const { data: uploadData, error: uploadError } = await bigBazarApi.storage.from('assets').upload(filePath, file, {
      cacheControl: '31536000',
      upsert: false
    });
    
    if (uploadError) {
      console.error(uploadError);
      return null;
    }
    
    // Support for local Express API which returns the exact fullPath immediately
    if (uploadData && uploadData.fullPath) {
      return uploadData.fullPath;
    }

    const { data } = bigBazarApi.storage.from('assets').getPublicUrl(uploadData?.path || filePath);
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
      confirmText: 'Delete',
      onConfirm: async () => {
        const { error } = await bigBazarApi.from('products').delete().eq('id', id);
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
      is_new: false, is_sold_out: false, is_exclusive: false, category: 'Women',
      status: 'published', platform_id: '', serial_no: '',
      available_sizes: [], available_colors: [], stock_count: ''
    });
    setFormStep(1);
  };

  const startEdit = (p) => {
    setEditingProduct(p);
    setForm(p);
    setFormStep(1);
    setActiveTab('add');
  };

  if (!session) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8 bg-zinc-900 p-10 rounded-[32px] border border-white/5 shadow-2xl">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-white uppercase">Admin <span className="text-[#ce112d]">Login</span></h2>
          <p className="text-sm text-zinc-500 font-medium">
            Enter your credentials to access the dashboard
          </p>
        </div>



        <form onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Login failed');
            
            // Direct login
            setToken(json.session.access_token);
            setSession(json.session);
          } catch (err) {
            setAlertModal({ isOpen: true, title: 'Login Failed', message: err.message, type: 'error' });
          } finally {
            setLoading(false);
          }
        }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Email Address</label>
            <input
              type="email"
              placeholder="admin@bigbazar.com"
              className="w-full bg-black border border-zinc-800 h-12 px-4 rounded-2xl text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all text-white"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-black border border-zinc-800 h-12 px-4 rounded-2xl text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all text-white"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button disabled={loading} className="w-full bg-[#ce112d] h-14 rounded-2xl font-bold uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-red-900/20 text-white text-sm mt-4 disabled:opacity-50">
            {loading ? 'Verifying...' : 'Continue →'}
          </button>
        </form>
      </div>

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
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-zinc-950 border-b border-white/5 sticky top-0 z-[60] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-[#ce112d] w-5 h-5" />
          <h1 className="text-lg font-bold uppercase tracking-tight text-white">Big<span className="text-[#ce112d]">Bazar</span></h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-zinc-900 rounded-xl transition-all"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Position */}
      <aside className={`fixed lg:sticky top-0 left-0 w-64 h-[100dvh] lg:h-screen border-r border-white/5 px-6 pt-24 pb-6 lg:py-8 flex flex-col justify-between shrink-0 bg-zinc-950 z-50 transition-transform duration-300 lg:translate-x-0 overflow-y-auto no-scrollbar ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="space-y-10">
          <div className="hidden lg:flex items-center gap-3 px-2">
            <ShoppingBag className="text-[#ce112d]" />
            <h1 className="text-xl font-bold uppercase tracking-tight text-white">Big<span className="text-[#ce112d]">Bazar</span></h1>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'pending-items', icon: <Package size={18} />, label: 'Pending Items', count: orders.filter(o => o && o.status === 'Pending').length },
              { id: 'orders', icon: <ShoppingBag size={18} />, label: 'All Orders', count: orders.filter(o => o && o.status !== 'Deleted').length },
              { id: 'deleted', icon: <Archive size={18} />, label: 'Deleted', count: orders.filter(o => o && o.status === 'Deleted').length },
              { id: 'reviews', icon: <Star size={18} />, label: 'Reviews', count: reviews.length },
              { id: 'pending', icon: <Clock size={18} />, label: 'Drafts', count: products.filter(p => p && p.status === 'pending' && !p.is_sold_out).length },
              { id: 'published', icon: <CheckCircle2 size={18} />, label: 'Live Products', count: products.filter(p => p && p.status === 'published' && !p.is_sold_out).length },
              { id: 'soldout', icon: <AlertCircle size={18} />, label: 'Sold Out', count: products.filter(p => p && p.is_sold_out).length },
              { id: 'add', icon: <Plus size={18} />, label: 'Add Product', special: true },
              { id: 'settings', icon: <Settings size={18} />, label: 'System Settings' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                  if (tab.id === 'settings') fetchPendingCodes();
                }}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-[11px] font-bold tracking-wider transition-all duration-200 ${tab.special && activeTab !== tab.id ? 'border-2 border-dashed border-[#ce112d]/40 text-[#ce112d] hover:bg-[#ce112d]/10 hover:border-[#ce112d]' : activeTab === tab.id ? 'bg-[#ce112d] text-white shadow-lg shadow-red-900/30' : 'hover:bg-white/5 text-zinc-500 hover:text-white'}`}
              >
                <div className={`${activeTab === tab.id ? 'text-white' : 'text-zinc-600 group-hover:text-white'}`}>{tab.icon}</div>
                <span className="uppercase">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-auto text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-900 text-zinc-500'}`}>{tab.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/5 pt-6 space-y-2">
          <button
            onClick={() => {
              fetchProducts();
              fetchOrders();
              fetchReviews();
            }}
            disabled={loading}
            className="w-full flex items-center gap-3 p-4 text-zinc-500 hover:text-white transition-all rounded-2xl hover:bg-white/5 text-xs font-semibold"
          >
            <RotateCcw size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing..." : "Refresh Data"}
          </button>

          <button
            onClick={() => {
              bigBazarApi.auth.signOut();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 p-4 text-zinc-700 hover:text-red-500 transition-all rounded-2xl hover:bg-white/5 text-xs font-semibold"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto no-scrollbar">
        {activeTab === 'settings' ? (
          <div className="max-w-3xl space-y-12">
            <div>
              <h2 className="text-3xl font-bold italic uppercase tracking-tight text-white">Site <span className="text-[#ce112d]">Settings</span></h2>
              <p className="text-zinc-500 text-xs mt-2 font-medium">Configure banner and system notifications</p>
            </div>

            <div className="space-y-8 pt-12 border-t border-white/5">
              <div>
                <h3 className="text-xl font-bold italic uppercase tracking-tight text-white">Home Slider <span className="text-[#ce112d]">Images</span></h3>
                <p className="text-zinc-500 text-xs mt-1 font-medium">Carousel images for the main page (স্লাইডার ইমেজ)</p>
              </div>

              <div className="space-y-6">
                {siteSettings.main_slides?.map((slide, i) => (
                  <div key={slide.id || i} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                    <div className="relative aspect-[21/9] bg-black">
                      <img src={slide.image} className="w-full h-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => setSiteSettings({ ...siteSettings, main_slides: siteSettings.main_slides.filter((_, idx) => idx !== i) })}
                        className="absolute top-3 right-3 p-2.5 bg-black/60 text-white rounded-xl hover:bg-[#ce112d] transition-all shadow-xl backdrop-blur-md"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white/60 uppercase">Slide {i + 1}</div>
                    </div>
                    <div className="p-4 space-y-3">
                      <input
                        value={slide.title || ''}
                        placeholder="Slide title (optional)"
                        onChange={e => {
                          const updated = [...siteSettings.main_slides];
                          updated[i] = { ...slide, title: e.target.value };
                          setSiteSettings({ ...siteSettings, main_slides: updated });
                        }}
                        className="w-full bg-black/40 border border-white/5 h-10 px-3 rounded-xl text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50 transition-all"
                      />
                      <input
                        value={slide.subtitle || ''}
                        placeholder="Subtitle (optional)"
                        onChange={e => {
                          const updated = [...siteSettings.main_slides];
                          updated[i] = { ...slide, subtitle: e.target.value };
                          setSiteSettings({ ...siteSettings, main_slides: updated });
                        }}
                        className="w-full bg-black/40 border border-white/5 h-10 px-3 rounded-xl text-xs text-zinc-400 placeholder:text-zinc-700 outline-none focus:border-white/10 transition-all"
                      />
                      <input
                        value={slide.cta || ''}
                        placeholder="Button text, e.g. Shop Now (optional)"
                        onChange={e => {
                          const updated = [...siteSettings.main_slides];
                          updated[i] = { ...slide, cta: e.target.value };
                          setSiteSettings({ ...siteSettings, main_slides: updated });
                        }}
                        className="w-full bg-black/40 border border-white/5 h-10 px-3 rounded-xl text-xs text-[#ce112d] placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/30 transition-all font-bold"
                      />
                      <input
                        value={slide.product_id || ''}
                        placeholder="Target Product ID (optional)"
                        onChange={e => {
                          const updated = [...siteSettings.main_slides];
                          updated[i] = { ...slide, product_id: e.target.value };
                          setSiteSettings({ ...siteSettings, main_slides: updated });
                        }}
                        className="w-full bg-black/40 border border-white/5 h-10 px-3 rounded-xl text-[10px] text-zinc-500 placeholder:text-zinc-800 outline-none focus:border-white/10 transition-all font-mono"
                      />
                    </div>
                  </div>
                ))}
                <label className="flex items-center justify-center gap-3 h-24 rounded-2xl border-2 border-dashed border-zinc-800 cursor-pointer hover:bg-zinc-900 hover:border-[#ce112d]/50 transition-all text-zinc-500 hover:text-white">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 shadow-lg">
                    <Plus size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Add Slide</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleFileUpload(e, 'slider')} />
                </label>
              </div>

              <div className="flex pt-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await bigBazarApi.from('site_settings').upsert({ key: 'main_slides', value: siteSettings.main_slides }, { onConflict: 'key' });
                    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
                    else setAlertModal({ isOpen: true, title: 'Success', message: "Slider Updated Successfully!", type: 'success' });
                    setLoading(false);
                  }}
                  className="flex items-center gap-2 bg-[#ce112d] px-10 h-14 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-red-900/30 active:scale-95 transition-all disabled:opacity-50 text-white"
                >
                  {loading ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{loading ? 'Saving...' : 'Save Slider'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-8 pt-12 border-t border-white/5">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white">Announcement <span className="text-[#ce112d]">Banner</span></h3>
                <p className="text-zinc-500 text-[11px] mt-2 uppercase font-bold tracking-widest">Manage the notification banner on home page (বিজ্ঞপ্তির ব্যানার পরিবর্তন করুন)</p>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 space-y-8">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${siteSettings.announcement?.enabled ? 'bg-[#ce112d] text-white shadow-lg shadow-red-500/20' : 'bg-zinc-800 text-zinc-600'}`}>
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Show Announcement</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Toggle visibility on home page</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSiteSettings({
                      ...siteSettings,
                      announcement: { ...siteSettings.announcement, enabled: !siteSettings.announcement?.enabled }
                    })}
                    className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${siteSettings.announcement?.enabled ? 'bg-[#ce112d]' : 'bg-zinc-800'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${siteSettings.announcement?.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Bangla Content */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ce112d]" /> Bangla Content (বাংলা ভাষা)
                  </label>
                  <input
                    value={siteSettings.announcement?.title_bn || ''}
                    placeholder="বিজ্ঞপ্তির শিরোনাম (যেমন: গুরুত্বপূর্ণ বিজ্ঞপ্তি)"
                    onChange={e => setSiteSettings({
                      ...siteSettings,
                      announcement: { ...siteSettings.announcement, title_bn: e.target.value }
                    })}
                    className="w-full bg-black/40 border border-white/5 h-12 px-4 rounded-xl text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50 transition-all"
                  />
                  <textarea
                    value={siteSettings.announcement?.message_bn || ''}
                    placeholder="বিজ্ঞপ্তির বিস্তারিত বার্তা"
                    rows={4}
                    onChange={e => setSiteSettings({
                      ...siteSettings,
                      announcement: { ...siteSettings.announcement, message_bn: e.target.value }
                    })}
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-medium text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50 transition-all resize-none"
                  />
                  <input
                    value={siteSettings.announcement?.footer_bn || ''}
                    placeholder="নিচের ছোট বার্তা (যেমন: Website থেকে অর্ডার করুন)"
                    onChange={e => setSiteSettings({
                      ...siteSettings,
                      announcement: { ...siteSettings.announcement, footer_bn: e.target.value }
                    })}
                    className="w-full bg-black/40 border border-white/5 h-12 px-4 rounded-xl text-sm font-bold text-zinc-400 placeholder:text-zinc-700 outline-none focus:border-white/10 transition-all"
                  />
                </div>

                {/* English Content */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] px-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> English Content
                  </label>
                  <input
                    value={siteSettings.announcement?.title_en || ''}
                    placeholder="Announcement Title (e.g., Important Notice)"
                    onChange={e => setSiteSettings({
                      ...siteSettings,
                      announcement: { ...siteSettings.announcement, title_en: e.target.value }
                    })}
                    className="w-full bg-black/40 border border-white/5 h-12 px-4 rounded-xl text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50 transition-all"
                  />
                  <textarea
                    value={siteSettings.announcement?.message_en || ''}
                    placeholder="Announcement detailed message"
                    rows={4}
                    onChange={e => setSiteSettings({
                      ...siteSettings,
                      announcement: { ...siteSettings.announcement, message_en: e.target.value }
                    })}
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-medium text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50 transition-all resize-none"
                  />
                  <input
                    value={siteSettings.announcement?.footer_en || ''}
                    placeholder="Footer small message (e.g., Order from Website)"
                    onChange={e => setSiteSettings({
                      ...siteSettings,
                      announcement: { ...siteSettings.announcement, footer_en: e.target.value }
                    })}
                    className="w-full bg-black/40 border border-white/5 h-12 px-4 rounded-xl text-sm font-bold text-zinc-400 placeholder:text-zinc-700 outline-none focus:border-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex pt-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await bigBazarApi.from('site_settings').upsert({ key: 'announcement', value: siteSettings.announcement }, { onConflict: 'key' });
                    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
                    else setAlertModal({ isOpen: true, title: 'Success', message: "Announcement Updated Successfully!", type: 'success' });
                    setLoading(false);
                  }}
                  className="flex items-center gap-2 bg-[#ce112d] px-10 h-14 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-red-900/30 active:scale-95 transition-all disabled:opacity-50 text-white"
                >
                  {loading ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{loading ? 'Saving...' : 'Save Announcement'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-8 pt-12 border-t border-white/5">
              <div>
                <h3 className="text-xl font-bold italic uppercase tracking-tight text-white">Category <span className="text-[#ce112d]">Filters</span></h3>
                <p className="text-zinc-500 text-xs mt-1 font-medium">Show or hide category tabs on the homepage</p>
              </div>
              <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 space-y-4">
                {[
                  { key: 'show_new',       label: 'New Arrivals Tab',     desc: 'Shows the "New" filter on homepage', icon: <><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></> },
                  { key: 'show_sale',      label: 'Sale / Offers Tab',    desc: 'Shows the "Sale" filter on homepage', icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" /></> },
                  { key: 'show_exclusive', label: 'Premium Collections Tab', desc: 'Shows the "Premium" filter on homepage', icon: <><path d="M12 15l-2 5L9 9l11 4-5 2zm0 0l4 4M7.5 13.5L5 15l1 1M8.5 8L7 5l-1 1M15.5 8L17 5l1 1" /><path d="M12 7a5 5 0 100 10 5 5 0 000-10z" /></> },
                ].map(({ key, label, desc, icon }) => {
                  const isOn = (siteSettings.category_visibility || {})[key] !== false;
                  return (
                    <div key={key} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOn ? 'bg-[#ce112d] text-white shadow-lg shadow-red-500/20' : 'bg-zinc-800 text-zinc-600'}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white uppercase tracking-wider">{label}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{desc}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSiteSettings(prev => ({ ...prev, category_visibility: { ...(prev.category_visibility || {}), [key]: !isOn } }))}
                        className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${isOn ? 'bg-[#ce112d]' : 'bg-zinc-800'}`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await bigBazarApi.from('site_settings').upsert({ key: 'category_visibility', value: siteSettings.category_visibility || {} }, { onConflict: 'key' });
                    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
                    else setAlertModal({ isOpen: true, title: 'Saved!', message: 'Category visibility updated.', type: 'success' });
                    setLoading(false);
                  }}
                  className="flex items-center gap-2 bg-[#ce112d] px-10 h-14 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-red-900/30 active:scale-95 transition-all disabled:opacity-50 text-white"
                >
                  {loading ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{loading ? 'Saving...' : 'Save Visibility'}</span>
                </button>
              </div>
            </div>

            {/* Security — Pending Admin Login Codes */}
            <div className="space-y-6 pt-12 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold italic uppercase tracking-tight text-white">Security <span className="text-[#ce112d]">Codes</span></h3>
                  <p className="text-zinc-500 text-xs mt-1 font-medium">Active 2FA codes for pending admin logins (expire in 5 min)</p>
                </div>
                <button
                  onClick={fetchPendingCodes}
                  className="flex items-center gap-2 px-4 h-10 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition-all"
                >
                  <RotateCcw size={14} /> Refresh
                </button>
              </div>

              {pendingCodes.length === 0 ? (
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8 text-center">
                  <ShieldCheck size={32} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-600 text-sm font-bold">No pending login attempts</p>
                  <p className="text-zinc-700 text-xs mt-1">Codes appear here when someone tries to log in</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingCodes.map(entry => (
                    <div key={entry.login_id} className="bg-zinc-900 border border-[#ce112d]/20 rounded-2xl p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{entry.email}</p>
                        <p className="text-xs text-zinc-600">Expires in {entry.expires_in}s</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-4xl font-black tracking-[0.25em] text-[#ce112d] font-mono">{entry.code}</div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(entry.code); }}
                          className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : activeTab === 'add' ? (
          <form onSubmit={handleProductSubmit} className="max-w-5xl space-y-6 md:space-y-12 pb-24 mx-auto">
            {/* Form Header */}
            <div className="bg-zinc-900/80 p-4 md:p-8 rounded-2xl md:rounded-[40px] border border-white/5 backdrop-blur-xl sticky top-0 lg:top-0 z-30 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white line-clamp-1">
                    {editingProduct ? 'Update' : 'Add'} <span className="text-[#ce112d]">Product</span>
                  </h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mt-1 italic">Fill all details below</p>
                </div>
                <button type="button" onClick={cancelEdit} className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all" title="Cancel">
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* IDENTITY & PRICING */}
              <div className="space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                  {/* Left Column: Basic Info */}
                  <div className="lg:col-span-12 space-y-8">
                    <div className="bg-zinc-900 border border-white/5 rounded-2xl md:rounded-[40px] p-4 md:p-10 shadow-2xl space-y-6 md:space-y-10">
                      <div className="space-y-6">
                        <div className="group">
                          <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-[0.2em] px-1 group-focus-within:text-[#ce112d] transition-colors">Product Name</label>
                          <input 
                            value={form.name} 
                            placeholder="e.g. Premium Mirror Work Panjabi 2024"
                            className="w-full bg-black/40 border-2 border-zinc-800 p-4 md:p-5 h-12 md:h-16 rounded-2xl md:rounded-3xl text-sm md:text-base font-black focus:border-[#ce112d] outline-none transition-all placeholder:text-zinc-800 text-white shadow-inner uppercase italic" 
                            onChange={e => setForm({ ...form, name: e.target.value })} 
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pt-4">
                          <div className="group">
                             <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-[0.2em] px-1">Original Price</label>
                             <div className="relative">
                               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 font-black text-xl italic">৳</span>
                               <input 
                                 type="number" 
                                 value={form.original_price || ''} 
                                 placeholder="1850" 
                                 className="w-full bg-black/40 border-2 border-zinc-800 pl-10 md:pl-12 pr-4 md:pr-6 h-12 md:h-16 rounded-2xl md:rounded-3xl text-lg md:text-xl font-black focus:border-white/20 outline-none transition-all placeholder:text-zinc-800 text-zinc-400 italic" 
                                 onChange={e => setForm({ ...form, original_price: e.target.value })} 
                               />
                             </div>
                          </div>
                          <div className="group">
                             <label className="text-[10px] font-black uppercase text-[#ce112d] mb-3 block tracking-[0.2em] px-1">Sale Price</label>
                             <div className="relative">
                               <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#ce112d] font-black text-xl italic animate-pulse">৳</span>
                               <input 
                                 type="number" 
                                 value={form.price || ''} 
                                 placeholder="1450" 
                                 className="w-full bg-black/40 border-2 border-[#ce112d]/30 pl-10 md:pl-12 pr-4 md:pr-6 h-12 md:h-16 rounded-2xl md:rounded-3xl text-xl md:text-2xl font-black focus:border-[#ce112d] outline-none transition-all placeholder:text-zinc-800 text-[#ce112d] italic shadow-[0_0_30px_rgba(206,17,45,0.1)]" 
                                 onChange={e => setForm({ ...form, price: e.target.value })} 
                               />
                             </div>
                          </div>
                        </div>

                        <div className="pt-6">
                          <label className="text-[10px] font-black uppercase text-zinc-500 mb-4 block tracking-[0.2em] px-1">Category</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
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
                                className={`py-3 md:py-5 px-3 rounded-2xl md:rounded-[24px] text-[10px] md:text-[11px] font-black uppercase tracking-[0.1em] transition-all border-2 shadow-xl hover:scale-[1.02] active:scale-95 ${form.category === cat.id ? 'bg-[#ce112d] border-[#ce112d] text-white shadow-red-900/30 ring-4 ring-red-900/20' : 'bg-black/40 border-white/5 text-zinc-500 hover:border-white/10'}`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-6 group">
                          <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-[0.2em] px-1 group-focus-within:text-white transition-colors">Description</label>
                          <textarea 
                            rows="6" 
                            value={form.description} 
                            placeholder="Crafted from premium fabrics. Elegant hand-stitch details. Perfect for festive celebrations..." 
                            className="w-full bg-black/40 border-2 border-zinc-800 p-4 md:p-8 rounded-2xl md:rounded-[40px] text-sm md:text-base font-medium focus:border-white/20 outline-none transition-all placeholder:text-zinc-800 text-zinc-300 resize-none leading-relaxed italic" 
                            onChange={e => setForm({ ...form, description: e.target.value })} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            {/* MEDIA & ASSETS */}
              <div className="space-y-10">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                  <div className="xl:col-span-12 space-y-8">
                    <div className="bg-zinc-900 border border-white/5 rounded-2xl md:rounded-[40px] p-4 md:p-10 shadow-2xl space-y-6 md:space-y-10">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-8">
                          <div className="group">
                             <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-[0.2em] px-1 group-focus-within:text-[#ce112d] transition-colors">Video URL</label>
                             <div className="relative">
                               <input 
                                 value={form.video_url} 
                                 onBlur={handleVideoBlur} 
                                 placeholder="https://www.instagram.com/reels/..." 
                                 className="w-full bg-black/40 border-2 border-zinc-800 p-4 md:p-5 h-12 md:h-16 rounded-2xl md:rounded-3xl text-sm font-medium focus:border-zinc-500 outline-none transition-all placeholder:text-zinc-800 text-white" 
                                 onChange={e => setForm({ ...form, video_url: e.target.value })} 
                               />
                               <div className="absolute right-5 top-1/2 -translate-y-1/2 p-2 bg-zinc-800 rounded-xl text-zinc-500">
                                 <Video size={16} />
                               </div>
                             </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-[0.2em] px-1">Main Photo</label>
                            <label className="flex items-center gap-4 md:gap-6 w-full bg-black/40 border-2 border-dashed border-zinc-800 p-4 md:p-6 rounded-2xl md:rounded-[32px] cursor-pointer hover:bg-white/5 hover:border-[#ce112d]/50 transition-all group">
                              <div className="w-14 h-14 rounded-2xl bg-[#ce112d] flex items-center justify-center text-white shadow-2xl shadow-red-900/40 group-hover:scale-110 transition-transform">
                                <Upload size={24} strokeWidth={3} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-white uppercase tracking-wider group-hover:text-[#ce112d] transition-colors">Upload Photo</span>
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">Best size: 1080x1350</span>
                              </div>
                              <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'product')} />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-6">
                           <label className="text-[10px] font-black uppercase text-zinc-500 mb-3 block tracking-[0.2em] px-1">Preview</label>
                           <div className="aspect-[4/5] w-full bg-black/60 rounded-2xl md:rounded-[40px] border-2 border-white/5 overflow-hidden shadow-2xl relative group ring-4 md:ring-8 ring-black/50">
                              {(previewImage || form.video_url) ? (
                                <>
                                  {previewImage && !form.video_url && <img src={previewImage} className="w-full h-full object-cover object-top" alt="Preview" />}
                                  {form.video_url && <VideoPlayer src={form.video_url} priority={true} />}
                                  <button
                                    type="button"
                                    onClick={() => { setPreviewImage(null); setForm({ ...form, video_url: '' }); }}
                                    className="absolute top-6 right-6 p-4 bg-red-600 text-white rounded-[20px] shadow-2xl hover:scale-110 active:scale-95 transition-all"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center space-y-4 text-zinc-800 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]">
                                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-900 flex items-center justify-center opacity-20">
                                    <ImageIcon size={32} />
                                  </div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Waiting for Assets...</p>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>

                      <div className="pt-10 border-t border-white/5">
                        <div className="flex items-center justify-between mb-8 px-1">
                           <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">More Photos</label>
                           {uploadProgress.total > 0 && (
                             <div className="text-[10px] font-black text-[#ce112d] uppercase tracking-widest animate-pulse">
                               Uploading: {uploadProgress.current}/{uploadProgress.total}
                             </div>
                           )}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-6">
                           {form.images?.map((img, i) => (
                             <div key={i} className="relative aspect-[3/4] rounded-xl md:rounded-[24px] overflow-hidden border-2 border-white/5 group bg-black shadow-xl">
                               <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                               <div className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer" onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}>
                                 <X size={24} strokeWidth={3} className="text-white" />
                               </div>
                               <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-black text-white/50 border border-white/10 uppercase">#{i + 1}</div>
                             </div>
                           ))}
                           <label className="aspect-[3/4] rounded-xl md:rounded-[24px] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center gap-2 md:gap-3 cursor-pointer hover:bg-[#ce112d]/5 hover:border-[#ce112d]/50 transition-all group overflow-hidden">
                              <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[#ce112d] group-hover:text-white transition-all shadow-xl">
                                <Plus size={20} strokeWidth={3} />
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#ce112d] opacity-60 group-hover:opacity-100 italic">Add Photo</span>
                              <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleFileUpload(e, 'product')} />
                           </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            {/* LOGISTICS & VARIANTS */}
              <div className="space-y-10">
                <div className="bg-zinc-900 border border-white/5 rounded-2xl md:rounded-[40px] p-4 md:p-10 shadow-2xl space-y-8 md:space-y-12">
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                      <div className="w-3 h-10 bg-[#ce112d] rounded-full shadow-[0_0_20px_rgba(206,17,45,0.4)]"></div>
                      <div>
                        <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight text-white italic">Sizes & Colors</h3>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Select available sizes, then add colors</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div className="space-y-6 bg-black/20 p-4 md:p-8 rounded-2xl md:rounded-[32px] border border-white/5">
                          <label className="text-[10px] font-black uppercase text-zinc-500 mb-4 block tracking-[0.2em]">Available Sizes</label>
                          <div className="space-y-8">
                             {[
                               { label: 'Clothing (XS-5XL)', items: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'] },
                               { label: 'Trousers / Numeric', items: ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48'] },
                               { label: 'Size 16–26', items: ['16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26'] },
                               { label: 'Kids / Growth Stage', items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'] }
                             ].map((group, gIdx) => (
                               <div key={gIdx} className="space-y-4">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-[2px] bg-zinc-800"></div>
                                     <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest italic">{group.label}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 md:gap-3">
                                    {group.items.map(s => {
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
                                          className={`px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-wider md:tracking-widest transition-all border-2 shadow-xl hover:scale-[1.02] active:scale-95 ${form.available_sizes?.some(sz => (typeof sz === 'object' ? sz.name : sz) === s) ? 'bg-[#ce112d] border-[#ce112d] text-white shadow-red-900/30 ring-4 ring-red-900/20' : 'bg-black/40 border-white/5 text-zinc-500 hover:border-white/10'}`}
                                        >
                                          {s}
                                        </button>
                                      );
                                    })}
                                    {gIdx === 1 && (
                                       <button
                                          type="button"
                                          onClick={() => {
                                            const custom = prompt('Enter size name:');
                                            if (custom) {
                                              const formatted = custom.trim().toUpperCase();
                                              if (formatted && !form.available_sizes?.some(s => (typeof s === 'object' ? s.name : s) === formatted)) {
                                                setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: formatted, is_available: true }] });
                                              }
                                            }
                                          }}
                                          className="px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 border-dashed border-zinc-800 text-zinc-700 hover:bg-zinc-800 hover:text-white transition-all italic"
                                       >
                                          + Custom
                                       </button>
                                    )}
                                  </div>
                               </div>
                             ))}
                          </div>

                          {form.available_sizes?.length > 0 && (
                            <div className="flex flex-wrap gap-2 md:gap-3 p-4 md:p-6 bg-green-500/5 rounded-2xl md:rounded-[24px] border border-green-500/10 shadow-inner">
                              <span className="text-[9px] font-black uppercase text-green-500 tracking-[0.2em] flex items-center gap-2 w-full mb-2">
                                 Selected Sizes:
                              </span>
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
                                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-2 cursor-pointer transition-all border-2 ${isAvailable ? 'bg-green-500/20 text-green-400 border-green-500/20 shadow-lg' : 'bg-zinc-800 text-zinc-700 border-white/5 opacity-50'}`}
                                  >
                                    {name}
                                    {isAvailable && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                       </div>

                       <div className="space-y-8 pt-6">
                         <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Add Colors</label>
                            <button
                              type="button"
                              onClick={() => {
                                const val = (form._newColorName || '').trim();
                                 if (!val) { setAlertModal({ isOpen: true, title: 'Missing', message: 'Please enter a color name first', type: 'error' }); return; }
                                const hex = form._newColorHex || '#888888';
                                setForm({ ...form, available_colors: [...(form.available_colors || []), { name: val, image: null, is_available: true, hex, sizes: [] }], _newColorHex: '#888888', _newColorName: '', _colorSuggestions: false });
                              }}
                              className="px-6 py-2.5 bg-[#ce112d] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                              Add Color
                            </button>
                         </div>

                         {/* Color Picker + Name Input */}
                         <div className="p-4 md:p-6 bg-black/40 border border-white/5 rounded-2xl md:rounded-[32px] space-y-4">
                            <div className="flex gap-3 md:gap-4 items-center">
                              <label className="relative w-14 h-14 shrink-0 cursor-pointer rounded-2xl border-4 border-zinc-800 shadow-2xl overflow-hidden transition-all hover:scale-105" style={{ backgroundColor: form._newColorHex || '#888888' }}>
                                 <input type="color" value={form._newColorHex || '#888888'} onChange={e => {
                                   const matched = getColorName(e.target.value);
                                   setForm({ ...form, _newColorHex: e.target.value, _newColorName: matched.en, _colorSuggestions: false });
                                 }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              </label>
                              <div className="flex-1 relative">
                                <input 
                                  value={form._newColorName || ''} 
                                  placeholder="Type color name..."
                                  onChange={e => setForm({ ...form, _newColorName: e.target.value, _colorSuggestions: true })}
                                  onFocus={() => setForm({ ...form, _colorSuggestions: true })}
                                  className="w-full bg-black/60 border-2 border-zinc-800 h-12 md:h-14 px-4 rounded-xl md:rounded-2xl text-sm font-bold shadow-inner focus:border-[#ce112d]/50 outline-none transition-all text-white" 
                                />
                                {/* Suggestion Dropdown */}
                                {form._colorSuggestions && form._newColorName && form._newColorName.length > 0 && (() => {
                                  const q = (form._newColorName || '').toLowerCase();
                                  const matches = COLOR_MAP.filter(c => c.en.toLowerCase().includes(q) || c.bn.includes(q)).slice(0, 8);
                                  if (matches.length === 0) return null;
                                  return (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-64 overflow-y-auto no-scrollbar">
                                      {matches.map((c, i) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => setForm({ ...form, _newColorName: c.en, _newColorHex: c.hex, _colorSuggestions: false })}
                                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left border-b border-white/5 last:border-0"
                                        >
                                          <div className="w-8 h-8 rounded-xl border-2 border-zinc-700 shrink-0" style={{ backgroundColor: c.hex }}></div>
                                          <div className="flex-1 min-w-0">
                                            <span className="text-sm font-bold text-white block">{c.en}</span>
                                            <span className="text-xs text-zinc-500">{c.bn}</span>
                                          </div>
                                          <span className="text-[9px] font-mono text-zinc-600 uppercase">{c.hex}</span>
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            {/* Selected preview */}
                            {form._newColorName && (
                              <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl">
                                <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: form._newColorHex || '#888' }}></div>
                                <span className="text-xs font-bold text-white">{form._newColorName}</span>
                                <span className="text-[10px] text-zinc-500 ml-1">{getColorName(form._newColorHex || '#888').bn}</span>
                              </div>
                            )}
                         </div>

                         <div className="space-y-8">
                           {form.available_colors?.map((rawColor, idx) => {
                             const color = typeof rawColor === 'object' ? rawColor : { name: rawColor, is_available: true, image: null, hex: null, sizes: [] };
                             const isAvailable = color.is_available ?? true;
                             return (
                               <div key={idx} className="bg-zinc-950 border border-white/5 rounded-2xl md:rounded-[40px] p-4 md:p-8 space-y-6 md:space-y-8 relative overflow-hidden group/card shadow-2xl">
                                  <div className="absolute top-0 left-0 w-2 h-full bg-[#ce112d]/5 group-hover/card:bg-[#ce112d] transition-all"></div>
                                  
                                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                     <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl border-2 border-white/10 shadow-2xl" style={{ backgroundColor: color.hex || '#888' }}></div>
                                        <div>
                                           <h4 className="text-xl font-black text-white uppercase italic tracking-tight">{color.name}</h4>
                                           <div className="flex items-center gap-2 mt-1">
                                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${isAvailable ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                {isAvailable ? 'Status: Active' : 'Status: Sold Out'}
                                              </span>
                                           </div>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => {
                                           const updated = [...form.available_colors];
                                           updated[idx] = { ...color, is_available: !isAvailable };
                                           setForm({ ...form, available_colors: updated });
                                        }} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isAvailable ? 'bg-zinc-800 text-zinc-500' : 'bg-green-600 text-white shadow-lg'}`}>
                                           {isAvailable ? 'Mark Sold Out' : 'Restore'}
                                        </button>
                                        <button type="button" onClick={() => setForm({ ...form, available_colors: form.available_colors.filter((_, i) => i !== idx) })} className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-xl">
                                           <Trash2 size={16} />
                                        </button>
                                     </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                     <div className="lg:col-span-12 space-y-4">
                                        <label className="text-[11px] font-bold uppercase text-zinc-500 px-1 italic tracking-wide">Stock & SKU per Size</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                           {form.available_sizes?.map((sz, sIdx) => {
                                             const sName = typeof sz === 'object' ? sz.name : sz;
                                             const sObj = color.sizes?.find(s => (typeof s === 'object' ? s.name : s) === sName);
                                             const isLinked = !!sObj;
                                             return (
                                               <div key={sIdx} className={`p-3 md:p-5 rounded-2xl md:rounded-[28px] border-2 transition-all ${isLinked ? 'bg-black/40 border-[#ce112d]/30 shadow-2xl' : 'bg-black/10 border-white/5 opacity-60'}`}>
                                                  <div className="flex items-center justify-between mb-4">
                                                     <span className="text-sm font-black text-white italic">{sName}</span>
                                                     <input type="checkbox" checked={isLinked} onChange={() => {
                                                        const updated = [...form.available_colors];
                                                        const curSizes = color.sizes || [];
                                                        const newSizes = isLinked ? curSizes.filter(s => (typeof s === 'object' ? s.name : s) !== sName) : [...curSizes, { name: sName, stock: 0, sku: '' }];
                                                        updated[idx] = { ...color, sizes: newSizes };
                                                        setForm({ ...form, available_colors: updated });
                                                     }} className="w-5 h-5 accent-[#ce112d]" />
                                                  </div>
                                                  {isLinked && (
                                                    <div className="space-y-4">
                                                       <div>
                                                          <p className="text-[8px] font-black text-zinc-600 uppercase mb-1.5 ml-1">Stock</p>
                                                          <input type="number" value={sObj.stock || 0} onChange={e => {
                                                            const updated = [...form.available_colors];
                                                            const newSizes = color.sizes.map(s => (typeof s === 'object' ? s.name : s) === sName ? { ...s, stock: parseInt(e.target.value) || 0 } : s);
                                                            updated[idx] = { ...color, sizes: newSizes };
                                                            setForm({ ...form, available_colors: updated });
                                                          }} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl h-9 px-3 text-[11px] font-black text-white outline-none focus:border-[#ce112d]" />
                                                       </div>
                                                       <div>
                                                          <p className="text-[8px] font-black text-zinc-600 uppercase mb-1.5 ml-1">SKU</p>
                                                          <input type="text" placeholder="SKU Code" value={sObj.sku || ''} onChange={e => {
                                                            const updated = [...form.available_colors];
                                                            const newSizes = color.sizes.map(s => (typeof s === 'object' ? s.name : s) === sName ? { ...s, sku: e.target.value } : s);
                                                            updated[idx] = { ...color, sizes: newSizes };
                                                            setForm({ ...form, available_colors: updated });
                                                          }} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl h-9 px-3 text-[9px] font-mono font-black text-[#ce112d] outline-none focus:border-[#ce112d] uppercase" />
                                                       </div>
                                                    </div>
                                                  )}
                                               </div>
                                             );
                                           })}
                                        </div>
                                     </div>
                                  </div>

                                  {form.images?.length > 0 && (
                                    <div className="pt-6 border-t border-white/5">
                                       <label className="text-[11px] font-bold uppercase text-zinc-500 px-1 mb-4 block italic tracking-wide">Pick Photo for this Color</label>
                                       <div className="flex flex-wrap gap-3">
                                          {form.images.map((img, i) => (
                                            <div key={i} onClick={() => {
                                              const updated = [...form.available_colors];
                                              updated[idx] = { ...color, image: color.image === img ? null : img };
                                              setForm({ ...form, available_colors: updated });
                                            }} className={`relative w-14 h-14 rounded-[18px] overflow-hidden border-2 cursor-pointer transition-all ${color.image === img ? 'border-[#ce112d] scale-110 shadow-2xl ring-4 ring-red-900/20' : 'border-zinc-800 opacity-30 hover:opacity-100'}`}>
                                               <img src={img} className="w-full h-full object-cover" alt="Variant" />
                                               {color.image === img && <div className="absolute inset-0 bg-[#ce112d]/30 flex items-center justify-center"><Check size={16} strokeWidth={4} className="text-white" /></div>}
                                            </div>
                                          ))}
                                       </div>
                                    </div>
                                  )}
                               </div>
                             );
                           })}
                         </div>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <label className="flex items-center gap-4 md:gap-6 p-6 md:p-10 bg-black/40 rounded-2xl md:rounded-[40px] border border-white/5 cursor-pointer hover:bg-white/5 transition-all group shadow-2xl">
                        <input type="checkbox" checked={form.is_sold_out} onChange={e => setForm({ ...form, is_sold_out: e.target.checked })} className="w-8 h-8 rounded-xl accent-[#ce112d] shrink-0" />
                        <div>
                           <span className="text-base font-black text-white uppercase tracking-wider group-hover:text-red-500 transition-colors italic">Sold Out</span>
                           <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Hide product from the store</p>
                        </div>
                     </label>
                     <label className="flex items-center gap-4 md:gap-6 p-6 md:p-10 bg-[#ce112d]/5 rounded-2xl md:rounded-[40px] border border-[#ce112d]/20 cursor-pointer hover:bg-[#ce112d]/10 transition-all group shadow-2xl">
                        <input type="checkbox" checked={form.is_exclusive} onChange={e => setForm({ ...form, is_exclusive: e.target.checked })} className="w-8 h-8 rounded-xl accent-[#ce112d] shrink-0" />
                        <div>
                           <span className="text-base font-black text-[#ce112d] uppercase tracking-wider italic">Exclusive Product</span>
                           <p className="text-xs font-semibold text-red-900/60 mt-1">Requires 500 TK advance</p>
                        </div>
                     </label>
                  </div>
                </div>

                {/* Submit & Discard */}
                <div className="flex flex-col gap-4 pt-10">
                  <button type="submit" disabled={loading} className="w-full bg-[#ce112d] h-16 md:h-20 rounded-2xl md:rounded-[32px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-sm md:text-base text-white shadow-2xl shadow-red-900/40 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 md:gap-4 disabled:opacity-50">
                    {loading ? <RotateCcw size={22} className="animate-spin" /> : <Save size={22} />}
                    <span>{loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product')}</span>
                  </button>
                  <button type="button" onClick={cancelEdit} className="w-full h-14 md:h-16 border-2 border-zinc-800 rounded-2xl md:rounded-[32px] uppercase text-[11px] md:text-xs font-bold tracking-[0.15em] md:tracking-[0.2em] text-zinc-500 hover:text-red-500 hover:border-red-900/50 hover:bg-red-950/50 transition-all active:scale-[0.98]">
                    Discard
                  </button>
                </div>
              </div>
            </form>
        ) : activeTab === 'moderator' ? (
          <ModeratorEntry
            products={products}
            onSuccess={() => { fetchOrders(); setActiveTab('orders'); }}
            onCancel={() => setActiveTab('orders')}
          />
        ) : activeTab === 'pending-items' ? (
          <div className="space-y-12 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white">Pending <span className="text-yellow-500">Deliveries</span></h2>
                <p className="text-zinc-500 text-[10px] mt-3 uppercase font-bold tracking-wide bg-zinc-900 py-2 px-5 rounded-full border border-white/5 inline-block">
                  {orders.filter(o => o.status === 'Pending' && o.status !== 'Deleted').length} Items to Pack
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {orders.filter(o => o.status === 'Pending' && o.status !== 'Deleted').length === 0 ? (
                <div className="col-span-full py-32 text-center space-y-4 bg-zinc-900 shadow-xl border border-white/5 border-dashed rounded-[40px]">
                  <div className="w-20 h-20 bg-zinc-950 rounded-[32px] flex items-center justify-center mx-auto border border-white/5">
                    <Package className="text-zinc-800" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-400 text-base font-bold uppercase tracking-widest">No pending items</p>
                    <p className="text-zinc-600 text-sm">All orders are currently processed</p>
                  </div>
                </div>
              ) : (
                orders.filter(o => o.status === 'Pending' && o.status !== 'Deleted').map(order => (
                  <div 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="bg-zinc-900 border border-white/5 rounded-[40px] p-6 space-y-6 relative overflow-hidden group hover:border-yellow-500/30 transition-all shadow-2xl cursor-pointer"
                  >
                     {/* Date Tag */}
                     <div className="flex justify-between items-center bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">REF: #{order.id.toString().slice(-6).toUpperCase()}</span>
                     </div>

                     {/* Item Details */}
                     <div className="flex gap-5">
                        <div className="w-20 h-28 bg-black rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-xl">
                          {(() => {
                            const product = products.find(p => p.id === order.product_id);
                            const thumb = product?.image_url || product?.images?.[0];
                            return thumb ? <img src={thumb} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-800"><ShoppingBag size={32} /></div>
                          })()}
                        </div>
                        <div className="flex-1 space-y-3">
                           <h4 className="text-base font-black text-white italic leading-tight line-clamp-2">{order.product_name}</h4>
                           <div className="flex flex-wrap gap-2">
                              {order.size && <span className="bg-zinc-800 text-zinc-500 px-3 py-1 rounded-lg text-[9px] font-black border border-white/5 uppercase">SZ: {order.size}</span>}
                              {order.color && <span className="bg-zinc-800 text-zinc-500 px-3 py-1 rounded-lg text-[9px] font-black border border-white/5 uppercase">COL: {order.color}</span>}
                           </div>
                        </div>
                     </div>

                     {/* Customer Action */}
                     <div className="bg-black/40 p-5 rounded-3xl border border-white/5 space-y-2">
                         <p className="text-[11px] font-black text-[#ce112d] italic">{order.customer_name}</p>
                         <p className="text-[13px] font-bold text-zinc-400">{order.customer_phone}</p>
                         <p className="text-[10px] font-bold text-zinc-600 line-clamp-1">{order.customer_address}</p>
                     </div>

                     {/* Quick Move Action */}
                     <div className="grid grid-cols-2 gap-3 pt-2">
                        <a href={`tel:${order.customer_phone}`} className="h-12 flex items-center justify-center bg-blue-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wide border border-blue-400/20 shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all">Call Customer</a>
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'Shipped')}
                          className="h-12 flex items-center justify-center bg-yellow-500 text-black rounded-2xl text-[10px] font-bold uppercase tracking-wide shadow-lg shadow-yellow-500/10 active:scale-[0.98] transition-all"
                        >
                          Mark Shipped
                        </button>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white">Order <span className="text-[#ce112d]">Details</span></h2>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-zinc-400 tracking-wider bg-zinc-900 py-1.5 px-4 rounded-full border border-white/5">
                    <ShoppingBag size={14} className="text-[#ce112d]" />
                    {orders.filter(o => o && o.status !== 'Deleted').length} Orders
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 py-1.5 px-4 rounded-full border border-green-500/20">
                    Total Revenue: ৳{orders.filter(o => o && o.status !== 'Deleted').reduce((acc, o) => {
                      const amount = typeof o.total_amount === 'string'
                         ? parseFloat(o.total_amount.replace(/[^0-9.]/g, ''))
                         : parseFloat(o.total_amount);
                      return acc + (amount || 0);
                    }, 0).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 py-1.5 px-4 rounded-full border border-purple-500/20">
                    <ShieldCheck size={14} />
                    Advance: ৳{orders.filter(o => o && o.is_advance_paid).reduce((acc, o) => acc + (o.is_exclusive_order ? 500 : 100), 0).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 py-1.5 px-4 rounded-full border border-blue-500/20">
                    <Users size={14} />
                    {visitorCount} Visitors
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveTab('moderator')}
                  className="flex items-center justify-center gap-2 px-6 h-12 bg-zinc-900 border border-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#ce112d] hover:border-[#ce112d] hover:text-white transition-all text-zinc-400"
                >
                  <Plus size={16} /> Create Moderator Entry
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 px-6 h-12 bg-zinc-900 border border-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-[#ce112d] hover:border-[#ce112d] hover:text-white transition-all group text-zinc-400"
                >
                  <Download size={18} className="text-[#ce112d] group-hover:text-white transition-colors" />
                  Export to CSV
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-[32px] space-y-4 shadow-xl">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Total Active Revenue</p>
                <p className="text-3xl font-bold text-white">৳{orders.filter(o => o && o.status !== 'Deleted').reduce((acc, o) => {
                  const amount = typeof o.total_amount === 'string'
                     ? parseFloat(o.total_amount.replace(/[^0-9.]/g, ''))
                     : parseFloat(o.total_amount);
                  return acc + (amount || 0);
                }, 0).toLocaleString()}</p>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-[32px] space-y-4 shadow-xl">
                <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Advance Received</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-white">৳{orders.filter(o => o && o.is_advance_paid).reduce((acc, o) => acc + (o.is_exclusive_order ? 500 : 100), 0).toLocaleString()}</p>
                  <div className="w-10 h-10 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                    <ShieldCheck size={20} className="text-purple-500" />
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-[32px] space-y-4 shadow-xl">
                <p className="text-xs font-semibold text-[#ce112d] uppercase tracking-wide">Total Due</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-white">৳{orders.filter(o => o && o.status !== 'Deleted' && o.payment_status !== 'Fully Paid').reduce((acc, o) => {
                    const totalAmount = typeof o.total_amount === 'string'
                       ? parseFloat(o.total_amount.replace(/[^0-9.]/g, ''))
                       : parseFloat(o.total_amount);
                    const advanceAmount = o.is_advance_paid ? (o.is_exclusive_order ? 500 : (o.delivery_charge || 0)) : 0;
                    return acc + (totalAmount - advanceAmount);
                  }, 0).toLocaleString()}</p>
                  <div className="w-10 h-10 bg-[#ce112d]/10 rounded-2xl flex items-center justify-center border border-[#ce112d]/20">
                    <span className="text-[#ce112d] font-bold text-sm">৳</span>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-[32px] space-y-4 shadow-xl">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Pending Orders</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-white">{orders.filter(o => o && o.status === 'Pending').length}</p>
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20">
                    <Clock size={20} className="text-yellow-500" />
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-[32px] space-y-4 shadow-xl">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Completed Items</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-white">{orders.filter(o => o && o.status === 'Delivered').length}</p>
                  <div className="w-10 h-10 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20">
                    <CheckCircle2 size={20} className="text-green-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile / Shared Order Details Modal (Unified Experience) */}
            {selectedOrder && (activeTab === 'pending-items' || (activeTab === 'orders' && !window.matchMedia('(min-width: 1024px)').matches)) && (
              <div className="fixed inset-0 z-[1200] bg-black/95 flex items-center justify-center p-0 md:p-6 backdrop-blur-xl" onClick={() => setSelectedOrder(null)}>
                <div 
                  className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-2xl bg-neutral-950 rounded-t-[40px] md:rounded-[48px] overflow-hidden shadow-2xl border-t border-white/20 md:border border-white/10 flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="h-1.5 bg-gradient-to-r from-transparent via-[#ce112d] to-transparent shrink-0 opacity-80" />
                  
                  {/* Modal Header */}
                  <div className="p-8 pb-6 flex items-center justify-between bg-black/40 border-b border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-8 bg-[#ce112d] rounded-full shadow-[0_0_20px_rgba(206,17,45,0.4)]" />
                      <div>
                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Order <span className="text-[#ce112d]">Command</span></h3>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1 opacity-60">
                          Ref: #{selectedOrder.id.toString().slice(-6).toUpperCase()} • {new Date(selectedOrder.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setSelectedOrder(null); deleteOrder(selectedOrder.id); }} className="w-11 h-11 flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 active:scale-95 transition-all">
                          <Trash2 size={18} />
                       </button>
                       <button onClick={() => setSelectedOrder(null)} className="md:hidden w-11 h-11 flex items-center justify-center bg-white/5 text-white rounded-2xl border border-white/10 active:scale-95 transition-all">
                          <X size={22} />
                       </button>
                    </div>
                  </div>

                  {/* Modal Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 no-scrollbar custom-scrollbar">
                     {/* Section: Customer & Delivery */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-black/40 rounded-[32px] p-6 border border-white/5 space-y-6">
                           <div className="flex items-center gap-3">
                              <User size={16} className="text-[#ce112d]" />
                              <p className="text-xs font-bold uppercase tracking-wide text-[#ce112d]">Customer Detail</p>
                           </div>
                           <div className="space-y-4">
                              <div>
                                 <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wide mb-1.5">Name</p>
                                 <p className="text-base font-black text-white italic">{selectedOrder.customer_name}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wide mb-1.5">Phone Information</p>
                                 <div className="flex items-center justify-between bg-zinc-900 px-4 py-3 rounded-2xl border border-white/5">
                                    <span className="text-base font-black text-white tracking-widest italic">{selectedOrder.customer_phone}</span>
                                    <div className="flex gap-2">
                                       <a href={`tel:${selectedOrder.customer_phone}`} className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white"><Phone size={14} /></a>
                                       <a href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"><Copy size={14} /></a>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="bg-black/40 rounded-[32px] p-6 border border-white/5 space-y-6">
                           <div className="flex items-center gap-3">
                              <Truck size={16} className="text-zinc-500" />
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Logistics Detail</p>
                           </div>
                           <div className="space-y-4">
                              <div className="flex justify-between">
                                 <div>
                                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Area</p>
                                    <span className="text-[9px] font-black bg-zinc-900 border border-white/5 px-2.5 py-1 rounded text-zinc-400 uppercase">{selectedOrder.delivery_area}</span>
                                 </div>
                                 <button onClick={() => copyToClipboard(selectedOrder.customer_address, "Address")} className="flex items-center gap-1.5 text-[8px] font-black uppercase text-[#ce112d] bg-[#ce112d]/10 px-3 py-1.5 rounded-full">Copy Addr</button>
                              </div>
                              <div>
                                 <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1.5">Shipping Address</p>
                                 <p className="text-[13px] font-medium text-zinc-400 leading-relaxed italic">{selectedOrder.customer_address}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Section: Items & Financials */}
                     <div className="bg-black/40 rounded-[40px] border border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Order Items</p>
                            <span className="text-[10px] font-black bg-[#ce112d] text-white px-3 py-1 rounded-full uppercase italic">Items: {selectedOrder.product_name?.split('+').length || 1}</span>
                        </div>
                        <div className="p-6 md:p-8 space-y-8">
                            <div className="flex gap-6">
                               <div className="w-24 h-32 bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden shrink-0 shadow-2xl relative">
                                  {(() => {
                                      const product = products.find(p => p.id === selectedOrder.product_id);
                                      const thumb = product?.image_url || product?.images?.[0];
                                      return thumb ? <img src={thumb} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-800"><Package size={40} /></div>
                                  })()}
                               </div>
                               <div className="flex-1 space-y-4">
                                  <h4 className="text-sm md:text-xl font-black text-white italic leading-tight">{selectedOrder.product_name}</h4>
                                  <div className="flex flex-wrap gap-2">
                                     {selectedOrder.size && <span className="bg-zinc-800 text-zinc-500 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5">SIZE: {selectedOrder.size}</span>}
                                     {selectedOrder.color && <span className="bg-zinc-800 text-zinc-500 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5">COLOR: {selectedOrder.color}</span>}
                                  </div>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                               <div className="bg-zinc-950 p-4 rounded-3xl border border-white/5">
                                  <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Base Price</p>
                                  <p className="text-xl font-black text-white italic tracking-tighter">৳{selectedOrder.product_price}</p>
                               </div>
                               <div className="bg-zinc-950 p-4 rounded-3xl border border-white/5">
                                  <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Shipping</p>
                                  <p className="text-xl font-black text-white italic tracking-tighter">৳{selectedOrder.delivery_charge || 0}</p>
                               </div>
                               <div className="col-span-2 md:col-span-1 bg-[#ce112d]/5 p-4 rounded-3xl border border-[#ce112d]/10">
                                  <p className="text-[8px] font-black text-[#ce112d] uppercase mb-1">Advance</p>
                                  <p className="text-xl font-black text-[#ce112d] italic tracking-tighter">৳{selectedOrder.is_advance_paid ? (selectedOrder.is_exclusive_order ? 500 : (selectedOrder.delivery_charge || 0)) : 0}</p>
                               </div>
                            </div>

                            <div className="bg-[#ce112d] p-6 rounded-[32px] flex items-center justify-between shadow-red-500/20 shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
                                <div>
                                   <p className="text-[9px] font-black uppercase text-white/60 mb-1">Due Amount</p>
                                   <p className="text-4xl font-black text-white italic tracking-tighter">
                                      ৳{(() => {
                                          const total = Number(selectedOrder.total_amount);
                                          const adv = selectedOrder.is_advance_paid ? (selectedOrder.is_exclusive_order ? 500 : Number(selectedOrder.delivery_charge || 0)) : 0;
                                          return (selectedOrder.payment_status === 'Fully Paid' ? 0 : total - adv);
                                      })().toLocaleString()}
                                   </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                   <button onClick={() => togglePaymentStatus(selectedOrder, 'Advance Paid')} className={`h-10 px-5 rounded-2xl text-[9px] font-black uppercase transition-all ${selectedOrder.is_advance_paid ? 'bg-white text-[#ce112d]' : 'bg-black/20 text-white/50 border border-white/10'}`}>
                                      {selectedOrder.is_advance_paid ? '✓ Adv' : 'Set Adv'}
                                   </button>
                                   <button onClick={() => togglePaymentStatus(selectedOrder, 'Fully Paid')} className={`h-10 px-5 rounded-2xl text-[9px] font-black uppercase transition-all ${selectedOrder.payment_status === 'Fully Paid' ? 'bg-white text-[#ce112d]' : 'bg-black/20 text-white/50 border border-white/10'}`}>
                                      {selectedOrder.payment_status === 'Fully Paid' ? '✓ Paid' : 'Set Paid'}
                                   </button>
                                </div>
                            </div>
                        </div>
                     </div>

                     {/* Section: Status Control */}
                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <Clock size={16} className="text-orange-500" />
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Status Control</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           {['Pending', 'Shipped', 'Delivered', 'Canceled'].map(status => (
                              <button
                                key={status}
                                onClick={() => updateOrderStatus(selectedOrder.id, status)}
                                className={`h-16 rounded-[28px] text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-between px-6 ${
                                    selectedOrder.status === status 
                                    ? (status === 'Delivered' ? 'bg-green-500 border-green-500 text-white shadow-xl' : 
                                       status === 'Shipped' ? 'bg-blue-500 border-blue-500 text-white shadow-xl' :
                                       status === 'Canceled' ? 'bg-red-500 border-red-500 text-white shadow-xl' :
                                       'bg-yellow-500 border-yellow-500 text-black shadow-xl')
                                    : 'bg-zinc-900 border-white/5 text-zinc-600 hover:border-white/20'
                                }`}
                              >
                                 {status}
                                 {selectedOrder.status === status && <Check size={14} strokeWidth={4} />}
                              </button>
                           ))}
                        </div>
                        
                        <div className="space-y-4 pt-4">
                           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Order Notes</p>
                           <button onClick={() => updateOrderNote(selectedOrder.id, selectedOrder.customer_note)} className="w-full text-left p-6 bg-zinc-900 border border-white/5 rounded-[32px] min-h-[100px] flex flex-col justify-between group">
                              <p className={`text-sm italic font-medium leading-relaxed ${selectedOrder.customer_note ? 'text-zinc-300' : 'text-zinc-800'}`}>
                                 {selectedOrder.customer_note || "No internal management notes added yet..."}
                              </p>
                              <p className="text-[9px] text-[#ce112d] font-black uppercase mt-4 opacity-40 group-hover:opacity-100 transition-all">Edit Note →</p>
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Footer Action Mobile Only */}
                  <div className="md:hidden p-8 pt-2 border-t border-white/5 bg-black/40">
                     <button onClick={() => setSelectedOrder(null)} className="w-full py-5 bg-[#ce112d] text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl active:scale-[0.98] transition-all">
                        Done Management
                     </button>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Split-View (Only show when NO selected order on mobile, but on Desktop it's always there) */}
            <div className="hidden lg:grid grid-cols-12 gap-8 h-[calc(100vh-450px)] min-h-[600px]">
              
              {/* LEFT: Order List Sidebar (4/12) */}
              <div className="col-span-4 flex flex-col space-y-4 overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                {(() => {
                  const productMap = {};
                  products.forEach(p => productMap[p.id] = p);

                  const filteredOrders = orders.filter(o => o && o.status !== 'Deleted');
                  
                  if (filteredOrders.length === 0) return (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 py-20 bg-zinc-900 shadow-xl border border-white/5 rounded-3xl">
                      <ShoppingBag size={48} />
                      <p className="mt-4 font-bold uppercase tracking-widest text-xs">No active orders</p>
                    </div>
                  );

                  return filteredOrders.map(o => {
                    const product = productMap[o.product_id];
                    const isSelected = selectedOrder?.id === o.id;
                    const amount = typeof o.total_amount === 'string'
                       ? parseFloat(o.total_amount.replace(/[^0-9.]/g, ''))
                       : parseFloat(o.total_amount);

                    return (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrder(o)}
                        className={`p-4 rounded-[24px] border transition-all cursor-pointer group relative ${
                          isSelected 
                          ? 'bg-[#ce112d]/10 border-[#ce112d] shadow-[0_10px_30px_rgba(206,17,45,0.1)]' 
                          : 'bg-zinc-900/50 border-white/5 hover:border-white/20 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex gap-4">
                          <div className="w-14 h-14 bg-zinc-900 rounded-2xl overflow-hidden shrink-0 border border-white/5 relative">
                            {(product?.image_url || product?.images?.[0]) && (
                              <img src={product.image_url || product.images[0]} className="w-full h-full object-cover" alt="" />
                            )}
                            <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent ${isSelected ? 'opacity-0' : 'opacity-100'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-[#ce112d]' : 'text-zinc-500'}`}>
                                {new Date(o.created_at).toLocaleDateString()}
                              </p>
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight ${
                                o.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                                o.status === 'Shipped' ? 'bg-blue-500/10 text-blue-500' : 
                                o.status === 'Delivered' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {o.status}
                              </span>
                            </div>
                            <h4 className="text-[13px] font-bold text-white truncate group-hover:text-[#ce112d] transition-colors">{o.customer_name}</h4>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[12px] font-black text-[#ce112d]">৳{amount.toLocaleString()}</p>
                              <p className="text-[10px] font-bold text-zinc-500">{o.delivery_area}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* RIGHT: Detailed Command Center (8/12) */}
              <div className="col-span-8 bg-zinc-900/30 border border-white/5 rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative">
                {!selectedOrder ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <div className="w-24 h-24 bg-zinc-900 rounded-[32px] flex items-center justify-center border border-white/5 shadow-xl animate-pulse">
                      <ShoppingBag size={40} className="text-zinc-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-300">Select an order to manage</h3>
                      <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto">Complete details, customer info, and quick actions will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Detail Panel Header */}
                    <div className="p-8 bg-black/40 border-b border-white/5 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-8 bg-[#ce112d] rounded-full shadow-[0_0_20px_rgba(206,17,45,0.4)]" />
                        <div>
                          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Order <span className="text-[#ce112d]">Command</span></h3>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">
                            Ref: #{selectedOrder.id.toString().slice(-6).toUpperCase()} • {new Date(selectedOrder.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => deleteOrder(selectedOrder.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Detail Panel Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar no-scrollbar">
                      
                      {/* Section 1: Customer & Logistics */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#ce112d]">Customer Profile</p>
                          <div className="space-y-3">
                            <div>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Full Name</p>
                                <p className="text-lg font-bold text-white">{selectedOrder.customer_name}</p>
                            </div>
                            <div>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Phone Number</p>
                                <p className="text-lg font-bold text-[#ce112d]">{selectedOrder.customer_phone}</p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <a href={`tel:${selectedOrder.customer_phone}`} className="flex-1 h-10 flex items-center justify-center bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all text-[10px] font-black uppercase">Call Now</a>
                                <a href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^0-9]/g, '')}`} target="_blank" className="flex-1 h-10 flex items-center justify-center bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl hover:bg-green-500 hover:text-white transition-all text-[10px] font-black uppercase">WhatsApp</a>
                            </div>
                          </div>
                        </div>

                        <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Shipping Details</p>
                          <div className="space-y-3">
                            <div>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Delivery Area</p>
                                <span className="inline-block bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-white/5">{selectedOrder.delivery_area}</span>
                            </div>
                            <div>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Full Address</p>
                                <p className="text-sm font-medium text-zinc-300 leading-relaxed">{selectedOrder.customer_address}</p>
                            </div>
                            <button onClick={() => copyToClipboard(selectedOrder.customer_address, "Address")} className="w-full h-10 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all text-[10px] font-black uppercase">
                                <Copy size={14} /> Copy Address
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Items & Financials */}
                      <div className="bg-black/40 rounded-[32px] border border-white/5 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Order Items & Summary</p>
                            <span className="text-[10px] font-black bg-[#ce112d] text-white px-3 py-1 rounded-full uppercase italic">Items: {selectedOrder.product_name?.split('+').length || 1}</span>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-6 items-start">
                                <div className="w-24 h-32 bg-zinc-900 rounded-2xl overflow-hidden shrink-0 border border-white/5 relative shadow-2xl">
                                    {(() => {
                                        const product = products.find(p => p.id === selectedOrder.product_id);
                                        const thumb = product?.image_url || product?.images?.[0];
                                        return thumb ? <img src={thumb} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-800"><ImageIcon size={32} /></div>
                                    })()}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <h4 className="text-xl font-bold text-white leading-tight italic">{selectedOrder.product_name}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedOrder.size && <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-lg text-[10px] font-black border border-white/5 uppercase">SIZE: {selectedOrder.size}</span>}
                                        {selectedOrder.color && <span className="bg-zinc-800 text-zinc-400 px-3 py-1 rounded-lg text-[10px] font-black border border-white/5 uppercase">COLOR: {selectedOrder.color}</span>}
                                        {selectedOrder.last_four_digits && <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-500/20 uppercase">METHOD: {selectedOrder.last_four_digits}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 grid grid-cols-3 gap-6">
                                <div className="bg-zinc-950/50 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Product Price</p>
                                    <p className="text-xl font-black text-white italic">৳{selectedOrder.product_price.toLocaleString()}</p>
                                </div>
                                <div className="bg-zinc-950/50 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Delivery Charge</p>
                                    <p className="text-xl font-black text-white italic">৳{selectedOrder.delivery_charge || 0}</p>
                                </div>
                                <div className="bg-[#ce112d]/5 p-4 rounded-2xl border border-[#ce112d]/10">
                                    <p className="text-[9px] text-[#ce112d] font-bold uppercase tracking-widest mb-1">Advance Received</p>
                                    <p className="text-xl font-black text-[#ce112d] italic">৳{selectedOrder.is_advance_paid ? (selectedOrder.is_exclusive_order ? 500 : (selectedOrder.delivery_charge || 0)) : 0}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-[#ce112d] rounded-[24px] flex items-center justify-between shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Total Due on Delivery</p>
                                    <p className="text-4xl font-black text-white italic tracking-tighter">
                                        ৳{(() => {
                                            const totalAmount = typeof selectedOrder.total_amount === 'string'
                                               ? Number(selectedOrder.total_amount.replace(/[^0-9.]/g, ''))
                                               : Number(selectedOrder.total_amount);
                                            const advanceAmount = selectedOrder.is_advance_paid ? (selectedOrder.is_exclusive_order ? 500 : (Number(selectedOrder.delivery_charge || 0))) : 0;
                                            return (selectedOrder.payment_status === 'Fully Paid' ? 0 : totalAmount - advanceAmount).toLocaleString();
                                        })()}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); togglePaymentStatus(selectedOrder, 'Advance Paid'); }}
                                        className={`px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedOrder.is_advance_paid ? 'bg-white text-[#ce112d] shadow-xl' : 'bg-black/20 text-white/50 border border-white/10 hover:bg-black/30'}`}
                                    >
                                        {selectedOrder.is_advance_paid ? 'Advance Paid✓' : 'Mark Advance Paid'}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); togglePaymentStatus(selectedOrder, 'Fully Paid'); }}
                                        className={`px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedOrder.payment_status === 'Fully Paid' ? 'bg-white text-[#ce112d] shadow-xl' : 'bg-black/20 text-white/50 border border-white/10 hover:bg-black/30'}`}
                                    >
                                        {selectedOrder.payment_status === 'Fully Paid' ? 'Fully Paid✓' : 'Mark Fully Paid'}
                                    </button>
                                </div>
                            </div>
                        </div>
                      </div>

                      {/* Section 3: Notes & Status Control */}
                      <div className="grid grid-cols-2 gap-8 pt-4">
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Internal Management Note</p>
                            <button
                              onClick={() => updateOrderNote(selectedOrder.id, selectedOrder.customer_note)}
                              className="w-full text-left p-6 bg-zinc-900 border border-white/5 rounded-[32px] hover:border-[#ce112d]/30 transition-all min-h-[120px] flex flex-col justify-between group"
                            >
                              <p className={`text-sm italic font-medium leading-relaxed ${selectedOrder.customer_note ? 'text-zinc-300' : 'text-zinc-700 font-bold'}`}>
                                {selectedOrder.customer_note || "Write an internal note for this order (visible only to admin)..."}
                              </p>
                              <p className="text-[10px] text-zinc-700 font-black uppercase mt-4 text-right group-hover:text-[#ce112d]">Click to Edit Note</p>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Order Fulfilment Status</p>
                            <div className="grid grid-cols-1 gap-4">
                                {['Pending', 'Shipped', 'Delivered', 'Canceled'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                                        className={`h-14 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-between px-6 ${
                                            selectedOrder.status === status 
                                            ? (status === 'Delivered' ? 'bg-green-500 border-green-500 text-white shadow-lg' : 
                                               status === 'Shipped' ? 'bg-blue-500 border-blue-500 text-white shadow-lg' :
                                               status === 'Canceled' ? 'bg-red-500 border-red-500 text-white shadow-lg' :
                                               'bg-yellow-500 border-yellow-500 text-black shadow-lg')
                                            : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-zinc-500 hover:text-white'
                                        }`}
                                    >
                                        {status}
                                        {selectedOrder.status === status && <CheckCircle2 size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile View remains unchanged for specialized experience */}
            <div className="lg:hidden space-y-4 pb-24">
              {(() => {
                const productMap = {};
                products.forEach(p => productMap[p.id] = p);

                return orders.filter(o => o && o.status !== 'Deleted').map(o => {
                  const product = productMap[o.product_id];
                  let productThumb = product?.image_url || product?.images?.[0];

                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="bg-zinc-900 border border-white/5 rounded-[24px] p-4 space-y-4 relative hover:border-[#ce112d]/30 transition-all cursor-pointer shadow-xl"
                    >
                      <div className="flex gap-4">
                        <div className="w-16 h-20 bg-black rounded-xl overflow-hidden shrink-0 relative border border-white/5">
                          {productThumb && <img src={productThumb} className="w-full h-full object-cover" alt="" />}
                          {product?.serial_no && (
                            <div className="absolute top-0 right-0 bg-[#ce112d] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl">#{product.serial_no}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-[13px] font-bold text-white truncate">{o.customer_name}</p>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase shrink-0 ${o.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' : o.status === 'Shipped' ? 'bg-blue-500/10 text-blue-500' : o.status === 'Delivered' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {o.status}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {o.product_name?.split(' + ').map((item, idx) => (
                              <p key={idx} className="text-[10px] font-medium text-zinc-400 leading-tight truncate">
                                {item}
                              </p>
                            )) || <p className="text-[10px] font-medium text-zinc-400">Generic Item</p>}
                          </div>
                          <p className="text-xs text-[#ce112d] font-bold">৳{o.total_amount}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePaymentStatus(o, 'Advance Paid');
                            }}
                            className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase border transition-all ${o.payment_status === 'Advance Paid' ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : o.is_advance_paid && o.payment_status !== 'Fully Paid' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-black text-zinc-600 border-white/5'}`}
                          >
                            {o.is_exclusive_order ? 'Adv' : 'Del'} Paid
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePaymentStatus(o, 'Fully Paid');
                            }}
                            className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase border transition-all ${o.payment_status === 'Fully Paid' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-black text-zinc-600 border-white/5'}`}
                          >
                            Full Paid
                          </button>
                        </div>
                        <p className="text-[10px] font-bold text-zinc-500">{o.customer_phone}</p>
                      </div>

                      <button onClick={(e) => { e.stopPropagation(); deleteOrder(o.id); }} className="absolute bottom-4 right-4 text-zinc-700 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
            {orders.filter(o => o && o.status !== 'Deleted').length === 0 && !loading && (
              <div className="py-32 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-900 rounded-[32px] flex items-center justify-center mx-auto border border-white/5">
                  <ShoppingBag className="text-zinc-700" size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-400 text-base font-bold">No orders found.</p>
                  <p className="text-zinc-600 text-sm">Waiting for new orders to arrive</p>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'deleted' ? (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white">Deleted <span className="text-[#ce112d]">Orders</span></h2>
                <p className="text-zinc-500 text-xs mt-3 uppercase font-bold tracking-widest bg-zinc-900 py-1.5 px-4 rounded-full border border-white/5 inline-block">{orders.filter(o => o && o.status === 'Deleted').length} Deleted Orders</p>
              </div>
              {orders.filter(o => o && o.status === 'Deleted').length > 0 && (
                <button
                  onClick={emptyBin}
                  className="flex items-center justify-center gap-2 px-6 h-12 bg-zinc-900 border border-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-[#ce112d] hover:bg-[#ce112d] hover:text-white transition-all shadow-lg"
                >
                  <Trash2 size={16} /> Empty Bin
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(() => {
                const productMap = {};
                products.forEach(p => productMap[p.id] = p);

                return orders.filter(o => o && o.status === 'Deleted').map(o => {
                  const product = productMap[o.product_id];
                  let productThumb = product?.image_url || product?.images?.[0];

                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="bg-zinc-900 border border-white/5 rounded-[32px] overflow-hidden p-6 space-y-6 opacity-70 hover:opacity-100 transition-all border-dashed shadow-xl group cursor-pointer hover:border-[#ce112d]/30"
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
                          {new Date(o.created_at).toLocaleDateString()} • {new Date(o.created_at).toLocaleTimeString()}
                        </div>
                        <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase rounded-lg border border-red-500/20">Deleted</span>
                      </div>

                      <div className="flex gap-4 p-3 bg-black/40 border border-white/5 rounded-[24px]">
                        <div className="w-16 h-20 bg-zinc-900 rounded-xl overflow-hidden flex-shrink-0 relative border border-white/5">
                          {productThumb ? (
                            <img src={productThumb} className="w-full h-full object-cover grayscale" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-800">
                              <ImageIcon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-sm font-bold text-white leading-tight mb-1 truncate">{o.product_name}</p>
                          <p className="text-base font-bold text-[#ce112d]">৳{o.total_amount}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white truncate">{o.customer_name}</p>
                          <p className="text-xs text-zinc-500 font-semibold">{o.customer_phone}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[10px] font-bold uppercase text-zinc-400 truncate">{o.delivery_area}</p>
                          <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{o.customer_address}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-white/5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => restoreOrder(o.id)} className="flex-1 h-11 flex items-center justify-center gap-2 bg-green-500/10 text-green-500 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/10">
                          <RotateCcw size={14} /> Restore
                        </button>
                        <button onClick={() => permanentDeleteOrder(o.id)} className="flex-1 h-11 flex items-center justify-center gap-2 bg-zinc-800 text-zinc-400 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 size={14} /> Wipe
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {orders.filter(o => o && o.status === 'Deleted').length === 0 && (
              <div className="py-32 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-900 rounded-[32px] flex items-center justify-center mx-auto border border-white/5 shadow-xl">
                  <Archive className="text-zinc-700" size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-400 text-lg font-bold">Trash is Empty</p>
                  <p className="text-zinc-600 text-sm font-medium">No deleted orders to show here</p>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {(() => {
                const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
                return (
                  <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-zinc-900 border border-white/5 p-8 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                    <p className="text-xs font-semibold uppercase text-zinc-500 tracking-[0.2em]">Avg Rating</p>
                    <div className="flex items-end gap-1">
                      <span className="text-6xl font-bold tracking-tighter text-white">{reviews.length > 0 ? avgRating.toFixed(1) : '—'}</span>
                      <span className="text-2xl font-bold text-[#ce112d] mb-2">/5</span>
                    </div>
                    <div className="flex gap-1.5 text-[#ce112d]">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={20} fill={s <= avgRating ? 'currentColor' : 'none'} className={s <= avgRating ? 'opacity-100' : 'opacity-20'} />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest">Based on {reviews.length} reviews</p>
                  </div>
                );
              })()}

              <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-zinc-900 border border-white/5 p-8 rounded-[40px] space-y-6 shadow-xl">
                <p className="text-xs font-semibold uppercase text-zinc-500 tracking-wider">Rating Distribution</p>
                <div className="space-y-4">
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = reviews.filter(r => r.rating === stars).length;
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-4">
                        <span className="text-xs font-bold text-zinc-500 w-4">{stars}</span>
                        <div className="flex-1 h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                          <div className="h-full bg-[#ce112d] transition-all duration-1000" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs font-bold text-zinc-400 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-400 border-b border-white/5 pb-4">Recent <span className="text-white">Feedback</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {reviews.map(r => (
                  <div key={r.id} className="bg-zinc-900 border border-white/5 rounded-3xl p-6 space-y-4 hover:border-zinc-700 transition-all shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={16} className={s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-800'} />
                        ))}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-bold">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-zinc-300 leading-relaxed font-medium">"{r.comment}"</p>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <p className="text-xs text-zinc-400 font-bold">{r.customer_name || 'Anonymous'}</p>
                      {r.product_name && <p className="text-[10px] text-zinc-600 font-bold uppercase truncate max-w-[120px]">{r.product_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {reviews.length === 0 && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto border border-white/5">
                    <Star className="text-zinc-800" size={32} />
                  </div>
                  <p className="text-zinc-500 text-sm font-bold">No reviews submitted yet.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
              <div>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-white">{activeTab === 'published' ? 'Published' : activeTab === 'pending' ? 'Pending' : 'Sold Out'} <span className="text-[#ce112d]">Feed</span></h2>
                <p className="text-zinc-500 text-xs mt-3 uppercase font-bold tracking-widest bg-zinc-900 py-1.5 px-4 rounded-full border border-white/5 inline-block">{products.filter(p => p.status === (activeTab === 'soldout' ? p.status : activeTab)).length} Items Loaded</p>
              </div>
              <div className="relative w-full sm:w-72 group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ce112d] transition-colors" />
                <input 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-zinc-900 border border-zinc-800 pl-12 pr-4 h-12 rounded-2xl text-sm font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all placeholder:text-zinc-700" 
                  placeholder="Search products..." 
                />
              </div>
            </div>

            <div className="space-y-2">
              {products.filter(p => {
                if (!p) return false;
                const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
                if (activeTab === 'soldout') return p.is_sold_out && matchesSearch;
                if (activeTab === 'pending' || activeTab === 'published') {
                  return p.status === activeTab && !p.is_sold_out && matchesSearch;
                }
                return false;
              }).map(p => {
                let displayImage = getOptimizedUrl(p.image_url || p.images?.[0], mediaSizes.thumbnail);
                if (!displayImage || displayImage.includes('via.placeholder')) {
                  displayImage = null;
                }

                return (
                  <div key={p.id} className="group bg-zinc-900 border border-white/5 rounded-[32px] overflow-hidden hover:border-[#ce112d]/30 transition-all duration-300 shadow-xl">

                    {/* ── Top section: Image + Details ── */}
                    <div className="flex gap-5 p-4">

                      {/* Thumbnail */}
                      <div
                        className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden shrink-0 bg-black relative cursor-pointer border border-white/5 shadow-lg group-hover:scale-[1.02] transition-transform"
                        onClick={() => p.video_url ? setPreviewVideo(p.video_url) : null}
                      >
                        {displayImage ? (
                          <img src={displayImage} className="w-full h-full object-cover" loading="lazy" alt={p.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                            {p.video_url ? <Play size={24} /> : <ImageIcon size={24} />}
                          </div>
                        )}
                        {p.is_sold_out && (
                          <div className="absolute inset-0 bg-red-600/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Sold Out</span>
                          </div>
                        )}
                        {p.serial_no && (
                          <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-lg border border-white/10">
                            #{p.serial_no}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div className="space-y-2">
                          <h4 className="text-sm sm:text-base font-bold text-white leading-tight line-clamp-2" title={p.name}>
                            {p.name || <span className="text-zinc-600">Unnamed Product</span>}
                          </h4>

                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[#ce112d] text-lg font-bold">৳{p.price}</span>
                            {p.original_price && p.original_price > p.price && (
                               <span className="text-zinc-500 line-through text-xs font-semibold">
                                 ৳{p.original_price}
                               </span>
                            )}
                            <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${p.status === 'published' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                              {p.status === 'published' ? 'Live' : 'Draft'}
                            </span>
                          </div>
                        </div>

                        {/* Meta badges */}
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {p.stock_count !== null && (
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-lg border ${p.stock_count <= 3 ? 'bg-red-500/10 text-red-500 border-red-500/20' : p.stock_count <= 8 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-zinc-800 text-zinc-400 border-white/5'}`}>
                              STOCK: {p.stock_count}
                            </span>
                          )}
                          {p.available_colors?.length > 0 && (
                            <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-white/5 px-3 py-1 rounded-lg uppercase">
                              VARIANTS: {p.available_colors.length}
                            </span>
                          )}
                          {p.platform_id && (
                            <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-white/5 px-3 py-1 rounded-lg truncate max-w-[120px] uppercase">
                              ID: {p.platform_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Actions Row ── */}
                    <div className="flex items-stretch border-t border-white/5 bg-black/20 divide-x divide-white/5">
                      <button
                        onClick={() => startEdit(p)}
                        className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all group/btn"
                      >
                        <Edit size={16} className="group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Edit</span>
                      </button>

                      {(activeTab === 'pending' || (activeTab === 'soldout' && p.status === 'pending')) && (
                        <button
                          onClick={() => setConfirmation({
                            isOpen: true,
                            title: 'Publish Product',
                            message: 'Are you sure you want to Publish this product to the main site?',
                            confirmText: 'Publish',
                            onConfirm: () => bigBazarApi.from('products').update({ status: 'published' }).eq('id', p.id).then(fetchProducts)
                          })}
                          className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 text-green-500 hover:bg-green-500/10 transition-all group/btn"
                        >
                          <CheckCircle2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Live</span>
                        </button>
                      )}

                      {(activeTab === 'published' || (activeTab === 'soldout' && p.status === 'published')) && (
                        <button
                          onClick={() => setConfirmation({
                            isOpen: true,
                            title: 'Unpublish Product',
                            message: 'Are you sure you want to move this product back to Pending/Drafts?',
                            confirmText: 'Unpublish',
                            onConfirm: () => bigBazarApi.from('products').update({ status: 'pending' }).eq('id', p.id).then(fetchProducts)
                          })}
                          className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 text-yellow-500 hover:bg-yellow-500/10 transition-all group/btn"
                        >
                          <Clock size={16} className="group-hover/btn:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Draft</span>
                        </button>
                      )}

                      <button
                        onClick={() => setConfirmation({
                          isOpen: true,
                          title: p.is_exclusive ? 'Remove Exclusive Status' : 'Mark as Exclusive/Premium',
                          message: p.is_exclusive ? 'আপনি কি নিশ্চিত যে পণ্যটি আর এক্সক্লুসিভ নয়?' : 'আপনি কি এই পণ্যটিকে Exclusive/Premium হিসেবে চিহ্নিত করতে চান?',
                          confirmText: 'Confirm',
                          onConfirm: () => bigBazarApi.from('products').update({ is_exclusive: !p.is_exclusive }).eq('id', p.id).then(fetchProducts)
                        })}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${p.is_exclusive ? 'bg-orange-500/10 text-orange-400' : 'text-neutral-500 hover:text-orange-400 hover:bg-orange-500/10'}`}
                      >
                        <Star size={15} className={p.is_exclusive ? "fill-orange-400" : ""} />
                        <span className="text-[9px] font-black uppercase text-center leading-tight">PREMIUM</span>
                      </button>

                      <button
                        onClick={() => setConfirmation({
                          isOpen: true,
                          title: p.is_sold_out ? 'Mark as Available' : 'Mark as Sold Out',
                          message: p.is_sold_out ? 'আপনি কি নিশ্চিত যে পণ্যটি স্টকে আছে?' : 'আপনি কি এই পণ্যটিকে Sold Out হিসেবে চিহ্নিত করতে চান?',
                          confirmText: 'Confirm',
                          onConfirm: () => bigBazarApi.from('products').update({ is_sold_out: !p.is_sold_out }).eq('id', p.id).then(fetchProducts)
                        })}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${p.is_sold_out ? 'bg-[#ce112d] text-white' : 'text-neutral-500 hover:text-red-400 hover:bg-red-500/10'}`}
                      >
                        <ShoppingBag size={15} />
                        <span className="text-[9px] font-black uppercase">{p.is_sold_out ? 'Resell' : 'Sold'}</span>
                      </button>

                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="flex-1 flex flex-col items-center gap-1 py-3 text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 size={15} />
                        <span className="text-[9px] font-black uppercase">Del</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
        }
      </main>

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

      {/* Mobile/Shared Detail Modal restricted to appropriate tabs */}
      {selectedOrder && (activeTab !== 'orders' && activeTab !== 'pending-items') && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setSelectedOrder(null)}>
          {(() => {
            // ── Parser ──────────────────────────────────────────────
            const parseOrderItem = (str) => {
              let s = str.trim();
              let quantity = 1;
              let sku = null;
              let size = null;
              let color = null;

              const structuredMatch = s.match(/^(.*?)\s*(?:\((?:Color|রঙ):\s*([^)]*)\))?\s*(?:\((?:Size|সাইজ):\s*([^)]*)\))?\s*(?:\((?:SKU):\s*([^)]*)\))?\s*(?:\((?:Qty|পরিমাণ):\s*(\d+)\))?\s*$/i);
              if (structuredMatch && (structuredMatch[2] || structuredMatch[3] || structuredMatch[4] || structuredMatch[5])) {
                return {
                  name: structuredMatch[1].trim() || 'Unknown Item',
                  color: structuredMatch[2]?.trim() || null,
                  size: structuredMatch[3]?.trim() || null,
                  sku: structuredMatch[4]?.trim() || null,
                  quantity: parseInt(structuredMatch[5] || '1')
                };
              }

              const qtyMatch = s.match(/^(.*)\s+(\d+)\s*(?:piece|pc)\s*$/i);
              if (qtyMatch) {
                quantity = parseInt(qtyMatch[2]);
                s = qtyMatch[1].trim();
              }

              const skuMatch = s.match(/^(.*)\s*\(SKU:\s*([^)]*)\)\s*$/i);
              if (skuMatch) {
                sku = skuMatch[2].trim();
                s = skuMatch[1].trim();
              } else {
                const truncatedSku = s.match(/^(.*)\s*\(SKU:\s*([^)]*)\s*$/i);
                if (truncatedSku) {
                  sku = truncatedSku[2].trim() + '…';
                  s = truncatedSku[1].trim();
                }
              }

              const sizeMatch = s.match(/^(.*)\s+(.+?)\s+size\s*$/i);
              if (sizeMatch) {
                size = sizeMatch[2].trim();
                s = sizeMatch[1].trim();
              }

              const colorMatch = s.match(/^(.*)\s+(.+?)\s+color\s*$/i);
              if (colorMatch) {
                color = colorMatch[2].trim();
                s = colorMatch[1].trim();
              }

              return { name: s.trim() || 'Unknown Item', color, size, sku, quantity };
            };

            const productByName = {};
            const productBySku = {};
            products.forEach(p => {
              if (p.name) productByName[p.name.toLowerCase().trim()] = p;
              if (p.platform_id) productBySku[p.platform_id.toLowerCase().trim()] = p;
              if (p.available_colors) {
                p.available_colors.forEach(c => {
                  if (typeof c === 'object' && c.sizes) {
                    c.sizes.forEach(sz => {
                      if (typeof sz === 'object' && sz.sku) {
                        productBySku[sz.sku.toLowerCase().trim()] = p;
                      }
                    });
                  }
                });
              }
            });

            const rawParts = (selectedOrder.product_name || '').split(' + ');
            const parsedItems = rawParts.map(parseOrderItem);

            const alreadyUsedIds = new Set();
            const detailedItems = parsedItems.map((item, idx) => {
              const isTruncatedSku = item.sku?.endsWith('…');
              let p = idx === 0 ? products.find(pr => pr.id === selectedOrder.product_id) : null;

              if (!p && !isTruncatedSku) {
                if (item.sku && item.sku.length > 2) {
                  const candidate = productBySku[item.sku.toLowerCase().trim()];
                  if (candidate && !alreadyUsedIds.has(candidate.id)) p = candidate;
                }
                if (!p && item.name) {
                  const candidate = productByName[item.name.toLowerCase().trim()];
                  if (candidate && !alreadyUsedIds.has(candidate.id)) p = candidate;
                }
                if (!p && item.name && item.name.length > 2) {
                  const needle = item.name.toLowerCase().trim();
                  p = products.find(pr =>
                    !alreadyUsedIds.has(pr.id) && (
                      pr.name?.toLowerCase().includes(needle) ||
                      needle.includes(pr.name?.toLowerCase())
                    )
                  );
                }
              }

              if (p) alreadyUsedIds.add(p.id);
              
              const unitPrice = (parsedItems.length === 1) 
                ? (Number(selectedOrder.product_price) / item.quantity) 
                : (p?.price || 0);

              return { ...item, p, unitPrice };
            });

            const derivedItemsSubtotal = detailedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            const totalQty = detailedItems.reduce((s, i) => s + i.quantity, 0);
            const derivedTotalAmount = Number(derivedItemsSubtotal) + Number(selectedOrder.delivery_charge || 0);

            return (
              <div className="relative w-full max-w-lg bg-neutral-950 rounded-[40px] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[85vh] sm:max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="h-1.5 bg-gradient-to-r from-transparent via-[#ce112d] to-transparent opacity-80 flex-shrink-0" />

                <div className="px-8 pt-8 pb-5 flex justify-between items-center bg-neutral-950 border-b border-white/5 relative z-30 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-[#ce112d] rounded-full shadow-[0_0_15px_rgba(206,17,45,0.4)]" />
                    <div>
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Order <span className="text-[#ce112d]">Details</span></h3>
                      <p className="text-[9px] text-neutral-500 font-black uppercase tracking-[0.2em] mt-1.5 opacity-60">
                        {new Date(selectedOrder.created_at).toLocaleDateString('bn-BD')} • {new Date(selectedOrder.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="p-2.5 bg-white/5 hover:bg-[#ce112d] hover:text-white text-neutral-600 rounded-full transition-all border border-white/5">
                    <X size={20} className="stroke-2" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-7 custom-scrollbar shadow-inner">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">
                          Ordered Items <span className="text-[#ce112d]">({detailedItems.length})</span>
                        </p>
                      </div>

                      {detailedItems.map((item, idx) => {
                        const { p, unitPrice } = item;
                        const thumb = p?.image_url || p?.images?.[0];
                        const colorObj = p?.available_colors?.find(c => (typeof c === 'object' ? c.name : c) === item.color);
                        const hex = typeof colorObj === 'object' ? colorObj.hex : null;

                        return (
                          <div key={idx} className="relative overflow-hidden bg-neutral-900/50 rounded-[20px] border border-white/5 p-4 hover:border-white/10 transition-all">
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                              <span className="text-[8px] font-black text-neutral-500">{idx + 1}</span>
                            </div>
                            <div className="flex gap-4">
                              <div className="w-16 h-20 bg-neutral-900 rounded-xl overflow-hidden shrink-0 border border-white/10 relative">
                                {thumb ? <img src={thumb} className="w-full h-full object-cover" alt={item.name} /> : <div className="w-full h-full flex items-center justify-center text-neutral-800"><ImageIcon size={20} /></div>}
                                {p?.serial_no && <div className="absolute top-0 left-0 bg-[#ce112d] text-white text-[6px] font-black px-1 rounded-br">#{p.serial_no}</div>}
                              </div>
                              <div className="flex-1 min-w-0 space-y-2 pr-5">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-xs font-black text-white uppercase italic leading-snug truncate pr-2">{item.name || 'Unknown Item'}</p>
                                  <span className="text-xs font-black text-[#ce112d] italic shrink-0">৳{unitPrice}</span>
                                </div>
                                {item.sku && <p className="text-[9px] font-mono text-neutral-600 tracking-wider">SKU: <span className="text-neutral-400">{item.sku}</span></p>}
                                <div className="flex flex-wrap gap-1.5">
                                  {item.size && !['size', 'সাইজ'].includes(item.size.toLowerCase()) && (
                                    <span className="text-[9px] font-black bg-[#ce112d]/10 text-[#ce112d] px-2 py-0.5 rounded border border-[#ce112d]/20 uppercase">{item.size}</span>
                                  )}
                                  {item.color && !['color', 'কালার'].includes(item.color.toLowerCase()) && (
                                    <div className="flex items-center gap-1 bg-white/5 text-white px-2 py-0.5 rounded border border-white/10">
                                      {hex && <div className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: hex }} />}
                                      <span className="text-[9px] font-black uppercase">{item.color}</span>
                                    </div>
                                  )}
                                  <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">×{item.quantity} pcs</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <div className="mt-2 rounded-[24px] border border-white/10 overflow-hidden bg-neutral-900/30">
                        <div className="px-5 py-3 bg-white/[0.03] border-b border-white/5">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-500">Order Summary</p>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-500 font-bold uppercase tracking-wider">Subtotal ({totalQty} items)</span>
                            <span className="font-black text-white italic">৳{derivedItemsSubtotal}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-500 font-bold uppercase tracking-wider">Delivery Charge</span>
                            <span className="font-black text-white italic">৳{selectedOrder.delivery_charge || 0}</span>
                          </div>
                          
                          <div className="flex justify-between items-center py-3 border-y border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Total Order Value</span>
                            <span className="text-xl font-black text-white italic">৳{derivedTotalAmount}</span>
                          </div>

                          {selectedOrder.is_advance_paid && (
                            <div className="flex justify-between text-[11px] bg-orange-500/5 p-2 rounded-lg border border-orange-500/10">
                                <span className="text-orange-500 font-bold uppercase tracking-wider">Advance / Partial Paid</span>
                                <span className="font-black text-orange-400 italic">-৳{selectedOrder.is_exclusive_order ? 500 : (selectedOrder.delivery_charge || 0)}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ce112d]">Due on Delivery</span>
                            <span className="text-2xl font-black text-[#ce112d] italic">৳{selectedOrder.payment_status === 'Fully Paid' ? 0 : (selectedOrder.is_advance_paid ? derivedTotalAmount - (selectedOrder.is_exclusive_order ? 500 : (selectedOrder.delivery_charge || 0)) : derivedTotalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Consolidated Customer & Delivery Details */}
                    <div className="bg-neutral-900/50 rounded-[32px] border border-white/10 p-6 space-y-6 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-4 bg-[#ce112d] rounded-full" />
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-500">Customer & Shipping Info</p>
                        </div>

                        <div className="space-y-6">
                            {/* Name & ID Group */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 group-hover:bg-[#ce112d]/10 group-hover:text-[#ce112d] transition-all">
                                        <User size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-neutral-600 tracking-widest mb-0.5">Full Name</p>
                                        <p className="text-base font-black text-white tracking-tight">{selectedOrder.customer_name}</p>
                                    </div>
                                </div>
                                <button onClick={() => copyToClipboard(selectedOrder.customer_name, "Name")} className="p-3 bg-neutral-900 hover:bg-[#ce112d] text-neutral-600 hover:text-white rounded-2xl transition-all shadow-lg active:scale-90">
                                    <Copy size={14} />
                                </button>
                            </div>

                            {/* Phone Group - Fixed Clipping */}
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 group-hover:bg-green-500/10 group-hover:text-green-500 transition-all">
                                        <Phone size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[8px] font-black uppercase text-neutral-600 tracking-widest mb-0.5">Phone Number</p>
                                        <p className="text-lg font-black text-[#ce112d] tracking-tighter truncate">{selectedOrder.customer_phone}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4 shrink-0">
                                    <a href={`tel:${selectedOrder.customer_phone}`} className="p-3 bg-neutral-900 hover:bg-green-600 text-neutral-600 hover:text-white rounded-2xl transition-all shadow-lg">
                                        <ExternalLink size={14} />
                                    </a>
                                    <button onClick={() => copyToClipboard(selectedOrder.customer_phone, "Phone")} className="p-3 bg-neutral-900 hover:bg-[#ce112d] text-neutral-600 hover:text-white rounded-2xl transition-all shadow-lg shadow-black/20">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Address Group */}
                            <div className="flex items-start justify-between group">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all mt-1">
                                        <MapPin size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[8px] font-black uppercase text-neutral-600 tracking-widest mb-1.5">
                                            Delivery Address <span className="text-[#ce112d] ml-1">({selectedOrder.delivery_area})</span>
                                        </p>
                                        <p className="text-[13px] font-bold text-neutral-300 leading-relaxed italic">{selectedOrder.customer_address}</p>
                                    </div>
                                </div>
                                <button onClick={() => copyToClipboard(selectedOrder.customer_address, "Address")} className="p-3 bg-neutral-900 hover:bg-[#ce112d] text-neutral-600 hover:text-white rounded-2xl transition-all shadow-lg ml-4 shrink-0 mt-1">
                                    <Copy size={14} />
                                </button>
                            </div>

                            {/* Merchant Note */}
                            {selectedOrder.customer_note && (
                                <div className="bg-yellow-500/5 p-4 rounded-3xl border border-yellow-500/10 flex items-start gap-3 mt-4">
                                    <AlertCircle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[8px] font-black uppercase text-yellow-600/80 mb-1 tracking-widest">Internal Order Note</p>
                                        <p className="text-xs font-bold text-yellow-500/80 leading-relaxed italic">{selectedOrder.customer_note}</p>
                                    </div>
                                    <button onClick={() => copyToClipboard(selectedOrder.customer_note, "Note")} className="p-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-600/50 hover:text-white rounded-xl transition-all shrink-0">
                                        <Copy size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Refactored Footer Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-900/40 p-5 rounded-[28px] border border-white/5 group hover:border-white/20 transition-all">
                            <div className="flex items-center gap-2 mb-2 opacity-60">
                                <Truck size={14} className="text-neutral-500" />
                                <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest">
                                    {selectedOrder.is_exclusive_order ? 'Adv Required' : 'Deli Charge'}
                                </p>
                            </div>
                            <p className="text-xl font-black text-white italic">৳{selectedOrder.is_exclusive_order ? 500 : (selectedOrder.delivery_charge || 0)}</p>
                        </div>
                        
                        <div className="bg-neutral-900/40 p-5 rounded-[28px] border border-white/5 group hover:border-[#ce112d]/30 transition-all overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 opacity-60">
                                    <ShieldCheck size={14} className="text-neutral-500" />
                                    <p className="text-[8px] font-black uppercase text-neutral-500 tracking-widest">Sender ID</p>
                                </div>
                                <button onClick={() => copyToClipboard(selectedOrder.last_four_digits, "Sender Number")} className="p-1.5 bg-neutral-950 text-neutral-700 hover:text-[#ce112d] rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                    <Copy size={10} />
                                </button>
                            </div>
                            <p className="text-xl font-black text-[#ce112d] italic truncate" title={selectedOrder.last_four_digits}>{selectedOrder.last_four_digits || 'COD'}</p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600 text-center">Admin Controls & Status</p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => togglePaymentStatus(selectedOrder, 'Advance Paid')}
                          className={`flex-1 group relative overflow-hidden p-5 rounded-[28px] border transition-all duration-500 ${selectedOrder.payment_status === 'Advance Paid' ? 'bg-orange-500 border-orange-400 text-white shadow-2xl shadow-orange-500/40' : 'bg-neutral-900/50 border-white/5 text-neutral-500 hover:border-orange-500/50 hover:bg-orange-950/20'}`}
                        >
                          <div className="relative z-10 flex flex-col items-center">
                            <span className="text-2xl font-black italic tracking-tighter">৳{selectedOrder.is_exclusive_order ? 500 : (selectedOrder.delivery_charge || 0)}</span>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-1">{selectedOrder.is_exclusive_order ? 'Adv Paid' : 'Deli Paid'}</span>
                          </div>
                          {selectedOrder.payment_status === 'Advance Paid' && <div className="absolute top-0 right-0 p-1.5 bg-white/20 rounded-bl-xl"><Check size={10} strokeWidth={4} /></div>}
                        </button>
                        <button
                          onClick={() => togglePaymentStatus(selectedOrder, 'Fully Paid')}
                          className={`flex-1 group relative overflow-hidden p-5 rounded-[28px] border transition-all duration-500 ${selectedOrder.payment_status === 'Fully Paid' ? 'bg-green-600 border-green-500 text-white shadow-2xl shadow-green-500/40' : 'bg-neutral-900/50 border-white/5 text-neutral-500 hover:border-green-500/50 hover:bg-green-950/20'}`}
                        >
                          <div className="relative z-10 flex flex-col items-center">
                            <span className="text-2xl font-black italic tracking-tighter">৳{derivedTotalAmount}</span>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-1">Full Paid</span>
                          </div>
                          {selectedOrder.payment_status === 'Fully Paid' && <div className="absolute top-0 right-0 p-1.5 bg-white/20 rounded-bl-xl"><Check size={10} strokeWidth={4} /></div>}
                        </button>
                      </div>
                      <div className={`w-full p-6 rounded-[32px] border-2 flex items-center justify-between font-black uppercase tracking-[0.2em] shadow-inner transition-colors duration-500 ${selectedOrder.status === 'Delivered' ? 'bg-green-500/5 border-green-500/10 text-green-500' : selectedOrder.status === 'Canceled' ? 'bg-red-500/5 border-red-500/10 text-red-500' : selectedOrder.status === 'Deleted' ? 'bg-zinc-800 border-white/10 text-zinc-600' : 'bg-[#ce112d]/5 border-[#ce112d]/10 text-[#ce112d]'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_currentColor] ${selectedOrder.status === 'Delivered' ? 'bg-green-500' : selectedOrder.status === 'Canceled' ? 'bg-red-500' : selectedOrder.status === 'Deleted' ? 'bg-zinc-600' : 'bg-[#ce112d]'}`} />
                          <span className="text-[11px] opacity-60">Order Status</span>
                        </div>
                        <span className="text-2xl italic tracking-tighter transform -skew-x-12">{selectedOrder.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
        onConfirm={confirmation.onConfirm}
        title={confirmation.title}
        message={confirmation.message}
        confirmText={confirmation.confirmText}
      />
    </div>
  );
}
