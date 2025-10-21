// Quick test to check if env variables are loaded
console.log('Testing environment variables:');
console.log('VITE_GROQ_API_KEY:', import.meta.env.VITE_GROQ_API_KEY ? 'SET ✓' : 'NOT SET ✗');
console.log('VITE_NEWS_API_KEY:', import.meta.env.VITE_NEWS_API_KEY ? 'SET ✓' : 'NOT SET ✗');
console.log('Full VITE_GROQ_API_KEY:', import.meta.env.VITE_GROQ_API_KEY);
console.log('Full VITE_NEWS_API_KEY:', import.meta.env.VITE_NEWS_API_KEY);
