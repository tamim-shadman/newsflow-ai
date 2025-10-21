# NewsFlow AI 🚀

An AI-powered news aggregation platform that delivers beautifully enhanced news from around the world.

![Deployment Status](https://img.shields.io/badge/deployment-active-brightgreen)

## ✨ Features

- 🤖 **AI-Enhanced Content**: Powered by Groq's Llama 3.3 70B model
- 📰 **Real-Time News**: Latest updates from NewsAPI
- 🎨 **Beautiful UI**: Built with React, TypeScript, and Tailwind CSS
- 🔄 **Auto-Refresh**: Content updates every 12 hours via GitHub Actions
- ⚡ **Fast & Responsive**: Optimized with Vite and cached with React Query
- 🎯 **Smart Categorization**: Technology, Business, Sports, Entertainment, and more
- 🌍 **Global Coverage**: News from sources worldwide
- 📱 **Mobile Friendly**: Responsive design for all devices

## 🎯 Categories

- **All News**: Comprehensive coverage
- **Trending**: Most popular stories
- **Business**: Market updates and financial news
- **Technology**: Latest tech innovations
- **Health**: Medical and wellness news
- **Sports**: European football and cricket
- **Entertainment**: Movies, music, and celebrity news
- **World**: International affairs

## 🏗️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn UI
- **Data Fetching**: React Query, Axios
- **AI Enhancement**: Groq (Llama 3.3 70B)
- **News Source**: NewsAPI
- **Deployment**: Vercel
- **Automation**: GitHub Actions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- NewsAPI key from [newsapi.org](https://newsapi.org)
- Groq API key from [console.groq.com](https://console.groq.com)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/newsflow-ai.git
cd newsflow-ai
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```env
VITE_NEWS_API_KEY=your_newsapi_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here
```

4. Start development server:

```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173)

## 📦 Build for Production

```bash
npm run build
npm run preview
```

## 🌐 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete deployment instructions including:

- Vercel deployment setup
- GitHub Actions configuration
- Auto-refresh every 12 hours
- Environment variables setup

## 🔄 Auto-Refresh Feature

The app automatically triggers a new deployment every 12 hours (6 AM & 6 PM UTC) using GitHub Actions to ensure fresh content without manual intervention.

## 📊 API Usage

- **NewsAPI**: 100 requests/day (Free tier)
- **Groq**: 14,400 requests/day (Free tier)
- **Caching**: 5-minute cache, 10-minute auto-refresh

## 🎨 Features in Detail

### AI Summarization

Click the document icon on any article to get an AI-generated summary powered by Llama 3.3 70B.

### Smart Search

Real-time search across all news categories with instant results.

### Bookmarking & Sharing

Save articles and share via native share API or copy link.

### Responsive Design

Beautiful animations and glassmorphism effects across all devices.

## 🛠️ Development

### Project Structure

```
src/
├── components/        # Reusable UI components
│   └── ui/           # Shadcn UI components
├── pages/            # Page components
├── services/         # API services (NewsAPI, Groq)
├── types/            # TypeScript types
├── hooks/            # Custom React hooks
└── lib/              # Utility functions
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Made with ❤️ using React, TypeScript, and AI
