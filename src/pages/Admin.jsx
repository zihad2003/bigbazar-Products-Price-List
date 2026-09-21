import { useState, useEffect, useMemo } from 'react';
import { bigBazarApi } from '../api/client';
import { setToken, API_URL, getToken, clearCustomerToken, clearAdminToken } from '../api/client';
import {
  Plus, Trash2, LogOut, Image as ImageIcon, Search,
  Settings, ShoppingBag, Edit, X, Play, Check,
  AlertCircle, Instagram, CheckCircle2, Clock, Upload, Save, Download, Package, Box,
  Sun, Moon, Star, RotateCcw, Archive, MessageSquare, Users, User, Phone, MapPin, Truck, ShieldCheck, Pipette, Menu, Copy, ExternalLink,
  Pencil, ChevronDown, ArrowRight, ArrowLeft, Video, Eye, EyeOff, Sparkles, BarChart3, Filter,
  Smartphone, Monitor, Tablet, Shield
} from 'lucide-react';
import { extractInstagramId } from '../utils/instagram';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { getColorName, PRESET_SWATCHES, suggestColorNames, resolveColorByName } from '../utils/colorNames';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import AlertModal from '../components/modals/AlertModal';
import VideoPlayer from '../components/VideoPlayer';
import AdminReports from '../components/admin/AdminReports';
import AdminConversations from '../components/admin/AdminConversations';
import AdminUsers from '../components/admin/AdminUsers';
import SuperadminPanel from '../components/admin/SuperadminPanel';
import OrderDetailsPanel from '../components/admin/OrderDetailsPanel';
import { compressImage, compressImages, COMPRESS_PRESETS, formatFileSize } from '../utils/imageCompressor';
import { TOP_CATEGORIES, SEED_SUBCATEGORIES, mergeWithDynamic, getSubcategoriesForCategory } from '../data/categories';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminTheme, setAdminTheme] = useState(() => {
    return localStorage.getItem('admin_theme') || 'light';
  });

  const toggleAdminTheme = () => {
    const next = adminTheme === 'dark' ? 'light' : 'dark';
    setAdminTheme(next);
    try {
      localStorage.setItem('admin_theme', next);
    } catch {
      // ignore storage errors
    }
  };
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [subcategoriesData, setSubcategoriesData] = useState(null);
  const [editingSubcat, setEditingSubcat] = useState(null);
  const [subcatForm, setSubcatForm] = useState({ id: '', name_en: '', name_bn: '', image_url: '', sort_order: 0 });
  const [subcatCategory, setSubcatCategory] = useState('Women');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState('All');
  const [editingProduct, setEditingProduct] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'error' });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Delete' });
  const [siteTheme, setSiteTheme] = useState('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  const [pendingCodes, setPendingCodes] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'compressing' | 'uploading'
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [formAlert, setFormAlert] = useState(null); // { title, message, type: 'error' | 'success' }
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [copyBusy, setCopyBusy] = useState(null); // null | 'name' | 'description' | 'both'
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [productPage, setProductPage] = useState(0);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [showRangeDeleteModal, setShowRangeDeleteModal] = useState(false);
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('200');
  const [deletingRangeProgress, setDeletingRangeProgress] = useState(null);

  // Confirm/Alert modals lock themselves; only lock for Admin-owned overlays here
  useBodyScrollLock(
    !!(selectedOrder || previewVideo || showRangeDeleteModal || deletingRangeProgress)
  );

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

  const copyFullOrderDetails = (order) => {
    if (!order) return;
    const charge = parseFloat(order.delivery_charge) || 0;
    const advance = order.is_advance_paid
      ? (order.is_exclusive_order ? 500 : (order.delivery_area === 'mirsarai' && charge === 0 ? 100 : charge))
      : 0;
    const total = Number(order.total_amount) || 0;
    const due = order.payment_status === 'Fully Paid' ? 0 : Math.max(0, total - advance);

    const text = `BIG BAZAR ORDER DETAILS
━━━━━━━━━━━━━━━━━━━━
Order Ref: #${order.id.toString().slice(-6).toUpperCase()}
Date: ${new Date(order.created_at).toLocaleDateString()}
Customer: ${order.customer_name || 'N/A'}
Phone: ${order.customer_phone || 'N/A'}
Address: ${order.customer_address || 'N/A'}
Area: ${order.delivery_area || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
Product(s): ${order.product_name || 'N/A'}
${order.size ? `Size: ${order.size}\n` : ''}${order.color ? `Color: ${order.color}\n` : ''}Total Price: ৳${total.toLocaleString()}
Advance Paid: ৳${advance.toLocaleString()}
Balance Due: ৳${due.toLocaleString()}
Payment Ref: ${order.last_four_digits || 'COD'}
${order.customer_note ? `Note: ${order.customer_note}` : ''}`.trim();

    copyToClipboard(text, "Order Details");
  };

  const [formStep, setFormStep] = useState(1);
  const [notifySignedInUsers, setNotifySignedInUsers] = useState(true);
  const [form, setForm] = useState({
    name: '', price: '', original_price: '', description: '',
    images: [], video_url: '', is_sale: false, is_hot: false,
    is_new: false, is_sold_out: false, is_exclusive: false, category: 'Women', subcategory: '',
    status: 'published', platform_id: '', serial_no: '',
    available_sizes: [], available_colors: [], stock_count: ''
  });

  const [siteSettings, setSiteSettings] = useState({
    hero_banner: { title: '', subtitle: '', image_url: '' },
    contact_info: { whatsapp: '', facebook: '', instagram: '' },
    main_slides: [],
    slider_aspect: 'auto',
    category_visibility: { show_new: true, show_sale: true, show_exclusive: true },
    wedding_banner: {
      enabled: false,
      image_url: '',
      title_bn: 'ওয়েডিং কালেকশন',
      title_en: 'Wedding Collection',
      subtitle_bn: 'এক্সক্লুসিভ কালেকশন',
      subtitle_en: 'Exclusive Collection',
      cta_bn: 'কালেকশন দেখুন',
      cta_en: 'Explore Collection',
      category_filter: 'Wedding',
    },
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
    let cancelled = false;
    let bootGen = 0;

    const boot = async () => {
      const gen = ++bootGen;
      try {
        const { data } = await bigBazarApi.auth.getSession();
        if (cancelled || gen !== bootGen) return;
        // Only adopt a positive session from boot — never wipe a login that
        // happened while getSession was still in flight.
        if (data?.session?.access_token || data?.session?.user) {
          setSession(data.session);
        }
      } catch (_) {
        /* keep current session */
      }
    };

    boot();
    const sub = bigBazarApi.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      if (event === 'SIGNED_IN' && nextSession) {
        bootGen += 1; // invalidate in-flight boot
        setSession(nextSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
      }
    });

    return () => {
      cancelled = true;
      try {
        sub?.data?.subscription?.unsubscribe?.();
      } catch (_) {}
    };
  }, []);

  // Only load dashboard data after admin session is confirmed (keeps login screen instant)
  useEffect(() => {
    if (!session?.access_token && !session?.user) return;
    fetchProducts();
    fetchOrders();
    fetchReviews();
    fetchSiteSettings();
  }, [session?.access_token, session?.user?.id]);

  const fetchProducts = async (pageToFetch = 0, append = false) => {
    setLoading(true);
    const { data } = await bigBazarApi
      .from('products')
      // DB-1 fix: use fixed 100-item page size (range 0..99, 100..199, etc.) for stable KV cache reuse
      .select('id,serial_no,name,price,original_price,category,subcategory,status,stock_count,is_sale,is_hot,is_new,is_sold_out,is_deleted,available_sizes,available_colors,is_exclusive,images,created_at,video_url,platform_id')
      .order('serial_no', { ascending: false })
      .range(pageToFetch * 100, (pageToFetch + 1) * 100 - 1);

    const fetched = data || [];
    if (append) {
      setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = fetched.filter(p => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
    } else {
      setProducts(fetched);
    }
    setProductPage(pageToFetch);
    setHasMoreProducts(fetched.length >= 100);
    setLoading(false);
  };

  const handleLoadMoreProducts = () => {
    const nextPage = productPage + 1;
    fetchProducts(nextPage, true);
  };

  /** Optimistic flag/status patch — keeps list order stable (no full refetch). */
  const patchProductFields = async (id, fields) => {
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, ...fields } : x)));
    const { error } = await bigBazarApi.from('products').update(fields).eq('id', id);
    if (error) {
      setAlertModal({
        isOpen: true,
        title: 'Update Failed',
        message: error.message || 'Could not update product.',
        type: 'error',
      });
      fetchProducts();
    }
  };

  const handleLoadAllProducts = async () => {
    setLoading(true);
    try {
      let allLoaded = [...products];
      let currentPage = productPage + 1;
      let more = true;
      while (more) {
        const { data } = await bigBazarApi
          .from('products')
          .select('id,serial_no,name,price,original_price,category,subcategory,status,stock_count,is_sale,is_hot,is_new,is_sold_out,is_deleted,available_sizes,available_colors,is_exclusive,images,created_at,video_url,platform_id')
          .order('serial_no', { ascending: false })
          .range(currentPage * 100, (currentPage + 1) * 100 - 1);

        if (!data || data.length === 0) {
          more = false;
          break;
        }
        const existingIds = new Set(allLoaded.map(p => p.id));
        const newItems = data.filter(p => !existingIds.has(p.id));
        allLoaded = [...allLoaded, ...newItems];
        if (data.length < 100) {
          more = false;
        } else {
          currentPage++;
        }
      }
      setProducts(allLoaded);
      setProductPage(currentPage);
      setHasMoreProducts(false);
    } catch (err) {
      console.error('Error loading all products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteBySerialRange = async () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    if (isNaN(start) || isNaN(end) || start > end) {
      setAlertModal({ isOpen: true, title: 'Invalid Range', message: 'Please enter valid serial numbers (e.g. From 1 To 200).', type: 'error' });
      return;
    }

    setLoading(true);
    // Fetch target products from DB in range using standard 100-item page requests
    let targetProducts = [];
    let page = 0;
    let keepFetching = true;
    while (keepFetching) {
      const { data } = await bigBazarApi
        .from('products')
        .select('id, serial_no, name')
        .order('serial_no', { ascending: true })
        .range(page * 100, (page + 1) * 100 - 1);

      if (!data || data.length === 0) {
        keepFetching = false;
      } else {
        targetProducts = [...targetProducts, ...data];
        if (data.length < 100 || targetProducts.length >= 5000) {
          keepFetching = false;
        } else {
          page++;
        }
      }
    }

    const matching = (targetProducts || []).filter(p => p.serial_no >= start && p.serial_no <= end);

    if (matching.length === 0) {
      setLoading(false);
      setAlertModal({ isOpen: true, title: 'No Products Found', message: `No products found with Serial numbers between #${start} and #${end}.`, type: 'error' });
      return;
    }

    setConfirmation({
      isOpen: true,
      title: `Delete ${matching.length} Products?`,
      message: `আপনি কি নিশ্চিত যে আপনি Serial #${start} থেকে #${end} পর্যন্ত ${matching.length}টি পণ্য স্থায়ীভাবে ডিলিট করতে চান?`,
      confirmText: `Delete ${matching.length} Items`,
      onConfirm: async () => {
        setShowRangeDeleteModal(false);
        setLoading(true);
        setDeletingRangeProgress({ current: 0, total: matching.length });

        for (let i = 0; i < matching.length; i++) {
          await bigBazarApi.from('products').delete().eq('id', matching[i].id);
          setDeletingRangeProgress({ current: i + 1, total: matching.length });
        }

        setDeletingRangeProgress(null);
        setAlertModal({ isOpen: true, title: 'Bulk Delete Complete!', message: `Successfully deleted ${matching.length} products (Serial #${start} - #${end}).`, type: 'success' });
        fetchProducts();
        setLoading(false);
      }
    });
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
    // Normalize current status (legacy rows may only have is_advance_paid)
    const current =
      order.payment_status === 'Fully Paid'
        ? 'Fully Paid'
        : order.payment_status === 'Advance Paid' || order.is_advance_paid
          ? 'Advance Paid'
          : 'Unpaid';

    let nextStatus;
    if (targetStatus === 'Advance Paid') {
      // Unpaid → Advance; Advance → Unpaid; Fully → Advance (one-step demote)
      if (current === 'Unpaid') nextStatus = 'Advance Paid';
      else if (current === 'Advance Paid') nextStatus = 'Unpaid';
      else nextStatus = 'Advance Paid';
    } else if (targetStatus === 'Fully Paid') {
      // Not fully → Fully; Fully → Advance (keep advance, don't wipe to Unpaid)
      nextStatus = current === 'Fully Paid' ? 'Advance Paid' : 'Fully Paid';
    } else {
      nextStatus = targetStatus;
    }

    const nextAdvance = nextStatus !== 'Unpaid';

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
            is_advance_paid: nextAdvance
          })
          .eq('id', order.id);

        if (error) {
          // Fallback for older schemas without payment_status column
          const { error: fallbackError } = await bigBazarApi
            .from('orders')
            .update({ is_advance_paid: nextAdvance })
            .eq('id', order.id);

          if (fallbackError) {
            setAlertModal({ isOpen: true, title: 'Error', message: fallbackError.message, type: 'error' });
          } else {
            fetchOrders();
            if (selectedOrder?.id === order.id) {
              setSelectedOrder({ ...selectedOrder, is_advance_paid: nextAdvance });
            }
          }
        } else {
          fetchOrders();
          if (selectedOrder?.id === order.id) {
            setSelectedOrder({ ...selectedOrder, payment_status: nextStatus, is_advance_paid: nextAdvance });
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
      },
      ticker_announcement: {
        enabled: false,
        text: '',
        position: 'top_navbar',
        bg_color: '#ce112d',
        speed: 25
      }
    };

    if (data) {
      // Backend returns data as either:
      // A) Flat object: { hero_banner: {...}, contact_info: {...}, ... }
      // B) Array of rows: [{ key: 'hero_banner', value: {...} }, ...]
      const isArray = Array.isArray(data);
      const getValue = (key) => {
        if (isArray) return data.find(s => s.key === key)?.value;
        return data[key]; // flat object from /api/settings
      };

      const banner = getValue('hero_banner');
      const contact = getValue('contact_info');
      const slides = getValue('main_slides');
      const sliderAspect = getValue('slider_aspect');
      const announcement = getValue('announcement');
      const ticker = getValue('ticker_announcement');
      if (banner) settings.hero_banner = banner;
      if (contact) settings.contact_info = contact;
      if (slides) settings.main_slides = Array.isArray(slides) ? slides : [];
      if (sliderAspect) settings.slider_aspect = sliderAspect;
      if (announcement) settings.announcement = announcement;
      if (ticker) settings.ticker_announcement = ticker;
      const themeData = getValue('site_theme');
      if (themeData?.mode) setSiteTheme(themeData.mode);
      const catVis = getValue('category_visibility');
      if (catVis) settings.category_visibility = catVis;
      const weddingBanner = getValue('wedding_banner');
      if (weddingBanner) settings.wedding_banner = { ...settings.wedding_banner, ...weddingBanner };

      // Load dynamic subcategories
      const subcats = getValue('subcategories');
      if (subcats && typeof subcats === 'object') {
        setSubcategoriesData(subcats);
      }

      const visitors = getValue('site_visitors');
      if (visitors !== undefined && visitors !== null) {
        setVisitorCount(parseInt(visitors) || 0);
      }
    }
    setSiteSettings(settings);
  };

  const fetchPendingCodes = async () => {
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/auth/pending-codes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setPendingCodes([]);
        return;
      }
      const json = await res.json();
      setPendingCodes(Array.isArray(json?.codes) ? json.codes : []);
    } catch { setPendingCodes([]); }
  };

  const handleVideoBlur = async () => {
    if (!form.video_url) return;
    // Instagram URL is for the video player only — store platform_id for reference, never pull photos
    if (form.video_url.includes('instagram.com') || form.video_url.includes('instagr.am')) {
      const igId = extractInstagramId(form.video_url);
      if (igId) {
        setForm(prev => ({
          ...prev,
          platform_id: prev.platform_id || igId,
        }));
      }
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();

    const isFakePoster = (url) => typeof url === 'string' && (url.startsWith('data:image/svg+xml') || url.includes('Big Bazar Video') || url.includes('Big Bazar Reel') || /instagram\.com|instagr\.am/i.test(url));
    let currentImages = [...(form.images || [])].filter(img => !isFakePoster(img));
    let currentImageUrl = form.image_url && !isFakePoster(form.image_url) ? form.image_url : (currentImages[0] || null);

    // Product cards need a real photo — Instagram link is video-only and must not replace images
    if (!currentImages.length && !currentImageUrl) {
      setAlertModal({
        isOpen: true,
        title: 'Product Photo Required',
        message: 'অনুগ্রহ করে পণ্যের ছবি আপলোড করুন। Instagram লিঙ্ক শুধু ভিডিও দেখানোর জন্য — ছবি আনা হয় না। (Upload a product photo. Instagram URL is for video only.)',
        type: 'error',
      });
      return;
    }

    if (!form.name?.trim()) {
      setAlertModal({ isOpen: true, title: 'Name Required', message: 'Please enter a product name.', type: 'error' });
      return;
    }

    if (!form.price && form.price !== 0) {
      setAlertModal({ isOpen: true, title: 'Price Required', message: 'Please enter the sale price.', type: 'error' });
      return;
    }

    // Validation: Every added color must have an image
    if (form.available_colors && form.available_colors.length > 0) {
      const missingColorImage = form.available_colors.find(c => !c.image);
      if (missingColorImage) {
        setAlertModal({ isOpen: true, title: 'Color Image Required', message: `অনুগ্রহ করে '${missingColorImage.name || 'রঙ'}' এর জন্য একটি ছবি যুক্ত করুন।`, type: 'error' });
        return;
      }
    }

    // Serial is automatic: next = max existing + 1 (no manual input)
    let finalSerialNo;
    if (editingProduct) {
      finalSerialNo = editingProduct.serial_no;
    } else {
      const { data: topSerial } = await bigBazarApi
        .from('products')
        .select('serial_no')
        .order('serial_no', { ascending: false })
        .range(0, 0);
      const maxFromDb = topSerial?.[0] ? parseInt(topSerial[0].serial_no, 10) || 0 : 0;
      const maxFromLoaded = products?.length
        ? Math.max(...products.map(p => parseInt(p.serial_no, 10) || 0), 0)
        : 0;
      finalSerialNo = Math.max(maxFromDb, maxFromLoaded) + 1;
    }

    const { _newColorHex, _newColorName, _colorSuggestions, serial_no: _ignoredSerial, ...formData } = form;
    const finalMainImage = currentImageUrl || (currentImages.length > 0 ? currentImages[0] : null);
    if (finalMainImage && (!currentImages.length || currentImages[0] !== finalMainImage)) {
      currentImages = [finalMainImage, ...currentImages.filter(img => img !== finalMainImage)];
    }

    const productData = {
      ...formData,
      images: currentImages,
      image_url: finalMainImage,
      price: parseFloat(form.price) || 0,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      stock_count: form.stock_count !== '' && form.stock_count !== null && form.stock_count !== undefined ? parseInt(form.stock_count) : null,
      is_exclusive: form.is_exclusive || false,
      platform_id: form.platform_id || null,
      video_url: form.video_url || '',
      description: form.description || '',
    };

    // Preserve existing serial on edit — never coerce null/undefined to 1
    if (editingProduct) {
      const existingSerial = editingProduct.serial_no;
      if (existingSerial != null && String(existingSerial).trim() !== '' && !Number.isNaN(Number(existingSerial))) {
        productData.serial_no = Number(existingSerial);
      }
      // else omit serial_no so PUT does not overwrite DB value
    } else {
      productData.serial_no = parseInt(finalSerialNo, 10) || 1;
    }

    if (editingProduct) {
      // ── OPTIMISTIC INSTANT UPDATE (<50ms UI response) ──
      const updatedProduct = {
        ...editingProduct,
        ...productData,
        id: editingProduct.id,
        serial_no: productData.serial_no ?? editingProduct.serial_no,
      };
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
      cancelEdit();
      // Stay on the correct list for this product (draft vs live vs sold out)
      if (updatedProduct.is_sold_out) setActiveTab('soldout');
      else if (updatedProduct.status === 'pending') setActiveTab('pending');
      else setActiveTab('published');
      setAlertModal({
        isOpen: true,
        title: "Updated!",
        message: "Product updated successfully!",
        type: "success"
      });

      // Background DB sync — avoid full refetch (prevents list jump / order shuffle)
      bigBazarApi.from('products').update(productData).eq('id', editingProduct.id).then(({ error }) => {
        if (error) {
          console.error("Background update error:", error);
          setAlertModal({
            isOpen: true,
            title: "Sync Error",
            message: "Failed to sync update to database: " + error.message,
            type: "error"
          });
          fetchProducts();
        }
      });
    } else {
      // ── OPTIMISTIC INSTANT INSERT (<50ms UI response) ──
      const newId = crypto.randomUUID();
      const newProduct = {
        ...productData,
        id: newId,
        created_at: new Date().toISOString()
      };
      setProducts(prev => [newProduct, ...prev]);
      cancelEdit();
      setActiveTab('published');
      setAlertModal({
        isOpen: true,
        title: "Added!",
        message: "New product added successfully!",
        type: "success"
      });

      // Background DB sync
      bigBazarApi.from('products').insert([{ ...productData, id: newId }]).then(async ({ error }) => {
        if (error) {
          console.error("Background insert error:", error);
          setAlertModal({
            isOpen: true,
            title: "Save Failed",
            message: error.message || "Failed to save product to database.",
            type: "error"
          });
        } else if (notifySignedInUsers && (productData.status || 'published') === 'published') {
          try {
            const token = getToken();
            const res = await fetch(`${API_URL}/api/admin/notify-product`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ product_id: newId, product_name: productData.name }),
            });
            const text = await res.text();
            let data = {};
            try { data = text ? JSON.parse(text) : {}; } catch (_) { data = {}; }
            if (res.ok) {
              const pushInfo = data.push && !data.push.skipped
                ? ` Browser push: ${data.push.delivered || 0} delivered.`
                : '';
              setAlertModal({
                isOpen: true,
                title: 'Added & Notified',
                message: `Product saved. In-app alert for ${data.audience ?? 0} user(s).${pushInfo}`,
                type: 'success',
              });
            } else if (res.status === 404) {
              setAlertModal({
                isOpen: true,
                title: 'Product Saved',
                message: 'Product saved, but notify API is not on production yet. Redeploy to enable alerts.',
                type: 'success',
              });
            }
          } catch (_) { /* product saved; notify is best-effort */ }
        }
        fetchProducts();
      });
    }
  };

  const handleBannerUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await bigBazarApi.from('site_settings').upsert({ key: 'hero_banner', value: siteSettings.hero_banner }, { onConflict: 'key' });
    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
    else setAlertModal({ isOpen: true, title: 'Success', message: "Hero Banner Updated!", type: 'success' });
  };

  /**
   * Upload an already compressed/processed File to the backend.
   * Returns the public URL string on success, or null on failure.
   */
  const uploadSingleFile = async (fileToUpload) => {
    setUploadStatus('uploading');

    // Extreme safety size check: block uploads over 5MB to prevent base64 timeouts
    const MAX_ALLOWED_SIZE = 5 * 1024 * 1024; // 5 MB
    if (fileToUpload.size > MAX_ALLOWED_SIZE) {
      console.error(`Rejected upload: File size is ${formatFileSize(fileToUpload.size)} which exceeds the 3MB safety limit.`);
      return null;
    }

    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `assets/${fileName}`;

    try {
      const { data: uploadData, error: uploadError } = await bigBazarApi.storage.from('assets').upload(filePath, fileToUpload, {
        cacheControl: '31536000',
        upsert: false
      });

      if (uploadError) {
        console.error('Upload API Error:', uploadError);
        return null;
      }

      if (uploadData && uploadData.fullPath) return uploadData.fullPath;
      const { data } = bigBazarApi.storage.from('assets').getPublicUrl(uploadData?.path || filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Upload Error:', err);
      return null;
    }
  };

  const handleFileUpload = async (e, target) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    setLoading(true);
    setUploadProgress({ current: 0, total: rawFiles.length });

    if (target === 'banner') {
      setUploadStatus('compressing');
      const totalBefore = rawFiles[0].size;
      let compressed;
      try {
        compressed = await compressImage(rawFiles[0], COMPRESS_PRESETS.banner);
      } catch (err) {
        setAlertModal({
          isOpen: true,
          title: 'Image Compression Skipped',
          message: err.message || "Failed to parse the file image payload. Please ensure it is a valid format (e.g. JPG, PNG).",
          type: 'error'
        });
        setLoading(false);
        setUploadStatus('idle');
        e.target.value = '';
        return;
      }

      const totalAfter = compressed.size;
      if (totalAfter > 5 * 1024 * 1024) {
        setAlertModal({
          isOpen: true,
          title: 'Image Too Large',
          message: `The image is ${formatFileSize(totalAfter)} after compression, which exceeds the 5MB limit. Please resize it locally first.`,
          type: 'error'
        });
        setLoading(false);
        setUploadStatus('idle');
        e.target.value = '';
        return;
      }

      const url = await uploadSingleFile(compressed);
      if (url) {
        setSiteSettings(prev => ({ ...prev, hero_banner: { ...prev.hero_banner, image_url: url } }));
        setAlertModal({
          isOpen: true,
          title: 'Banner Uploaded',
          message: `Size: ${formatFileSize(totalBefore)} → ${formatFileSize(totalAfter)} (saved ${Math.round((1 - totalAfter / totalBefore) * 100)}%)`,
          type: 'success'
        });
      } else {
        setAlertModal({ isOpen: true, title: 'Upload Failed', message: "The database or server-side store rejected this banner upload.", type: 'error' });
      }

    } else if (target === 'slider') {
      const uploadedUrls = [];
      let totalBefore = 0, totalAfter = 0;
      let failedReasons = [];

      for (let i = 0; i < rawFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: rawFiles.length });
        totalBefore += rawFiles[i].size;

        setUploadStatus('compressing');
        let compressed;
        try {
          compressed = await compressImage(rawFiles[i], COMPRESS_PRESETS.slider);
        } catch (err) {
          failedReasons.push(`${rawFiles[i].name}: ${err.message}`);
          continue;
        }

        totalAfter += compressed.size;

        // Size check for specific slide to prevent crash
        if (compressed.size > 5 * 1024 * 1024) {
          failedReasons.push(`${rawFiles[i].name}: File size remains at ${formatFileSize(compressed.size)} which exceeds the 5MB limit.`);
          continue;
        }

        const url = await uploadSingleFile(compressed);
        if (url) {
          let aspect_ratio = null, width = null, height = null;
          try {
            const imgBitmap = await createImageBitmap(compressed);
            width = imgBitmap.width;
            height = imgBitmap.height;
            aspect_ratio = Number((width / height).toFixed(4));
            imgBitmap.close();
          } catch (_) {}
          uploadedUrls.push({ id: Date.now() + i, image: url, aspect_ratio, width, height });
        } else {
          failedReasons.push(`${rawFiles[i].name}: Main upload rejected by server.`);
        }
      }

      if (uploadedUrls.length > 0) {
        setSiteSettings(prev => ({ ...prev, main_slides: [...(prev.main_slides || []), ...uploadedUrls] }));
        const savings = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : 0;
        setAlertModal({
          isOpen: true,
          title: `${uploadedUrls.length} Slide${uploadedUrls.length > 1 ? 's' : ''} Uploaded`,
          message: `Compressed total: ${formatFileSize(totalBefore)} → ${formatFileSize(totalAfter)} (saved ${savings}%)${failedReasons.length > 0 ? `. ${failedReasons.length} issue(s): ${failedReasons.join(' | ')}` : ''}`,
          type: 'success'
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Upload Failed',
          message: failedReasons.length > 0
            ? failedReasons.join('\n')
            : 'No files were uploaded. Make sure you selected correct images.',
          type: 'error'
        });
      }

    } else {
      // Product gallery / variants
      const uploadedUrls = [];
      let totalBefore = 0, totalAfter = 0;
      let failedReasons = [];

      for (let i = 0; i < rawFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: rawFiles.length });
        totalBefore += rawFiles[i].size;

        setUploadStatus('compressing');
        const preset = i === 0 && target === 'product' ? COMPRESS_PRESETS.product : COMPRESS_PRESETS.gallery;
        let compressed;
        try {
          compressed = await compressImage(rawFiles[i], preset);
        } catch (err) {
          failedReasons.push(`${rawFiles[i].name}: ${err.message}`);
          continue;
        }

        totalAfter += compressed.size;

        if (compressed.size > 2 * 1024 * 1024) {
          failedReasons.push(`${rawFiles[i].name}: Over 2MB limit (${formatFileSize(compressed.size)})`);
          continue;
        }

        const url = await uploadSingleFile(compressed);
        if (url) {
          uploadedUrls.push(url);
        } else {
          failedReasons.push(`${rawFiles[i].name}: Transfer failed.`);
        }
      }

      if (uploadedUrls.length > 0) {
        if (target === 'product') {
          setForm(prev => {
            const cleanOther = (prev.images || []).filter(img => !img.includes('Big Bazar Video') && !img.includes('placeholder'));
            return {
              ...prev,
              image_url: prev.image_url || uploadedUrls[0],
              images: [...uploadedUrls, ...cleanOther.filter(img => !uploadedUrls.includes(img))]
            };
          });
          setPreviewImage(uploadedUrls[0]);
        } else {
          setForm(prev => ({ ...prev, images: [...(prev.images || []), ...uploadedUrls] }));
          setPreviewImage(uploadedUrls[uploadedUrls.length - 1]);
        }
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Upload Failed',
          message: failedReasons.length > 0 ? failedReasons.join('\n') : 'Could not upload pictures.',
          type: 'error'
        });
      }
    }

    setUploadProgress({ current: 0, total: 0 });
    setUploadStatus('idle');
    setLoading(false);
    e.target.value = '';
  };

  const handleMobileSlideUpload = async (e, slideIndex) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setUploadStatus('compressing');
    try {
      const compressed = await compressImage(file, COMPRESS_PRESETS.slider_mobile);
      let mobile_aspect_ratio = null, mobile_width = null, mobile_height = null;
      try {
        const imgBitmap = await createImageBitmap(compressed);
        mobile_width = imgBitmap.width;
        mobile_height = imgBitmap.height;
        mobile_aspect_ratio = Number((mobile_width / mobile_height).toFixed(4));
        imgBitmap.close();
      } catch (_) {}

      const url = await uploadSingleFile(compressed);
      if (url) {
        const updated = [...siteSettings.main_slides];
        updated[slideIndex] = {
          ...updated[slideIndex],
          mobile_image: url,
          mobile_aspect_ratio,
          mobile_width,
          mobile_height
        };
        setSiteSettings(prev => ({ ...prev, main_slides: updated }));
        setAlertModal({
          isOpen: true,
          title: 'Mobile Banner Attached',
          message: `Dedicated mobile banner attached to Slide ${slideIndex + 1}.`,
          type: 'success'
        });
      }
    } catch (err) {
      setAlertModal({
        isOpen: true,
        title: 'Upload Failed',
        message: err.message || 'Failed to upload mobile banner.',
        type: 'error'
      });
    } finally {
      setLoading(false);
      setUploadStatus('idle');
      e.target.value = '';
    }
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
    setNameSuggestions([]);
    setCopyBusy(null);
    setForm({
      name: '', price: '', original_price: '', description: '',
      images: [], video_url: '', is_sale: false, is_hot: false,
      is_new: false, is_sold_out: false, is_exclusive: false, category: 'Women', subcategory: '',
      status: 'published', platform_id: '', serial_no: '',
      available_sizes: [], available_colors: [], stock_count: ''
    });
    setFormStep(1);
  };

  const requestProductCopy = async (mode = 'both') => {
    setCopyBusy(mode);
    try {
      const endpoint = (!API_URL || API_URL === '/')
        ? '/api/admin/product-copy'
        : `${API_URL.replace(/\/$/, '')}/api/admin/product-copy`;
      const token = getToken();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode,
          name: form.name,
          description: form.description,
          category: form.category,
          subcategory: form.subcategory,
          price: form.price,
          original_price: form.original_price,
          colors: form.available_colors,
          sizes: form.available_sizes,
          is_exclusive: form.is_exclusive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Copy helper failed');

      if (mode === 'name' || mode === 'both') {
        const names = Array.isArray(data.names) ? data.names.filter(Boolean) : [];
        setNameSuggestions(names);
        if (!form.name?.trim() && names[0]) {
          setForm((prev) => ({ ...prev, name: names[0] }));
        }
      }
      if (mode === 'description' || mode === 'both') {
        if (data.description) {
          setForm((prev) => ({ ...prev, description: data.description }));
        }
      }
      setFormAlert({
        title: data.source === 'ai' ? 'AI copy ready' : 'Template copy ready',
        message: data.source === 'ai'
          ? 'Suggestions generated. Pick a name chip or edit the description.'
          : 'AI key offline — used Big Bazar template. Still editable.',
        type: 'success',
      });
    } catch (err) {
      setFormAlert({
        title: 'Copy helper failed',
        message: err.message || 'Could not generate product copy',
        type: 'error',
      });
    } finally {
      setCopyBusy(null);
    }
  };

  const startEdit = (p) => {
    setEditingProduct(p);
    setNameSuggestions([]);
    setCopyBusy(null);
    const isFakePoster = (url) => typeof url === 'string' && (url.startsWith('data:image/svg+xml') || url.includes('Big Bazar Video') || url.includes('Big Bazar Reel') || /instagram\.com|instagr\.am/i.test(url));
    const rawImages = Array.isArray(p.images) ? p.images.filter(img => !isFakePoster(img)) : [];
    const mainImg = p.image_url && !isFakePoster(p.image_url) ? p.image_url : (rawImages[0] || null);

    setForm({
      ...p,
      image_url: mainImg,
      images: rawImages.length > 0 ? rawImages : (mainImg ? [mainImg] : [])
    });
    setPreviewImage(mainImg);
    setFormStep(1);
    setActiveTab('add');
  };

  if (!session) return (
    <div className={`min-h-screen flex items-center justify-center p-6 font-sans relative ${adminTheme === 'light' ? 'bg-slate-100' : 'bg-black'}`}>
      {/* Theme toggle on login screen */}
      <button
        onClick={toggleAdminTheme}
        title={adminTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        className={`absolute top-5 right-5 p-2.5 rounded-xl transition-all ${adminTheme === 'light' ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-zinc-800 border border-white/10 text-zinc-400 hover:bg-zinc-700'}`}
      >
        {adminTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
      <div className={`w-full max-w-md space-y-8 p-10 rounded-[32px] shadow-2xl ${
        adminTheme === 'light'
          ? 'bg-white border border-slate-200 shadow-slate-200'
          : 'bg-zinc-900 border border-white/5'
      }`}>
        <div className="text-center space-y-2">
          <h2 className={`text-3xl font-bold tracking-tight uppercase ${adminTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>Admin <span className="text-[#ce112d]">Login</span></h2>
          <p className={`text-sm font-medium ${adminTheme === 'light' ? 'text-slate-500' : 'text-zinc-500'}`}>
            Enter your email & password to access the dashboard
          </p>
        </div>



        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!email || !password) {
            setAlertModal({ isOpen: true, title: 'Incomplete Login', message: 'Please enter both email address and password.', type: 'error' });
            return;
          }
          setLoading(true);
          try {
            const { data, error } = await bigBazarApi.auth.signInWithPassword({ email, password });
            if (error) {
              setAlertModal({
                isOpen: true,
                title: 'Authentication Error',
                message: error.message || 'Invalid email or password. Please verify your admin credentials.',
                type: 'error'
              });
            } else if (data?.step === 2) {
              setAlertModal({
                isOpen: true,
                title: 'Extra Step Required',
                message: 'This account still expects a 2FA code, but that flow is disabled. Ask the owner to reset admin login.',
                type: 'error'
              });
            } else if (data?.session) {
              const userType = data.session?.user?.type || data.user?.type;
              if (userType && userType !== 'admin') {
                setAlertModal({
                  isOpen: true,
                  title: 'Not an Admin Account',
                  message: 'This email is a customer login. Use an admin_users email/password for /admin.',
                  type: 'error'
                });
                clearAdminToken();
                clearCustomerToken();
                setSession(null);
              } else {
                setSession(data.session);
              }
            } else {
              setAlertModal({
                isOpen: true,
                title: 'Login Incomplete',
                message: 'Server did not return a session. Please try again.',
                type: 'error'
              });
            }
          } catch (err) {
            setAlertModal({
              isOpen: true,
              title: 'Login Error',
              message: err.message || 'Unable to connect to login service. Please check your connection.',
              type: 'error'
            });
          } finally {
            setLoading(false);
          }
        }} className="space-y-4">
          <div className="space-y-2">
            <label className={`text-xs font-semibold uppercase tracking-wider ml-1 ${adminTheme === 'light' ? 'text-slate-500' : 'text-zinc-500'}`}>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              className={`w-full h-12 px-4 rounded-2xl text-sm font-medium outline-none transition-all ${
                adminTheme === 'light'
                  ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#ce112d] focus:ring-1 focus:ring-[#ce112d]'
                  : 'bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
              }`}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className={`text-xs font-semibold uppercase tracking-wider ml-1 ${adminTheme === 'light' ? 'text-slate-500' : 'text-zinc-500'}`}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`w-full h-12 pl-4 pr-12 rounded-2xl text-sm font-medium outline-none transition-all ${
                  adminTheme === 'light'
                    ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#ce112d] focus:ring-1 focus:ring-[#ce112d]'
                    : 'bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                }`}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 transition-colors ${adminTheme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'}`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
    <div className={`admin-a11y min-h-screen flex flex-col lg:flex-row font-sans selection:bg-[#ce112d]/30 ${
      adminTheme === 'light'
        ? 'admin-theme-light bg-slate-50 text-slate-900'
        : 'admin-theme-dark bg-[#0a0a0c] text-[#e4e4e7]'
    }`}>
      {/* Mobile Top Bar */}
      <div className={`lg:hidden flex items-center justify-between p-4 border-b sticky top-0 z-[60] backdrop-blur-xl ${
        adminTheme === 'light'
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-zinc-950 border-white/5 text-white'
      }`}>
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-[#ce112d] w-5 h-5" />
          <h1 className={`text-lg font-bold uppercase tracking-tight ${adminTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>Big<span className="text-[#ce112d]">Bazar</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAdminTheme}
            title={adminTheme === 'light' ? 'Dark Mode' : 'Light Mode'}
            className={`p-2 rounded-xl transition-all ${adminTheme === 'light' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400'}`}
          >
            {adminTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-xl transition-all ${adminTheme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-zinc-900'}`}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed Position */}
      <aside className={`fixed lg:sticky top-0 left-0 w-64 h-[100dvh] lg:h-screen border-r px-6 pt-24 pb-6 lg:py-8 flex flex-col justify-between shrink-0 z-50 transition-transform duration-300 lg:translate-x-0 overflow-y-auto no-scrollbar ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${
        adminTheme === 'light'
          ? 'bg-white border-slate-200'
          : 'bg-[#0a0a0c] border-[#1d1d21]'
      }`}>
        <div className="space-y-10">
          <div className="hidden lg:flex items-center gap-3 px-2">
            <ShoppingBag className="text-[#ce112d]" />
            <h1 className={`text-xl font-bold uppercase tracking-tight ${adminTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>Big<span className="text-[#ce112d]">Bazar</span></h1>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'pending-items', icon: <Package size={18} />, label: 'Pending Items', count: orders.filter(o => o && o.status === 'Pending').length },
              { id: 'orders', icon: <ShoppingBag size={18} />, label: 'All Orders', count: orders.filter(o => o && o.status !== 'Deleted').length },
              { id: 'reports', icon: <BarChart3 size={18} />, label: 'Reports & Analytics' },
              { id: 'conversations', icon: <MessageSquare size={18} />, label: 'AI Conversations' },
              { id: 'users', icon: <Users size={18} />, label: 'Signed-in Users' },
              { id: 'deleted', icon: <Archive size={18} />, label: 'Deleted', count: orders.filter(o => o && o.status === 'Deleted').length },
              { id: 'reviews', icon: <Star size={18} />, label: 'Reviews', count: reviews.length },
              { id: 'pending', icon: <Clock size={18} />, label: 'Drafts', count: products.filter(p => p && p.status === 'pending' && !p.is_sold_out).length },
              { id: 'published', icon: <CheckCircle2 size={18} />, label: 'Live Products', count: products.filter(p => p && p.status === 'published' && !p.is_sold_out).length },
              { id: 'soldout', icon: <AlertCircle size={18} />, label: 'Sold Out', count: products.filter(p => p && p.is_sold_out).length },
              { id: 'add', icon: <Plus size={18} />, label: 'Add Product', special: true },
              { id: 'subcategories', icon: <Box size={18} />, label: 'Subcategories' },
              { id: 'settings', icon: <Settings size={18} />, label: 'System Settings' },
              ...(session?.user?.role === 'superadmin' ? [{ id: 'superadmin', icon: <Shield size={18} />, label: 'Superadmin' }] : []),
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                  // Order details only belongs on Orders / Pending — close when leaving
                  if (tab.id !== 'orders' && tab.id !== 'pending-items') {
                    setSelectedOrder(null);
                  }
                  if (tab.id === 'settings' || tab.id === 'subcategories') {
                    fetchSiteSettings();
                    if (tab.id === 'settings') fetchPendingCodes();
                  }
                }}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-[11px] font-bold tracking-wider transition-all duration-300 ${
                  tab.special && activeTab !== tab.id
                    ? 'border-2 border-dashed border-[#ce112d]/40 text-[#ce112d] hover:bg-[#ce112d]/10 hover:border-[#ce112d]'
                    : activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#ce112d] to-[#ff1c3a] text-white shadow-xl shadow-red-900/30 ring-1 ring-white/10'
                      : adminTheme === 'light'
                        ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        : 'hover:bg-white/[0.03] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className={`${activeTab === tab.id ? 'text-white' : adminTheme === 'light' ? 'text-slate-400' : 'text-zinc-500'}`}>{tab.icon}</div>
                <span className="font-semibold text-xs tracking-normal">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-auto text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 font-bold ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : adminTheme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-zinc-900 text-zinc-400'
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className={`mt-auto border-t pt-6 space-y-2 ${adminTheme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
          {/* Theme Toggle */}
          <button
            onClick={toggleAdminTheme}
            className={`w-full flex items-center gap-3 p-4 transition-all rounded-2xl text-xs font-semibold ${
              adminTheme === 'light'
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {adminTheme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {adminTheme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

          <button
            onClick={() => {
              fetchProducts();
              fetchOrders();
              fetchReviews();
            }}
            disabled={loading}
            className={`w-full flex items-center gap-3 p-4 transition-all rounded-2xl text-xs font-semibold ${
              adminTheme === 'light'
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <RotateCcw size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing..." : "Refresh Data"}
          </button>

          <button
            onClick={() => {
              bigBazarApi.auth.signOut();
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 p-4 transition-all rounded-2xl text-xs font-semibold ${
              adminTheme === 'light'
                ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                : 'text-zinc-400 hover:text-red-400 hover:bg-white/5'
            }`}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-4 md:p-12 overflow-y-auto no-scrollbar ${adminTheme === 'light' ? 'bg-slate-50' : 'bg-[#0a0a0c]'}`}>
        {activeTab === 'reports' ? (
          <AdminReports orders={orders} products={products} reviews={reviews} />
        ) : activeTab === 'conversations' ? (
          <AdminConversations />
        ) : activeTab === 'users' ? (
          <AdminUsers />
        ) : activeTab === 'superadmin' && session?.user?.role === 'superadmin' ? (
          <SuperadminPanel />
        ) : activeTab === 'subcategories' ? (
          /* ═══ SUBCATEGORY MANAGER ═══ */
          <div className="max-w-4xl space-y-5 pb-16">
            <div>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Subcategory <span className="text-[#ce112d]">Manager</span>
              </h2>
              <p className="text-[11px] text-zinc-500 mt-1">Photos and names per category</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TOP_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSubcatCategory(cat.id)}
                  className={`h-9 px-3 rounded-lg text-[11px] font-semibold transition-colors border ${
                    subcatCategory === cat.id
                      ? 'bg-[#ce112d] border-[#ce112d] text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                  }`}
                >
                  {cat.en}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-300">
                  {subcatCategory} ({getSubcategoriesForCategory(subcatCategory, subcategoriesData).length})
                </h3>
              </div>

              {getSubcategoriesForCategory(subcatCategory, subcategoriesData).map((sub, idx) => (
                <div key={sub.id} className="flex items-center gap-2.5 p-2.5 bg-[#121215] border border-white/10 rounded-lg hover:border-white/20 transition-colors">
                  <div className="w-9 h-9 rounded-md overflow-hidden bg-zinc-800 border border-white/10 shrink-0 flex items-center justify-center">
                    {sub.image_url ? (
                      <img src={sub.image_url} alt={sub.name_en} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-zinc-500">{(sub.name_en || '?')[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{sub.name_en}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{sub.name_bn}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600">#{sub.sort_order || idx}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubcat(sub.id);
                      setSubcatForm({ id: sub.id, name_en: sub.name_en || '', name_bn: sub.name_bn || '', image_url: sub.image_url || '', sort_order: sub.sort_order || idx });
                    }}
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const merged = mergeWithDynamic(subcategoriesData);
                      const updated = { ...merged };
                      updated[subcatCategory] = (updated[subcatCategory] || []).filter(s => s.id !== sub.id);
                      await bigBazarApi.from('site_settings').upsert({ key: 'subcategories', value: updated });
                      setSubcategoriesData(updated);
                      setAlertModal({ isOpen: true, title: 'Deleted', message: 'Subcategory deleted successfully.', type: 'success' });
                    }}
                    className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {getSubcategoriesForCategory(subcatCategory, subcategoriesData).length === 0 && (
                <div className="text-center py-10 text-zinc-600">
                  <Box size={32} className="mx-auto mb-3 text-zinc-700" />
                  <p className="text-xs font-bold uppercase tracking-wider">No subcategories yet for {subcatCategory}</p>
                </div>
              )}
            </div>

            {/* Add/Edit Subcategory Form */}
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-5">
              <h3 className="text-sm font-black uppercase text-[#ce112d] tracking-wider">
                {editingSubcat ? 'Edit Subcategory' : 'Add New Subcategory'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1.5">English Name</label>
                  <input
                    type="text"
                    value={subcatForm.name_en}
                    onChange={e => setSubcatForm(p => ({ ...p, name_en: e.target.value }))}
                    placeholder="e.g. Sari"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#ce112d]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1.5">Bengali Name</label>
                  <input
                    type="text"
                    value={subcatForm.name_bn}
                    onChange={e => setSubcatForm(p => ({ ...p, name_bn: e.target.value }))}
                    placeholder="e.g. শাড়ি"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#ce112d]/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1.5">Photo URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subcatForm.image_url}
                      onChange={e => setSubcatForm(p => ({ ...p, image_url: e.target.value }))}
                      placeholder="https://... or upload"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#ce112d]/50 transition-all"
                    />
                    <label className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2">
                      <Upload size={16} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setLoading(true);
                            const compressed = await compressImage(file, COMPRESS_PRESETS.thumbnail);
                            const { data, error } = await bigBazarApi.storage.from('products').upload(`subcategory-${Date.now()}.webp`, compressed);
                            if (error) {
                              setAlertModal({ isOpen: true, title: 'Upload Failed', message: error.message || 'Image upload failed', type: 'error' });
                              return;
                            }
                            if (data?.fullPath) setSubcatForm(p => ({ ...p, image_url: data.fullPath }));
                            else if (data?.path) {
                              const { data: urlData } = bigBazarApi.storage.from('products').getPublicUrl(data.path);
                              setSubcatForm(p => ({ ...p, image_url: urlData.publicUrl }));
                            }
                            setAlertModal({ isOpen: true, title: 'Photo Uploaded', message: 'Subcategory photo uploaded successfully!', type: 'success' });
                          } catch (err) {
                            console.error('Upload error:', err);
                            setAlertModal({ isOpen: true, title: 'Upload Error', message: err.message || 'Could not process image', type: 'error' });
                          } finally {
                            setLoading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>
                  {subcatForm.image_url && (
                    <div className="mt-2 w-10 h-10 rounded-full overflow-hidden border border-white/20">
                      <img src={subcatForm.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    value={subcatForm.sort_order}
                    onChange={e => setSubcatForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#ce112d]/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!subcatForm.name_en.trim()) return;
                    const merged = mergeWithDynamic(subcategoriesData);
                    const updated = { ...merged };
                    const catSubs = [...(updated[subcatCategory] || [])];

                    const subObj = {
                      id: editingSubcat || subcatForm.name_en.trim().replace(/[\s/]+/g, '-'),
                      name_en: subcatForm.name_en.trim(),
                      name_bn: subcatForm.name_bn.trim(),
                      image_url: subcatForm.image_url.trim(),
                      sort_order: subcatForm.sort_order,
                    };

                    if (editingSubcat) {
                      const idx = catSubs.findIndex(s => s.id === editingSubcat);
                      if (idx >= 0) catSubs[idx] = subObj;
                      else catSubs.push(subObj);
                    } else {
                      if (catSubs.some(s => s.id === subObj.id)) {
                        setAlertModal({ isOpen: true, title: 'Duplicate', message: `A subcategory with ID "${subObj.id}" already exists.`, type: 'error' });
                        return;
                      }
                      catSubs.push(subObj);
                    }

                    catSubs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                    updated[subcatCategory] = catSubs;

                    await bigBazarApi.from('site_settings').upsert({ key: 'subcategories', value: updated });
                    setSubcategoriesData(updated);
                    setEditingSubcat(null);
                    setSubcatForm({ id: '', name_en: '', name_bn: '', image_url: '', sort_order: catSubs.length });
                    setAlertModal({ isOpen: true, title: 'Saved!', message: 'Subcategory saved successfully.', type: 'success' });
                  }}
                  className="px-8 py-3.5 bg-[#ce112d] hover:bg-[#b00e26] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-red-900/30 flex items-center gap-2"
                >
                  <Save size={16} />
                  {editingSubcat ? 'Save & Update Subcategory' : 'Save & Add Subcategory'}
                </button>
                {editingSubcat && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubcat(null);
                      setSubcatForm({ id: '', name_en: '', name_bn: '', image_url: '', sort_order: 0 });
                    }}
                    className="px-6 py-3.5 bg-white/5 border border-white/10 text-zinc-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all hover:bg-white/10"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="max-w-4xl space-y-6 pb-16">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  System <span className="text-[#ce112d]">Settings</span>
                </h2>
                <p className="text-[11px] text-zinc-500 mt-1">Banners, ticker, and site options</p>
              </div>
              <button type="button" onClick={fetchSiteSettings} className="w-9 h-9 inline-flex items-center justify-center bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-zinc-400">
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="space-y-5 pt-4 border-t border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Home slider</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Desktop & mobile banners</p>
                </div>
                <div className="px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-md text-[10px] font-medium text-zinc-400">
                  {siteSettings.main_slides?.length || 0} slides
                </div>
              </div>

              {/* Recommended Dimensions Guide */}
              <div className="bg-[#151518] border border-white/10 rounded-lg p-3 text-xs space-y-2.5">
                <div className="flex items-center gap-2 text-white font-semibold text-xs">
                  <Sparkles size={14} className="text-[#ce112d]" />
                  <span>Banner size guide</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-black/50 border border-white/5 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-[10px] uppercase">
                      <Monitor size={13} className="text-[#ce112d]" />
                      <span>Desktop / Laptop</span>
                    </div>
                    <p className="text-white font-mono font-semibold text-xs">1920 × 1080 px <span className="text-zinc-500 font-normal">(16:9)</span></p>
                    <p className="text-white font-mono font-semibold text-xs">1920 × 600 px <span className="text-zinc-500 font-normal">(Slim)</span></p>
                    <p className="text-zinc-400 text-[10px] leading-tight">Wide PC & laptop</p>
                  </div>
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase text-[10px]">
                      <Tablet size={14} className="text-[#ce112d]" />
                      <span>Tablet View</span>
                    </div>
                    <p className="text-white font-mono font-bold text-xs">1024 × 500 px <span className="text-zinc-500 font-normal">(~2:1 ratio)</span></p>
                    <p className="text-zinc-400 text-[10px] leading-tight">Perfect for iPad &amp; mid-size tablets</p>
                  </div>
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase text-[10px]">
                      <Smartphone size={14} className="text-[#ce112d]" />
                      <span>Mobile View</span>
                    </div>
                    <p className="text-white font-mono font-bold text-xs">768 × 1024 px <span className="text-zinc-500 font-normal">(Vertical / 3:4)</span></p>
                    <p className="text-white font-mono font-bold text-xs">600 × 600 px / 420 × 400 px</p>
                    <p className="text-zinc-400 text-[10px] leading-tight">Attach mobile banner to slide for pixel-perfect display</p>
                  </div>
                </div>
              </div>

              {/* Slider Ratio Mode Setting */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#121215] border border-white/10 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">Slider Display Ratio Mode</span>
                  <span className="text-[11px] text-zinc-400">Controls how banner aspect ratio behaves across screens</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'auto', label: 'Auto / Smart Adaptive', desc: 'Preserves exact banner proportions without crop' },
                    { id: 'slim', label: '1920 × 600 (Slim)', desc: 'Slim banner mode' },
                    { id: 'fullscreen', label: '1920 × 1080 (16:9)', desc: '16:9 Fullscreen' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSiteSettings({ ...siteSettings, slider_aspect: m.id })}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        (siteSettings.slider_aspect || 'auto') === m.id
                          ? 'bg-[#ce112d] text-white shadow-lg shadow-red-900/30'
                          : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {siteSettings.main_slides?.map((slide, i) => (
                  <div key={slide.id || i} className="bg-[#121215] border border-[#1d1d21] rounded-[24px] overflow-hidden shadow-2xl group relative">
                    {/* Desktop Banner Display */}
                    <div className="relative aspect-[16/9] bg-black">
                      <img src={slide.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-60" />
                      <button
                        type="button"
                        onClick={() => setSiteSettings({ ...siteSettings, main_slides: siteSettings.main_slides.filter((_, idx) => idx !== i) })}
                        className="absolute top-4 right-4 p-3 bg-black/60 text-white rounded-2xl hover:bg-[#ce112d] transition-all shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                        title="Delete Entire Slide"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase border border-white/10 italic">
                          SLIDE {i + 1}
                        </span>
                        <span className="px-2 py-1 bg-[#ce112d]/80 backdrop-blur-md rounded-lg text-[9px] font-bold text-white uppercase flex items-center gap-1">
                          <Monitor size={11} /> Desktop
                        </span>
                      </div>
                      {slide.width && slide.height && (
                        <div className="absolute bottom-4 right-4 px-2 py-0.5 bg-black/70 backdrop-blur-md rounded text-[9px] font-mono text-zinc-400">
                          {slide.width} × {slide.height}
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Mobile Banner Upload/Preview Section */}
                      <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-zinc-300 font-bold uppercase text-[10px]">
                            <Smartphone size={13} className="text-[#ce112d]" />
                            <span>Mobile Banner (768×1024 / 600×600 / 420×400)</span>
                          </div>
                          {slide.mobile_image && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...siteSettings.main_slides];
                                delete updated[i].mobile_image;
                                delete updated[i].mobile_aspect_ratio;
                                delete updated[i].mobile_width;
                                delete updated[i].mobile_height;
                                setSiteSettings({ ...siteSettings, main_slides: updated });
                              }}
                              className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase"
                            >
                              Remove Mobile
                            </button>
                          )}
                        </div>

                        {slide.mobile_image ? (
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 bg-black shrink-0 relative">
                              <img src={slide.mobile_image} className="w-full h-full object-cover" alt="Mobile Banner" />
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              <span className="text-emerald-400 font-bold block">✓ Mobile Version Active</span>
                              {slide.mobile_width && slide.mobile_height ? (
                                <span className="font-mono text-zinc-500">{slide.mobile_width} × {slide.mobile_height} px</span>
                              ) : (
                                <span>Shown automatically on phone screens</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-white/15 hover:border-[#ce112d]/40 bg-black/30 hover:bg-[#ce112d]/5 cursor-pointer transition-all">
                            <Smartphone size={13} className="text-[#ce112d]" />
                            <span className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase">+ Upload Mobile Banner</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              disabled={loading}
                              onChange={e => handleMobileSlideUpload(e, i)}
                            />
                          </label>
                        )}
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider mb-1.5 block">
                          Destination Link <span className="text-zinc-700 normal-case font-normal">(where clicking the banner goes)</span>
                        </label>
                        <input
                          value={slide.button_link || slide.product_id || ''}
                          placeholder="https://... or /products?category=... or product ID"
                          onChange={e => {
                            const updated = [...siteSettings.main_slides];
                            updated[i] = { ...slide, button_link: e.target.value, product_id: e.target.value };
                            setSiteSettings({ ...siteSettings, main_slides: updated });
                          }}
                          className="w-full bg-black/60 border border-white/10 h-10 px-3 rounded-xl text-xs text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50 transition-all font-mono"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <span className="text-[9px] font-black uppercase text-zinc-600">Image Fit</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...siteSettings.main_slides];
                            updated[i] = { ...slide, image_fit: slide.image_fit === 'contain' ? 'cover' : 'contain' };
                            setSiteSettings({ ...siteSettings, main_slides: updated });
                          }}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${slide.image_fit === 'contain'
                            ? 'bg-zinc-800 border-white/20 text-white'
                            : 'bg-[#ce112d]/20 border-[#ce112d]/40 text-[#ce112d]'
                          }`}
                        >
                          {slide.image_fit === 'contain' ? 'Contain' : 'Cover (Fill)'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <label className={`flex flex-col items-center justify-center gap-4 aspect-[16/9] rounded-[24px] border-2 border-dashed transition-all text-zinc-600 group ${loading && uploadStatus !== 'idle'
                    ? 'border-[#ce112d]/50 bg-[#ce112d]/5 cursor-not-allowed'
                    : 'border-[#1d1d21] cursor-pointer bg-[#121215]/30 hover:bg-[#121215]/50 hover:border-[#ce112d]/30 hover:text-white'
                  }`}>
                  <div className="w-16 h-16 rounded-full bg-[#121215] flex items-center justify-center border border-white/5 shadow-2xl group-hover:scale-110 transition-transform">
                    {loading && uploadStatus !== 'idle'
                      ? <div className="w-7 h-7 border-[3px] border-[#ce112d]/30 border-t-[#ce112d] rounded-full animate-spin" />
                      : <Plus size={24} className="text-[#ce112d]" />}
                  </div>
                  <div className="text-center">
                    {loading && uploadStatus !== 'idle' ? (
                      <>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ce112d] animate-pulse">
                          {uploadStatus === 'compressing' ? 'Compressing...' : `Uploading ${uploadProgress.current}/${uploadProgress.total}`}
                        </span>
                        <p className="text-[9px] text-zinc-700 mt-1 uppercase font-bold">Please wait, do not close</p>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Upload Desktop Slides</span>
                        <p className="text-[9px] text-zinc-500 mt-1 font-bold">1920×1080 or 1920×600</p>
                      </>
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*" multiple disabled={loading} onChange={e => handleFileUpload(e, 'slider')} />
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    await bigBazarApi.from('site_settings').upsert({ key: 'slider_aspect', value: siteSettings.slider_aspect || 'auto' }, { onConflict: 'key' });
                    const { error } = await bigBazarApi.from('site_settings').upsert({ key: 'main_slides', value: siteSettings.main_slides }, { onConflict: 'key' });
                    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
                    else setAlertModal({ isOpen: true, title: 'Live!', message: "Slider Engine & Display Settings Updated Successfully.", type: 'success' });
                    setLoading(false);
                  }}
                  className="flex items-center gap-3 bg-[#ce112d] px-12 h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-red-900/40 active:scale-95 transition-all disabled:opacity-50 text-white relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {loading ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{loading ? 'Processing...' : 'Deploy Slider'}</span>
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

            {/* Moving Text Announcement Ticker Section */}
            <div className="space-y-8 pt-12 border-t border-white/5">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white">
                  Scrolling Announcement <span className="text-[#ce112d]">Ticker</span>
                </h3>
                <p className="text-zinc-500 text-[11px] mt-2 uppercase font-bold tracking-widest">
                  Create a minimal moving text strip (e.g. Free Delivery for Mirsharai, 10% OFF, etc.)
                </p>
              </div>

              <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 space-y-8">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${siteSettings.ticker_announcement?.enabled ? 'bg-[#ce112d] text-white shadow-lg shadow-red-500/20' : 'bg-zinc-800 text-zinc-600'}`}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Enable Moving Ticker</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Show left-to-right animated text strip</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSiteSettings({
                      ...siteSettings,
                      ticker_announcement: { 
                        ...siteSettings.ticker_announcement, 
                        enabled: !siteSettings.ticker_announcement?.enabled 
                      }
                    })}
                    className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${siteSettings.ticker_announcement?.enabled ? 'bg-[#ce112d]' : 'bg-zinc-800'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${siteSettings.ticker_announcement?.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Text Content Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] px-1 block">
                    Announcement Text (বিজ্ঞপ্তির লেখা)
                  </label>
                  <input
                    value={siteSettings.ticker_announcement?.text || ''}
                    placeholder="Enter your announcement (e.g. Free Delivery for Mirsharai on orders over 1000 BDT! | 10% OFF on Eid Collection)"
                    onChange={e => setSiteSettings({
                      ...siteSettings,
                      ticker_announcement: { ...siteSettings.ticker_announcement, text: e.target.value }
                    })}
                    className="w-full bg-black/40 border border-white/5 h-14 px-4 rounded-xl text-sm font-bold text-white placeholder:text-zinc-700 outline-none focus:border-[#ce112d]/50 transition-all"
                  />
                  <p className="text-[10px] text-zinc-500 italic px-1">
                    * Leave empty or disable toggle to hide the ticker from the website.
                  </p>
                </div>

                {/* Display Position Selector */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] px-1 block">
                    Display Position (প্রদর্শনের স্থান)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'top_navbar', label: 'Top of Page (On Navbar)', desc: 'Sticks above the site header across all pages' },
                      { id: 'bottom_slider', label: 'Bottom of Hero Slider', desc: 'Displays right below main slider on home page' }
                    ].map(pos => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setSiteSettings({
                          ...siteSettings,
                          ticker_announcement: { ...siteSettings.ticker_announcement, position: pos.id }
                        })}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          (siteSettings.ticker_announcement?.position || 'top_navbar') === pos.id 
                            ? 'bg-[#ce112d]/10 border-[#ce112d] text-white' 
                            : 'bg-black/40 border-white/5 text-zinc-400 hover:border-white/10'
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider">{pos.label}</p>
                        <p className="text-[10px] opacity-60 mt-1">{pos.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color & Speed Customization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                  {/* Background Color */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] block">
                      Background Theme Color
                    </label>
                    <div className="flex items-center gap-3">
                      {[
                        { color: '#ce112d', label: 'Red' },
                        { color: '#18181b', label: 'Dark' },
                        { color: '#059669', label: 'Green' },
                        { color: '#d97706', label: 'Gold' },
                        { color: '#4f46e5', label: 'Indigo' }
                      ].map(c => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setSiteSettings({
                            ...siteSettings,
                            ticker_announcement: { ...siteSettings.ticker_announcement, bg_color: c.color }
                          })}
                          className={`w-9 h-9 rounded-xl transition-transform ${
                            (siteSettings.ticker_announcement?.bg_color || '#ce112d') === c.color 
                              ? 'scale-110 ring-2 ring-white shadow-lg' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Speed */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] block">
                      Scroll Speed
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { speed: 45, label: 'Normal (45s)' },
                        { speed: 65, label: 'Slow (65s)' },
                        { speed: 90, label: 'Very Slow (90s)' },
                        { speed: 120, label: 'Ultra Slow (120s)' }
                      ].map(s => (
                        <button
                          key={s.speed}
                          type="button"
                          onClick={() => setSiteSettings({
                            ...siteSettings,
                            ticker_announcement: { ...siteSettings.ticker_announcement, speed: s.speed }
                          })}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            (siteSettings.ticker_announcement?.speed || 65) === s.speed 
                              ? 'bg-white text-black border-white' 
                              : 'bg-black/40 text-zinc-400 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex pt-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await bigBazarApi.from('site_settings').upsert({ 
                      key: 'ticker_announcement', 
                      value: siteSettings.ticker_announcement 
                    }, { onConflict: 'key' });
                    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
                    else setAlertModal({ isOpen: true, title: 'Success', message: "Ticker Announcement Saved Successfully!", type: 'success' });
                    setLoading(false);
                  }}
                  className="flex items-center gap-2 bg-[#ce112d] px-10 h-14 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-red-900/30 active:scale-95 transition-all disabled:opacity-50 text-white"
                >
                  {loading ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{loading ? 'Saving...' : 'Save Ticker Announcement'}</span>
                </button>
              </div>
            </div>

            {/* Wedding Banner Section */}
            <div className="space-y-6 pt-12 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold italic uppercase tracking-tight text-white">Wedding <span className="text-[#ce112d]">Banner</span></h3>
                  <p className="text-zinc-500 text-[10px] mt-1 font-black uppercase tracking-[0.2em]">Homepage promotional banner — image, text & category filter</p>
                </div>
                {/* Enable / Disable Toggle */}
                <button
                  type="button"
                  onClick={() => setSiteSettings(prev => ({
                    ...prev,
                    wedding_banner: { ...prev.wedding_banner, enabled: !prev.wedding_banner?.enabled }
                  }))}
                  className="flex items-center gap-3"
                >
                  <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${siteSettings.wedding_banner?.enabled ? 'bg-[#ce112d]' : 'bg-zinc-800'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${siteSettings.wedding_banner?.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
                    {siteSettings.wedding_banner?.enabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-6">

                {/* Poster Image */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block">Poster Image</label>
                  {siteSettings.wedding_banner?.image_url ? (
                    <div className="relative w-full aspect-[16/5] rounded-xl overflow-hidden group">
                      <img src={siteSettings.wedding_banner.image_url} alt="Wedding Banner" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                        <label className="px-4 py-2 bg-white text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-zinc-100 transition-all">
                          Replace
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            setLoading(true);
                            try {
                              const compressed = await compressImage(file, COMPRESS_PRESETS.banner);
                              const url = await uploadSingleFile(compressed);
                              if (url) {
                                setSiteSettings(prev => ({ ...prev, wedding_banner: { ...prev.wedding_banner, image_url: url } }));
                                setAlertModal({ isOpen: true, title: 'Banner Uploaded', message: 'Wedding banner uploaded successfully!', type: 'success' });
                              } else {
                                setAlertModal({ isOpen: true, title: 'Upload Failed', message: 'Could not upload banner. Please try again.', type: 'error' });
                              }
                            } catch (err) {
                              setAlertModal({ isOpen: true, title: 'Upload Error', message: err.message || 'Failed to process image.', type: 'error' });
                            } finally {
                              setLoading(false);
                              e.target.value = '';
                            }
                          }} />
                        </label>
                        <button type="button" onClick={() => setSiteSettings(prev => ({ ...prev, wedding_banner: { ...prev.wedding_banner, image_url: '' } }))}
                          className="px-4 py-2 bg-[#ce112d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-[16/5] rounded-xl border-2 border-dashed border-zinc-700 hover:border-[#ce112d]/60 cursor-pointer transition-all group bg-zinc-950/50">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-[#ce112d] group-hover:scale-110 transition-transform mb-3">
                        <Plus size={22} strokeWidth={2.5} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Upload Poster Image</span>
                      <span className="text-[9px] text-zinc-700 mt-1">Recommended: 1920×600px, landscape</span>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setLoading(true);
                        try {
                          const compressed = await compressImage(file, COMPRESS_PRESETS.banner);
                          const url = await uploadSingleFile(compressed);
                          if (url) {
                            setSiteSettings(prev => ({ ...prev, wedding_banner: { ...prev.wedding_banner, image_url: url } }));
                            setAlertModal({ isOpen: true, title: 'Banner Uploaded', message: 'Wedding banner uploaded successfully!', type: 'success' });
                          } else {
                            setAlertModal({ isOpen: true, title: 'Upload Failed', message: 'Could not upload banner. Please try again.', type: 'error' });
                          }
                        } catch (err) {
                          setAlertModal({ isOpen: true, title: 'Upload Error', message: err.message || 'Failed to process image.', type: 'error' });
                        } finally {
                          setLoading(false);
                          e.target.value = '';
                        }
                      }} />
                    </label>
                  )}
                </div>



                {/* Category Filter */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest block">Category Filter Keyword</label>
                  <p className="text-[9px] text-zinc-600">Products page will filter by this category name when banner is clicked</p>
                  <input
                    type="text"
                    value={siteSettings.wedding_banner?.category_filter || ''}
                    onChange={e => setSiteSettings(prev => ({ ...prev, wedding_banner: { ...prev.wedding_banner, category_filter: e.target.value } }))}
                    className="w-full bg-black/50 border border-zinc-800 focus:border-[#ce112d]/40 text-white text-sm font-bold px-4 h-11 rounded-xl outline-none transition-all"
                    placeholder="e.g. Wedding"
                  />
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const { error } = await bigBazarApi.from('site_settings').upsert({ key: 'wedding_banner', value: siteSettings.wedding_banner }, { onConflict: 'key' });
                    if (error) setAlertModal({ isOpen: true, title: 'Error', message: error.message, type: 'error' });
                    else setAlertModal({ isOpen: true, title: 'Saved!', message: 'Wedding banner settings updated.', type: 'success' });
                    setLoading(false);
                  }}
                  className="flex items-center gap-2 bg-[#ce112d] px-10 h-14 rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-red-900/30 active:scale-95 transition-all disabled:opacity-50 text-white"
                >
                  {loading ? <RotateCcw size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{loading ? 'Saving...' : 'Save Wedding Banner'}</span>
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
          <form onSubmit={handleProductSubmit} className="max-w-6xl mx-auto pb-28 space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Catalog</p>
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  {editingProduct ? 'Edit product' : 'New product'}
                </h2>
                <p className="text-sm text-zinc-500 mt-1.5 max-w-xl">
                  Name, price, photo, then sizes and colors. Instagram URL is optional for video only.
                </p>
              </div>
              <button type="button" onClick={cancelEdit} className="shrink-0 p-2.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors" title="Close">
                <X size={20} />
              </button>
            </div>

            {formAlert && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                formAlert.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-100'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
              }`}>
                {formAlert.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{formAlert.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{formAlert.message}</p>
                </div>
                <button type="button" onClick={() => setFormAlert(null)} className="p-1 text-zinc-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-5">
                <section className="rounded-xl border border-white/10 bg-[#111113] p-5 md:p-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Basics</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Title, pricing, stock</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-medium text-zinc-400">Product name</label>
                      <div className="flex items-center gap-2">
                        {form.subcategory && (
                          <button
                            type="button"
                            onClick={() => {
                              const subName = form.subcategory.split('/')[0].trim();
                              if (!form.name.toLowerCase().includes(subName.toLowerCase())) {
                                setForm(prev => ({ ...prev, name: `${subName} ${prev.name}`.trim() }));
                              }
                            }}
                            className="text-[11px] font-medium text-[#ce112d] hover:underline"
                          >
                            Prefix "{form.subcategory.split('/')[0]}"
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!!copyBusy}
                          onClick={() => requestProductCopy('name')}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
                        >
                          <Sparkles size={12} />
                          {copyBusy === 'name' ? 'Suggesting…' : 'AI names'}
                        </button>
                      </div>
                    </div>
                    <input
                      value={form.name}
                      maxLength={255}
                      placeholder="e.g. Premium Mirror Work Panjabi"
                      className="w-full h-11 px-3.5 rounded-lg bg-black/50 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#ce112d]/60"
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-zinc-600">{(form.name || '').length}/255</p>
                    </div>
                    {nameSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {nameSuggestions.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, name: n }))}
                            className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                              form.name === n
                                ? 'bg-[#ce112d]/15 border-[#ce112d]/40 text-[#ce112d]'
                                : 'bg-white/5 border-white/10 text-zinc-300 hover:border-[#ce112d]/30 hover:text-white'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Original</label>
                      <input type="number" value={form.original_price || ''} placeholder="1850"
                        className="w-full h-11 px-3 rounded-lg bg-black/50 border border-white/10 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/25"
                        onChange={e => setForm({ ...form, original_price: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#ce112d]">Sale *</label>
                      <input type="number" required value={form.price || ''} placeholder="1450"
                        className="w-full h-11 px-3 rounded-lg bg-black/50 border border-[#ce112d]/40 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#ce112d]"
                        onChange={e => setForm({ ...form, price: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">Stock</label>
                      <input type="number" value={form.stock_count !== undefined && form.stock_count !== null ? form.stock_count : ''} placeholder="50"
                        className="w-full h-11 px-3 rounded-lg bg-black/50 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/50"
                        onChange={e => setForm({ ...form, stock_count: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-400">Category</label>
                        {form.category && (
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, category: '', subcategory: '' }))} className="text-[11px] text-zinc-500 hover:text-white">Clear</button>
                        )}
                      </div>
                      <div className="relative">
                        <select value={form.category || ''} onChange={e => setForm(prev => ({ ...prev, category: e.target.value, subcategory: '' }))} aria-label="Top-level product category"
                          className="w-full h-11 pl-3.5 pr-9 rounded-lg bg-black/50 border border-white/10 text-sm text-white outline-none appearance-none focus:border-[#ce112d]/60">
                          <option value="" className="bg-zinc-900">Uncategorized</option>
                          {TOP_CATEGORIES.map(cat => (
                            <option key={cat.id} value={cat.id} className="bg-zinc-900">{cat.en} ({cat.bn})</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-400">Subcategory</label>
                        {form.subcategory && (
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, subcategory: '' }))} className="text-[11px] text-zinc-500 hover:text-white">Clear</button>
                        )}
                      </div>
                      <div className="relative">
                        <select value={form.subcategory || ''} onChange={e => setForm(prev => ({ ...prev, subcategory: e.target.value }))} disabled={!form.category} aria-label="Product subcategory"
                          className="w-full h-11 pl-3.5 pr-9 rounded-lg bg-black/50 border border-white/10 text-sm text-white outline-none appearance-none focus:border-[#ce112d]/60 disabled:opacity-40">
                          <option value="" className="bg-zinc-900">None</option>
                          {form.category && getSubcategoriesForCategory(form.category, subcategoriesData).map(sub => (
                            <option key={sub.id} value={sub.id} className="bg-zinc-900">{sub.name_en || sub.en} ({sub.name_bn || sub.bn})</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-medium text-zinc-400">Description</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!!copyBusy}
                          onClick={() => requestProductCopy('description')}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
                        >
                          <Sparkles size={12} />
                          {copyBusy === 'description'
                            ? 'Writing…'
                            : (form.description?.trim() ? 'Improve desc' : 'Write desc')}
                        </button>
                        <button
                          type="button"
                          disabled={!!copyBusy}
                          onClick={() => requestProductCopy('both')}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white disabled:opacity-50"
                        >
                          {copyBusy === 'both' ? 'Working…' : 'Name + desc'}
                        </button>
                      </div>
                    </div>
                    <textarea rows="4" value={form.description} placeholder="Fabric, fit, occasion… or tap Write desc"
                      className="w-full px-3.5 py-3 rounded-lg bg-black/50 border border-white/10 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/25 resize-y min-h-[96px] leading-relaxed"
                      onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4">
                <section className="rounded-xl border border-white/10 bg-[#111113] p-5 md:p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Photos & video</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Main photo required · Instagram optional</p>
                  </div>

                  <div className="aspect-[4/5] w-full rounded-lg border border-white/10 bg-black/40 overflow-hidden relative">
                    {(previewImage || form.image_url) ? (
                      <>
                        <img src={previewImage || form.image_url} className="w-full h-full object-cover object-top" alt="Preview" />
                        <button type="button" onClick={() => {
                          setPreviewImage(null);
                          setForm(prev => ({
                            ...prev,
                            image_url: null,
                            images: (prev.images || []).filter((_, idx) => idx !== 0)
                          }));
                        }} className="absolute top-2.5 right-2.5 p-2 bg-black/70 hover:bg-red-600 text-white rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600 px-4 text-center">
                        <ImageIcon size={28} className="opacity-50" />
                        <p className="text-xs text-zinc-500">No photo yet</p>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-3 w-full px-3.5 py-3 rounded-lg border border-dashed border-white/15 cursor-pointer hover:border-[#ce112d]/50 hover:bg-white/[0.03] transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-[#ce112d] flex items-center justify-center text-white shrink-0">
                      <Upload size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">Upload main photo</p>
                      <p className="text-[11px] text-zinc-500">Best 1080×1350</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'product')} />
                  </label>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Instagram video URL</label>
                    <div className="relative">
                      <input value={form.video_url} onBlur={handleVideoBlur} placeholder="https://www.instagram.com/reels/..."
                        className="w-full h-11 pl-3.5 pr-10 rounded-lg bg-black/50 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#ce112d]/50"
                        onChange={e => setForm({ ...form, video_url: e.target.value })} />
                      <Video size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    </div>
                  </div>

                  {form.video_url && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Video preview</span>
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, video_url: '', platform_id: prev.platform_id }))} className="text-[11px] text-red-400 hover:underline">Clear</button>
                      </div>
                      <div className="aspect-[4/5] max-h-52 rounded-lg border border-white/10 overflow-hidden bg-black">
                        <VideoPlayer src={form.video_url} priority={true} />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-400">Gallery</span>
                      {loading && uploadStatus !== 'idle' && (
                        <span className="text-[11px] text-[#ce112d]">
                          {uploadStatus === 'compressing' ? 'Compressing…' : `Uploading ${uploadProgress.current}/${uploadProgress.total}`}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {form.images?.map((img, i) => (
                        <div key={i} className="relative aspect-[3/4] rounded-md overflow-hidden border border-white/10 group bg-black">
                          <img src={img} onError={(e) => { e.target.src = 'https://placehold.co/400x500/0a0a0c/ce112d?text=Error'; }} className="w-full h-full object-cover" alt="Gallery" />
                          <button type="button" className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            onClick={() => {
                              const removedImg = form.images[i];
                              const updatedImages = form.images.filter((_, idx) => idx !== i);
                              const updatedColors = (form.available_colors || []).map(c => c.image === removedImg ? { ...c, image: null } : c);
                              setForm({ ...form, images: updatedImages, available_colors: updatedColors });
                            }}>
                            <Trash2 size={14} className="text-white" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-[3/4] rounded-md border border-dashed border-white/15 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#ce112d]/40 hover:bg-white/[0.03]">
                        <Plus size={16} className="text-zinc-400" />
                        <span className="text-[10px] text-zinc-500">Add</span>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleFileUpload(e, 'product')} />
                      </label>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#111113] p-5 md:p-6 space-y-6">
              <div className="pb-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">Sizes & colors</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Optional variants for the product page</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4 rounded-lg border border-white/5 bg-black/20 p-4 md:p-5">
                  <div>
                    <label className="text-xs font-semibold text-white">Available sizes</label>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Type a size or use presets</p>
                  </div>
                  <div className="flex gap-2">
                    <input value={customSizeInput} placeholder="e.g. S, M, L, 38, Free Size"
                      onChange={e => setCustomSizeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = customSizeInput.trim().toUpperCase();
                          if (val && !(form.available_sizes || []).some(s => (typeof s === 'object' ? s.name : s) === val)) {
                            setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: val, is_available: true }] });
                            setCustomSizeInput('');
                          }
                        }
                      }}
                      className="flex-1 h-11 px-3.5 rounded-lg bg-black/50 border border-white/10 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#ce112d]/50 uppercase" />
                    <button type="button" onClick={() => {
                      const val = customSizeInput.trim().toUpperCase();
                      if (val && !(form.available_sizes || []).some(s => (typeof s === 'object' ? s.name : s) === val)) {
                        setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: val, is_available: true }] });
                        setCustomSizeInput('');
                      }
                    }} className="px-4 h-11 bg-[#ce112d] hover:bg-[#b00e26] text-white rounded-lg text-xs font-semibold shrink-0">Add</button>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[11px] text-zinc-500">Presets</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', 'Free Size'].map(s => {
                        const isAdded = (form.available_sizes || []).some(sz => (typeof sz === 'object' ? sz.name : sz) === s);
                        return (
                          <button key={s} type="button" onClick={() => {
                            if (isAdded) setForm({ ...form, available_sizes: (form.available_sizes || []).filter(sz => (typeof sz === 'object' ? sz.name : sz) !== s) });
                            else setForm({ ...form, available_sizes: [...(form.available_sizes || []), { name: s, is_available: true }] });
                          }} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${isAdded ? 'bg-[#ce112d]/20 border-[#ce112d]/50 text-white' : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/25 hover:text-white'}`}>{s}</button>
                        );
                      })}
                    </div>
                  </div>
                  {(form.available_sizes || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {form.available_sizes.map((size, idx) => {
                        const name = typeof size === 'object' ? size.name : size;
                        const isAvailable = typeof size === 'object' ? (size.is_available ?? true) : true;
                        return (
                          <div key={idx} className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border ${isAvailable ? 'bg-white/5 text-white border-white/15' : 'bg-transparent text-zinc-600 border-white/5 line-through'}`}>
                            <span>{name}</span>
                            <button type="button" onClick={() => setForm({ ...form, available_sizes: (form.available_sizes || []).filter((_, i) => i !== idx) })} className="p-0.5 hover:text-red-400 text-zinc-500"><X size={12} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                    {/* Colors — compact picker (no category grids) */}
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Colors</label>
                        <p className="text-[11px] text-zinc-600 mt-0.5">Pick a color, confirm the name, then add</p>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-4">
                        {/* Primary row: native picker + name + hex + add */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                          <label
                            className="relative w-12 h-12 shrink-0 cursor-pointer rounded-lg border border-white/15 overflow-hidden shadow-inner"
                            style={{ backgroundColor: form._newColorHex || '#888888' }}
                            title="Open color picker"
                          >
                            <input
                              type="color"
                              aria-label="Pick color"
                              value={/^#[0-9a-fA-F]{6}$/.test(form._newColorHex || '') ? form._newColorHex : '#888888'}
                              onChange={(e) => {
                                const matched = getColorName(e.target.value);
                                setForm({ ...form, _newColorHex: e.target.value, _newColorName: matched.en });
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center py-0.5 bg-black/40">
                              <Pipette size={10} className="text-white/70" />
                            </span>
                          </label>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_7.5rem] gap-2">
                            <div className="relative">
                              <span className="text-[10px] text-zinc-500 font-medium mb-1 block">Name</span>
                              <input
                                value={form._newColorName || ''}
                                placeholder="Type to search… e.g. Navy"
                                autoComplete="off"
                                onFocus={() => setForm((prev) => ({ ...prev, _colorSuggestions: true }))}
                                onBlur={() => {
                                  // Delay so suggestion click registers
                                  setTimeout(() => setForm((prev) => ({ ...prev, _colorSuggestions: false })), 150);
                                }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const exact = resolveColorByName(val);
                                  setForm({
                                    ...form,
                                    _newColorName: val,
                                    _colorSuggestions: true,
                                    ...(exact ? { _newColorHex: exact.hex } : {}),
                                  });
                                }}
                                className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-sm text-white outline-none focus:border-[#ce112d]/50"
                              />
                              {form._colorSuggestions && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 shadow-2xl">
                                  {suggestColorNames(form._newColorName || '', 10).map((s) => (
                                    <button
                                      key={`${s.en}-${s.hex}`}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        setForm({
                                          ...form,
                                          _newColorName: s.en,
                                          _newColorHex: s.hex,
                                          _colorSuggestions: false,
                                        });
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                                    >
                                      <span
                                        className="w-5 h-5 rounded border border-white/20 shrink-0"
                                        style={{ backgroundColor: s.hex }}
                                      />
                                      <span className="flex-1 min-w-0">
                                        <span className="block text-xs font-semibold text-white truncate">{s.en}</span>
                                        <span className="block text-[10px] text-zinc-500 truncate">{s.bn}</span>
                                      </span>
                                      <span className="text-[10px] font-mono text-zinc-600 uppercase shrink-0">{s.hex}</span>
                                    </button>
                                  ))}
                                  {suggestColorNames(form._newColorName || '', 10).length === 0 && (
                                    <p className="px-3 py-2.5 text-[11px] text-zinc-500">No match — pick a swatch or use the color picker</p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500 font-medium mb-1 block">HEX</span>
                              <input
                                value={form._newColorHex || ''}
                                placeholder="#000000"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                                    const matched = getColorName(val);
                                    setForm({ ...form, _newColorHex: val, _newColorName: matched.en, _colorSuggestions: false });
                                  } else {
                                    setForm({ ...form, _newColorHex: val });
                                  }
                                }}
                                className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-xs font-mono uppercase text-zinc-300 outline-none focus:border-[#ce112d]/50"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const typed = (form._newColorName || '').trim();
                              if (!typed) {
                                setAlertModal({ isOpen: true, title: 'Missing Name', message: 'Enter or pick a color name first.', type: 'error' });
                                return;
                              }
                              const known = resolveColorByName(typed);
                              const name = known?.en || typed;
                              const hex = known?.hex
                                || (/^#[0-9a-fA-F]{6}$/.test(form._newColorHex || '') ? form._newColorHex : '#888888');
                              setForm({
                                ...form,
                                available_colors: [...(form.available_colors || []), { name, image: null, is_available: true, hex, sizes: [] }],
                                _newColorHex: '#888888',
                                _newColorName: '',
                                _colorSuggestions: false,
                              });
                            }}
                            className="h-10 px-4 rounded-lg bg-[#ce112d] hover:bg-[#e61535] text-white text-xs font-semibold shrink-0 active:scale-[0.98] transition-all"
                          >
                            + Add
                          </button>
                        </div>

                        {/* Quick fashion colors — one compact strip, no category labels */}
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
                          {PRESET_SWATCHES.map((swatch) => {
                            const isSelected = (form._newColorHex || '').toLowerCase() === swatch.hex.toLowerCase();
                            return (
                              <button
                                key={swatch.hex + swatch.en}
                                type="button"
                                title={swatch.en}
                                aria-label={swatch.en}
                                onClick={() => setForm({ ...form, _newColorHex: swatch.hex, _newColorName: swatch.en })}
                                className={`w-7 h-7 rounded-md border transition-all ${
                                  isSelected
                                    ? 'border-emerald-400 ring-1 ring-emerald-400/50 scale-110'
                                    : 'border-white/15 hover:border-white/40 hover:scale-105'
                                }`}
                                style={{ backgroundColor: swatch.hex }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-8">
                        {form.available_colors?.map((rawColor, idx) => {
                          const color = typeof rawColor === 'object' ? rawColor : { name: rawColor, is_available: true, image: null, hex: null, sizes: [] };
                          const isAvailable = color.is_available ?? true;
                          return (
                            <div key={idx} className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-md border border-white/15" style={{ backgroundColor: color.hex || '#888' }}></div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-white">{color.name}</h4>
                                    <span className={`text-[10px] font-medium ${isAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {isAvailable ? 'Active' : 'Sold out'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => {
                                    const updated = [...form.available_colors];
                                    updated[idx] = { ...color, is_available: !isAvailable };
                                    setForm({ ...form, available_colors: updated });
                                  }} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${isAvailable ? 'bg-white/5 text-zinc-400 hover:text-white' : 'bg-emerald-600 text-white'}`}>
                                    {isAvailable ? 'Mark sold out' : 'Restore'}
                                  </button>
                                  <button type="button" onClick={() => setForm({ ...form, available_colors: form.available_colors.filter((_, i) => i !== idx) })} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <label className="text-[11px] font-medium text-zinc-500">Stock & SKU per size</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                                    {form.available_sizes?.map((sz, sIdx) => {
                                      const sName = typeof sz === 'object' ? sz.name : sz;
                                      const sObj = color.sizes?.find(s => (typeof s === 'object' ? s.name : s) === sName);
                                      const isLinked = !!sObj;
                                      return (
                                        <div key={sIdx} className={`p-3 rounded-lg border transition-colors ${isLinked ? 'bg-black/40 border-[#ce112d]/30' : 'bg-black/10 border-white/5 opacity-60'}`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-white">{sName}</span>
                                            <input type="checkbox" checked={isLinked} onChange={() => {
                                              const updated = [...form.available_colors];
                                              const curSizes = color.sizes || [];
                                              const newSizes = isLinked ? curSizes.filter(s => (typeof s === 'object' ? s.name : s) !== sName) : [...curSizes, { name: sName, stock: 0, sku: '' }];
                                              updated[idx] = { ...color, sizes: newSizes };
                                              setForm({ ...form, available_colors: updated });
                                            }} className="w-4 h-4 accent-[#ce112d]" />
                                          </div>
                                          {isLinked && (
                                            <div className="space-y-2">
                                              <div>
                                                <p className="text-[10px] text-zinc-500 mb-1">Stock</p>
                                                <input type="number" value={sObj.stock || 0} onChange={e => {
                                                  const updated = [...form.available_colors];
                                                  const newSizes = color.sizes.map(s => (typeof s === 'object' ? s.name : s) === sName ? { ...s, stock: parseInt(e.target.value) || 0 } : s);
                                                  updated[idx] = { ...color, sizes: newSizes };
                                                  setForm({ ...form, available_colors: updated });
                                                }} className="w-full bg-zinc-900 border border-white/10 rounded-md h-8 px-2 text-xs text-white outline-none focus:border-[#ce112d]" />
                                              </div>
                                              <div>
                                                <p className="text-[10px] text-zinc-500 mb-1">SKU</p>
                                                <input type="text" placeholder="SKU" value={sObj.sku || ''} onChange={e => {
                                                  const updated = [...form.available_colors];
                                                  const newSizes = color.sizes.map(s => (typeof s === 'object' ? s.name : s) === sName ? { ...s, sku: e.target.value } : s);
                                                  updated[idx] = { ...color, sizes: newSizes };
                                                  setForm({ ...form, available_colors: updated });
                                                }} className="w-full bg-zinc-900 border border-white/10 rounded-md h-8 px-2 text-[11px] font-mono text-[#ce112d] outline-none focus:border-[#ce112d] uppercase" />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-white/10 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-medium text-zinc-500">
                                      Photo for {color.name || 'this color'}
                                    </label>
                                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-md text-[11px] font-medium cursor-pointer border border-white/10">
                                      <Upload size={12} />
                                      <span>Upload</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          setLoading(true);
                                          try {
                                            const compressed = await compressImage(file, COMPRESS_PRESETS.product);
                                            const url = await uploadSingleFile(compressed);
                                            if (url) {
                                              const updated = [...form.available_colors];
                                              updated[idx] = { ...color, image: url };
                                              setForm(prev => ({
                                                ...prev,
                                                images: [url, ...(prev.images || []).filter(img => img !== url)],
                                                available_colors: updated
                                              }));
                                            }
                                          } catch (err) {
                                            console.error('Color image upload error:', err);
                                          } finally {
                                            setLoading(false);
                                            e.target.value = '';
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>

                                  {form.images?.length > 0 && (
                                    <div className="flex flex-wrap gap-2.5">
                                      {form.images.map((img, i) => (
                                        <div
                                          key={i}
                                          onClick={() => {
                                            const updated = [...form.available_colors];
                                            updated[idx] = { ...color, image: color.image === img ? null : img };
                                            setForm({ ...form, available_colors: updated });
                                          }}
                                          className={`relative w-14 h-14 rounded-[18px] overflow-hidden border-2 cursor-pointer transition-all ${
                                            color.image === img
                                              ? 'border-[#ce112d] scale-110 shadow-2xl ring-4 ring-red-900/20'
                                              : 'border-zinc-800 opacity-40 hover:opacity-100'
                                          }`}
                                        >
                                          <img src={img} className="w-full h-full object-cover" alt="Variant" />
                                          {color.image === img && (
                                            <div className="absolute inset-0 bg-[#ce112d]/40 flex items-center justify-center">
                                              <Check size={16} strokeWidth={4} className="text-white" />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <label className="flex items-center gap-3 p-4 rounded-lg border border-white/10 bg-black/30 cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <input type="checkbox" checked={form.is_sold_out} onChange={e => setForm({ ...form, is_sold_out: e.target.checked })} className="w-4 h-4 rounded accent-[#ce112d] shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-white">Sold out</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Hide from store</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-lg border border-[#ce112d]/25 bg-[#ce112d]/5 cursor-pointer hover:bg-[#ce112d]/10 transition-colors">
                    <input type="checkbox" checked={form.is_exclusive} onChange={e => setForm({ ...form, is_exclusive: e.target.checked })} className="w-4 h-4 rounded accent-[#ce112d] shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-red-300">Exclusive</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">৳500 advance</p>
                    </div>
                  </label>
                  {!editingProduct && (
                    <label className="flex items-center gap-3 p-4 rounded-lg border border-emerald-500/25 bg-emerald-500/5 cursor-pointer hover:bg-emerald-500/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={notifySignedInUsers}
                        onChange={(e) => setNotifySignedInUsers(e.target.checked)}
                        className="w-4 h-4 rounded accent-emerald-500 shrink-0"
                      />
                      <div>
                        <span className="text-sm font-medium text-emerald-300">Notify users</span>
                        <p className="text-[11px] text-zinc-500 mt-0.5">On publish</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-full sm:w-36 h-11 border border-white/10 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-48 bg-emerald-600 hover:bg-emerald-500 h-11 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {loading ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{loading ? 'Saving…' : (editingProduct ? 'Update product' : 'Save product')}</span>
                </button>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#0a0a0c]/95 border-t border-white/10 backdrop-blur-md z-50 lg:hidden flex items-center gap-2">
                <button type="button" onClick={cancelEdit} className="px-4 h-11 border border-white/10 rounded-lg text-xs font-semibold text-zinc-400">
                  Discard
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-11 rounded-lg font-semibold text-xs text-white flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{loading ? 'Saving…' : (editingProduct ? 'Update' : 'Save')}</span>
                </button>
              </div>
            </div>
          </form>
        ) : activeTab === 'pending-items' ? (
          <div className="space-y-5 pb-20">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Pending <span className="text-yellow-500">Deliveries</span>
              </h2>
              <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-white/10">
                {orders.filter(o => o.status === 'Pending' && o.status !== 'Deleted').length} to pack
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {orders.filter(o => o.status === 'Pending' && o.status !== 'Deleted').length === 0 ? (
                <div className="col-span-full py-16 text-center space-y-2 rounded-xl border border-dashed border-white/10 bg-zinc-900/40">
                  <Package className="mx-auto text-zinc-700" size={28} />
                  <p className="text-sm font-semibold text-zinc-400">No pending items</p>
                  <p className="text-xs text-zinc-600">All orders are processed</p>
                </div>
              ) : (
                orders.filter(o => o.status === 'Pending' && o.status !== 'Deleted').map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="bg-[#121215] border border-white/10 rounded-xl p-3 space-y-3 hover:border-yellow-500/40 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      <span className="font-semibold text-yellow-500">#{order.id.toString().slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="flex gap-2.5">
                      <div className="w-12 h-14 bg-black rounded-md overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                        {(() => {
                          const product = products.find(p => p.id == order.product_id);
                          const thumb = getOptimizedUrl(product?.image_url || product?.images?.[0], mediaSizes.thumbnail);
                          return thumb ? <img src={thumb} className="w-full h-full object-cover" alt="" /> : <ShoppingBag size={16} className="text-zinc-700" />;
                        })()}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-[12px] font-semibold text-white leading-snug line-clamp-2">{order.product_name}</h4>
                        <div className="flex flex-wrap gap-1">
                          {order.size && <span className="bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] border border-white/10">SZ: {order.size}</span>}
                          {order.color && <span className="bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] border border-white/10">COL: {order.color}</span>}
                        </div>
                        <p className="text-[11px] text-[#ce112d] font-medium truncate">{order.customer_name}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{order.customer_phone}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <a href={`tel:${order.customer_phone}`} onClick={e => e.stopPropagation()} className="h-9 flex items-center justify-center bg-blue-500 text-white rounded-lg text-[10px] font-semibold">Call</a>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyFullOrderDetails(order); }}
                        className="h-9 flex items-center justify-center gap-1 bg-zinc-800 text-white hover:bg-[#ce112d] rounded-lg text-[10px] font-semibold"
                      >
                        <Copy size={11} /> Copy
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'Shipped'); }}
                        className="h-9 flex items-center justify-center bg-yellow-500 text-black rounded-lg text-[10px] font-semibold"
                      >
                        Shipped
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Orders <span className="text-[#ce112d]">Details</span>
                </h2>
                <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-white/10">
                  {orders.filter(o => o && o.status !== 'Deleted').length} active
                </span>
              </div>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#121215] border border-white/10 text-[11px] font-semibold text-zinc-400 hover:border-[#ce112d]/40 hover:text-white transition-colors self-start sm:self-auto"
              >
                <Download size={14} className="text-[#ce112d]" />
                CSV
              </button>
            </div>

            {/* Compact stats */}
            {(() => {
              const live = orders.filter(o => o && o.status !== 'Deleted');
              const revenue = live.reduce((acc, o) => acc + (parseFloat(o.total_amount) || 0), 0);
              const advance = orders.filter(o => o && o.is_advance_paid).reduce((acc, o) => {
                const charge = parseFloat(o.delivery_charge) || 0;
                return acc + (o.is_exclusive_order ? 500 : (o.delivery_area === 'mirsarai' && charge === 0 ? 100 : charge));
              }, 0);
              const due = live.filter(o => o.payment_status !== 'Fully Paid').reduce((acc, o) => {
                const totalAmount = parseFloat(o.total_amount) || 0;
                const charge = parseFloat(o.delivery_charge) || 0;
                const adv = o.is_advance_paid ? (o.is_exclusive_order ? 500 : (o.delivery_area === 'mirsarai' && charge === 0 ? 100 : charge)) : 0;
                return acc + (totalAmount - adv);
              }, 0);
              const pending = orders.filter(o => o && o.status === 'Pending').length;
              const done = orders.filter(o => o && o.status === 'Delivered').length;
              const cards = [
                { label: 'Revenue', value: `৳${revenue.toLocaleString()}`, color: 'border-t-green-500', icon: <ShoppingBag size={14} className="text-green-500" /> },
                { label: 'Advance', value: `৳${advance.toLocaleString()}`, color: 'border-t-purple-500', icon: <ShieldCheck size={14} className="text-purple-500" /> },
                { label: 'Due', value: `৳${due.toLocaleString()}`, color: 'border-t-[#ce112d]', icon: <span className="text-[#ce112d] text-xs font-bold">৳</span> },
                { label: 'Pending', value: pending, color: 'border-t-yellow-500', icon: <Clock size={14} className="text-yellow-500" /> },
                { label: 'Done', value: done, color: 'border-t-emerald-500', icon: <CheckCircle2 size={14} className="text-emerald-500" /> },
              ];
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {cards.map((c) => (
                    <div key={c.label} className={`rounded-lg border border-white/10 bg-[#121215] border-t-2 ${c.color} px-3 py-2.5 flex items-center justify-between gap-2`}>
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{c.label}</p>
                        <p className="text-base font-semibold text-white truncate mt-0.5">{c.value}</p>
                      </div>
                      <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {c.icon}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Mobile / Shared Order Details Modal */}
            {selectedOrder && (activeTab === 'pending-items' || (activeTab === 'orders' && !window.matchMedia('(min-width: 1024px)').matches)) && (
              <div className="fixed inset-0 z-[1200] bg-black/80 flex items-end md:items-center justify-center p-0 md:p-6 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
                <div
                  className="relative w-full md:max-w-2xl md:rounded-xl overflow-hidden shadow-2xl border-t md:border border-white/10 bg-[#0a0a0c] h-[100dvh] md:h-auto md:max-h-[90vh]"
                  onClick={e => e.stopPropagation()}
                >
                  <OrderDetailsPanel
                    order={selectedOrder}
                    products={products}
                    variant="modal"
                    onClose={() => setSelectedOrder(null)}
                    onCopyFull={copyFullOrderDetails}
                    onCopy={copyToClipboard}
                    onDelete={(id) => { deleteOrder(id); setSelectedOrder(null); }}
                    onTogglePayment={togglePaymentStatus}
                    onUpdateStatus={updateOrderStatus}
                    onEditNote={updateOrderNote}
                  />
                </div>
              </div>
            )}

            {/* Desktop split view */}
            <div className="hidden lg:grid grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[28rem]">
              {/* LEFT: order list */}
              <div className="col-span-4 flex flex-col gap-2 overflow-y-auto pr-1">
                {(() => {
                  const filteredOrders = orders.filter(o => o && o.status !== 'Deleted');
                  if (filteredOrders.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-white/10 bg-zinc-900/50 text-zinc-600">
                        <ShoppingBag size={28} />
                        <p className="mt-2 text-xs font-medium">No active orders</p>
                      </div>
                    );
                  }

                  return filteredOrders.map(o => {
                    const isSelected = selectedOrder?.id === o.id;
                    const amount = typeof o.total_amount === 'string'
                      ? parseFloat(o.total_amount.replace(/[^0-9.]/g, ''))
                      : parseFloat(o.total_amount);

                    const firstItemName = (o.product_name || '').split('(')[0]?.trim();
                    const firstItemSku = (o.product_name || '').match(/\(SKU:\s*([^)]*)\)/i)?.[1]?.trim();
                    const targetProduct =
                      products.find(p => p.id == o.product_id) ||
                      products.find(p => firstItemSku && (p.platform_id == firstItemSku || p.serial_no == firstItemSku)) ||
                      products.find(p => p.name === firstItemName) ||
                      products.find(p => p.name && firstItemName && p.name.toLowerCase().includes(firstItemName.toLowerCase()));
                    const thumb = getOptimizedUrl(targetProduct?.image_url || targetProduct?.images?.[0], mediaSizes.thumbnail);

                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-[#1a1214] border-[#ce112d]/60'
                            : 'bg-[#121215]/60 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex gap-2.5">
                          <div className="w-12 h-14 rounded-md overflow-hidden shrink-0 border border-white/10 bg-black flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <ShoppingBag size={16} className="text-zinc-700" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <p className="text-[10px] text-zinc-500">{new Date(o.created_at).toLocaleDateString()}</p>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                                  o.status === 'Pending' ? 'bg-yellow-500/15 text-yellow-400' :
                                  o.status === 'Shipped' ? 'bg-blue-500/15 text-blue-400' :
                                  o.status === 'Delivered' ? 'bg-green-500/15 text-green-400' :
                                  'bg-red-500/15 text-red-400'
                                }`}>{o.status}</span>
                              </div>
                              <p className="text-[12px] font-semibold text-white truncate leading-snug">
                                {firstItemName || 'Custom Order'}
                              </p>
                              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{o.customer_name}</p>
                            </div>
                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5">
                              <p className="text-[12px] font-semibold text-[#ce112d]">৳{(amount || 0).toLocaleString()}</p>
                              <p className="text-[10px] text-zinc-500 uppercase flex items-center gap-0.5 truncate max-w-[45%]">
                                <MapPin size={10} className="shrink-0" /> {o.delivery_area}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              {/* RIGHT: details */}
              <div className="col-span-8 bg-[#121215]/40 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                {!selectedOrder ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2">
                    <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center border border-white/5">
                      <ShoppingBag size={22} className="text-zinc-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-300">Select an order</h3>
                    <p className="text-zinc-500 text-xs max-w-xs">Customer, items, payment and status appear here.</p>
                  </div>
                ) : (
                  <OrderDetailsPanel
                    order={selectedOrder}
                    products={products}
                    variant="panel"
                    onCopyFull={copyFullOrderDetails}
                    onCopy={copyToClipboard}
                    onDelete={deleteOrder}
                    onTogglePayment={togglePaymentStatus}
                    onUpdateStatus={updateOrderStatus}
                    onEditNote={updateOrderNote}
                  />
                )}
              </div>
            </div>

            {/* Mobile list */}
            <div className="lg:hidden space-y-2 pb-24">
              {(() => {
                const productMap = {};
                products.forEach(p => { productMap[p.id] = p; });

                return orders.filter(o => o && o.status !== 'Deleted').map(o => {
                  const product = productMap[o.product_id];
                  let productThumb = product?.image_url || product?.images?.[0];
                  const amount = typeof o.total_amount === 'string'
                    ? parseFloat(o.total_amount.replace(/[^0-9.]/g, ''))
                    : parseFloat(o.total_amount);

                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="w-full text-left bg-[#121215] border border-white/10 rounded-lg p-2.5 hover:border-[#ce112d]/40 transition-colors"
                    >
                      <div className="flex gap-2.5">
                        <div className="w-12 h-14 bg-black rounded-md overflow-hidden shrink-0 relative border border-white/10">
                          {productThumb && <img src={getOptimizedUrl(productThumb, mediaSizes.thumbnail)} className="w-full h-full object-cover" alt="" />}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-[12px] font-semibold text-white truncate">{o.customer_name}</p>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase shrink-0 ${
                              o.status === 'Pending' ? 'bg-yellow-500/15 text-yellow-400' :
                              o.status === 'Shipped' ? 'bg-blue-500/15 text-blue-400' :
                              o.status === 'Delivered' ? 'bg-green-500/15 text-green-400' :
                              'bg-red-500/15 text-red-400'
                            }`}>{o.status}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate">{(o.product_name || '').split('(')[0]?.trim()}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[12px] font-semibold text-[#ce112d]">৳{(amount || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">{o.delivery_area}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
            {orders.filter(o => o && o.status !== 'Deleted').length === 0 && !loading && (
              <div className="py-16 text-center space-y-2">
                <div className="w-14 h-14 bg-zinc-900 rounded-xl flex items-center justify-center mx-auto border border-white/5">
                  <ShoppingBag className="text-zinc-600" size={22} />
                </div>
                <p className="text-zinc-400 text-sm font-semibold">No orders found</p>
                <p className="text-zinc-600 text-xs">Waiting for new orders</p>
              </div>
            )}
          </div>
        ) : activeTab === 'deleted' ? (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Deleted <span className="text-[#ce112d]">Orders</span>
                </h2>
                <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-white/10">
                  {orders.filter(o => o && o.status === 'Deleted').length} in trash
                </span>
              </div>
              {orders.filter(o => o && o.status === 'Deleted').length > 0 && (
                <button
                  onClick={emptyBin}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-zinc-900 border border-white/10 text-[11px] font-semibold text-[#ce112d] hover:bg-[#ce112d] hover:text-white transition-colors self-start"
                >
                  <Trash2 size={14} /> Empty Bin
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(() => {
                const productMap = {};
                products.forEach(p => { productMap[p.id] = p; });

                return orders.filter(o => o && o.status === 'Deleted').map(o => {
                  const product = productMap[o.product_id];
                  let productThumb = product?.image_url || product?.images?.[0];

                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className="bg-[#121215] border border-dashed border-white/10 rounded-xl p-3 space-y-3 opacity-80 hover:opacity-100 hover:border-[#ce112d]/40 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-[10px] text-zinc-500 truncate">
                          {new Date(o.created_at).toLocaleDateString()}
                        </p>
                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-semibold uppercase rounded border border-red-500/20">Deleted</span>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="w-12 h-14 bg-black rounded-md overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                          {productThumb ? (
                            <img src={getOptimizedUrl(productThumb, mediaSizes.thumbnail)} className="w-full h-full object-cover grayscale" alt="" />
                          ) : (
                            <ImageIcon size={16} className="text-zinc-700" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-white truncate">{o.product_name}</p>
                          <p className="text-[12px] font-semibold text-[#ce112d] mt-0.5">৳{o.total_amount}</p>
                          <p className="text-[11px] text-zinc-400 truncate mt-1">{o.customer_name}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{o.customer_phone} · {o.delivery_area}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 pt-1 border-t border-white/5" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => restoreOrder(o.id)} className="flex-1 h-9 inline-flex items-center justify-center gap-1 bg-green-500/10 text-green-400 rounded-lg text-[10px] font-semibold hover:bg-green-500 hover:text-white transition-colors">
                          <RotateCcw size={12} /> Restore
                        </button>
                        <button type="button" onClick={() => permanentDeleteOrder(o.id)} className="flex-1 h-9 inline-flex items-center justify-center gap-1 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-semibold hover:bg-red-500 hover:text-white transition-colors">
                          <Trash2 size={12} /> Wipe
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {orders.filter(o => o && o.status === 'Deleted').length === 0 && (
              <div className="py-16 text-center space-y-2">
                <Archive className="mx-auto text-zinc-700" size={28} />
                <p className="text-sm font-semibold text-zinc-400">Trash is empty</p>
                <p className="text-xs text-zinc-600">No deleted orders</p>
              </div>
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Reviews <span className="text-[#ce112d]">& Feedback</span>
              </h2>
              <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-white/10">
                {reviews.length} total
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {(() => {
                const avgRating = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;
                return (
                  <div className="rounded-lg border border-white/10 border-t-2 border-t-[#ce112d] bg-[#121215] px-3 py-3 flex flex-col items-center justify-center text-center gap-1.5">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Avg rating</p>
                    <p className="text-2xl font-semibold text-white">
                      {reviews.length > 0 ? avgRating.toFixed(1) : '—'}
                      <span className="text-sm text-[#ce112d] font-medium"> /5</span>
                    </p>
                    <div className="flex gap-0.5 text-[#ce112d]">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} fill={s <= avgRating ? 'currentColor' : 'none'} className={s <= avgRating ? 'opacity-100' : 'opacity-20'} />
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="lg:col-span-3 rounded-lg border border-white/10 bg-[#121215] p-3 space-y-2">
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Distribution</p>
                {[5, 4, 3, 2, 1].map(stars => {
                  const count = reviews.filter(r => r.rating === stars).length;
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-zinc-500 w-3">{stars}</span>
                      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-[#ce112d]" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">Recent feedback</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {reviews.map(r => (
                  <div key={r.id} className="bg-[#121215] border border-white/10 rounded-lg p-3 space-y-2 hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={12} className={s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-700'} />
                        ))}
                      </div>
                      <span className="text-[10px] text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && (
                      <p className="text-[12px] text-zinc-300 leading-relaxed line-clamp-3">"{r.comment}"</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2">
                      <p className="text-[11px] text-zinc-400 font-medium truncate">{r.customer_name || 'Anonymous'}</p>
                      {r.product_name && <p className="text-[10px] text-zinc-600 truncate max-w-[40%]">{r.product_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {reviews.length === 0 && (
                <div className="py-14 text-center space-y-2">
                  <Star className="mx-auto text-zinc-700" size={28} />
                  <p className="text-sm text-zinc-500 font-medium">No reviews yet</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    {activeTab === 'published' ? 'Live' : activeTab === 'pending' ? 'Draft' : 'Sold Out'} <span className="text-[#ce112d]">Products</span>
                  </h2>
                  <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-white/10">
                    {products.filter(p => {
                      if (!p) return false;
                      if (activeTab === 'soldout') return p.is_sold_out;
                      return p.status === activeTab && !p.is_sold_out;
                    }).length} items
                  </span>
                  {hasMoreProducts && (
                    <>
                      <button
                        type="button"
                        onClick={handleLoadMoreProducts}
                        disabled={loading}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-semibold text-[#ce112d] bg-[#ce112d]/10 border border-[#ce112d]/20 hover:bg-[#ce112d]/20 disabled:opacity-50"
                      >
                        {loading ? <RotateCcw size={11} className="animate-spin" /> : <Plus size={11} />}
                        Load 100
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadAllProducts}
                        disabled={loading}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-semibold text-white bg-zinc-800 border border-white/10 hover:bg-zinc-700 disabled:opacity-50"
                      >
                        <Sparkles size={11} className="text-amber-400" />
                        Load all
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowRangeDeleteModal(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 self-start"
                >
                  <Trash2 size={11} />
                  Delete range
                </button>
              </div>

              {/* Filter bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-[#121215]/80 p-2.5 rounded-lg border border-white/10">
                <div className="sm:col-span-4 relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#ce112d]" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 pl-9 pr-8 h-9 rounded-lg text-xs font-medium focus:border-[#ce112d]/40 outline-none placeholder:text-zinc-600 text-white"
                    placeholder="Search name, SKU, serial..."
                  />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-4 relative">
                  <select
                    value={selectedCategoryFilter}
                    onChange={e => {
                      setSelectedCategoryFilter(e.target.value);
                      setSelectedSubcategoryFilter('All'); // Reset subcategory when category changes
                    }}
                    className={`w-full bg-black/50 border h-11 px-3.5 rounded-xl text-xs font-bold outline-none transition-all appearance-none cursor-pointer pr-9 ${
                      selectedCategoryFilter !== 'All' ? 'border-[#ce112d] text-white bg-[#ce112d]/10' : 'border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <option value="All" className="bg-zinc-900 text-white">All Categories (সব ক্যাটাগরি)</option>
                    {TOP_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                        {cat.en} ({cat.bn})
                      </option>
                    ))}
                    <option value="__uncategorized__" className="bg-zinc-900 text-amber-400 font-bold">
                      Uncategorized (ক্যাটাগরি নেই)
                    </option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>

                {/* Subcategory Dropdown Filter */}
                <div className="sm:col-span-4 relative">
                  <select
                    value={selectedSubcategoryFilter}
                    onChange={e => setSelectedSubcategoryFilter(e.target.value)}
                    className={`w-full bg-black/50 border h-11 px-3.5 rounded-xl text-xs font-bold outline-none transition-all appearance-none cursor-pointer pr-9 ${
                      selectedSubcategoryFilter !== 'All' ? 'border-rose-500 text-white bg-rose-500/10' : 'border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <option value="All" className="bg-zinc-900 text-white">All Subcategories (সব সাব-ক্যাটাগরি)</option>
                    {(() => {
                      const merged = mergeWithDynamic(subcategoriesData);
                      let subsToDisplay = [];
                      if (selectedCategoryFilter && selectedCategoryFilter !== 'All' && selectedCategoryFilter !== '__uncategorized__') {
                        subsToDisplay = merged[selectedCategoryFilter] || [];
                      } else {
                        const seen = new Set();
                        Object.values(merged).forEach(list => {
                          (list || []).forEach(sub => {
                            if (!seen.has(sub.id)) {
                              seen.add(sub.id);
                              subsToDisplay.push(sub);
                            }
                          });
                        });
                      }
                      return subsToDisplay.map(sub => (
                        <option key={sub.id} value={sub.id} className="bg-zinc-900 text-white">
                          {sub.name_en || sub.en} ({sub.name_bn || sub.bn})
                        </option>
                      ));
                    })()}
                    <option value="__no_subcategory__" className="bg-zinc-900 text-amber-400 font-bold">
                      No Subcategory / Uncategorized (সাব-ক্যাটাগরি নেই)
                    </option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              {/* Active Filter Indicators */}
              {(selectedCategoryFilter !== 'All' || selectedSubcategoryFilter !== 'All' || searchTerm) && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Filter size={12} className="text-[#ce112d]" /> Filters Active:
                  </span>
                  {selectedCategoryFilter !== 'All' && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#ce112d]/15 border border-[#ce112d]/30 text-white text-[11px] font-bold flex items-center gap-1.5">
                      Cat: {selectedCategoryFilter === '__uncategorized__' ? 'Uncategorized' : selectedCategoryFilter}
                      <button onClick={() => setSelectedCategoryFilter('All')} className="hover:text-red-300"><X size={12} /></button>
                    </span>
                  )}
                  {selectedSubcategoryFilter !== 'All' && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-white text-[11px] font-bold flex items-center gap-1.5">
                      Subcat: {selectedSubcategoryFilter === '__no_subcategory__' ? 'No Subcategory' : selectedSubcategoryFilter}
                      <button onClick={() => setSelectedSubcategoryFilter('All')} className="hover:text-rose-300"><X size={12} /></button>
                    </span>
                  )}
                  {searchTerm && (
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-[11px] font-bold flex items-center gap-1.5">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')} className="hover:text-white"><X size={12} /></button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCategoryFilter('All');
                      setSelectedSubcategoryFilter('All');
                      setSearchTerm('');
                    }}
                    className="text-[10px] font-bold text-zinc-400 hover:text-white underline underline-offset-2 ml-1"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {products.filter(p => {
                if (!p) return false;
                
                // Status filter based on active tab
                if (activeTab === 'soldout') {
                  if (!p.is_sold_out) return false;
                } else if (activeTab === 'pending' || activeTab === 'published') {
                  if (p.status !== activeTab || p.is_sold_out) return false;
                } else {
                  return false;
                }

                // Search term matching
                const term = searchTerm.toLowerCase().trim();
                const matchesSearch = !term ||
                  (p.name && p.name.toLowerCase().includes(term)) ||
                  (p.description && p.description.toLowerCase().includes(term)) ||
                  (p.platform_id && p.platform_id.toLowerCase().includes(term)) ||
                  (p.serial_no && String(p.serial_no).includes(term));
                if (!matchesSearch) return false;

                // Category filter matching (including uncategorized)
                if (selectedCategoryFilter !== 'All') {
                  if (selectedCategoryFilter === '__uncategorized__') {
                    const isUncategorized = !p.category || p.category.trim() === '' || p.category === 'Uncategorized';
                    if (!isUncategorized) return false;
                  } else {
                    if (p.category !== selectedCategoryFilter) return false;
                  }
                }

                // Subcategory filter matching (including no subcategory)
                if (selectedSubcategoryFilter !== 'All') {
                  if (selectedSubcategoryFilter === '__no_subcategory__') {
                    const hasNoSub = !p.subcategory || p.subcategory.trim() === '' || p.subcategory === 'Uncategorized';
                    if (!hasNoSub) return false;
                  } else {
                    const matchesSub = p.subcategory && (
                      p.subcategory.toLowerCase() === selectedSubcategoryFilter.toLowerCase() ||
                      p.subcategory.toLowerCase().includes(selectedSubcategoryFilter.toLowerCase())
                    );
                    if (!matchesSub) return false;
                  }
                }

                return true;
              }).map(p => {
                let displayImage = getOptimizedUrl(p.image_url || p.images?.[0], mediaSizes.thumbnail);
                if (!displayImage || displayImage.includes('via.placeholder')) {
                  displayImage = null;
                }

                return (
                  <div key={p.id} className="group bg-[#121215] border border-white/10 rounded-xl overflow-hidden hover:border-[#ce112d]/40 transition-colors">

                    {/* ── Top section: Image + Details ── */}
                    <div className="flex gap-5 p-4">

                      {/* Thumbnail */}
                      <div
                        className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden shrink-0 bg-black relative cursor-pointer border border-white/5 shadow-lg group-hover:scale-[1.02] transition-transform"
                        onClick={() => p.video_url ? setPreviewVideo(p.video_url) : null}
                      >
                        {displayImage ? (
                          <img
                            src={displayImage}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            alt={p.name}
                            onError={(e) => {
                              if (e.currentTarget.src.includes('images.weserv.nl') && (p.image_url || p.images?.[0])) {
                                e.currentTarget.src = p.image_url || p.images[0];
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                            {p.video_url ? <Play size={24} /> : <ImageIcon size={24} />}
                          </div>
                        )}
                        {p.is_sold_out && (
                          <div className="absolute inset-0 bg-red-600/30 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest drop-shadow">Sold Out</span>
                          </div>
                        )}
                        {p.serial_no && (
                          <div className="absolute top-2 left-2 bg-black/35 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-lg border border-white/25 drop-shadow">
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
                            onConfirm: () => {
                              patchProductFields(p.id, { status: 'published' });
                            }
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
                            onConfirm: () => {
                              patchProductFields(p.id, { status: 'pending' });
                            }
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
                          onConfirm: () => patchProductFields(p.id, { is_exclusive: !p.is_exclusive })
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
                          onConfirm: () => patchProductFields(p.id, { is_sold_out: !p.is_sold_out })
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

            {hasMoreProducts && (
              <div className="pt-6 pb-6 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadMoreProducts}
                  disabled={loading}
                  className="flex items-center gap-2 bg-[#ce112d] hover:bg-[#b00e26] text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-900/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? <RotateCcw size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>Load More Products ({products.length} Loaded)</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadAllProducts}
                  disabled={loading}
                  className="text-xs text-zinc-400 hover:text-white font-semibold underline underline-offset-4"
                >
                  Load All Live &amp; Draft Products
                </button>
              </div>
            )}
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

      {/* Bulk Serial Range Delete Modal */}
      {showRangeDeleteModal && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowRangeDeleteModal(false)}>
          <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
                  <Trash2 size={20} className="text-[#ce112d]" />
                  Delete <span className="text-[#ce112d]">Serial Range</span>
                </h3>
                <p className="text-zinc-500 text-xs mt-1">Delete all products within a serial number range</p>
              </div>
              <button onClick={() => setShowRangeDeleteModal(false)} className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Start Serial #</label>
                  <input
                    type="number"
                    value={rangeStart}
                    onChange={e => setRangeStart(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full bg-black border border-zinc-800 h-11 px-3 rounded-xl text-sm font-bold text-white outline-none focus:border-[#ce112d]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">End Serial #</label>
                  <input
                    type="number"
                    value={rangeEnd}
                    onChange={e => setRangeEnd(e.target.value)}
                    placeholder="e.g. 200"
                    className="w-full bg-black border border-zinc-800 h-11 px-3 rounded-xl text-sm font-bold text-white outline-none focus:border-[#ce112d]/50"
                  />
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-1">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={14} /> Warning: Permanent Action
                </p>
                <p className="text-[11px] text-zinc-400">
                  This will permanently delete all products with Serial numbers between #{rangeStart || '1'} and #{rangeEnd || '200'} from the database.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRangeDeleteModal(false)}
                className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleBulkDeleteBySerialRange}
                className="flex-1 h-12 bg-[#ce112d] hover:bg-[#b00e26] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-900/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RotateCcw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>Delete #{rangeStart} - #{rangeEnd}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Overlay during Bulk Range Delete */}
      {deletingRangeProgress && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center justify-center mx-auto text-[#ce112d]">
              <RotateCcw size={32} className="animate-spin" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white uppercase tracking-tight">Deleting Products...</h4>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Deleting item {deletingRangeProgress.current} of {deletingRangeProgress.total}
              </p>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#ce112d] h-full transition-all duration-200"
                style={{ width: `${(deletingRangeProgress.current / deletingRangeProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for Add Product */}
      {activeTab !== 'add' && (
        <button
          type="button"
          onClick={() => {
            cancelEdit();
            setSelectedOrder(null);
            setActiveTab('add');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 h-11 px-4 bg-[#ce112d] hover:bg-[#e61535] text-white rounded-full text-xs font-semibold shadow-lg shadow-red-900/40 transition-colors"
          title="Add New Product"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Product
        </button>
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
