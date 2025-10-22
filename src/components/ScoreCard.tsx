import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import type { LiveScore, CricketScore } from "@/types/news";
import { Clock, MapPin, Radio } from "lucide-react";

interface ScoreCardProps {
  score: LiveScore | CricketScore;
}

export function ScoreCard({ score }: ScoreCardProps) {
  const isLive = score.status === 'live';
  const isFinished = score.status === 'finished';
  const isCricket = score.sport === 'cricket';
  
  return (
    <Card className="group relative overflow-hidden border border-white/10 bg-gradient-to-br from-black/40 via-black/60 to-black/80 backdrop-blur-xl hover:border-purple-500/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
      {/* Live indicator glow */}
      {isLive && (
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-transparent animate-pulse pointer-events-none" />
      )}
      
      <div className="p-4 space-y-3">
        {/* Header: League + Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-medium text-white/60 truncate">
              {score.league}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="destructive" className="animate-pulse gap-1.5 px-2 py-0.5">
                <Radio className="w-3 h-3" />
                <span className="text-xs font-bold">LIVE</span>
              </Badge>
            )}
            {isFinished && (
              <Badge variant="secondary" className="px-2 py-0.5">
                <span className="text-xs">FT</span>
              </Badge>
            )}
            {!isLive && !isFinished && (
              <Badge variant="outline" className="px-2 py-0.5 border-white/20">
                <span className="text-xs text-white/60">Upcoming</span>
              </Badge>
            )}
          </div>
        </div>
        
        {/* Match Score */}
        <div className="space-y-2">
          {/* Home Team */}
          <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {score.homeTeam.logo && (
                <img 
                  src={score.homeTeam.logo} 
                  alt={score.homeTeam.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <span className="font-semibold text-white truncate">
                {score.homeTeam.name}
              </span>
            </div>
            <span className={`text-2xl font-bold ${isLive ? 'text-green-400' : 'text-white'} min-w-[3rem] text-right`}>
              {score.homeTeam.score ?? '-'}
            </span>
          </div>
          
          {/* Away Team */}
          <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {score.awayTeam.logo && (
                <img 
                  src={score.awayTeam.logo} 
                  alt={score.awayTeam.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <span className="font-semibold text-white truncate">
                {score.awayTeam.name}
              </span>
            </div>
            <span className={`text-2xl font-bold ${isLive ? 'text-green-400' : 'text-white'} min-w-[3rem] text-right`}>
              {score.awayTeam.score ?? '-'}
            </span>
          </div>
        </div>
        
        {/* Cricket-specific info */}
        {isCricket && (score as CricketScore).currentOver && (
          <div className="flex items-center gap-4 text-xs text-white/60 pt-1 border-t border-white/10">
            <span>Over: {(score as CricketScore).currentOver}</span>
            {(score as CricketScore).runRate && (
              <span>RR: {(score as CricketScore).runRate}</span>
            )}
            {(score as CricketScore).target && (
              <span className="text-orange-400">Target: {(score as CricketScore).target}</span>
            )}
          </div>
        )}
        
        {/* Footer: Match Time + Venue */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Clock className="w-3.5 h-3.5" />
            <span className={isLive ? 'text-green-400 font-semibold' : ''}>
              {score.matchTime}
            </span>
          </div>
          
          {score.venue && (
            <div className="flex items-center gap-1.5 text-xs text-white/60 truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{score.venue}</span>
            </div>
          )}
        </div>
        
        {/* Source */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">via {score.source}</span>
          {isLive && (
            <span className="text-white/40">
              Updated {new Date(score.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {/* Click to view */}
        {score.url && (
          <a 
            href={score.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10"
            aria-label={`View ${score.homeTeam.name} vs ${score.awayTeam.name}`}
          />
        )}
      </div>
      
      {/* Sport icon overlay */}
      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <span className="text-6xl">
          {isCricket ? '🏏' : '⚽'}
        </span>
      </div>
    </Card>
  );
}
