# NewsFlow AI - AI-Powered News Aggregation App

An advanced news aggregation application that fetches real-time news from NewsAPI and enhances articles using AI (Groq's Llama model) for better readability and presentation.

## 🌟 Features

- **Real-time News**: Fetches latest news from the last 24 hours across 8 categories
- **AI Enhancement**: Uses Groq's free LLM API to beautify and summarize news articles
- **Categories**: All News, Trending, Business, Technology, Health, Sports, Entertainment, World
- **Search**: Real-time search across all news articles
- **Beautiful UI**: Modern, animated interface with glassmorphism effects
- **Responsive**: Works perfectly on desktop, tablet, and mobile
- **Free APIs**: Uses completely free tier APIs (NewsAPI + Groq)

## 🚀 Quick Start

### 1. Get API Keys (Both are FREE!)

#### NewsAPI

1. Go to [https://newsapi.org/](https://newsapi.org/)
2. Click "Get API Key"
3. Sign up for the **Developer Plan** (FREE - 100 requests/day)
4. Copy your API key

#### Groq API (Free LLM)

1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up for free account
3. Go to API Keys section
4. Create new API key
5. Copy your API key

### 2. Configure Environment Variables

Open the `.env` file in the root directory and add your API keys:

```env
VITE_NEWS_API_KEY=your_newsapi_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/               # Shadcn UI components
│   ├── NewsSkeletons.tsx # Loading state components
│   └── ErrorState.tsx    # Error handling components
├── services/
│   ├── newsApi.ts        # NewsAPI integration
│   └── llmService.ts     # Groq AI integration
├── types/
│   └── news.ts           # TypeScript interfaces
└── pages/
    └── Index.tsx         # Main news feed page
```

## 🔧 How It Works

### News Fetching

1. **NewsAPI Integration**: Fetches real-time news from multiple categories
2. **24-Hour Filter**: Only shows news from the last 24 hours
3. **Category Filtering**: Filter by specific categories or view all
4. **Search**: Search across all articles in real-time

### AI Enhancement

1. **Groq AI (Llama 3.3 70B)**: Free, fast LLM service
2. **Title Enhancement**: Makes titles more engaging and clickable
3. **Excerpt Beautification**: Creates compelling 2-sentence summaries
4. **Summary Generation**: Detailed 3-4 sentence article summaries
5. **Key Points Extraction**: Bullet points of main takeaways

### Features

- **Auto-refresh**: News updates every 10 minutes
- **Caching**: 5-minute cache to reduce API calls
- **Fallback Data**: Shows example data if APIs are not configured
- **Error Handling**: Graceful error states with retry options
- **Loading States**: Beautiful skeleton loaders while fetching

## 📊 API Limits & Best Practices

### NewsAPI (Free Tier)

- **Requests**: 100 per day
- **Rate Limit**: None specified
- **Features**: Top headlines, search, categories

### Groq API (Free Tier)

- **Requests**: 14,400 per day
- **Tokens**: 5,000 per minute
- **Models**: Llama 3.3 70B (very fast)

### Optimization Strategies

1. **Caching**: 5-10 minute cache reduces API calls
2. **Batch Processing**: LLM enhances only first 5 articles
3. **Fallback**: Displays original content if LLM fails
4. **Sequential Processing**: Avoids rate limiting

## 🎨 Customization

### Add More Categories

Edit `src/pages/Index.tsx`:

```typescript
const categories = [
  { id: "science" as CategoryType, name: "Science", icon: Beaker },
  // Add more categories...
];
```

### Modify AI Prompts

Edit `src/services/llmService.ts` to customize how articles are enhanced:

```typescript
const prompt = `Your custom prompt here...`;
```

### Change Refresh Intervals

In `src/pages/Index.tsx`:

```typescript
staleTime: 5 * 60 * 1000,        // Cache duration
refetchInterval: 10 * 60 * 1000,  // Auto-refresh interval
```

## 🛠️ Technologies Used

- **React** 18.3.1 - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching & caching
- **Axios** - HTTP client
- **Shadcn/UI** - Component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **NewsAPI** - News data source
- **Groq AI** - LLM for content enhancement

## 📝 Environment Variables

```env
# Required
VITE_NEWS_API_KEY=your_newsapi_key

# Required for AI enhancement
VITE_GROQ_API_KEY=your_groq_key

# Optional: Alternative LLM (OpenRouter)
# VITE_OPENROUTER_API_KEY=your_openrouter_key
```

## 🐛 Troubleshooting

### No News Showing?

1. Check your NewsAPI key is correct in `.env`
2. Check browser console for errors
3. Verify you haven't exceeded daily limit (100 requests/day)

### AI Enhancement Not Working?

1. Check Groq API key in `.env`
2. Articles will show original content if LLM fails
3. Check browser console for API errors

### Build Issues?

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📦 New Dependencies Added

```json
{
  "axios": "^1.7.9"
}
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Deploy to Vercel/Netlify

1. Push code to GitHub
2. Import repository
3. Add environment variables in dashboard
4. Deploy!

## 📄 License

MIT License - Feel free to use for personal or commercial projects!

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 💡 Future Enhancements

- [ ] Bookmark articles
- [ ] Share articles on social media
- [ ] User preferences/settings
- [ ] Dark/Light mode toggle
- [ ] Email newsletter subscription
- [ ] Article reading history
- [ ] Advanced filters
- [ ] Multiple language support

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section
2. Review API documentation:
   - [NewsAPI Docs](https://newsapi.org/docs)
   - [Groq API Docs](https://console.groq.com/docs)
3. Open an issue on GitHub

---

**Built with ❤️ using React, TypeScript, and AI**
