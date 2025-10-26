import axios from "axios";
import type { NewsAPIArticle, CategoryType } from "@/types/news";

// Use serverless function for news aggregation in production
// For local dev without Vercel CLI, we'll call APIs directly
const IS_PRODUCTION = import.meta.env.PROD;
const NEWS_API_URL = IS_PRODUCTION ? "/api/news" : null;

// API keys for local development (from .env)
const NEWSDATA_API_KEY = import.meta.env.NEWSDATA_API_KEY;
const NEWSDATA_BD_API_KEY = import.meta.env.NEWSDATA_BD_API_KEY || import.meta.env.NEWSDATA_API_KEY; // Bangladesh news API key (falls back to global key)
const CURRENTS_API_KEY = import.meta.env.CURRENTS_API_KEY;
const GNEWS_API_KEY = import.meta.env.GNEWS_API_KEY;
const GUARDIAN_API_KEY = import.meta.env.GUARDIAN_API_KEY;

// New specialized API keys
const ALPHA_VANTAGE_API_KEY = import.meta.env.ALPHA_VANTAGE_API_KEY;
const MARKETAUX_API_KEY = import.meta.env.MARKETAUX_API_KEY;
const FMP_API_KEY = import.meta.env.FMP_API_KEY;
const SPORTSDB_API_KEY = import.meta.env.SPORTSDB_API_KEY;
const API_FOOTBALL_KEY = import.meta.env.API_FOOTBALL_KEY;
const TMDB_API_KEY = import.meta.env.TMDB_API_KEY;
const OMDB_API_KEY = import.meta.env.OMDB_API_KEY;
const RSS_PROXY_URL = import.meta.env.VITE_RSS_PROXY_URL || "/api/rss-proxy";

// Smart fallback image system - returns different images based on category and article hash
// Expanded with 20 images per category for maximum variety
const FALLBACK_IMAGES = {
  technology: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop", // Tech workspace
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop", // Code
    "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=600&fit=crop", // Laptop
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop", // Data center
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop", // Binary code
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop", // Computer setup
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&h=600&fit=crop", // Tech devices
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop", // Keyboard
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop", // Circuit board
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop", // Robot AI
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop", // Smartphone
    "https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=800&h=600&fit=crop", // Server
    "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&h=600&fit=crop", // VR headset
    "https://images.unsplash.com/photo-1560732488-6b0df240254a?w=800&h=600&fit=crop", // Cloud computing
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop", // Analytics
    "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=600&fit=crop", // Chip
    "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&h=600&fit=crop", // Computer screen
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop", // Blockchain
    "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600&fit=crop", // 5G
    "https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?w=800&h=600&fit=crop", // Cybersecurity
  ],
  sports: [
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop", // Soccer
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop", // Basketball
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop", // American football
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=600&fit=crop", // Baseball
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop", // Tennis
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop", // Stadium
    "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&h=600&fit=crop", // Running
    "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=600&fit=crop", // Golf
    "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&h=600&fit=crop", // Volleyball
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop", // Cricket
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop", // Hockey
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop", // Rugby
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=600&fit=crop", // Boxing
    "https://images.unsplash.com/photo-1434648957308-5e6a859697e8?w=800&h=600&fit=crop", // Swimming
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=600&fit=crop", // Gym
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop", // Cycling
    "https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&h=600&fit=crop", // Racing
    "https://images.unsplash.com/photo-1569003339405-ea396a5a8a90?w=800&h=600&fit=crop", // Surfing
    "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?w=800&h=600&fit=crop", // Skiing
    "https://images.unsplash.com/photo-1596727147705-61a532a659bd?w=800&h=600&fit=crop", // Trophy
  ],
  business: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop", // Stock market
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop", // Finance
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop", // Charts
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop", // Business meeting
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop", // Office
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop", // Skyscrapers
    "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&h=600&fit=crop", // Money
    "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=600&fit=crop", // Entrepreneur
    "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&h=600&fit=crop", // Handshake
    "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&h=600&fit=crop", // Business person
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop", // Documents
    "https://images.unsplash.com/photo-1559526324-593bc073d938?w=800&h=600&fit=crop", // Bitcoin
    "https://images.unsplash.com/photo-1565120130276-dfbd9a7a3ad7?w=800&h=600&fit=crop", // Trading floor
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop", // Globe business
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop", // Calculator
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop", // Team
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=600&fit=crop", // Investment
    "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=800&h=600&fit=crop", // Corporate
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=600&fit=crop", // Banking
    "https://images.unsplash.com/photo-1561414927-6d86591d0c4f?w=800&h=600&fit=crop", // Credit card
  ],
  health: [
    "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=600&fit=crop", // Stethoscope
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop", // Medicine
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop", // Fruits
    "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=600&fit=crop", // Hospital
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop", // Medical equipment
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop", // Pharmacy
    "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&h=600&fit=crop", // Doctor
    "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&h=600&fit=crop", // Blood pressure
    "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop", // Lab
    "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&h=600&fit=crop", // Surgery
    "https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=800&h=600&fit=crop", // Vaccine
    "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=800&h=600&fit=crop", // Pills
    "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=600&fit=crop", // Mental health
    "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&h=600&fit=crop", // Fitness
    "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&h=600&fit=crop", // Nutrition
    "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800&h=600&fit=crop", // Medical research
    "https://images.unsplash.com/photo-1576671081837-49000212a370?w=800&h=600&fit=crop", // Wellness
    "https://images.unsplash.com/photo-1600959907703-125ba1374a12?w=800&h=600&fit=crop", // DNA
    "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=600&fit=crop", // Microscope
    "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=600&fit=crop", // Heartbeat
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop", // Movie theater
    "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=600&fit=crop", // Popcorn
    "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=800&h=600&fit=crop", // Movie camera
    "https://images.unsplash.com/photo-1574267432644-f610f1f6e6b1?w=800&h=600&fit=crop", // Stage
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=600&fit=crop", // Concert
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop", // Headphones
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop", // Gaming
    "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=600&fit=crop", // Video game
    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=600&fit=crop", // Music festival
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop", // DJ
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=600&fit=crop", // Streaming
    "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=600&fit=crop", // Netflix
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop", // Guitar
    "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&h=600&fit=crop", // Microphone
    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&h=600&fit=crop", // Red carpet
    "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&h=600&fit=crop", // Clapperboard
    "https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=800&h=600&fit=crop", // TV show
    "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=800&h=600&fit=crop", // Award
    "https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&h=600&fit=crop", // Celebrity
    "https://images.unsplash.com/photo-1579158386396-78cc45dd6b4f?w=800&h=600&fit=crop", // Theater
  ],
  world: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop", // Newspaper
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop", // Globe
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop", // Earth
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=600&fit=crop", // Map
    "https://images.unsplash.com/photo-1569163139394-de4798aa62b4?w=800&h=600&fit=crop", // City
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop", // Skyline
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop", // International
    "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&h=600&fit=crop", // Politics
    "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&h=600&fit=crop", // Government
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&h=600&fit=crop", // Flags
    "https://images.unsplash.com/photo-1589519160732-57fc498494f8?w=800&h=600&fit=crop", // United Nations
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=600&fit=crop", // Capitol
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=600&fit=crop", // Crowd
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop", // Travel
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop", // Landmark
    "https://images.unsplash.com/photo-1573495627361-d9b87960b12d?w=800&h=600&fit=crop", // Climate
    "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&h=600&fit=crop", // Protest
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&h=600&fit=crop", // Conference
    "https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?w=800&h=600&fit=crop", // Peace
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop", // Diversity
  ],
  bangladesh: [
    "https://images.unsplash.com/photo-1586829135343-132950070391?w=800&h=600&fit=crop", // Bangladesh landscape
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop", // Dhaka
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop", // South Asia
    "https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?w=800&h=600&fit=crop", // Traffic
    "https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=800&h=600&fit=crop", // Startup
    "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&h=600&fit=crop", // Education
    "https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800&h=600&fit=crop", // Culture
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop", // Development
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=600&fit=crop", // Geography
    "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&h=600&fit=crop", // News
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop", // River
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop", // Agriculture
    "https://images.unsplash.com/photo-1557838923-2985c318be48?w=800&h=600&fit=crop", // Market
    "https://images.unsplash.com/photo-1569163139394-de4798aa62b4?w=800&h=600&fit=crop", // Urban
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop", // Technology
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop", // Infrastructure
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=600&fit=crop", // Economy
    "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=800&h=600&fit=crop", // Community
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop", // People
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop", // University
  ],
  general: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1557838923-2985c318be48?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1569163139394-de4798aa62b4?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1589519160732-57fc498494f8?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1573495627361-d9b87960b12d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
  ],
};

// Simple hash function to generate consistent index from string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Enhanced smart fallback image - analyzes article content for better matching
function getSmartFallbackImage(category: CategoryType | 'general', title: string, description?: string): string {
  // Map 'all' and 'trending' to the general category images
  const categoryKey = (category === 'all' || category === 'trending' || category === 'general') ? 'general' : category;
  const categoryImages = FALLBACK_IMAGES[categoryKey as keyof typeof FALLBACK_IMAGES] || FALLBACK_IMAGES.general;
  
  // Use both title and description for better hash variety
  const contentToHash = `${title || ''}${description || ''}`;
  const hash = hashString(contentToHash);
  const index = hash % categoryImages.length;
  
  return categoryImages[index];
}

const DEFAULT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop";

// In-memory cache with TTL (2 hours)
interface CacheEntry {
  data: NewsAPIArticle[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours (7200000 ms) for most categories
const CACHE_TTL_RSS_HEAVY = 30 * 60 * 1000; // 30 minutes for RSS-heavy categories (Bangladesh, Health)
const MAX_ARTICLE_AGE = 48 * 60 * 60 * 1000; // 48 hours in milliseconds (increased from 24 hours)
const MAX_ARTICLE_AGE_RSS_HEAVY = 72 * 60 * 60 * 1000; // 72 hours for RSS-heavy categories needing extended freshness window
const RSS_PROXY_TIMEOUT = 12000;

type ProviderTier = "unlimited" | "limited" | "fallback";

type RSSFeedItem = Record<string, unknown>;

interface RSSItemNormalized extends RSSFeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  author?: string;
  content?: string;
  guid?: string;
  enclosure?: { link?: string };
  thumbnail?: string;
}

interface ProviderConfig {
  name: string;
  tier: ProviderTier;
  options?: Record<string, unknown>;
}

// Persistent fallback data (never expires)
const persistentFallback = new Map<string, NewsAPIArticle[]>();

function normalizeUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const normalized = new URL(url);
    normalized.hash = "";
    return normalized.toString();
  } catch {
    return url;
  }
}

function toISODate(input?: string | null): string | undefined {
  if (!input) return undefined;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

async function fetchRSSFeed(rssUrl: string, limit: number): Promise<RSSFeedItem[]> {
  try {
    console.log(`📡 Fetching RSS via proxy: ${rssUrl.substring(0, 80)}...`);
    const response = await axios.get(RSS_PROXY_URL, {
      params: { url: rssUrl, limit },
      timeout: RSS_PROXY_TIMEOUT,
      validateStatus: status => status < 500,
    });

    if (response.status >= 400) {
      console.warn(`⚠️ RSS proxy returned ${response.status} for ${rssUrl}`);
      return [];
    }

    const items = Array.isArray(response.data?.items) ? response.data.items.slice(0, limit) : [];
    if (items.length > 0) {
      console.log(`✅ RSS proxy returned ${items.length} items from ${rssUrl.substring(0, 60)}...`);
    } else {
      console.warn(`⚠️ RSS proxy returned no items for ${rssUrl}`);
    }
    return items;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ RSS proxy fetch failed for ${rssUrl.substring(0, 60)}...`, message);
    return [];
  }
}

function dedupeArticles(articles: NewsAPIArticle[]): NewsAPIArticle[] {
  const seen = new Set<string>();
  const unique: NewsAPIArticle[] = [];

  for (const article of articles) {
    const key = normalizeUrl(article.url || article.title || "");
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(article);
  }

  return unique;
}

function blendArticlesBySource(
  articles: NewsAPIArticle[],
  pageSize: number,
  maxPerSource: number = Math.max(5, Math.ceil(pageSize * 0.5))
): NewsAPIArticle[] {
  const groups = new Map<string, NewsAPIArticle[]>();

  // Sort by publish date first
  const sorted = articles
    .slice()
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });

  // Group by source
  sorted.forEach(article => {
    const sourceName = article.source?.name || "Unknown";
    if (!groups.has(sourceName)) {
      groups.set(sourceName, []);
    }
    groups.get(sourceName)!.push(article);
  });

  // Limit articles per source to ensure variety (max 50% from any single source)
  for (const [source, group] of groups.entries()) {
    if (group.length > maxPerSource) {
      groups.set(source, group.slice(0, maxPerSource));
    }
  }

  // Round-robin distribution from all sources
  const orderedGroups = Array.from(groups.values()).filter(g => g.length > 0);
  const result: NewsAPIArticle[] = [];
  let index = 0;

  while (result.length < pageSize && orderedGroups.length > 0) {
    const group = orderedGroups[index];
    if (!group || group.length === 0) {
      orderedGroups.splice(index, 1);
      if (index >= orderedGroups.length) index = 0;
      continue;
    }

    const article = group.shift();
    if (article) {
      result.push(article);
    }

    if (group.length === 0) {
      orderedGroups.splice(index, 1);
      if (index >= orderedGroups.length) index = 0;
    } else {
      index = (index + 1) % orderedGroups.length;
    }
  }

  return result.slice(0, pageSize);
}

function mergeAndPrepareArticles(articles: NewsAPIArticle[], category: CategoryType = 'all'): NewsAPIArticle[] {
  const filtered = filterRecentArticles(articles, category);
  const unique = dedupeArticles(filtered);
  
  // Sort by publish date - LATEST FIRST (newest to oldest)
  const sorted = unique.sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime; // Descending order (latest first)
  });
  
  // Apply smart fallback images to articles without images
  // Uses both title and description for better variety
  return sorted.map(article => {
    if (!article.urlToImage || article.urlToImage === DEFAULT_FALLBACK_IMAGE) {
      return {
        ...article,
        urlToImage: getSmartFallbackImage(category, article.title, article.description)
      };
    }
    return article;
  });
}

function buildRSSArticles(
  items: RSSFeedItem[],
  {
    sourceId,
    sourceName,
    fallbackImage = DEFAULT_FALLBACK_IMAGE,
  }: { sourceId: string; sourceName: string; fallbackImage?: string }
): NewsAPIArticle[] {
  return items
    .map(item => item as RSSItemNormalized)
    .filter(item => Boolean(item?.title && item?.link))
    .map(item => ({
      source: { id: sourceId, name: sourceName },
      author: item.author || sourceName,
      title: item.title ?? sourceName,
      description: item.description || item.content || item.title || "",
      url: item.link as string,
      urlToImage:
        (item.enclosure?.link && typeof item.enclosure.link === "string"
          ? item.enclosure.link
          : item.thumbnail && typeof item.thumbnail === "string"
            ? item.thumbnail
            : fallbackImage) || fallbackImage,
      publishedAt: toISODate(item.pubDate) || new Date().toISOString(),
      content: (item.content || item.description || null) as string | null,
    }));
}

const COMMON_LIMITED_PROVIDERS: ProviderConfig[] = [
  { name: "guardian", tier: "limited" },
  { name: "currents", tier: "limited" },
  { name: "gnews", tier: "limited" },
  { name: "newsdata", tier: "limited" },
  { name: "saurav", tier: "fallback" },
];

const CATEGORY_PROVIDER_MAP: Record<CategoryType, ProviderConfig[]> = {
  technology: [
    // Tech RSS Feeds (Unlimited, No API Key)
    { name: "techcrunch", tier: "unlimited" },
    { name: "the-verge", tier: "unlimited" },
    { name: "wired", tier: "unlimited" },
    { name: "ars-technica", tier: "unlimited" },
    { name: "engadget", tier: "unlimited" },
    { name: "cnet", tier: "unlimited" },
    { name: "zdnet", tier: "unlimited" },
    { name: "techmeme", tier: "unlimited" },
    { name: "google-news-tech", tier: "unlimited" },
    { name: "hackernews", tier: "unlimited" },
    { name: "devto", tier: "unlimited" },
    { name: "lobsters", tier: "unlimited" },
    { name: "github-trending", tier: "unlimited" },
    { name: "slashdot", tier: "unlimited" },
    // Additional Tech RSS Feeds
    { name: "mit-tech-review", tier: "unlimited" },
    { name: "tech-radar", tier: "unlimited" },
    { name: "android-authority", tier: "unlimited" },
    { name: "9to5mac", tier: "unlimited" },
    { name: "macrumors", tier: "unlimited" },
    { name: "xda-developers", tier: "unlimited" },
    // Recommended Tech Alternative Sources (Apple-Focused)
    { name: "appleinsider", tier: "unlimited" },
    { name: "macworld", tier: "unlimited" },
    { name: "macobserver", tier: "unlimited" },
    { name: "google-news-tech-topic", tier: "unlimited" },
    // Community Sources
    { name: "reddit", tier: "unlimited", options: { subreddit: "technology" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "programming" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "android" } },
    // Limited APIs as fallback
    { name: "guardian", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "gnews", tier: "limited" },
    { name: "newsdata", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
  sports: [
    // Sports RSS Feeds (Unlimited, No API Key)
    { name: "espn", tier: "unlimited" },
    { name: "bbc-sport", tier: "unlimited" },
    { name: "sky-sports", tier: "unlimited" },
    { name: "goal", tier: "unlimited" },
    { name: "bleacher-report", tier: "unlimited" },
    { name: "sports-illustrated", tier: "unlimited" },
    { name: "fox-sports", tier: "unlimited" },
    { name: "nba-rss", tier: "unlimited" },
    { name: "nfl-rss", tier: "unlimited" },
    { name: "mlb-rss", tier: "unlimited" },
    { name: "google-news-sports", tier: "unlimited" },
    // Additional Sports RSS Feeds
    { name: "yahoo-sports", tier: "unlimited" },
    { name: "cbssports", tier: "unlimited" },
    { name: "nhl-rss", tier: "unlimited" },
    { name: "uefa", tier: "unlimited" },
    { name: "fifa-news", tier: "unlimited" },
    // Recommended Sports Alternative Sources
    { name: "thescore", tier: "unlimited" },
    { name: "sbnation", tier: "unlimited" },
    { name: "nba-official", tier: "unlimited" },
    { name: "clutchpoints", tier: "unlimited" },
    { name: "fansided", tier: "unlimited" },
    { name: "google-news-sports-topic", tier: "unlimited" },
    // Community Sources
    { name: "reddit", tier: "unlimited", options: { subreddit: "soccer" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "nba" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "nfl" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "sports" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "football" } },
    // Limited APIs
    { name: "sportsdb", tier: "limited" },
    { name: "guardian", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "newsdata", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
  business: [
    // Business/Finance RSS Feeds (Unlimited, No API Key)
    { name: "yahoo", tier: "unlimited" },
    { name: "bloomberg", tier: "unlimited" },
    { name: "reuters-business", tier: "unlimited" },
    { name: "cnbc", tier: "unlimited" },
    { name: "marketwatch", tier: "unlimited" },
    { name: "financial-times", tier: "unlimited" },
    { name: "wsj", tier: "unlimited" },
    { name: "forbes", tier: "unlimited" },
    { name: "business-insider", tier: "unlimited" },
    { name: "seeking-alpha", tier: "unlimited" },
    { name: "google-news-business", tier: "unlimited" },
    // Additional Business RSS Feeds
    { name: "economist", tier: "unlimited" },
    { name: "fortune", tier: "unlimited" },
    { name: "fast-company", tier: "unlimited" },
    { name: "inc", tier: "unlimited" },
    { name: "entrepreneur", tier: "unlimited" },
    // Recommended Business Alternative Sources
    { name: "barrons", tier: "unlimited" },
    { name: "investors-business-daily", tier: "unlimited" },
    { name: "google-news-business-topic", tier: "unlimited" },
    // Community Sources
    { name: "reddit", tier: "unlimited", options: { subreddit: "business" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "investing" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "stocks" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "finance" } },
    // Limited APIs
    { name: "marketaux", tier: "limited" },
    { name: "alphavantage", tier: "limited" },
    { name: "guardian", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "gnews", tier: "limited" },
    { name: "newsdata", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
  health: [
    // Global Health RSS Feeds (Unlimited, No API Key)
    { name: "who-news", tier: "unlimited" },
    { name: "who-outbreaks", tier: "unlimited" },
    { name: "cdc-newsroom", tier: "unlimited" },
    { name: "cdc-travelers", tier: "unlimited" },
    { name: "medlineplus", tier: "unlimited" },
    { name: "sciencedaily-health", tier: "unlimited" },
    { name: "kff-health", tier: "unlimited" },
    { name: "nih", tier: "unlimited" },
    { name: "cdc-rss", tier: "unlimited" },
    // Additional Global Health RSS Feeds
    { name: "harvard-health", tier: "unlimited" },
    { name: "johns-hopkins-health", tier: "unlimited" },
    { name: "cleveland-clinic", tier: "unlimited" },
    { name: "medscape", tier: "unlimited" },
    { name: "medical-news-today", tier: "unlimited" },
    { name: "health-news-review", tier: "unlimited" },
    { name: "reuters-health", tier: "unlimited" },
    { name: "npr-health", tier: "unlimited" },
    { name: "bbc-health", tier: "unlimited" },
    { name: "lancet-health", tier: "unlimited" },
    // Recommended Health Alternative Sources
    { name: "medpage-today", tier: "unlimited" },
    { name: "healthday-full", tier: "unlimited" },
    { name: "pubmed-central", tier: "unlimited" },
    { name: "everyday-health-all", tier: "unlimited" },
    { name: "verywell-health-main", tier: "unlimited" },
    { name: "google-news-health", tier: "unlimited" },
    // Bangladesh Health RSS Feeds
    { name: "dailystar-health", tier: "unlimited" },
    { name: "bdnews24-health", tier: "unlimited" },
    { name: "banglanews24-health", tier: "unlimited" },
    // Other Health Sources
    { name: "pubmed", tier: "unlimited" },
    { name: "webmd", tier: "unlimited" },
    { name: "healthline", tier: "unlimited" },
    { name: "mayo-clinic", tier: "unlimited" },
    { name: "reddit", tier: "unlimited", options: { subreddit: "health" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "medicine" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "medicalscience" } },
    { name: "guardian", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "newsdata", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
  entertainment: [
    // Entertainment RSS Feeds (Unlimited, No API Key)
    { name: "variety", tier: "unlimited" },
    { name: "hollywood-reporter", tier: "unlimited" },
    { name: "entertainment-weekly", tier: "unlimited" },
    { name: "deadline", tier: "unlimited" },
    { name: "rolling-stone", tier: "unlimited" },
    { name: "billboard", tier: "unlimited" },
    { name: "ign", tier: "unlimited" },
    { name: "gamespot", tier: "unlimited" },
    { name: "polygon", tier: "unlimited" },
    { name: "google-news-entertainment", tier: "unlimited" },
    // Additional Entertainment RSS Feeds
    { name: "vulture", tier: "unlimited" },
    { name: "collider", tier: "unlimited" },
    { name: "screen-rant", tier: "unlimited" },
    { name: "cinemablend", tier: "unlimited" },
    { name: "pitchfork", tier: "unlimited" },
    { name: "consequence", tier: "unlimited" },
    { name: "av-club", tier: "unlimited" },
    { name: "eurogamer", tier: "unlimited" },
    { name: "kotaku", tier: "unlimited" },
    { name: "pcgamer", tier: "unlimited" },
    { name: "comicbook", tier: "unlimited" },
    { name: "indiewire", tier: "unlimited" },
    // Recommended Entertainment Alternative Sources
    { name: "rottentomatoes-editorial", tier: "unlimited" },
    { name: "consequence-net", tier: "unlimited" },
    { name: "comicbook-correct", tier: "unlimited" },
    { name: "anime-news-network", tier: "unlimited" },
    { name: "metacritic-all", tier: "unlimited" },
    { name: "google-news-entertainment-topic", tier: "unlimited" },
    // Movie/TV APIs
    { name: "tmdb", tier: "unlimited" },
    { name: "tvmaze", tier: "unlimited" },
    { name: "itunes", tier: "unlimited" },
    { name: "imdb", tier: "unlimited" },
    { name: "rottentomatoes", tier: "unlimited" },
    { name: "metacritic", tier: "unlimited" },
    // Community Sources
    { name: "reddit", tier: "unlimited", options: { subreddit: "movies" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "television" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "gaming" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "music" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "entertainment" } },
    // Limited APIs
    { name: "guardian", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "gnews", tier: "limited" },
    { name: "newsdata", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
  world: [
    // World News RSS Feeds (Unlimited, No API Key)
    { name: "bbc-rss", tier: "unlimited" },
    { name: "reuters-rss", tier: "unlimited" },
    { name: "aljazeera", tier: "unlimited" },
    { name: "cnn", tier: "unlimited" },
    { name: "npr", tier: "unlimited" },
    { name: "france24", tier: "unlimited" },
    { name: "dw", tier: "unlimited" },
    { name: "un-news", tier: "unlimited" },
    { name: "ap-news", tier: "unlimited" },
    { name: "pbs-news", tier: "unlimited" },
    { name: "abc-news", tier: "unlimited" },
    { name: "google-news-world", tier: "unlimited" },
    // Additional World News RSS Feeds
    { name: "euronews", tier: "unlimited" },
    { name: "nyt-world", tier: "unlimited" },
    { name: "wapo-world", tier: "unlimited" },
    { name: "independent", tier: "unlimited" },
    { name: "telegraph", tier: "unlimited" },
    // Community Sources
    { name: "reddit", tier: "unlimited", options: { subreddit: "worldnews" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "geopolitics" } },
    { name: "reddit", tier: "unlimited", options: { subreddit: "news" } },
    // Limited APIs
    { name: "guardian", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "newsdata", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
  bangladesh: [
    // Primary Bangladesh RSS Feeds (Unlimited, No API Key)
    { name: "dailystar-bd", tier: "unlimited" },
    { name: "banglanews24", tier: "unlimited" },
    { name: "prothomalo-en", tier: "unlimited" },
    { name: "dhakatribune", tier: "unlimited" },
    { name: "bdnews24", tier: "unlimited" },
    { name: "bangladeshjournal", tier: "unlimited" },
    { name: "hindustantimes-bangla", tier: "unlimited" },
    { name: "google-news-bangladesh", tier: "unlimited" },
    // International Coverage
    { name: "bbc-bangladesh", tier: "unlimited" },
    { name: "guardian-bangladesh", tier: "unlimited" },
    { name: "aljazeera", tier: "unlimited" },
    // Recommended Bangladesh Alternative Sources
    { name: "business-standard-bd", tier: "unlimited" },
    { name: "dhaka-post", tier: "unlimited" },
    { name: "independent-bangladesh", tier: "unlimited" },
    { name: "google-news-bangladesh-topic", tier: "unlimited" },
    // Limited APIs as fallback
    { name: "newsdata-bangladesh", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
  trending: [
    { name: "google-news-world", tier: "unlimited" },
    { name: "reddit", tier: "unlimited", options: { subreddit: "news" } },
    { name: "hackernews", tier: "unlimited" },
    { name: "bbc-rss", tier: "unlimited" },
    { name: "cnn", tier: "unlimited" },
    { name: "guardian", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "gnews", tier: "limited" },
    { name: "newsdata", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
  all: [
    { name: "google-news-world", tier: "unlimited" },
    { name: "bbc-rss", tier: "unlimited" },
    { name: "cnn", tier: "unlimited" },
    { name: "npr", tier: "unlimited" },
    { name: "reuters-rss", tier: "unlimited" },
    { name: "aljazeera", tier: "unlimited" },
    { name: "reddit", tier: "unlimited", options: { subreddit: "news" } },
    { name: "guardian", tier: "limited" },
    { name: "currents", tier: "limited" },
    { name: "gnews", tier: "limited" },
    { name: "newsdata", tier: "limited" },
    { name: "saurav", tier: "fallback" },
  ],
};

function getAgeLimitForCategory(category?: CategoryType | "general"): number {
  const normalizedCategory = category === "general" ? "all" : category;
  return normalizedCategory === "bangladesh" || normalizedCategory === "health"
    ? MAX_ARTICLE_AGE_RSS_HEAVY
    : MAX_ARTICLE_AGE;
}

function getFreshnessWindowHours(category?: CategoryType | "general"): number {
  return Math.round(getAgeLimitForCategory(category) / (60 * 60 * 1000));
}

/**
 * Filter articles to only include those within the freshness window for their category
 */
function filterRecentArticles(
  articles: NewsAPIArticle[],
  category?: CategoryType | "general"
): NewsAPIArticle[] {
  const now = Date.now();
  const ageLimit = getAgeLimitForCategory(category);

  return articles.filter(article => {
    if (!article.publishedAt) return false;
    
    try {
      const publishedTime = new Date(article.publishedAt).getTime();
      
      if (Number.isNaN(publishedTime)) return false;
      
      const age = now - publishedTime;
      if (age < 0) return false;
      
      return age <= ageLimit;
    } catch (error) {
      console.error("Error parsing article date:", error);
      return false;
    }
  });
}

// Initialize cache with fallback data immediately on load
// This ensures the app always has data to show
function initializeCache() {
  // We'll initialize this later after getFallbackNews is defined
  console.log('🚀 Cache initialization deferred until first use');
}

// Helper to get from cache
function getFromCache(key: string): NewsAPIArticle[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  // Use shorter TTL for RSS-heavy categories (Bangladesh, Health)
  const isRSSHeavy = key.includes('bangladesh') || key.includes('health');
  const ttl = isRSSHeavy ? CACHE_TTL_RSS_HEAVY : CACHE_TTL;
  
  const isExpired = Date.now() - entry.timestamp > ttl;
  if (isExpired) {
    const minutesOld = Math.floor((Date.now() - entry.timestamp) / 1000 / 60);
    const ttlMinutes = isRSSHeavy ? 30 : 120;
    console.log(`⏰ Cache expired for: ${key} (age: ${minutesOld} minutes, TTL: ${ttlMinutes} min)`);
    cache.delete(key);
    return null;
  }
  
  const minutesOld = Math.floor((Date.now() - entry.timestamp) / 1000 / 60);
  const ttlMinutes = isRSSHeavy ? 30 : 120;
  console.log(`✅ Cache hit for: ${key} (age: ${minutesOld} minutes, fresh for ${ttlMinutes - minutesOld} more minutes)`);
  return entry.data;
}

// Helper to set cache
function setCache(key: string, data: NewsAPIArticle[]) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Also store as persistent fallback (never expires)
  persistentFallback.set(key, data);
  
  const isRSSHeavyKey = key.includes('bangladesh') || key.includes('health');
  const ttlMinutes = Math.round((isRSSHeavyKey ? CACHE_TTL_RSS_HEAVY : CACHE_TTL) / (60 * 1000));
  console.log(`💾 Cached data for: ${key} (valid for ${ttlMinutes} minutes)`);
}

// Get persistent fallback (for when all APIs fail)
function getPersistentFallback(key: string): NewsAPIArticle[] | null {
  const fallback = persistentFallback.get(key);
  if (fallback) {
    console.log(`🔄 Using persistent fallback for: ${key}`);
    return fallback;
  }
  return null;
}

/**
 * Fetch Bangladesh news using multi-source routing prioritizing RSS feeds before limited APIs
 * @param pageSize - Number of articles to fetch
 */
export async function fetchBangladeshNews(pageSize: number = 20): Promise<NewsAPIArticle[]> {
  const cacheKey = `bangladesh_news_${pageSize}`;

  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('✅ Using cached Bangladesh news');
    return cached;
  }

  console.log('🇧🇩 Fetching Bangladesh news (multi-source pipeline)...');

  try {
    const collectionPageSize = Math.max(pageSize, 20);
    let collected: NewsAPIArticle[] = [];

    try {
      collected = await fetchNewsDirectly('bangladesh', collectionPageSize);
      console.log(`📰 Primary Bangladesh sources returned ${collected.length} articles`);
    } catch (primaryError) {
      console.warn('⚠️ Primary Bangladesh pipeline failed:', primaryError instanceof Error ? primaryError.message : primaryError);
    }

    if (collected.length < pageSize) {
      if (!NEWSDATA_BD_API_KEY && !NEWSDATA_API_KEY) {
        console.log('🔐 Skipping NewsData.io top-up (missing API key)');
      } else {
        const topUp = await tryNewsDataBangladeshAPI(Math.max(pageSize * 2, 20));
        if (topUp.length > 0) {
          console.log(`➕ Added ${topUp.length} fallback articles from NewsData.io Bangladesh`);
          collected = collected.length > 0 ? [...collected, ...topUp] : topUp;
        }
      }
    }

    if (collected.length === 0) {
      throw new Error('No Bangladesh news data received from primary sources');
    }

    const prepared = mergeAndPrepareArticles(collected, 'bangladesh');
    const blended = blendArticlesBySource(prepared, pageSize);
    const finalArticles = blended.slice(0, pageSize);

    if (finalArticles.length === 0) {
      throw new Error('Bangladesh pipeline returned only stale articles');
    }

    setCache(cacheKey, finalArticles);
    console.log(`✅ Successfully fetched ${finalArticles.length} Bangladesh news articles`);
    return finalArticles;
  } catch (error) {
    console.error('❌ Error fetching Bangladesh news:', error);

    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      console.log('⚠️ Using stale cache for Bangladesh news');
      return staleCache.data;
    }

    const persistent = getPersistentFallback(cacheKey);
    if (persistent) {
      return persistent.slice(0, pageSize);
    }

    const fallback = getFallbackNews('bangladesh', pageSize);
    console.log('🆘 Using static fallback for Bangladesh news');
    setCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Fetch news from multiple aggregated sources
 * @param category - The news category to fetch
 * @param pageSize - Number of articles to fetch (default: 20)
 * @returns Promise with news articles
 */
export async function fetchNewsByCategory(
  category: CategoryType = "all",
  pageSize: number = 20
): Promise<NewsAPIArticle[]> {
  const cacheKey = `news_${category}_${pageSize}`;

  if (category === "bangladesh") {
    const bangladeshNews = await fetchBangladeshNews(pageSize);
    if (bangladeshNews.length > 0) {
      return bangladeshNews;
    }
    return getFallbackNews("bangladesh", pageSize);
  }
  
  try {
    // Check cache first (2-hour TTL)
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`🔄 Fetching fresh news for category: ${category} (cache expired or empty)`);

    let articles: NewsAPIArticle[] = [];
    const errors: string[] = [];

    // In production, use serverless function
    if (NEWS_API_URL) {
      try {
        const response = await axios.get(NEWS_API_URL, {
          params: {
            category: category === "all" ? "general" : category,
            pageSize,
            language: "en",
          },
          timeout: 10000, // 10 second timeout (reduced from 15)
        });

        console.log("✅ Serverless API Response:", {
          status: response.data.status,
          totalResults: response.data.totalResults,
        });

        if (response.data.status === "ok" && response.data.articles) {
          // Filter articles: valid title AND within the freshness window
          articles = response.data.articles.filter(
            (article: NewsAPIArticle) =>
              article.title && article.title !== "[Removed]"
          );
          
          // Apply category-specific freshness filter and sort by latest first
          const recentArticles = filterRecentArticles(articles, category);
          const freshnessWindowHours = getFreshnessWindowHours(category);
          console.log(`📅 Filtered ${articles.length} → ${recentArticles.length} articles (last ${freshnessWindowHours} hours)`);
          articles = recentArticles;
        }
      } catch (serverlessError: unknown) {
        const errorMsg = serverlessError instanceof Error ? serverlessError.message : 'Unknown error';
        errors.push(`Serverless API failed: ${errorMsg}`);
        console.warn("⚠️ Serverless API error (but has 4-layer fallback):", errorMsg);
        // Serverless function has its own sequential fallback, so empty articles means all 4 APIs failed
        articles = []; // Will be handled by the stale cache fallback below
      }
    }
    
    // If serverless failed and we're in local development, try direct fetch (with timeout)
    if (!IS_PRODUCTION && articles.length === 0) {
      try {
        const fetchPromise = fetchNewsDirectly(category, pageSize);
        const timeoutPromise = new Promise<NewsAPIArticle[]>((_, reject) =>
          setTimeout(() => reject(new Error('Direct fetch timeout')), 8000)
        );
        
        const fetchedArticles = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Apply category-specific freshness filter and sort by latest first
        articles = filterRecentArticles(fetchedArticles, category);
        const freshnessWindowHours = getFreshnessWindowHours(category);
        console.log(`📅 Filtered ${fetchedArticles.length} → ${articles.length} articles (last ${freshnessWindowHours} hours)`);
      } catch (directError: unknown) {
        const errorMsg = directError instanceof Error ? directError.message : 'Unknown error';
        errors.push(`Direct fetch failed: ${errorMsg}`);
        console.warn("⚠️ Direct fetch error (all 4 APIs failed):", errorMsg);
        // All APIs exhausted, will use stale cache below
        articles = [];
      }
    }

    // Cache the results if successful
    if (articles.length > 0) {
      setCache(cacheKey, articles);
      console.log(`✅ Successfully fetched ${articles.length} articles for ${category}`);
      return articles;
    }

    // No articles from any source - use fallbacks
    throw new Error("All primary sources failed");
    
  } catch (error) {
    console.error("❌ Error fetching news:", error);
    
    // Fallback chain:
    // 1. Stale cache (even if expired)
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      const ageMinutes = Math.floor((Date.now() - staleCache.timestamp) / 1000 / 60);
      console.log(`⚠️ Using stale cache for: ${cacheKey} (${ageMinutes} minutes old)`);
      return staleCache.data;
    }

    // 2. Persistent fallback (from previous successful fetches)
    const persistent = getPersistentFallback(cacheKey);
    if (persistent) {
      return persistent;
    }

    // 3. Static fallback data
    console.log(`🆘 Using static fallback for: ${category}`);
    const fallback = getFallbackNews(category, pageSize);
    
    // Cache the fallback too (so it's available next time)
    setCache(cacheKey, fallback);
    
    return fallback;
  }
}

/**
 * Fetch trending news from aggregated sources
 * @param pageSize - Number of articles to fetch
 * @returns Promise with trending articles
 */
export async function fetchTrendingNews(
  pageSize: number = 10
): Promise<NewsAPIArticle[]> {
  const cacheKey = `trending_${pageSize}`;
  
  try {
    // Check cache first (2-hour TTL)
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log('🔄 Fetching trending news...');

    let articles: NewsAPIArticle[] = [];

    if (NEWS_API_URL) {
      try {
        const response = await axios.get(NEWS_API_URL, {
          params: {
            category: "general",
            pageSize,
            language: "en",
          },
          timeout: 10000,
        });

        if (response.data.status === "ok") {
          articles = response.data.articles.filter(
            (article: NewsAPIArticle) =>
              article.title && article.title !== "[Removed]"
          );
        }
      } catch (apiError) {
        console.warn("⚠️ Trending API failed, trying direct fetch...");
      }
    }
    
    // If serverless failed, try direct fetch (development only)
    if (!IS_PRODUCTION && articles.length === 0) {
      articles = await fetchNewsDirectly("all", pageSize);
    }

    // Cache if successful
    if (articles.length > 0) {
      setCache(cacheKey, articles);
      console.log(`✅ Successfully fetched ${articles.length} trending articles`);
      return articles;
    }

    throw new Error("Failed to fetch trending news from all sources");
  } catch (error) {
    console.error("❌ Error fetching trending news:", error);
    
    // Fallback chain:
    // 1. Stale cache
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      console.log('⚠️ Using stale cache for trending news');
      return staleCache.data;
    }

    // 2. Persistent fallback
    const persistent = getPersistentFallback(cacheKey);
    if (persistent) {
      console.log('⚠️ Using persistent fallback for trending news');
      return persistent;
    }

    // 3. Static fallback
    console.log('🆘 Using static fallback for trending news');
    const fallback = getFallbackNews("all", pageSize);
    setCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Fetch one hot topic from each category for carousel
 * @returns Promise with featured articles from each category
 */
export async function fetchFeaturedFromAllCategories(): Promise<NewsAPIArticle[]> {
  try {
    // Check cache first
    const cacheKey = 'featured_all_categories';
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('✅ Using cached featured articles');
      return cached;
    }

    console.log('🔄 Fetching featured articles from all categories...');

    const categories: CategoryType[] = ["technology", "business", "sports", "health", "entertainment", "world"];
    const featuredArticles: NewsAPIArticle[] = [];

    // Fetch 2 articles from each category in parallel
    // Each fetchNewsByCategory already has sequential API fallback (Guardian→Currents→GNews→NewsData)
    // Plus stale cache fallback, so this should almost always return real articles
    const promises = categories.map(cat => 
      fetchNewsByCategory(cat, 2).catch(err => {
        console.warn(`⚠️ Failed to fetch featured for ${cat} (this should be rare):`, err.message);
        // Return empty array, will be filtered out
        return [];
      })
    );
    
    const results = await Promise.all(promises);

    // Take the first (most recent/relevant) article from each category
    // Each category should return different articles with their own unique URLs
    results.forEach((articles, index) => {
      if (articles && articles.length > 0) {
        const article = articles[0];
        // Ensure the article has required fields
        if (article.title && article.url) {
          console.log(`🔗 Carousel item ${index}: ${article.title.substring(0, 40)}... → ${article.url}`);
          featuredArticles.push(article);
        }
      }
    });

    const uniqueArticles = featuredArticles.filter((article, index, arr) =>
      article.url ? arr.findIndex(candidate => candidate.url === article.url) === index : true
    );

    if (uniqueArticles.length !== featuredArticles.length) {
      console.warn(`♻️ Removed ${featuredArticles.length - uniqueArticles.length} duplicate carousel articles by URL.`);
    }

    console.log(`✅ Fetched ${uniqueArticles.length} featured articles from different categories`);
    console.log('📋 Carousel URLs:', uniqueArticles.map((a, i) => `[${i}] ${a.url}`));
    
    // If we have no articles, use static fallback (each category has unique articles)
    if (uniqueArticles.length === 0) {
      console.log('🆘 Using complete static fallback for featured articles');
      const fallbackArticles = categories.flatMap(cat => getFallbackNews(cat, 1));
      setCache(cacheKey, fallbackArticles.slice(0, 6));
      return fallbackArticles.slice(0, 6);
    }
    
    // Cache the results
    setCache(cacheKey, uniqueArticles);
    
    return uniqueArticles;
  } catch (error) {
    console.error("❌ Error fetching featured from all categories:", error);
    
    // Try to get from stale cache
    const staleCache = cache.get('featured_all_categories');
    if (staleCache) {
      console.log('⚠️ Using stale cache for featured articles');
      return staleCache.data;
    }
    
    // Last resort: static fallback (each category has different articles with unique URLs)
    console.log('🆘 Using static fallback for featured articles');
    const categories: CategoryType[] = ["technology", "business", "sports", "health", "entertainment", "world"];
    return categories.flatMap(cat => getFallbackNews(cat, 1)).slice(0, 6);
  }
}

/**
 * Fetch breaking news for ticker (more articles)
 * @param limit - Number of breaking news items
 * @returns Promise with breaking news titles
 */
export async function fetchBreakingNews(limit: number = 15): Promise<string[]> {
  try {
    // Check cache first
    const cacheKey = `breaking_news_${limit}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached.map(a => a.title);
    }

    // Fetch recent articles from multiple categories with error handling
    const [general, tech, business] = await Promise.all([
      fetchNewsByCategory("all", 5).catch(() => []),
      fetchNewsByCategory("technology", 5).catch(() => []),
      fetchNewsByCategory("business", 5).catch(() => []),
    ]);

    const allArticles = [...general, ...tech, ...business];
    
    // Cache the articles
    if (allArticles.length > 0) {
      setCache(cacheKey, allArticles);
    }
    
    // Remove duplicates and get titles
    const uniqueTitles = Array.from(
      new Set(allArticles.map(a => a.title))
    ).slice(0, limit);

    return uniqueTitles;
  } catch (error) {
    console.error("Error fetching breaking news:", error);
    return [
      "Loading latest breaking news...",
      "Stay tuned for more updates...",
      "News from around the world coming soon...",
    ];
  }
}

/**
 * Search news articles by query
 * Note: Search might be limited on free tiers of aggregated APIs
 * @param query - Search query
 * @param pageSize - Number of results
 * @returns Promise with search results
 */
export async function searchNews(
  query: string,
  pageSize: number = 20
): Promise<NewsAPIArticle[]> {
  try {
    if (!query.trim()) return [];

    if (NEWS_API_URL) {
      // For search, we'll fetch general news and filter client-side
      // since not all free APIs support search
      const response = await axios.get(NEWS_API_URL, {
        params: {
          category: "general",
          pageSize: 50, // Get more to filter
          language: "en",
        },
      });

      if (response.data.status === "ok") {
        const articles = response.data.articles.filter(
          (article: NewsAPIArticle) =>
            article.title && article.title !== "[Removed]"
        );

        // Client-side search filtering
        const searchLower = query.toLowerCase();
        return articles
          .filter(
            (article: NewsAPIArticle) =>
              article.title?.toLowerCase().includes(searchLower) ||
              article.description?.toLowerCase().includes(searchLower)
          )
          .slice(0, pageSize);
      }
    } else {
      const articles = await fetchNewsDirectly("all", 50);
      const searchLower = query.toLowerCase();
      return articles
        .filter(
          (article: NewsAPIArticle) =>
            article.title?.toLowerCase().includes(searchLower) ||
            article.description?.toLowerCase().includes(searchLower)
        )
        .slice(0, pageSize);
    }

    return [];
  } catch (error) {
    console.error("Error searching news:", error);
    return [];
  }
}

/**
 * Fetch news directly from APIs (for local development)
 * Uses OPTIMIZED category-specific routing + fallback chain
 * Each category uses the best API for that content type
 */
async function fetchNewsDirectly(
  category: CategoryType,
  pageSize: number
): Promise<NewsAPIArticle[]> {
  const providers = CATEGORY_PROVIDER_MAP[category] || CATEGORY_PROVIDER_MAP.all;
  const normalizedCategory = category === "all" ? "general" : category;

  const collected: NewsAPIArticle[] = [];
  const unlimitedProviders = providers.filter(provider => provider.tier === "unlimited");
  const limitedProviders = providers.filter(provider => provider.tier !== "unlimited");

  console.log(
    `🎯 Using multi-source routing for ${category}: ${providers
      .map(provider => provider.name)
      .join(" → ")}`
  );

  await collectFromProviders(unlimitedProviders, category, normalizedCategory, pageSize, collected);

  if (collected.length < pageSize) {
    await collectFromProviders(limitedProviders, category, normalizedCategory, pageSize, collected);
  }

  if (collected.length === 0) {
    console.error("❌ All providers failed for this category");
    return [];
  }

  const prepared = mergeAndPrepareArticles(collected, category);
  const blended = blendArticlesBySource(prepared, pageSize);

  return blended;
}

async function collectFromProviders(
  providers: ProviderConfig[],
  category: CategoryType,
  normalizedCategory: string,
  pageSize: number,
  accumulator: NewsAPIArticle[]
): Promise<void> {
  if (providers.length === 0) {
    return;
  }

  // RSS-heavy categories (Bangladesh, Health) need more RSS sources for better coverage
  const isRSSHeavy = category === 'bangladesh' || category === 'health';
  const minSources = isRSSHeavy ? 5 : 3; // Collect from more RSS sources for Bangladesh/Health
  const targetArticles = isRSSHeavy ? pageSize * 4 : pageSize * 3; // Collect even more articles from RSS
  let sourcesCollected = 0;

  console.log(`📰 ${category}: Collecting from ${providers.length} providers (min sources: ${minSources}, target: ${targetArticles} articles)`);

  for (const provider of providers) {
    // For RSS-heavy categories, prioritize unlimited (RSS) sources more aggressively
    if (isRSSHeavy && provider.tier === "unlimited") {
      // Always collect from RSS feeds, don't stop early
      try {
        console.log(`  📡 Trying RSS: ${provider.name}`);
        const articles = await tryAPI(provider.name, normalizedCategory, pageSize, provider.options);
        if (articles.length > 0) {
          console.log(`  ✅ ${provider.name}: ${articles.length} articles`);
          accumulator.push(...articles);
          sourcesCollected++;
        } else {
          console.log(`  ⚠️ ${provider.name}: No articles`);
        }
      } catch (error) {
        console.log(`  ❌ ${provider.name}: Failed`);
      }
    } else {
      // Standard behavior for other categories
      // Stop only if we have enough articles AND variety
      if (accumulator.length >= targetArticles && sourcesCollected >= minSources) {
        console.log(`  🎯 Target reached: ${accumulator.length} articles from ${sourcesCollected} sources`);
        break;
      }

      try {
        const articles = await tryAPI(provider.name, normalizedCategory, pageSize, provider.options);
        if (articles.length > 0) {
          accumulator.push(...articles);
          sourcesCollected++;
        }
      } catch (error) {
        // Silently skip failed providers - we have many fallbacks
        continue;
      }
    }
  }
  
  console.log(`✅ Collection complete: ${accumulator.length} total articles from ${sourcesCollected} sources`);
}

/**
 * Try a specific API and return articles
 * Router function to dispatch to specialized API handlers
 */
async function tryAPI(
  apiName: string,
  cat: string,
  pageSize: number,
  options: Record<string, unknown> = {}
): Promise<NewsAPIArticle[]> {
  try {
    switch (apiName) {
      // Existing aggregator APIs
      case 'guardian':
        return await tryGuardianAPI(cat, pageSize);
      case 'currents':
        return await tryCurrentsAPI(cat, pageSize);
      case 'gnews':
        return await tryGNewsAPI(cat, pageSize);
      case 'newsdata':
        return await tryNewsDataAPI(cat, pageSize);
      case 'saurav':
        return await trySauravAPI(cat, pageSize);
      
      // Technology APIs
      case 'hackernews':
        return await tryHackerNewsAPI(pageSize);
      case 'devto':
        return await tryDevToAPI(pageSize);
    case 'github-trending':
      return await tryGitHubTrendingAPI(pageSize);
    case 'lobsters':
      return await tryLobstersAPI(pageSize);
    case 'slashdot':
      return await trySlashdotRSSAPI(pageSize);
    case 'techcrunch':
      return await tryTechCrunchRSSAPI(pageSize);
    case 'the-verge':
      return await tryTheVergeRSSAPI(pageSize);
    case 'wired':
      return await tryWiredRSSAPI(pageSize);
    case 'ars-technica':
      return await tryArsTechnicaRSSAPI(pageSize);
    case 'engadget':
      return await tryEngadgetRSSAPI(pageSize);
    case 'cnet':
      return await tryCNETRSSAPI(pageSize);
    case 'zdnet':
      return await tryZDNetRSSAPI(pageSize);
    case 'techmeme':
      return await tryTechmemeRSSAPI(pageSize);
    case 'google-news-tech':
      return await tryGoogleNewsTechRSSAPI(pageSize);
    case 'reddit':
      return await tryRedditAPI(options.subreddit as string | undefined, pageSize);
    
    // Additional Technology RSS APIs
    case 'mit-tech-review':
      return await tryMITTechReviewRSSAPI(pageSize);
    case 'tech-radar':
      return await tryTechRadarRSSAPI(pageSize);
    case 'android-authority':
      return await tryAndroidAuthorityRSSAPI(pageSize);
    case '9to5mac':
      return await try9to5MacRSSAPI(pageSize);
    case 'macrumors':
      return await tryMacRumorsRSSAPI(pageSize);
    case 'xda-developers':
      return await tryXDADevelopersRSSAPI(pageSize);
    
    // Recommended Tech Alternative Sources
    case 'appleinsider':
      return await tryAppleInsiderRSSAPI(pageSize);
    case 'macworld':
      return await tryMacWorldRSSAPI(pageSize);
    case 'macobserver':
      return await tryMacObserverRSSAPI(pageSize);
    case 'google-news-tech-topic':
      return await tryGoogleNewsTechTopicRSSAPI(pageSize);
    
    // Sports APIs
    case 'espn':
      return await tryESPNAPI(cat, pageSize);
    case 'sportsdb':
      return await trySportsDBAPI(pageSize);
    case 'bbc-sport':
      return await tryBBCSportRSSAPI(pageSize);
    case 'sky-sports':
      return await trySkySportsRSSAPI(pageSize);
    case 'goal':
    case 'fourfourtwo':
      return await tryGoalRSSAPI(pageSize);
    case 'bleacher-report':
    case 'cbs-sports-alt':
      return await tryBleacherReportRSSAPI(pageSize);
    case 'sports-illustrated':
    case 'the-athletic-soccer':
      return await trySportsIllustratedRSSAPI(pageSize);
    case 'fox-sports':
      return await tryFoxSportsRSSAPI(pageSize);
    case 'nba-rss':
    case 'espn-nba':
      return await tryNBARSSAPI(pageSize);
    case 'nfl-rss':
    case 'profootballtalk':
      return await tryNFLRSSAPI(pageSize);
    case 'mlb-rss':
      return await tryMLBRSSAPI(pageSize);
    case 'google-news-sports':
      return await tryGoogleNewsSportsRSSAPI(pageSize);
    
    // Additional Sports RSS APIs
    case 'yahoo-sports':
      return await tryYahooSportsRSSAPI(pageSize);
    case 'cbssports':
      return await tryCBSSportsRSSAPI(pageSize);
    case 'nhl-rss':
      return await tryNHLRSSAPI(pageSize);
    case 'uefa':
      return await tryUEFARSSAPI(pageSize);
    case 'fifa-news':
      return await tryFIFANewsRSSAPI(pageSize);
    
    // Recommended Sports Alternative Sources
    case 'thescore':
      return await tryTheScoreRSSAPI(pageSize);
    case 'sbnation':
      return await trySBNationRSSAPI(pageSize);
    case 'nba-official':
      return await tryNBAOfficialRSSAPI(pageSize);
    case 'clutchpoints':
      return await tryClutchPointsRSSAPI(pageSize);
    case 'fansided':
      return await tryFanSidedRSSAPI(pageSize);
    case 'google-news-sports-topic':
      return await tryGoogleNewsSportsTopicRSSAPI(pageSize);
    
    // Business APIs
    case 'alphavantage':
      return await tryAlphaVantageAPI(pageSize);
    case 'marketaux':
      return await tryMarketauxAPI(pageSize);
    case 'yahoo':
      return await tryYahooFinanceRSSAPI(pageSize);
    case 'bloomberg':
      return await tryBloombergRSSAPI(pageSize);
    case 'reuters-business':
      return await tryReutersBusinessRSSAPI(pageSize);
    case 'cnbc':
      return await tryCNBCRSSAPI(pageSize);
    case 'marketwatch':
      return await tryMarketWatchRSSAPI(pageSize);
    case 'financial-times':
      return await tryFinancialTimesRSSAPI(pageSize);
    case 'wsj':
      return await tryWSJRSSAPI(pageSize);
    case 'forbes':
      return await tryForbesRSSAPI(pageSize);
    case 'business-insider':
      return await tryBusinessInsiderRSSAPI(pageSize);
    case 'seeking-alpha':
      return await trySeekingAlphaRSSAPI(pageSize);
    case 'google-news-business':
      return await tryGoogleNewsBusinessRSSAPI(pageSize);
    
    // Additional Business RSS APIs
    case 'economist':
      return await tryEconomistRSSAPI(pageSize);
    case 'fortune':
      return await tryFortuneRSSAPI(pageSize);
    case 'fast-company':
      return await tryFastCompanyRSSAPI(pageSize);
    case 'inc':
      return await tryIncRSSAPI(pageSize);
    case 'entrepreneur':
      return await tryEntrepreneurRSSAPI(pageSize);
    
    // Recommended Business Alternative Sources
    case 'barrons':
      return await tryBarronsRSSAPI(pageSize);
    case 'investors-business-daily':
      return await tryInvestorsBusinessDailyRSSAPI(pageSize);
    case 'google-news-business-topic':
      return await tryGoogleNewsBusinessTopicRSSAPI(pageSize);
    
    // Health APIs
    case 'pubmed':
      return await tryPubMedAPI(pageSize);
    case 'cdc-rss':
      return await tryCDCRSSAPI(pageSize);
    case 'nih':
    case 'drugs-com':
      return await tryNIHRSSAPI(pageSize);
    case 'webmd':
    case 'verywell-health':
      return await tryWebMDRSSAPI(pageSize);
    case 'healthline':
    case 'healthday':
      return await tryHealthlineRSSAPI(pageSize);
    case 'mayo-clinic':
    case 'livescience-health':
      return await tryMayoClinicRSSAPI(pageSize);
    
    // Recommended Health Alternative Sources
    case 'medpage-today':
      return await tryMedPageTodayRSSAPI(pageSize);
    case 'healthday-full':
      return await tryHealthDayFullRSSAPI(pageSize);
    case 'pubmed-central':
      return await tryPubMedCentralRSSAPI(pageSize);
    case 'everyday-health-all':
      return await tryEverydayHealthAllRSSAPI(pageSize);
    case 'verywell-health-main':
      return await tryVerywellHealthMainRSSAPI(pageSize);
    case 'google-news-health':
      return await tryGoogleNewsHealthRSSAPI(pageSize);
    
    // Entertainment APIs
    case 'tmdb':
      return await tryTMDBAPI(pageSize);
    case 'tvmaze':
      return await tryTVMazeAPI(pageSize);
    case 'itunes':
      return await tryITunesAPI(pageSize);
    case 'imdb':
    case 'movieweb':
      return await tryIMDbRSSAPI(pageSize);
    case 'variety':
      return await tryVarietyRSSAPI(pageSize);
    case 'hollywood-reporter':
      return await tryHollywoodReporterRSSAPI(pageSize);
    case 'entertainment-weekly':
    case 'slashfilm':
      return await tryEntertainmentWeeklyRSSAPI(pageSize);
    case 'rottentomatoes':
      return await tryRottenTomatoesRSSAPI(pageSize);
    case 'metacritic':
      return await tryMetacriticRSSAPI(pageSize);
    case 'deadline':
      return await tryDeadlineRSSAPI(pageSize);
    case 'rolling-stone':
      return await tryRollingStoneRSSAPI(pageSize);
    case 'billboard':
      return await tryBillboardRSSAPI(pageSize);
    case 'ign':
      return await tryIGNRSSAPI(pageSize);
    case 'gamespot':
      return await tryGameSpotRSSAPI(pageSize);
    case 'polygon':
      return await tryPolygonRSSAPI(pageSize);
    case 'google-news-entertainment':
      return await tryGoogleNewsEntertainmentRSSAPI(pageSize);
    
    // Additional Entertainment RSS APIs
    case 'vulture':
      return await tryVultureRSSAPI(pageSize);
    case 'collider':
      return await tryColliderRSSAPI(pageSize);
    case 'screen-rant':
      return await tryScreenRantRSSAPI(pageSize);
    case 'cinemablend':
      return await tryCinemaBlendRSSAPI(pageSize);
    case 'pitchfork':
      return await tryPitchforkRSSAPI(pageSize);
    case 'consequence':
      return await tryConsequenceRSSAPI(pageSize);
    case 'av-club':
      return await tryAVClubRSSAPI(pageSize);
    case 'eurogamer':
      return await tryEurogamerRSSAPI(pageSize);
    case 'kotaku':
      return await tryKotakuRSSAPI(pageSize);
    case 'pcgamer':
      return await tryPCGamerRSSAPI(pageSize);
    case 'comicbook':
    case 'denofgeek':
      return await tryComicbookRSSAPI(pageSize);
    case 'indiewire':
      return await tryIndieWireRSSAPI(pageSize);
    
    // Recommended Entertainment Alternative Sources
    case 'rottentomatoes-editorial':
      return await tryRottenTomatoesEditorialRSSAPI(pageSize);
    case 'consequence-net':
      return await tryConsequenceNetRSSAPI(pageSize);
    case 'comicbook-correct':
      return await tryComicBookCorrectRSSAPI(pageSize);
    case 'anime-news-network':
      return await tryAnimeNewsNetworkRSSAPI(pageSize);
    case 'metacritic-all':
      return await tryMetacriticAllRSSAPI(pageSize);
    case 'google-news-entertainment-topic':
      return await tryGoogleNewsEntertainmentTopicRSSAPI(pageSize);
    
    // World News RSS APIs
    case 'bbc-rss':
      return await tryBBCRSSAPI(pageSize);
    case 'reuters-rss':
      return await tryReutersRSSAPI(pageSize);
    case 'cnn':
      return await tryCNNRSSAPI(pageSize);
    case 'npr':
      return await tryNPRRSSAPI(pageSize);
    case 'france24':
      return await tryFrance24RSSAPI(pageSize);
    case 'dw':
      return await tryDWRSSAPI(pageSize);
    case 'un-news':
      return await tryUNNewsRSSAPI(pageSize);
    case 'aljazeera':
      return await tryAlJazeeraRSSAPI(pageSize);
    case 'ap-news':
      return await tryAPNewsRSSAPI(pageSize);
    case 'pbs-news':
      return await tryPBSNewsRSSAPI(pageSize);
    case 'abc-news':
      return await tryABCNewsRSSAPI(pageSize);
    case 'google-news-world':
      return await tryGoogleNewsWorldRSSAPI(pageSize);
    
    // Additional World News RSS APIs
    case 'euronews':
      return await tryEuronewsRSSAPI(pageSize);
    case 'nyt-world':
      return await tryNYTWorldRSSAPI(pageSize);
    case 'wapo-world':
      return await tryWaPoWorldRSSAPI(pageSize);
    case 'independent':
      return await tryIndependentRSSAPI(pageSize);
    case 'telegraph':
      return await tryTelegraphRSSAPI(pageSize);
    
    // Bangladesh RSS Feeds (Unlimited)
    case 'dailystar-bd':
    case 'unb-news':
      return await tryDailyStarBDRSSAPI(pageSize);
    case 'banglanews24':
      return await tryBanglanews24RSSAPI(pageSize);
    case 'prothomalo-en':
      return await tryProthomAloEnRSSAPI(pageSize);
    case 'dhakatribune':
    case 'financial-express-bd':
      return await tryDhakaTribuneRSSAPI(pageSize);
    case 'bdnews24':
    case 'newage-bd':
      return await tryBDNews24RSSAPI(pageSize);
    case 'bangladeshjournal':
      return await tryBangladeshJournalRSSAPI(pageSize);
    case 'hindustantimes-bangla':
      return await tryHindustanTimesBanglaRSSAPI(pageSize);
    case 'google-news-bangladesh':
      return await tryGoogleNewsBangladeshRSSAPI(pageSize);
    case 'bbc-bangladesh':
      return await tryBBCBangladeshRSSAPI(pageSize);
    case 'guardian-bangladesh':
      return await tryGuardianBangladeshRSSAPI(pageSize);
    case 'newsdata-bangladesh':
      return await tryNewsDataBangladeshAPI(pageSize);
    
    // Recommended Bangladesh Alternative Sources
    case 'business-standard-bd':
      return await tryBusinessStandardBDRSSAPI(pageSize);
    case 'dhaka-post':
      return await tryDhakaPostRSSAPI(pageSize);
    case 'independent-bangladesh':
      return await tryIndependentBangladeshRSSAPI(pageSize);
    case 'google-news-bangladesh-topic':
      return await tryGoogleNewsBangladeshTopicRSSAPI(pageSize);
    
    // Health RSS Feeds (Unlimited)
    case 'who-news':
      return await tryWHONewsRSSAPI(pageSize);
    case 'who-outbreaks':
      return await tryWHOOutbreaksRSSAPI(pageSize);
    case 'cdc-newsroom':
      return await tryCDCNewsroomRSSAPI(pageSize);
    case 'cdc-travelers':
      return await tryCDCTravelersRSSAPI(pageSize);
    case 'medlineplus':
      return await tryMedlinePlusRSSAPI(pageSize);
    case 'sciencedaily-health':
      return await tryScienceDailyHealthRSSAPI(pageSize);
    case 'kff-health':
      return await tryKFFHealthRSSAPI(pageSize);
    case 'dailystar-health':
    case 'unb-health':
      return await tryDailyStarHealthRSSAPI(pageSize);
    case 'bdnews24-health':
    case 'newage-health':
      return await tryBDNews24HealthRSSAPI(pageSize);
    case 'banglanews24-health':
      return await tryBanglanews24HealthRSSAPI(pageSize);
    
    // Additional Health RSS APIs
    case 'harvard-health':
    case 'medicalxpress':
      return await tryHarvardHealthRSSAPI(pageSize);
    case 'johns-hopkins-health':
      return await tryJohnsHopkinsHealthRSSAPI(pageSize);
    case 'cleveland-clinic':
    case 'medscape-news':
      return await tryClevelandClinicRSSAPI(pageSize);
    case 'medscape':
      return await tryMedscapeRSSAPI(pageSize);
    case 'medical-news-today':
    case 'medicinenet':
      return await tryMedicalNewsTodayRSSAPI(pageSize);
    case 'health-news-review':
    case 'everyday-health':
      return await tryHealthNewsReviewRSSAPI(pageSize);
    case 'reuters-health':
      return await tryReutersHealthRSSAPI(pageSize);
    case 'npr-health':
      return await tryNPRHealthRSSAPI(pageSize);
    case 'bbc-health':
      return await tryBBCHealthRSSAPI(pageSize);
    case 'lancet-health':
      return await tryLancetHealthRSSAPI(pageSize);
    
    default:
      console.warn(`⚠️ Unknown API: ${apiName}`);
      return [];
    }
  } catch (error) {
    // Silently handle all provider errors - we have many fallbacks
    return [];
  }
}

/**
 * Try Guardian API
 */
async function tryGuardianAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!GUARDIAN_API_KEY) return [];
  
  console.log('🔄 Trying Guardian API (5000/day quota)...');
  const guardianSection = cat === "general" ? "world" : cat;
  const response = await axios.get(
    `https://content.guardianapis.com/search?section=${guardianSection}&show-fields=thumbnail,trailText,byline&page-size=${pageSize}&api-key=${GUARDIAN_API_KEY}`,
    { timeout: 8000 }
  );

  const guardianArticles = response.data.response?.results || [];
  if (guardianArticles.length > 0) {
    const articles = guardianArticles.map((article: { 
      fields?: { byline?: string; trailText?: string; thumbnail?: string }; 
      webTitle: string; 
      webUrl: string; 
      webPublicationDate: string 
    }) => ({
      source: { id: "guardian", name: "The Guardian" },
      author: article.fields?.byline || "The Guardian",
      title: article.webTitle,
      description: article.fields?.trailText || article.webTitle,
      url: article.webUrl,
      urlToImage: article.fields?.thumbnail || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.webPublicationDate,
      content: article.fields?.trailText,
    }));
    
    console.log(`✅ Guardian API SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

/**
 * Try Currents API
 */
async function tryCurrentsAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!CURRENTS_API_KEY) return [];
  
  console.log('🔄 Trying Currents API (600/day quota)...');
  const response = await axios.get(
    `https://api.currentsapi.services/v1/latest-news?apiKey=${CURRENTS_API_KEY}&category=${cat}&language=en`,
    { timeout: 8000 }
  );

  const currentsArticles = response.data.news || [];
  if (currentsArticles.length > 0) {
    const articles = currentsArticles.slice(0, pageSize).map((article: {
      author?: string;
      title: string;
      description: string;
      url: string;
      image?: string;
      published: string;
    }) => ({
      source: { id: "currents", name: "Currents API" },
      author: article.author || "Currents",
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.published,
      content: article.description,
    }));
    
    console.log(`✅ Currents API SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

/**
 * Try GNews API
 */
async function tryGNewsAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!GNEWS_API_KEY) return [];
  
  console.log('🔄 Trying GNews API (100/day quota)...');
  const gnewsCategory = cat === "general" ? "world" : cat;
  const response = await axios.get(
    `https://gnews.io/api/v4/top-headlines?category=${gnewsCategory}&lang=en&max=${pageSize}&apikey=${GNEWS_API_KEY}`,
    { timeout: 8000 }
  );

  const gnewsArticles = response.data.articles || [];
  if (gnewsArticles.length > 0) {
    const articles = gnewsArticles.map((article: { 
      source?: { name?: string }; 
      title: string; 
      description: string; 
      url: string; 
      image: string; 
      publishedAt: string; 
      content: string 
    }) => ({
      source: { id: "gnews", name: article.source?.name || "GNews" },
      author: article.source?.name || "GNews",
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.image || "https://images.unsplash.com/photo-504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.publishedAt,
      content: article.content,
    }));
    
    console.log(`✅ GNews API SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

/**
 * Try NewsData.io API
 */
async function tryNewsDataAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!NEWSDATA_API_KEY) return [];
  
  console.log('🔄 Trying NewsData.io API (200/day quota)...');
  const response = await axios.get(
    `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&category=${cat}&language=en`,
    { timeout: 8000 }
  );

  const newsdataArticles = response.data.results || [];
  if (newsdataArticles.length > 0) {
    const articles = newsdataArticles.slice(0, pageSize).map((article: {
      creator?: string[];
      title: string;
      description?: string;
      link: string;
      image_url?: string;
      pubDate: string;
      content?: string;
      source_id?: string;
    }) => ({
      source: { id: "newsdata", name: article.source_id || "NewsData" },
      author: article.creator?.[0] || "NewsData",
      title: article.title,
      description: article.description || article.title,
      url: article.link,
      urlToImage: article.image_url || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.pubDate,
      content: article.content || article.description,
    }));
    
    console.log(`✅ NewsData.io API SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

/**
 * Try Saurav Tech NewsAPI
 */
async function trySauravAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  console.log('🔄 Trying Saurav Tech NewsAPI (Free, no quota)...');
  const sauravCategory = cat === 'general' ? 'general' : cat;
  const response = await axios.get(
    `https://saurav.tech/NewsAPI/top-headlines/category/${sauravCategory}/in.json`,
    { timeout: 8000 }
  );

  const sauravArticles = response.data.articles || [];
  if (sauravArticles.length > 0) {
    const articles = sauravArticles.slice(0, pageSize).map((article: {
      source?: { id?: string; name?: string };
      author?: string;
      title: string;
      description?: string;
      url: string;
      urlToImage?: string;
      publishedAt: string;
      content?: string;
    }) => ({
      source: { id: article.source?.id || "saurav-tech", name: article.source?.name || "News API" },
      author: article.author || "NewsAPI",
      title: article.title,
      description: article.description || article.title,
      url: article.url,
      urlToImage: article.urlToImage || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.publishedAt,
      content: article.content || article.description,
    }));
    
    console.log(`✅ Saurav Tech NewsAPI SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

// ============================================================================
// TECHNOLOGY APIs
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
// External API responses use any for flexibility with varying response structures

/**
 * Try Hacker News API (Unlimited, no key needed)
 * Best for: Tech news, startups, programming
 */
async function tryHackerNewsAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying Hacker News API (Unlimited, no quota)...');
    
    // Get top stories IDs
    const topStoriesResponse = await axios.get(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      { timeout: 8000 }
    );
    
    const storyIds = topStoriesResponse.data.slice(0, pageSize * 2); // Get extra in case some fail
    const articles: NewsAPIArticle[] = [];
    
    // Fetch individual stories in parallel (but limit to pageSize)
    const storyPromises = storyIds.slice(0, pageSize).map(async (id: number) => {
      try {
        const response = await axios.get(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          { timeout: 5000 }
        );
        return response.data;
      } catch {
        return null;
      }
    });
    
    const stories = await Promise.all(storyPromises);
    
    for (const story of stories) {
      if (story && story.title && story.url) {
        articles.push({
          source: { id: "hacker-news", name: "Hacker News" },
          author: story.by || "HN User",
          title: story.title,
          description: story.text || story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          urlToImage: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&h=600&fit=crop",
          publishedAt: new Date(story.time * 1000).toISOString(),
          content: story.text || story.title,
        });
      }
    }
    
    console.log(`✅ Hacker News API SUCCESS: ${articles.length} articles`);
    return articles.slice(0, pageSize);
  } catch (error) {
    console.error('❌ Hacker News API failed:', error);
    return [];
  }
}

/**
 * Try Dev.to API (Unlimited, no key needed)
 * Best for: Developer tutorials, tech articles
 */
async function tryDevToAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying Dev.to API (Unlimited, no quota)...');
    
    const response = await axios.get(
      `https://dev.to/api/articles?per_page=${pageSize}&top=7`,
      { timeout: 8000 }
    );
    
    const articles = response.data.map((article: any) => ({
      source: { id: "dev-to", name: "DEV Community" },
      author: article.user?.name || "DEV User",
      title: article.title,
      description: article.description || article.title,
      url: article.url,
      urlToImage: article.cover_image || article.social_image || "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
      publishedAt: article.published_at || new Date().toISOString(),
      content: article.description || article.title,
    }));
    
    console.log(`✅ Dev.to API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Dev.to API failed:', error);
    return [];
  }
}

/**
 * Try GitHub Trending API (Unofficial, unlimited)
 * Best for: Trending repositories, open source news
 */
async function tryGitHubTrendingAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying GitHub Trending API (Unlimited)...');
    
    const response = await axios.get(
      'https://api.gitterHYPE.com/repositories?since=daily',
      { timeout: 8000 }
    );
    
    const articles = response.data.slice(0, pageSize).map((repo: any) => ({
      source: { id: "github-trending", name: "GitHub Trending" },
      author: repo.author || repo.username || "GitHub User",
      title: `${repo.name || repo.repository}: ${repo.description || 'Trending Repository'}`,
      description: repo.description || `Trending repository with ${repo.stars || 0} stars`,
      url: repo.url || `https://github.com/${repo.author}/${repo.name}`,
      urlToImage: repo.avatar || "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&h=600&fit=crop",
      publishedAt: new Date().toISOString(),
      content: repo.description || `${repo.name} - ${repo.stars || 0} stars today`,
    }));
    
    console.log(`✅ GitHub Trending API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ GitHub Trending API failed:', error);
    return [];
  }
}

async function tryLobstersAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying Lobsters API (Unlimited)...');

    const response = await axios.get('https://lobste.rs/hottest.json', { timeout: 8000 });
    const posts = Array.isArray(response.data) ? response.data : [];

    const articles = posts.slice(0, Math.max(pageSize * 2, pageSize)).map((post: any) => ({
      source: { id: 'lobsters', name: 'Lobsters' },
      author: post.submitter_user?.username || 'Lobsters',
      title: post.title,
      description: post.description || post.title,
      url: post.url || `https://lobste.rs/s/${post.short_id}`,
      urlToImage: DEFAULT_FALLBACK_IMAGE,
      publishedAt: post.created_at ? new Date(post.created_at).toISOString() : new Date().toISOString(),
      content: post.description || post.title,
    }));

    console.log(`✅ Lobsters API SUCCESS: ${articles.length} articles`);
    return articles.slice(0, pageSize);
  } catch (error) {
    console.error('❌ Lobsters API failed:', error);
    return [];
  }
}

async function trySlashdotRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://rss.slashdot.org/Slashdot/slashdotMain', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'slashdot',
    sourceName: 'Slashdot',
  }).slice(0, pageSize);
}

async function tryTechCrunchRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://techcrunch.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'techcrunch',
    sourceName: 'TechCrunch',
  }).slice(0, pageSize);
}

async function tryTheVergeRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.theverge.com/rss/index.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'the-verge',
    sourceName: 'The Verge',
  }).slice(0, pageSize);
}

async function tryWiredRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.wired.com/feed/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'wired',
    sourceName: 'Wired',
  }).slice(0, pageSize);
}

async function tryRedditAPI(subreddit: string | undefined, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!subreddit) {
    return [];
  }

  try {
    console.log(`🔄 Trying Reddit API for r/${subreddit} (Unlimited)...`);
    const limit = Math.min(pageSize * 2, 100);
    const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json`, {
      params: { limit },
      timeout: 8000,
      headers: { 'User-Agent': 'newsflow-ai/1.0' },
    });

    const posts = response.data?.data?.children || [];

    const articles = posts
      .map((post: any) => post?.data)
      .filter((data: any) => data && data.title && data.permalink)
      .map((data: any) => ({
        source: { id: `reddit-${subreddit}`, name: `r/${subreddit}` },
        author: data.author || `r/${subreddit}`,
        title: data.title,
        description: data.selftext || data.title,
        url: `https://www.reddit.com${data.permalink}`,
        urlToImage:
          data.thumbnail && typeof data.thumbnail === 'string' && data.thumbnail.startsWith('http')
            ? data.thumbnail
            : DEFAULT_FALLBACK_IMAGE,
        publishedAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : new Date().toISOString(),
        content: data.selftext || data.title,
      }));

    console.log(`✅ Reddit API SUCCESS (r/${subreddit}): ${articles.length} articles`);
    return articles.slice(0, pageSize);
  } catch (error) {
    console.error(`❌ Reddit API failed for r/${subreddit}:`, error);
    return [];
  }
}

// ============================================================================
// SPORTS APIs
// ============================================================================

/**
 * Try ESPN API (Unofficial, unlimited)
 * Best for: Sports news, scores, updates
 */
async function tryESPNAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying ESPN API (Unlimited)...');
    
    // ESPN API provides various sports news
    const response = await axios.get(
      'http://site.api.espn.com/apis/site/v2/sports/news',
      { timeout: 8000 }
    );
    
    const articles = response.data.articles?.slice(0, pageSize).map((article: any) => ({
      source: { id: "espn", name: "ESPN" },
      author: article.byline || "ESPN Staff",
      title: article.headline,
      description: article.description || article.headline,
      url: article.links?.web?.href || "https://espn.com",
      urlToImage: article.images?.[0]?.url || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
      publishedAt: article.published || new Date().toISOString(),
      content: article.story || article.description,
    })) || [];
    
    console.log(`✅ ESPN API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ ESPN API failed:', error);
    return [];
  }
}

/**
 * Try TheSportsDB API (30/min free)
 * Best for: Sports events, team info
 */
async function trySportsDBAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    if (!SPORTSDB_API_KEY) return [];
    
    console.log('🔄 Trying TheSportsDB API (30/min)...');
    
    // Get latest events (can be converted to news format)
    const response = await axios.get(
      `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventslast.php?id=4328`,
      { timeout: 8000 }
    );
    
    const events = response.data.results?.slice(0, pageSize) || [];
    const articles = events.map((event: any) => ({
      source: { id: "sportsdb", name: "TheSportsDB" },
      author: "TheSportsDB",
      title: `${event.strEvent}: ${event.strHomeTeam} vs ${event.strAwayTeam}`,
      description: event.strEventDescription || `${event.strSport} match`,
      url: event.strVideo || "https://www.thesportsdb.com/",
      urlToImage: event.strThumb || event.strSquare || "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop",
      publishedAt: event.dateEvent ? new Date(event.dateEvent).toISOString() : new Date().toISOString(),
      content: `${event.strHomeTeam} ${event.intHomeScore || 0} - ${event.intAwayScore || 0} ${event.strAwayTeam}`,
    }));
    
    console.log(`✅ TheSportsDB API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ TheSportsDB API failed:', error);
    return [];
  }
}

async function tryBBCSportRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://feeds.bbci.co.uk/sport/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'bbc-sport',
    sourceName: 'BBC Sport',
  }).slice(0, pageSize);
}

async function trySkySportsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.skysports.com/rss/12040', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'sky-sports',
    sourceName: 'Sky Sports',
  }).slice(0, pageSize);
}

async function tryGoalRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with FourFourTwo as Goal.com RSS unavailable
  const items = await fetchRSSFeed('https://www.fourfourtwo.com/feed', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'fourfourtwo',
    sourceName: 'FourFourTwo',
  }).slice(0, pageSize);
}

async function tryBleacherReportRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with CBS Sports as Bleacher Report blocks RSS
  const items = await fetchRSSFeed('https://www.cbssports.com/rss/headlines', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cbs-sports-alt',
    sourceName: 'CBS Sports',
  }).slice(0, pageSize);
}

// ============================================================================
// BUSINESS APIs
// ============================================================================

/**
 * Try Alpha Vantage API (25/day for news)
 * Best for: Financial news, market updates
 */
async function tryAlphaVantageAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    if (!ALPHA_VANTAGE_API_KEY) return [];
    
    console.log('🔄 Trying Alpha Vantage API (25/day)...');
    
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${ALPHA_VANTAGE_API_KEY}`,
      { timeout: 8000 }
    );
    
    const feed = response.data.feed?.slice(0, pageSize) || [];
    const articles = feed.map((item: any) => ({
      source: { id: "alpha-vantage", name: item.source || "Alpha Vantage" },
      author: item.authors?.[0] || item.source || "Alpha Vantage",
      title: item.title,
      description: item.summary || item.title,
      url: item.url,
      urlToImage: item.banner_image || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
      publishedAt: item.time_published ? new Date(item.time_published).toISOString() : new Date().toISOString(),
      content: item.summary || item.title,
    }));
    
    console.log(`✅ Alpha Vantage API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Alpha Vantage API failed:', error);
    return [];
  }
}

/**
 * Try Marketaux API (100/day free)
 * Best for: Market news, financial analysis
 */
async function tryMarketauxAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    if (!MARKETAUX_API_KEY) return [];
    
    console.log('🔄 Trying Marketaux API (100/day)...');
    
    const response = await axios.get(
      `https://api.marketaux.com/v1/news/all?api_token=${MARKETAUX_API_KEY}&limit=${pageSize}`,
      { timeout: 8000 }
    );
    
    const articles = response.data.data?.map((article: any) => ({
      source: { id: "marketaux", name: article.source || "Marketaux" },
      author: article.source || "Marketaux",
      title: article.title,
      description: article.description || article.snippet || article.title,
      url: article.url,
      urlToImage: article.image_url || "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
      publishedAt: article.published_at,
      content: article.description || article.snippet,
    })) || [];
    
    console.log(`✅ Marketaux API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Marketaux API failed:', error);
    return [];
  }
}

async function tryYahooFinanceRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://finance.yahoo.com/news/rssindex', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'yahoo-finance',
    sourceName: 'Yahoo Finance',
  }).slice(0, pageSize);
}

async function tryBloombergRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.bloomberg.com/feed/podcast/etf-report.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'bloomberg',
    sourceName: 'Bloomberg',
  }).slice(0, pageSize);
}

async function tryReutersBusinessRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Using Reuters agency feed as main feed has issues
  const items = await fetchRSSFeed('https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'reuters-business',
    sourceName: 'Reuters Business',
  }).slice(0, pageSize);
}

async function tryCNBCRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.cnbc.com/id/100003114/device/rss/rss.html', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cnbc',
    sourceName: 'CNBC',
  }).slice(0, pageSize);
}

async function tryMarketWatchRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Using MarketWatch real-time headlines
  const items = await fetchRSSFeed('https://feeds.marketwatch.com/marketwatch/realtimeheadlines/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'marketwatch',
    sourceName: 'MarketWatch',
  }).slice(0, pageSize);
}

// ============================================================================
// HEALTH APIs
// ============================================================================

/**
 * Try PubMed API (Unlimited, no key needed)
 * Best for: Medical research, health studies
 */
async function tryPubMedAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying PubMed API (Unlimited, no quota)...');
    
    // Search for recent health articles
    const searchResponse = await axios.get(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=health+news&retmax=${pageSize}&retmode=json&sort=date`,
      { timeout: 8000 }
    );
    
    const ids = searchResponse.data.esearchresult?.idlist || [];
    if (ids.length === 0) return [];
    
    // Fetch article details
    const summaryResponse = await axios.get(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`,
      { timeout: 8000 }
    );
    
    const articles: NewsAPIArticle[] = [];
    const result = summaryResponse.data.result;
    
    for (const id of ids) {
      const article = result[id];
      if (article && article.title) {
        articles.push({
          source: { id: "pubmed", name: "PubMed" },
          author: article.authors?.[0]?.name || "PubMed",
          title: article.title,
          description: article.source || article.title,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          urlToImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
          publishedAt: article.pubdate ? new Date(article.pubdate).toISOString() : new Date().toISOString(),
          content: article.source || article.title,
        });
      }
    }
    
    console.log(`✅ PubMed API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ PubMed API failed:', error);
    return [];
  }
}

/**
 * Try CDC RSS Feed (via server-side proxy)
 * Best for: Health alerts, CDC updates
 */
async function tryCDCRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://tools.cdc.gov/api/v2/resources/media/132608.rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cdc',
    sourceName: 'CDC',
    fallbackImage: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryNIHRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Drugs.com health news as NIH RSS is currently unavailable
  const items = await fetchRSSFeed('https://www.drugs.com/feeds/health_news.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'drugs-com',
    sourceName: 'Drugs.com Health News',
  }).slice(0, pageSize);
}

async function tryWebMDRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Verywell Health
  const items = await fetchRSSFeed('https://www.verywellhealth.com/feedburner/verywell', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'verywell-health',
    sourceName: 'Verywell Health',
  }).slice(0, pageSize);
}

async function tryHealthlineRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with HealthDay News as Healthline RSS is currently unavailable
  const items = await fetchRSSFeed('https://consumer.healthday.com/rss/healthday-news.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'healthday',
    sourceName: 'HealthDay News',
  }).slice(0, pageSize);
}

async function tryMayoClinicRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Live Science Health as Mayo Clinic RSS has issues
  const items = await fetchRSSFeed('https://www.livescience.com/feeds/health', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'livescience-health',
    sourceName: 'Live Science Health',
  }).slice(0, pageSize);
}

// ============================================================================
// ENTERTAINMENT APIs
// ============================================================================

/**
 * Try TMDB API (1M/month - excellent limit)
 * Best for: Movies, TV shows news
 */
async function tryTMDBAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    if (!TMDB_API_KEY) return [];
    
    console.log('🔄 Trying TMDB API (1M/month)...');
    
    // Get trending movies/shows
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}`,
      { timeout: 8000 }
    );
    
    const articles = response.data.results?.slice(0, pageSize).map((item: any) => ({
      source: { id: "tmdb", name: "The Movie Database" },
      author: "TMDB",
      title: item.title || item.name || "Trending Entertainment",
      description: item.overview || item.title || item.name,
      url: `https://www.themoviedb.org/${item.media_type}/${item.id}`,
      urlToImage: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 
                  item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` :
                  "https://images.unsplash.com/photo-1574267432644-f5810a9ae4e4?w=800&h=600&fit=crop",
      publishedAt: item.release_date || item.first_air_date || new Date().toISOString(),
      content: item.overview || `${item.media_type} with ${item.vote_average} rating`,
    })) || [];
    
    console.log(`✅ TMDB API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ TMDB API failed:', error);
    return [];
  }
}

/**
 * Try TVMaze API (Unlimited, no key needed)
 * Best for: TV show schedules, updates
 */
async function tryTVMazeAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying TVMaze API (Unlimited, no quota)...');
    
    const response = await axios.get(
      'https://api.tvmaze.com/schedule',
      { timeout: 8000 }
    );
    
    const articles = response.data.slice(0, pageSize).map((episode: any) => ({
      source: { id: "tvmaze", name: "TVMaze" },
      author: "TVMaze",
      title: `${episode.show?.name}: ${episode.name}`,
      description: episode.summary?.replace(/<[^>]*>/g, '') || `New episode of ${episode.show?.name}`,
      url: episode.url || episode.show?.url || "https://www.tvmaze.com/",
      urlToImage: episode.image?.original || episode.show?.image?.original || "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop",
      publishedAt: episode.airstamp || new Date().toISOString(),
      content: episode.summary?.replace(/<[^>]*>/g, '') || episode.name,
    }));
    
    console.log(`✅ TVMaze API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ TVMaze API failed:', error);
    return [];
  }
}

async function tryITunesAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying iTunes API (Unlimited)...');
    const limit = Math.min(Math.max(pageSize, 10), 50);
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: 'entertainment',
        media: 'movie',
        limit,
      },
      timeout: 8000,
    });

    const results = Array.isArray(response.data?.results) ? response.data.results : [];
    const articles = results.map((item: any) => ({
      source: { id: 'itunes', name: 'Apple iTunes' },
      author: item.artistName || 'Apple',
      title: item.trackName || item.collectionName || 'Trending Entertainment',
      description: item.shortDescription || item.longDescription || item.collectionName || item.trackName,
      url: item.trackViewUrl || item.collectionViewUrl || 'https://itunes.apple.com',
      urlToImage: item.artworkUrl100 || item.artworkUrl600 || DEFAULT_FALLBACK_IMAGE,
      publishedAt: item.releaseDate ? new Date(item.releaseDate).toISOString() : new Date().toISOString(),
      content: item.primaryGenreName || item.shortDescription || item.collectionName,
    }));

    console.log(`✅ iTunes API SUCCESS: ${articles.length} articles`);
    return articles.slice(0, pageSize);
  } catch (error) {
    console.error('❌ iTunes API failed:', error);
    return [];
  }
}

async function tryIMDbRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with MovieWeb as IMDb RSS is deprecated
  const items = await fetchRSSFeed('https://movieweb.com/rss/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'movieweb',
    sourceName: 'MovieWeb',
  }).slice(0, pageSize);
}

async function tryVarietyRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://variety.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'variety',
    sourceName: 'Variety',
  }).slice(0, pageSize);
}

async function tryHollywoodReporterRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.hollywoodreporter.com/t/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'hollywood-reporter',
    sourceName: 'The Hollywood Reporter',
  }).slice(0, pageSize);
}

async function tryEntertainmentWeeklyRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Slash Film as Entertainment Weekly RSS is currently unavailable
  const items = await fetchRSSFeed('https://www.slashfilm.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'slashfilm',
    sourceName: 'SlashFilm',
  }).slice(0, pageSize);
}

async function tryRottenTomatoesRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.rottentomatoes.com/syndication/rss/top_news.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'rottentomatoes',
    sourceName: 'Rotten Tomatoes',
  }).slice(0, pageSize);
}

async function tryMetacriticRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.metacritic.com/rss/movies', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'metacritic',
    sourceName: 'Metacritic',
  }).slice(0, pageSize);
}

// ============================================================================
// WORLD NEWS RSS APIs
// ============================================================================

/**
 * Try BBC RSS Feed (via server-side proxy)
 * Best for: International news, world events
 */
async function tryBBCRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('http://feeds.bbci.co.uk/news/world/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'bbc',
    sourceName: 'BBC News',
    fallbackImage: 'https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

/**
 * Try Reuters RSS Feed (via server-side proxy)
 * Best for: Breaking news, world coverage
 */
async function tryReutersRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Using Reuters main feed
  const items = await fetchRSSFeed('https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'reuters',
    sourceName: 'Reuters',
    fallbackImage: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryCNNRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('http://rss.cnn.com/rss/edition_world.rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cnn',
    sourceName: 'CNN',
  }).slice(0, pageSize);
}

async function tryNPRRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://feeds.npr.org/1004/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'npr',
    sourceName: 'NPR',
  }).slice(0, pageSize);
}

async function tryFrance24RSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.france24.com/en/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'france24',
    sourceName: 'France 24',
  }).slice(0, pageSize);
}

async function tryDWRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://rss.dw.com/rdf/rss-en-all', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'dw',
    sourceName: 'Deutsche Welle',
  }).slice(0, pageSize);
}

async function tryUNNewsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.un.org/feed/subscribe/en/news/all/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'un-news',
    sourceName: 'UN News',
  }).slice(0, pageSize);
}

async function tryAlJazeeraRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.aljazeera.com/xml/rss/all.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'aljazeera',
    sourceName: 'Al Jazeera',
  }).slice(0, pageSize);
}

async function tryBBCBangladeshRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://feeds.bbci.co.uk/news/world/asia/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'bbc-bangladesh',
    sourceName: 'BBC Asia',
  }).slice(0, pageSize);
}

async function tryGuardianBangladeshRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.theguardian.com/world/bangladesh/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'guardian-bangladesh',
    sourceName: 'The Guardian - Bangladesh',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL BANGLADESH RSS FEEDS (Recommended Alternatives)
// ============================================================================

async function tryBusinessStandardBDRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.tbsnews.net/feed', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'business-standard-bd',
    sourceName: 'The Business Standard',
    fallbackImage: 'https://images.unsplash.com/photo-1586829135343-132950070391?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryDhakaPostRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.dhakapost.com/feed', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'dhaka-post',
    sourceName: 'Dhaka Post',
    fallbackImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryIndependentBangladeshRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.theindependentbd.com/feed', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'independent-bangladesh',
    sourceName: 'The Independent Bangladesh',
    fallbackImage: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsBangladeshTopicRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/search?q=Bangladesh&hl=en-BD&gl=BD&ceid=BD:en', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-bangladesh-topic',
    sourceName: 'Google News Bangladesh',
    fallbackImage: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryNewsDataBangladeshAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  if (!NEWSDATA_BD_API_KEY && !NEWSDATA_API_KEY) {
    console.log('🔐 Skipping NewsData.io Bangladesh API (missing API key)');
    return [];
  }

  try {
    console.log('🔄 Trying NewsData.io Bangladesh API...');
    const response = await axios.get('https://newsdata.io/api/1/news', {
      params: {
        apikey: NEWSDATA_BD_API_KEY || NEWSDATA_API_KEY,
        country: 'bd',
        language: 'en',
      },
      timeout: 8000,
    });

    const results = Array.isArray(response.data?.results) ? response.data.results : [];
    const articles = results.slice(0, pageSize).map((article: any) => ({
      source: { id: article.source_id || 'newsdata-bd', name: article.source_id || 'NewsData Bangladesh' },
      author: article.creator?.[0] || 'NewsData.io',
      title: article.title,
      description: article.description || article.title,
      url: article.link,
      urlToImage: article.image_url || DEFAULT_FALLBACK_IMAGE,
      publishedAt: article.pubDate || new Date().toISOString(),
      content: article.content || article.description,
    }));

    console.log(`✅ NewsData.io Bangladesh SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ NewsData.io Bangladesh failed:', error);
    return [];
  }
}

// ============================================================================
// NEW BANGLADESH RSS FEEDS (Unlimited, No API Key)
// ============================================================================

async function tryDailyStarBDRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with UNB News as Daily Star RSS is currently unavailable
  const items = await fetchRSSFeed('https://unb.com.bd/feed', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'unb-news',
    sourceName: 'UNB News',
    fallbackImage: 'https://images.unsplash.com/photo-1586829135343-132950070391?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryBanglanews24RSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.banglanews24.com/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'banglanews24',
    sourceName: 'Banglanews24',
    fallbackImage: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryProthomAloEnRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://en.prothomalo.com/feed', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'prothomalo-en',
    sourceName: 'Prothom Alo',
    fallbackImage: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryDhakaTribuneRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Financial Express Bangladesh as Dhaka Tribune RSS is unavailable
  const items = await fetchRSSFeed('https://thefinancialexpress.com.bd/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'financial-express-bd',
    sourceName: 'Financial Express Bangladesh',
    fallbackImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryBDNews24RSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with New Age Bangladesh as bdnews24 RSS has parsing issues  
  const items = await fetchRSSFeed('https://www.newagebd.net/rss.php', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'newage-bd',
    sourceName: 'New Age Bangladesh',
    fallbackImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryBangladeshJournalRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://bd-journal.com/feed/latest-rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'bangladeshjournal',
    sourceName: 'Bangladesh Journal',
    fallbackImage: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryHindustanTimesBanglaRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://bangla.hindustantimes.com/rss/nation-and-world', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'hindustantimes-bangla',
    sourceName: 'Hindustan Times Bangla',
    fallbackImage: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsBangladeshRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/search?q=bangladesh&hl=en-BD&gl=BD&ceid=BD:en', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-bd',
    sourceName: 'Google News Bangladesh',
    fallbackImage: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsWorldRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-world',
    sourceName: 'Google News',
    fallbackImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// NEW HEALTH RSS FEEDS (Unlimited, No API Key)
// ============================================================================

async function tryWHONewsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.who.int/rss-feeds/news-english.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'who-news',
    sourceName: 'World Health Organization',
    fallbackImage: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryWHOOutbreaksRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.who.int/feeds/entity/csr/don/en/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'who-outbreaks',
    sourceName: 'WHO Disease Outbreaks',
    fallbackImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryCDCNewsroomRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://tools.cdc.gov/api/v2/resources/media/132608.rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cdc-newsroom',
    sourceName: 'CDC Newsroom',
    fallbackImage: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryCDCTravelersRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://wwwnc.cdc.gov/travel/notices.rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cdc-travelers',
    sourceName: 'CDC Travelers Health',
    fallbackImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryMedlinePlusRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://medlineplus.gov/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'medlineplus',
    sourceName: 'MedlinePlus',
    fallbackImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryScienceDailyHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.sciencedaily.com/rss/top/health.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'sciencedaily-health',
    sourceName: 'ScienceDaily Health',
    fallbackImage: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryKFFHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://kffhealthnews.org/topics/public-health/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'kff-health',
    sourceName: 'KFF Health News',
    fallbackImage: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// Bangladesh Health RSS Feeds
async function tryDailyStarHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with filtered UNB News for health content
  const items = await fetchRSSFeed('https://unb.com.bd/feed', Math.min(pageSize * 3, 50));
  const healthItems = items.filter((item: RSSItemNormalized) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return text.includes('health') || text.includes('medical') || text.includes('hospital') || 
           text.includes('doctor') || text.includes('disease') || text.includes('vaccine') ||
           text.includes('patient') || text.includes('medicine');
  });
  return buildRSSArticles(healthItems.slice(0, pageSize), {
    sourceId: 'unb-health',
    sourceName: 'UNB Health',
    fallbackImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryBDNews24HealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with filtered New Age Bangladesh for health content
  const items = await fetchRSSFeed('https://www.newagebd.net/rss.php', Math.min(pageSize * 3, 50));
  const healthItems = items.filter((item: RSSItemNormalized) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return text.includes('health') || text.includes('medical') || text.includes('hospital') || 
           text.includes('doctor') || text.includes('disease') || text.includes('vaccine') ||
           text.includes('patient') || text.includes('medicine');
  });
  return buildRSSArticles(healthItems.slice(0, pageSize), {
    sourceId: 'newage-health',
    sourceName: 'New Age Health',
    fallbackImage: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryBanglanews24HealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Banglanews24 has general RSS, we'll filter for health content
  const items = await fetchRSSFeed('https://www.banglanews24.com/rss.xml', Math.min(pageSize * 3, 50));
  const healthItems = items.filter((item: RSSItemNormalized) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return text.includes('health') || text.includes('medical') || text.includes('hospital') || 
           text.includes('doctor') || text.includes('disease') || text.includes('vaccine');
  });
  return buildRSSArticles(healthItems.slice(0, pageSize), {
    sourceId: 'banglanews24-health',
    sourceName: 'Banglanews24 Health',
    fallbackImage: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// TECHNOLOGY RSS FEEDS (Additional Sources)
// ============================================================================

async function tryArsTechnicaRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://feeds.arstechnica.com/arstechnica/index', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'ars-technica',
    sourceName: 'Ars Technica',
    fallbackImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryEngadgetRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.engadget.com/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'engadget',
    sourceName: 'Engadget',
    fallbackImage: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryCNETRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.cnet.com/rss/news/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cnet',
    sourceName: 'CNET',
    fallbackImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryZDNetRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.zdnet.com/news/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'zdnet',
    sourceName: 'ZDNet',
    fallbackImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryTechmemeRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.techmeme.com/feed.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'techmeme',
    sourceName: 'Techmeme',
    fallbackImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsTechRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/search?q=technology&hl=en-US&gl=US&ceid=US:en', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-tech',
    sourceName: 'Google News Tech',
    fallbackImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL TECHNOLOGY RSS FEEDS
// ============================================================================

async function tryMITTechReviewRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.technologyreview.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'mit-tech-review',
    sourceName: 'MIT Technology Review',
    fallbackImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryTechRadarRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.techradar.com/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'tech-radar',
    sourceName: 'TechRadar',
    fallbackImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryAndroidAuthorityRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.androidauthority.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'android-authority',
    sourceName: 'Android Authority',
    fallbackImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function try9to5MacRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://9to5mac.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: '9to5mac',
    sourceName: '9to5Mac',
    fallbackImage: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryMacRumorsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Using MacRumors all news feed
  const items = await fetchRSSFeed('https://feeds.macrumors.com/MacRumors-All', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'macrumors',
    sourceName: 'MacRumors',
    fallbackImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryXDADevelopersRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.xda-developers.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'xda-developers',
    sourceName: 'XDA Developers',
    fallbackImage: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL TECHNOLOGY RSS FEEDS (Apple-Focused Alternatives)
// ============================================================================

async function tryAppleInsiderRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://appleinsider.com/rss/news/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'appleinsider',
    sourceName: 'AppleInsider',
    fallbackImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryMacWorldRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.macworld.com/feed', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'macworld',
    sourceName: 'MacWorld',
    fallbackImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryMacObserverRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.macobserver.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'macobserver',
    sourceName: 'The Mac Observer',
    fallbackImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsTechTopicRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-tech-topic',
    sourceName: 'Google News Technology',
    fallbackImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// SPORTS RSS FEEDS (Additional Sources)
// ============================================================================

async function trySportsIllustratedRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with The Athletic via RSS Hub as SI RSS is currently unavailable
  const items = await fetchRSSFeed('https://rsshub.app/the-athletic/soccer', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'the-athletic-soccer',
    sourceName: 'The Athletic Soccer',
    fallbackImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryFoxSportsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://api.foxsports.com/v1/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'fox-sports',
    sourceName: 'Fox Sports',
    fallbackImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryNBARSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with ESPN NBA as NBA.com RSS has issues
  const items = await fetchRSSFeed('https://www.espn.com/espn/rss/nba/news', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'espn-nba',
    sourceName: 'ESPN NBA',
    fallbackImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryNFLRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Pro Football Talk as NFL RSS has issues
  const items = await fetchRSSFeed('https://profootballtalk.nbcsports.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'profootballtalk',
    sourceName: 'Pro Football Talk',
    fallbackImage: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryMLBRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.mlb.com/feeds/news/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'mlb-rss',
    sourceName: 'MLB News',
    fallbackImage: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsSportsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/search?q=sports&hl=en-US&gl=US&ceid=US:en', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-sports',
    sourceName: 'Google News Sports',
    fallbackImage: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL SPORTS RSS FEEDS
// ============================================================================

async function tryYahooSportsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://sports.yahoo.com/rss/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'yahoo-sports',
    sourceName: 'Yahoo Sports',
    fallbackImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryCBSSportsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.cbssports.com/rss/headlines/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cbssports',
    sourceName: 'CBS Sports',
    fallbackImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryNHLRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.nhl.com/rss/news.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'nhl-rss',
    sourceName: 'NHL News',
    fallbackImage: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryUEFARSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.uefa.com/rssfeed/news/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'uefa',
    sourceName: 'UEFA',
    fallbackImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryFIFANewsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.fifa.com/rss-feeds/news', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'fifa-news',
    sourceName: 'FIFA News',
    fallbackImage: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL SPORTS RSS FEEDS (Recommended Alternatives)
// ============================================================================

async function tryTheScoreRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.thescore.com/rss/news', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'thescore',
    sourceName: 'TheScore',
    fallbackImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function trySBNationRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.sbnation.com/rss/current', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'sbnation',
    sourceName: 'SB Nation',
    fallbackImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryNBAOfficialRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.nba.com/rss/nba_rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'nba-official',
    sourceName: 'NBA Official',
    fallbackImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryClutchPointsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://clutchpoints.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'clutchpoints',
    sourceName: 'ClutchPoints',
    fallbackImage: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryFanSidedRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://fansided.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'fansided',
    sourceName: 'FanSided',
    fallbackImage: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsSportsTopicRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp1ZEdvU0FtVnVHZ0pWVXlnQVAB', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-sports-topic',
    sourceName: 'Google News Sports',
    fallbackImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// BUSINESS RSS FEEDS (Additional Sources)
// ============================================================================

async function tryFinancialTimesRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.ft.com/?format=rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'financial-times',
    sourceName: 'Financial Times',
    fallbackImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryWSJRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://feeds.a.dj.com/rss/RSSWorldNews.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'wsj',
    sourceName: 'Wall Street Journal',
    fallbackImage: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryForbesRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.forbes.com/business/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'forbes',
    sourceName: 'Forbes',
    fallbackImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryBusinessInsiderRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.businessinsider.com/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'business-insider',
    sourceName: 'Business Insider',
    fallbackImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function trySeekingAlphaRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://seekingalpha.com/feed.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'seeking-alpha',
    sourceName: 'Seeking Alpha',
    fallbackImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsBusinessRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/search?q=business&hl=en-US&gl=US&ceid=US:en', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-business',
    sourceName: 'Google News Business',
    fallbackImage: 'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL BUSINESS RSS FEEDS
// ============================================================================

async function tryEconomistRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.economist.com/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'economist',
    sourceName: 'The Economist',
    fallbackImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryFortuneRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://fortune.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'fortune',
    sourceName: 'Fortune',
    fallbackImage: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryFastCompanyRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.fastcompany.com/latest/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'fast-company',
    sourceName: 'Fast Company',
    fallbackImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryIncRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.inc.com/rss/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'inc',
    sourceName: 'Inc.',
    fallbackImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryEntrepreneurRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.entrepreneur.com/latest.rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'entrepreneur',
    sourceName: 'Entrepreneur',
    fallbackImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL BUSINESS RSS FEEDS (Recommended Alternatives)
// ============================================================================

async function tryBarronsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.barrons.com/feed/rss/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'barrons',
    sourceName: "Barron's",
    fallbackImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryInvestorsBusinessDailyRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.investors.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'investors-business-daily',
    sourceName: "Investor's Business Daily",
    fallbackImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsBusinessTopicRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-business-topic',
    sourceName: 'Google News Business',
    fallbackImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ENTERTAINMENT RSS FEEDS (Additional Sources)
// ============================================================================

async function tryDeadlineRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://deadline.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'deadline',
    sourceName: 'Deadline',
    fallbackImage: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryRollingStoneRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.rollingstone.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'rolling-stone',
    sourceName: 'Rolling Stone',
    fallbackImage: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryBillboardRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.billboard.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'billboard',
    sourceName: 'Billboard',
    fallbackImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryIGNRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://feeds.ign.com/ign/all', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'ign',
    sourceName: 'IGN',
    fallbackImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGameSpotRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.gamespot.com/feeds/mashup/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'gamespot',
    sourceName: 'GameSpot',
    fallbackImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryPolygonRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.polygon.com/rss/index.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'polygon',
    sourceName: 'Polygon',
    fallbackImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsEntertainmentRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/search?q=entertainment&hl=en-US&gl=US&ceid=US:en', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-entertainment',
    sourceName: 'Google News Entertainment',
    fallbackImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL ENTERTAINMENT RSS FEEDS
// ============================================================================

async function tryVultureRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.vulture.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'vulture',
    sourceName: 'Vulture',
    fallbackImage: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryColliderRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://collider.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'collider',
    sourceName: 'Collider',
    fallbackImage: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryScreenRantRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://screenrant.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'screen-rant',
    sourceName: 'Screen Rant',
    fallbackImage: 'https://images.unsplash.com/photo-1574267432644-f610f1f6e6b1?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryCinemaBlendRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.cinemablend.com/rss_all.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'cinemablend',
    sourceName: 'CinemaBlend',
    fallbackImage: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryPitchforkRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://pitchfork.com/rss/news/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'pitchfork',
    sourceName: 'Pitchfork',
    fallbackImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryConsequenceRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://consequence.net/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'consequence',
    sourceName: 'Consequence',
    fallbackImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryAVClubRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.avclub.com/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'av-club',
    sourceName: 'The A.V. Club',
    fallbackImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryEurogamerRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.eurogamer.net/?format=rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'eurogamer',
    sourceName: 'Eurogamer',
    fallbackImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryKotakuRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://kotaku.com/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'kotaku',
    sourceName: 'Kotaku',
    fallbackImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryPCGamerRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.pcgamer.com/rss/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'pcgamer',
    sourceName: 'PC Gamer',
    fallbackImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryComicbookRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Den of Geek as ComicBook RSS is currently unavailable
  const items = await fetchRSSFeed('https://www.denofgeek.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'denofgeek',
    sourceName: 'Den of Geek',
    fallbackImage: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryIndieWireRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.indiewire.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'indiewire',
    sourceName: 'IndieWire',
    fallbackImage: 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL ENTERTAINMENT RSS FEEDS (Recommended Alternatives)
// ============================================================================

async function tryRottenTomatoesEditorialRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://editorial.rottentomatoes.com/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'rottentomatoes-editorial',
    sourceName: 'Rotten Tomatoes Editorial',
    fallbackImage: 'https://images.unsplash.com/photo-1574267432644-f5810a9ae4e4?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryConsequenceNetRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://consequence.net/feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'consequence-net',
    sourceName: 'Consequence',
    fallbackImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryComicBookCorrectRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://comicbook.com/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'comicbook-correct',
    sourceName: 'ComicBook.com',
    fallbackImage: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryAnimeNewsNetworkRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.animenewsnetwork.com/all/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'anime-news-network',
    sourceName: 'Anime News Network',
    fallbackImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryMetacriticAllRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.metacritic.com/rss/all', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'metacritic-all',
    sourceName: 'Metacritic',
    fallbackImage: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsEntertainmentTopicRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNREpxYW5RU0FtVnVHZ0pWVXlnQVAB', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-entertainment-topic',
    sourceName: 'Google News Entertainment',
    fallbackImage: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL HEALTH RSS FEEDS
// ============================================================================

async function tryHarvardHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Medical Xpress as Harvard Health RSS has parsing issues
  const items = await fetchRSSFeed('https://medicalxpress.com/rss-feed/', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'medicalxpress',
    sourceName: 'Medical Xpress',
    fallbackImage: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryJohnsHopkinsHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Johns Hopkins Bloomberg School of Public Health
  const items = await fetchRSSFeed('https://publichealth.jhu.edu/rss/all-news-releases-combined.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'johns-hopkins-health',
    sourceName: 'Johns Hopkins Public Health',
    fallbackImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryClevelandClinicRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Medscape Medical News as Cleveland Clinic RSS is unavailable
  const items = await fetchRSSFeed('https://www.medscape.com/rss/medicalnews', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'medscape-news',
    sourceName: 'Medscape Medical News',
    fallbackImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryMedscapeRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.medscape.com/rss/medscapewire', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'medscape',
    sourceName: 'Medscape',
    fallbackImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryMedicalNewsTodayRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with MedicineNet as Medical News Today RSS is currently unavailable
  const items = await fetchRSSFeed('https://www.medicinenet.com/rss/dailyhealth.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'medicinenet',
    sourceName: 'MedicineNet',
    fallbackImage: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryHealthNewsReviewRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Replaced with Everyday Health as Health News Review is defunct
  const items = await fetchRSSFeed('https://www.everydayhealth.com/rss/health-news.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'everyday-health',
    sourceName: 'Everyday Health',
    fallbackImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryReutersHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  // Using alternate Reuters health feed
  const items = await fetchRSSFeed('https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'reuters-health',
    sourceName: 'Reuters Health',
    fallbackImage: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryNPRHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://feeds.npr.org/1128/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'npr-health',
    sourceName: 'NPR Health',
    fallbackImage: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryBBCHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('http://feeds.bbci.co.uk/news/health/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'bbc-health',
    sourceName: 'BBC Health',
    fallbackImage: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryLancetHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.thelancet.com/rssfeed/lancet_current.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'lancet-health',
    sourceName: 'The Lancet',
    fallbackImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL HEALTH RSS FEEDS (Recommended Alternatives)
// ============================================================================

async function tryMedPageTodayRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.medpagetoday.com/rss/breaking-news.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'medpage-today',
    sourceName: 'MedPage Today',
    fallbackImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryHealthDayFullRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://consumer.healthday.com/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'healthday-full',
    sourceName: 'HealthDay',
    fallbackImage: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryPubMedCentralRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.ncbi.nlm.nih.gov/pmc/utils/rss/current/PMC.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'pubmed-central',
    sourceName: 'PubMed Central',
    fallbackImage: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryEverydayHealthAllRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.everydayhealth.com/rss/all.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'everyday-health-all',
    sourceName: 'Everyday Health',
    fallbackImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryVerywellHealthMainRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.verywellhealth.com/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'verywell-health-main',
    sourceName: 'Verywell Health',
    fallbackImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryGoogleNewsHealthRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNR3QwTlRFU0FtVnVHZ0pWVXlnQVAB', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'google-news-health',
    sourceName: 'Google News Health',
    fallbackImage: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// WORLD NEWS RSS FEEDS (Additional Sources)
// ============================================================================

async function tryAPNewsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://rsshub.app/apnews/topics/apf-topnews', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'ap-news',
    sourceName: 'Associated Press',
    fallbackImage: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryPBSNewsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.pbs.org/newshour/feeds/rss/headlines', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'pbs-news',
    sourceName: 'PBS NewsHour',
    fallbackImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryABCNewsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://abcnews.go.com/abcnews/topstories', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'abc-news',
    sourceName: 'ABC News',
    fallbackImage: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// ============================================================================
// ADDITIONAL WORLD NEWS RSS FEEDS
// ============================================================================

async function tryEuronewsRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.euronews.com/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'euronews',
    sourceName: 'Euronews',
    fallbackImage: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryNYTWorldRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://rss.nytimes.com/services/xml/rss/nyt/World.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'nyt-world',
    sourceName: 'New York Times World',
    fallbackImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryWaPoWorldRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://feeds.washingtonpost.com/rss/world', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'wapo-world',
    sourceName: 'Washington Post World',
    fallbackImage: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryIndependentRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.independent.co.uk/rss', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'independent',
    sourceName: 'The Independent',
    fallbackImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

async function tryTelegraphRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  const items = await fetchRSSFeed('https://www.telegraph.co.uk/rss.xml', pageSize);
  return buildRSSArticles(items, {
    sourceId: 'telegraph',
    sourceName: 'The Telegraph',
    fallbackImage: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop',
  }).slice(0, pageSize);
}

// OLD sequential fallback code removed - replaced with optimized routing above

/**
 * Comprehensive fallback data when all APIs fail
 * Organized by category with rich, realistic content
 */
function getFallbackNews(category: CategoryType, pageSize: number = 20): NewsAPIArticle[] {
  const fallbackDatabase: Record<CategoryType, NewsAPIArticle[]> = {
    all: [
      {
        source: { id: "reuters", name: "Reuters" },
        author: "Sarah Johnson",
        title: "Global Summit Addresses Climate Change Initiatives",
        description: "World leaders convene to discuss unprecedented climate action plans and sustainable development goals for the next decade.",
        url: "https://example.com/climate",
        urlToImage: "https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        content: "World leaders gathered today to address pressing climate concerns and outline actionable strategies for reducing global carbon emissions.",
      },
      {
        source: { id: "bbc", name: "BBC News" },
        author: "James Wilson",
        title: "International Trade Agreements Reshape Global Economy",
        description: "New trade partnerships emerge as nations seek to strengthen economic ties and promote sustainable growth.",
        url: "https://example.com/trade",
        urlToImage: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        content: "Major economies announced new trade frameworks aimed at fostering international cooperation and economic stability.",
      },
      {
        source: { id: "cnn", name: "CNN" },
        author: "Maria Garcia",
        title: "Space Exploration Enters New Era with Private Missions",
        description: "Commercial spaceflight companies announce ambitious plans for lunar and Mars exploration programs.",
        url: "https://example.com/space",
        urlToImage: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        content: "The space industry witnesses unprecedented growth as private companies unveil revolutionary spacecraft and mission plans.",
      },
      {
        source: { id: "aljazeera", name: "Al Jazeera" },
        author: "Ahmed Hassan",
        title: "Renewable Energy Projects Transform Developing Nations",
        description: "Sustainable power initiatives bring electricity and economic opportunities to underserved communities.",
        url: "https://example.com/renewable",
        urlToImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        content: "Clean energy projects provide sustainable solutions for communities in developing regions, improving quality of life.",
      },
      {
        source: { id: "guardian", name: "The Guardian" },
        author: "Sophie Dubois",
        title: "Historic Peace Talks Bring Hope to Conflict Zones",
        description: "Diplomatic efforts yield promising results as warring factions agree to ceasefire negotiations.",
        url: "https://example.com/peace",
        urlToImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        content: "International mediators successfully brought together representatives from conflicting parties for groundbreaking peace discussions.",
      },
      {
        source: { id: "nyt", name: "New York Times" },
        author: "David Park",
        title: "Education Reform Initiatives Transform Learning Worldwide",
        description: "Innovative teaching methods and technology integration revolutionize classrooms across the globe.",
        url: "https://example.com/education",
        urlToImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
        content: "Educational institutions embrace new pedagogical approaches combining digital tools with personalized learning strategies.",
      },
    ],
    bangladesh: [
      {
        source: { id: "bd-daily", name: "Dhaka Daily" },
        author: "Farhana Rahman",
        title: "Metro Rail Expansion Eases Dhaka Commute",
        description: "New metro rail stations open across Dhaka, reducing travel time for thousands of daily commuters.",
        url: "https://example.com/bd-metro",
        urlToImage: "https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        content: "Bangladesh inaugurated several metro rail stations, marking a major milestone in the country's transportation infrastructure.",
      },
      {
        source: { id: "bd-finance", name: "Bangladesh Business" },
        author: "Imran Chowdhury",
        title: "Startup Ecosystem Thrives in Dhaka Tech Hubs",
        description: "Bangladesh's startup community sees record investment as new innovation hubs open across the capital.",
        url: "https://example.com/bd-startups",
        urlToImage: "https://images.unsplash.com/photo-1474631245212-32dc3c8310c6?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        content: "Investors are backing Bangladeshi startups focused on fintech, agritech, and clean energy solutions at unprecedented levels.",
      },
      {
        source: { id: "bd-health", name: "Health Bangladesh" },
        author: "Dr. Nusrat Alam",
        title: "Community Clinics Expand Healthcare Access",
        description: "Government-led health initiatives bring modern medical facilities to rural districts across Bangladesh.",
        url: "https://example.com/bd-health",
        urlToImage: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "Newly established community clinics are offering affordable primary care and telemedicine services in remote regions.",
      },
      {
        source: { id: "bd-sports", name: "Bangla Sports" },
        author: "Rafiq Hasan",
        title: "Bangladesh Cricket Team Clinches Historic Series",
        description: "The Tigers secure a landmark victory in a home series, igniting celebrations nationwide.",
        url: "https://example.com/bd-cricket",
        urlToImage: "https://images.unsplash.com/photo-1516455207990-7a41ce80f7ee?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Bangladesh's national cricket team delivered a dominant performance, reinforcing its rise on the international stage.",
      },
    ],
    technology: [
      {
        source: { id: "techcrunch", name: "TechCrunch" },
        author: "Alex Rivera",
        title: "Revolutionary AI System Transforms Industry Standards",
        description: "Breakthrough artificial intelligence technology demonstrates unprecedented capabilities in solving complex problems.",
        url: "https://example.com/ai-breakthrough",
        urlToImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        content: "Scientists unveiled a groundbreaking AI system that surpasses previous benchmarks in machine learning and neural network efficiency.",
      },
      {
        source: { id: "wired", name: "Wired" },
        author: "Emma Thompson",
        title: "Quantum Computing Reaches New Milestone",
        description: "Researchers achieve quantum supremacy breakthrough, opening doors to revolutionary computing applications.",
        url: "https://example.com/quantum",
        urlToImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        content: "A team of quantum physicists successfully demonstrated a 1000-qubit quantum computer capable of solving previously impossible calculations.",
      },
      {
        source: { id: "verge", name: "The Verge" },
        author: "Sam Martinez",
        title: "Next-Gen Smartphones Feature Holographic Displays",
        description: "Major tech companies unveil revolutionary devices with 3D holographic projection capabilities.",
        url: "https://example.com/holographic",
        urlToImage: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "The smartphone industry takes a giant leap forward with holographic display technology becoming commercially available.",
      },
      {
        source: { id: "cnet", name: "CNET" },
        author: "Rachel Kim",
        title: "Cybersecurity Advances Combat Rising Threat Landscape",
        description: "New AI-powered security systems detect and prevent cyber attacks with unprecedented accuracy.",
        url: "https://example.com/cybersecurity",
        urlToImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Advanced machine learning algorithms now provide real-time threat detection and automated response to cyber attacks.",
      },
      {
        source: { id: "ars", name: "Ars Technica" },
        author: "Lisa Wong",
        title: "Breakthrough in Battery Technology Promises Week-Long Charge",
        description: "Scientists develop revolutionary solid-state batteries with 10x capacity of current lithium-ion technology.",
        url: "https://example.com/battery",
        urlToImage: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        content: "New battery technology could revolutionize electric vehicles and consumer electronics with unprecedented energy density.",
      },
    ],
    business: [
      {
        source: { id: "bloomberg", name: "Bloomberg" },
        author: "Michael Chen",
        title: "Stock Markets Hit Record Highs Amid Economic Recovery",
        description: "Global financial markets experience unprecedented growth as economic indicators show strong recovery signals.",
        url: "https://example.com/markets",
        urlToImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        content: "Major stock indices reached all-time highs today as investors responded positively to strong corporate earnings and economic data.",
      },
      {
        source: { id: "wsj", name: "Wall Street Journal" },
        author: "Jennifer Martinez",
        title: "Startups Raise Billions in Record Funding Round",
        description: "Venture capital investments surge as innovative companies attract unprecedented investor interest.",
        url: "https://example.com/funding",
        urlToImage: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        content: "Tech startups secured over $50 billion in funding this quarter, marking the highest investment period in history.",
      },
      {
        source: { id: "forbes", name: "Forbes" },
        author: "Thomas Anderson",
        title: "Cryptocurrency Market Stabilizes After Regulatory Clarity",
        description: "Digital assets gain mainstream acceptance as governments establish clear regulatory frameworks.",
        url: "https://example.com/crypto",
        urlToImage: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        content: "Major economies announce comprehensive cryptocurrency regulations, providing much-needed clarity for investors and businesses.",
      },
      {
        source: { id: "ft", name: "Financial Times" },
        author: "Sophie Turner",
        title: "Green Bonds Surge as ESG Investing Dominates Markets",
        description: "Environmental, social, and governance investments reach record levels as companies prioritize sustainability.",
        url: "https://example.com/esg",
        urlToImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        content: "Sustainable investing becomes mainstream as trillions of dollars flow into ESG-focused funds and green bonds.",
      },
    ],
    health: [
      {
        source: { id: "healthline", name: "Health Tribune" },
        author: "Dr. Emily Roberts",
        title: "Breakthrough Treatment Shows Promise for Chronic Diseases",
        description: "Medical researchers unveil innovative therapy that could revolutionize treatment for millions of patients worldwide.",
        url: "https://example.com/medical",
        urlToImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        content: "A groundbreaking medical treatment demonstrated remarkable efficacy in clinical trials, offering new hope for chronic disease patients.",
      },
      {
        source: { id: "medicalnews", name: "Medical News Today" },
        author: "Dr. Robert Kim",
        title: "Revolutionary Gene Therapy Advances Healthcare",
        description: "Scientists achieve major breakthrough in genetic medicine with successful human trials.",
        url: "https://example.com/gene-therapy",
        urlToImage: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "Gene therapy trials show unprecedented success rates, potentially curing previously untreatable genetic disorders.",
      },
      {
        source: { id: "healthnews", name: "Health News" },
        author: "Dr. Amanda Foster",
        title: "Mental Health Apps Show Remarkable Effectiveness",
        description: "Digital therapy platforms demonstrate significant positive impact on mental wellness outcomes.",
        url: "https://example.com/mental-health",
        urlToImage: "https://images.unsplash.com/photo-1576765607924-3f7b8410a787?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Studies show that AI-powered mental health applications provide accessible and effective support for millions of users worldwide.",
      },
      {
        source: { id: "wellness", name: "Wellness Today" },
        author: "Dr. Jessica Wong",
        title: "Immunotherapy Breakthroughs Transform Cancer Treatment",
        description: "Novel approaches harness immune system to fight cancer with unprecedented success rates.",
        url: "https://example.com/immunotherapy",
        urlToImage: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        content: "Revolutionary immunotherapy treatments achieve remarkable results in previously untreatable cancers, offering new hope to patients.",
      },
    ],
    sports: [
      {
        source: { id: "espn", name: "ESPN" },
        author: "David Martinez",
        title: "Championship Finals Break Viewership Records",
        description: "Historic sporting event captivates global audience with thrilling competition and outstanding performances.",
        url: "https://example.com/championship",
        urlToImage: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        content: "The championship finals shattered viewing records as millions tuned in to watch the most anticipated matchup of the season.",
      },
      {
        source: { id: "sports", name: "Sports Illustrated" },
        author: "Lisa Anderson",
        title: "Athletes Set New World Records at International Games",
        description: "Outstanding performances mark historic competition as multiple world records fall.",
        url: "https://example.com/records",
        urlToImage: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        content: "Athletes from around the world achieved remarkable feats, breaking long-standing records in multiple disciplines.",
      },
      {
        source: { id: "athletic", name: "The Athletic" },
        author: "Marcus Johnson",
        title: "Olympic Preparations Reach Final Stages",
        description: "Host city completes state-of-the-art facilities as world's best athletes prepare for competition.",
        url: "https://example.com/olympics",
        urlToImage: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        content: "Anticipation builds as the Olympic Games approach, with athletes and facilities ready for the world's premier sporting event.",
      },
      {
        source: { id: "bleacher", name: "Bleacher Report" },
        author: "Tony Williams",
        title: "Underdog Team Stuns Favorites in Historic Upset",
        description: "Long-shot contenders defy odds with spectacular performance against championship favorites.",
        url: "https://example.com/upset",
        urlToImage: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        content: "In one of the greatest upsets in sports history, the underdog team delivered a stunning victory that shocked the world.",
      },
    ],
    entertainment: [
      {
        source: { id: "variety", name: "Variety" },
        author: "Rachel Green",
        title: "Blockbuster Film Breaks Box Office Records Worldwide",
        description: "Latest cinematic release achieves unprecedented success, captivating audiences across all markets.",
        url: "https://example.com/blockbuster",
        urlToImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        content: "The highly anticipated film exceeded all expectations, earning record-breaking revenues in its opening weekend globally.",
      },
      {
        source: { id: "hollywood", name: "Hollywood Reporter" },
        author: "Tom Stevens",
        title: "Streaming Platform Announces Major Content Expansion",
        description: "Leading entertainment service unveils ambitious plans for original programming and global reach.",
        url: "https://example.com/streaming",
        urlToImage: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Major streaming platform announced investment of billions in original content, targeting international markets with diverse programming.",
      },
      {
        source: { id: "entertainment", name: "Entertainment Weekly" },
        author: "Nina Patel",
        title: "Music Festival Sets Attendance Records with Global Lineup",
        description: "Legendary artists and emerging stars unite for unprecedented musical celebration.",
        url: "https://example.com/music-festival",
        urlToImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
        content: "The festival drew record crowds as music fans from around the world gathered for an unforgettable weekend of performances.",
      },
      {
        source: { id: "billboard", name: "Billboard" },
        author: "Jordan Hayes",
        title: "Chart-Topping Album Breaks Streaming Records",
        description: "New release dominates music charts worldwide, setting new standards for digital consumption.",
        url: "https://example.com/album",
        urlToImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        content: "The album shattered streaming records within hours of release, marking a historic moment in music industry history.",
      },
    ],
    world: [
      {
        source: { id: "ap", name: "Associated Press" },
        author: "Maria Garcia",
        title: "International Cooperation Strengthens Global Relations",
        description: "Nations collaborate on crucial initiatives addressing worldwide challenges and promoting peace.",
        url: "https://example.com/cooperation",
        urlToImage: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "World leaders demonstrated unprecedented unity in addressing global challenges through coordinated diplomatic efforts.",
      },
      {
        source: { id: "guardian", name: "The Guardian" },
        author: "John Parker",
        title: "Humanitarian Efforts Bring Relief to Crisis Regions",
        description: "International aid organizations mobilize resources to support communities affected by natural disasters.",
        url: "https://example.com/humanitarian",
        urlToImage: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        content: "Global relief efforts provide critical assistance to regions affected by natural disasters and humanitarian crises.",
      },
      {
        source: { id: "bbc", name: "BBC World" },
        author: "Elena Volkov",
        title: "Historic Cultural Exchange Programs Unite Nations",
        description: "Countries launch ambitious initiatives to promote mutual understanding and cultural appreciation.",
        url: "https://example.com/cultural",
        urlToImage: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        content: "Innovative cultural exchange programs foster international friendship and understanding across diverse societies.",
      },
      {
        source: { id: "ap", name: "Associated Press" },
        author: "Carlos Silva",
        title: "Global Education Initiative Reaches Millions of Students",
        description: "International partnership provides free quality education to underserved populations worldwide.",
        url: "https://example.com/global-education",
        urlToImage: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        content: "Groundbreaking education programs leverage technology to deliver world-class learning opportunities to remote areas.",
      },
    ],
    trending: [
      {
        source: { id: "trending", name: "Trending Now" },
        author: "Social Media Team",
        title: "Viral Story Captures Hearts Around the World",
        description: "Heartwarming story spreads rapidly across social media platforms, inspiring millions globally.",
        url: "https://example.com/viral",
        urlToImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        content: "A touching story of human kindness went viral, reaching over 100 million people worldwide within hours.",
      },
      {
        source: { id: "buzzfeed", name: "BuzzFeed News" },
        author: "Viral Content Team",
        title: "Unexpected Collaboration Surprises and Delights Fans",
        description: "Unlikely partnership between celebrities creates internet sensation and trending phenomenon.",
        url: "https://example.com/collab",
        urlToImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        content: "Fans celebrate unexpected collaboration that brings together talents from different fields in creative new project.",
      },
      {
        source: { id: "mashable", name: "Mashable" },
        author: "Trends Reporter",
        title: "Social Media Challenge Unites Internet in Positive Movement",
        description: "Wholesome online challenge inspires millions to participate in acts of kindness worldwide.",
        url: "https://example.com/challenge",
        urlToImage: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "Uplifting social media challenge spreads positivity globally as millions share their participation and inspire others.",
      },
      {
        source: { id: "reddit", name: "Reddit Today" },
        author: "Community Highlights",
        title: "Internet Phenomenon Breaks All-Time Engagement Records",
        description: "Unprecedented online event captures attention of billions, setting new social media milestones.",
        url: "https://example.com/phenomenon",
        urlToImage: "https://images.unsplash.com/photo-1551292831-023188e78222?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Global online event generated record-breaking engagement across all major social media platforms simultaneously.",
      },
    ],
  };

  const categoryArticles = fallbackDatabase[category] || fallbackDatabase.all;
  
  // Create unique articles without excessive duplication
  const result: NewsAPIArticle[] = [];
  const articlesCount = categoryArticles.length;
  
  for (let i = 0; i < Math.min(pageSize, articlesCount * 10); i++) {
    const sourceArticle = categoryArticles[i % articlesCount];
    result.push({
      ...sourceArticle,
      // Make URL unique for each instance
      url: i < articlesCount ? sourceArticle.url : `${sourceArticle.url}?id=${i}`,
      // Vary timestamps
      publishedAt: new Date(Date.now() - (2 + i) * 60 * 60 * 1000).toISOString(),
    });
  }

  console.log(`🆘 Returning ${result.length} fallback articles for category: ${category} (from ${articlesCount} templates)`);
  return result.slice(0, pageSize);
}

/**
 * Calculate estimated reading time
 * @param content - Article content
 * @returns Reading time string
 */
export function calculateReadTime(content: string | null): string {
  if (!content) return "3 min read";

  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);

  return `${minutes} min read`;
}

/**
 * Calculate time ago from publish date
 * @param publishedAt - ISO date string
 * @returns Human-readable time ago
 */
export function getTimeAgo(publishedAt: string): string {
  try {
    const now = new Date();
    const published = new Date(publishedAt);
    
    // Validate date
    if (isNaN(published.getTime())) {
      return "Just now";
    }
    
    const diffInMs = now.getTime() - published.getTime();
    
    // Handle future dates or negative values (timezone issues, API errors)
    if (diffInMs < 0) {
      return "Just now";
    }
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    // Less than 1 minute
    if (diffInMinutes < 1) {
      return "Just now";
    }
    
    // Less than 1 hour (show minutes)
    if (diffInHours < 1) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    }
    
    // Less than 24 hours (show hours)
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    }
    
    // Less than 7 days (show days)
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
    }
    
    // Less than 30 days (show weeks)
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
    }
    
    // More than 30 days (show months)
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
    
  } catch (error) {
    console.error("Error calculating time ago:", error);
    return "Just now";
  }
}

/**
 * Generate random view count for demonstration
 */
export function generateViewCount(): string {
  const count = Math.floor(Math.random() * 200) + 10;
  return `${count}K`;
}

// Initialize fallback data in persistent cache on module load
// This ensures we always have data available immediately
(() => {
  const categories: CategoryType[] = ["all", "technology", "business", "sports", "health", "entertainment", "world", "trending"];
  
  categories.forEach(category => {
    const cacheKey = `news_${category}_20`;
    try {
      const fallbackData = getFallbackNews(category, 20);
      persistentFallback.set(cacheKey, fallbackData);
    } catch (e) {
      console.warn(`Failed to initialize fallback for ${category}`);
    }
  });
  
  console.log('🚀 Persistent fallback data initialized for all categories');
})();
