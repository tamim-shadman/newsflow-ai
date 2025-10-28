/**
 * Clear News Cache Script
 * 
 * Run this in the browser console to clear all cached news data
 * and force a fresh fetch of articles.
 * 
 * Usage:
 * 1. Open http://localhost:5173
 * 2. Press F12 (DevTools)
 * 3. Copy-paste this entire file into console
 * 4. Press Enter
 * 5. Refresh the page
 */

console.log('🧹 Clearing news cache...\n');

// Clear localStorage
const beforeLocalStorage = localStorage.length;
const localStorageKeys = Object.keys(localStorage);
localStorageKeys.forEach(key => {
  if (key.includes('news') || key.includes('article') || key.includes('cache')) {
    localStorage.removeItem(key);
    console.log(`   ✓ Removed: ${key}`);
  }
});

// Clear sessionStorage
const beforeSessionStorage = sessionStorage.length;
const sessionStorageKeys = Object.keys(sessionStorage);
sessionStorageKeys.forEach(key => {
  if (key.includes('news') || key.includes('article') || key.includes('cache')) {
    sessionStorage.removeItem(key);
    console.log(`   ✓ Removed: ${key}`);
  }
});

// Clear all caches (service worker caches)
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
      console.log(`   ✓ Cleared cache: ${cacheName}`);
    });
  });
}

console.log('\n✅ Cache cleared successfully!');
console.log(`   LocalStorage: ${beforeLocalStorage} → ${localStorage.length} items`);
console.log(`   SessionStorage: ${beforeSessionStorage} → ${sessionStorage.length} items`);
console.log('\n🔄 Refreshing page to fetch fresh articles...\n');

// Reload the page after a short delay
setTimeout(() => {
  window.location.reload(true);
}, 1000);
