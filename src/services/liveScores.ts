import axios from "axios";
import type { LiveScore, CricketScore } from "@/types/news";

// API keys from environment
const API_FOOTBALL_SCORES_KEY = import.meta.env.API_FOOTBALL_SCORES_KEY;
const FOOTBALL_DATA_KEY = import.meta.env.FOOTBALL_DATA_KEY;
const CRICAPI_KEY = import.meta.env.CRICAPI_KEY;
const RAPIDAPI_KEY = import.meta.env.RAPIDAPI_KEY;
const SPORTSDB_API_KEY = import.meta.env.SPORTSDB_API_KEY;

// Short cache for live scores (30-60 seconds)
interface ScoreCache {
  data: LiveScore[];
  timestamp: number;
}

const scoresCache = new Map<string, ScoreCache>();
const SCORES_CACHE_TTL = 60 * 1000; // 60 seconds for live scores

/**
 * Get scores from cache if fresh (< 60 seconds old)
 */
function getFromCache(key: string): LiveScore[] | null {
  const entry = scoresCache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > SCORES_CACHE_TTL) {
    scoresCache.delete(key);
    return null;
  }
  
  console.log(`⚡ Scores cache hit: ${key} (age: ${Math.floor(age / 1000)}s)`);
  return entry.data;
}

/**
 * Set scores in cache
 */
function setCache(key: string, data: LiveScore[]) {
  scoresCache.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log(`💾 Cached scores: ${key} (valid for 60s)`);
}

// ============================================================================
// FOOTBALL SCORES APIs
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Try API-Football (100/day - PRIMARY)
 * Best for: European football leagues
 */
async function tryAPIFootballScores(): Promise<LiveScore[]> {
  try {
    if (!API_FOOTBALL_SCORES_KEY || API_FOOTBALL_SCORES_KEY === 'demo') {
      console.log('⚠️ API-Football key not configured');
      return [];
    }
    
    console.log('🔄 Trying API-Football (100/day - PRIMARY)...');
    
    // Get live matches + today's matches
    const response = await axios.get(
      'https://v3.football.api-sports.io/fixtures?live=all',
      {
        headers: {
          'x-apisports-key': API_FOOTBALL_SCORES_KEY
        },
        timeout: 5000
      }
    );
    
    const fixtures = response.data.response || [];
    const scores: LiveScore[] = fixtures.slice(0, 20).map((fixture: any) => ({
      id: `football-${fixture.fixture.id}`,
      sport: 'football' as const,
      status: fixture.fixture.status.short === 'LIVE' || fixture.fixture.status.short === '1H' || fixture.fixture.status.short === '2H' ? 'live' : 
              fixture.fixture.status.short === 'FT' ? 'finished' : 'scheduled',
      league: fixture.league.name,
      homeTeam: {
        name: fixture.teams.home.name,
        logo: fixture.teams.home.logo,
        score: fixture.goals.home
      },
      awayTeam: {
        name: fixture.teams.away.name,
        logo: fixture.teams.away.logo,
        score: fixture.goals.away
      },
      matchTime: fixture.fixture.status.elapsed ? `${fixture.fixture.status.elapsed}'` : fixture.fixture.status.short,
      venue: fixture.fixture.venue?.name,
      startTime: fixture.fixture.date,
      url: `https://www.api-football.com/fixture/${fixture.fixture.id}`,
      source: 'API-Football',
      lastUpdated: new Date().toISOString()
    }));
    
    console.log(`✅ API-Football SUCCESS: ${scores.length} matches`);
    return scores;
  } catch (error) {
    console.error('❌ API-Football failed:', error);
    return [];
  }
}

/**
 * Try Football-Data.org (10/min - BACKUP)
 * Best for: European leagues backup
 */
async function tryFootballDataScores(): Promise<LiveScore[]> {
  try {
    if (!FOOTBALL_DATA_KEY || FOOTBALL_DATA_KEY === 'demo') {
      console.log('⚠️ Football-Data key not configured');
      return [];
    }
    
    console.log('🔄 Trying Football-Data.org (10/min - BACKUP)...');
    
    // Get matches from major European leagues
    const leagues = [2021, 2014, 2015, 2002, 2019]; // Premier League, La Liga, Ligue 1, Bundesliga, Serie A
    const allScores: LiveScore[] = [];
    
    for (const leagueId of leagues) {
      try {
        const response = await axios.get(
          `https://api.football-data.org/v4/competitions/${leagueId}/matches?status=LIVE,SCHEDULED,FINISHED`,
          {
            headers: {
              'X-Auth-Token': FOOTBALL_DATA_KEY
            },
            timeout: 5000
          }
        );
        
        const matches = response.data.matches || [];
        const scores = matches.slice(0, 5).map((match: any) => ({
          id: `football-${match.id}`,
          sport: 'football' as const,
          status: match.status === 'IN_PLAY' ? 'live' : 
                  match.status === 'FINISHED' ? 'finished' : 'scheduled',
          league: response.data.competition?.name || 'Football',
          homeTeam: {
            name: match.homeTeam.name,
            logo: match.homeTeam.crest,
            score: match.score.fullTime.home
          },
          awayTeam: {
            name: match.awayTeam.name,
            logo: match.awayTeam.crest,
            score: match.score.fullTime.away
          },
          matchTime: match.status === 'IN_PLAY' ? 'LIVE' : match.status,
          venue: match.venue,
          startTime: match.utcDate,
          url: `https://www.football-data.org/`,
          source: 'Football-Data',
          lastUpdated: new Date().toISOString()
        }));
        
        allScores.push(...scores);
      } catch (err) {
        console.warn(`⚠️ Failed to fetch league ${leagueId}`);
      }
    }
    
    console.log(`✅ Football-Data SUCCESS: ${allScores.length} matches`);
    return allScores.slice(0, 20); // Limit to 20 total
  } catch (error) {
    console.error('❌ Football-Data failed:', error);
    return [];
  }
}

/**
 * Try ESPN Football (Unlimited - EMERGENCY)
 * Best for: Always available fallback
 */
async function tryESPNFootballScores(): Promise<LiveScore[]> {
  try {
    console.log('🔄 Trying ESPN Football (Unlimited - EMERGENCY)...');
    
    // Get soccer scores from ESPN
    const response = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
      { timeout: 5000 }
    );
    
    const events = response.data.events || [];
    const scores: LiveScore[] = events.slice(0, 20).map((event: any) => {
      const competition = event.competitions?.[0];
      const homeTeam = competition?.competitors?.find((c: any) => c.homeAway === 'home');
      const awayTeam = competition?.competitors?.find((c: any) => c.homeAway === 'away');
      
      return {
        id: `football-espn-${event.id}`,
        sport: 'football' as const,
        status: competition?.status?.type?.state === 'in' ? 'live' : 
                competition?.status?.type?.state === 'post' ? 'finished' : 'scheduled',
        league: event.league?.name || 'Football',
        homeTeam: {
          name: homeTeam?.team?.displayName || 'Home',
          logo: homeTeam?.team?.logo,
          score: homeTeam?.score
        },
        awayTeam: {
          name: awayTeam?.team?.displayName || 'Away',
          logo: awayTeam?.team?.logo,
          score: awayTeam?.score
        },
        matchTime: competition?.status?.displayClock || competition?.status?.type?.shortDetail || 'Scheduled',
        venue: competition?.venue?.fullName,
        startTime: event.date,
        url: event.links?.[0]?.href || 'https://www.espn.com/soccer/',
        source: 'ESPN',
        lastUpdated: new Date().toISOString()
      };
    });
    
    console.log(`✅ ESPN Football SUCCESS: ${scores.length} matches`);
    return scores;
  } catch (error) {
    console.error('❌ ESPN Football failed:', error);
    return [];
  }
}

/**
 * Try TheSportsDB (30/min - MULTI-SPORT)
 * Best for: Multiple sports coverage (football, cricket, basketball, etc.)
 * Can fetch both football AND cricket in one call
 */
async function tryTheSportsDBScores(): Promise<LiveScore[]> {
  try {
    if (!SPORTSDB_API_KEY || SPORTSDB_API_KEY === 'demo' || SPORTSDB_API_KEY === '3') {
      console.log('⚠️ TheSportsDB key not configured (using free tier)');
      // Continue with free tier key
    }
    
    console.log('🔄 Trying TheSportsDB (30/min - MULTI-SPORT)...');
    
    const allScores: LiveScore[] = [];
    
    // Fetch live events from multiple sports
    const sportsToFetch = [
      { sport: 'Soccer', type: 'football' as const },
      { sport: 'Cricket', type: 'cricket' as const }
    ];
    
    for (const { sport, type } of sportsToFetch) {
      try {
        const response = await axios.post(
          'https://www.thesportsdb.com/api/v2/json/all/livescore',
          { },
          {
            headers: {
              'X-API-KEY': SPORTSDB_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
        
        const events = response.data?.events || [];
        const filteredEvents = events.filter((event: any) => 
          event.strSport === sport || event.strLeague?.toLowerCase().includes(sport.toLowerCase())
        );
        
        const scores: LiveScore[] = filteredEvents.slice(0, 15).map((event: any) => {
          const isCricket = type === 'cricket';
          
          if (isCricket) {
            // Cricket-specific formatting
            return {
              id: `sportsdb-cricket-${event.idEvent}`,
              sport: 'cricket' as const,
              status: event.strStatus === 'Match Finished' ? 'finished' : 
                      event.strStatus?.includes('Progress') ? 'live' : 'scheduled',
              league: event.strLeague || 'Cricket',
              homeTeam: {
                name: event.strHomeTeam || 'Home',
                logo: event.strHomeTeamBadge,
                score: event.intHomeScore ? `${event.intHomeScore}${event.strHomeScoreDetail || ''}` : 'Yet to bat',
                innings: event.strHomeScoreDetail
              },
              awayTeam: {
                name: event.strAwayTeam || 'Away',
                logo: event.strAwayTeamBadge,
                score: event.intAwayScore ? `${event.intAwayScore}${event.strAwayScoreDetail || ''}` : 'Yet to bat',
                innings: event.strAwayScoreDetail
              },
              matchTime: event.strProgress || event.strStatus || 'Scheduled',
              venue: event.strVenue,
              startTime: event.dateEvent ? `${event.dateEvent}T${event.strTime || '00:00:00'}` : undefined,
              currentOver: event.strProgress?.match(/\d+\.\d+/)?.[0],
              url: `https://www.thesportsdb.com/event/${event.idEvent}`,
              source: 'TheSportsDB',
              lastUpdated: new Date().toISOString()
            } as CricketScore;
          } else {
            // Football formatting
            return {
              id: `sportsdb-football-${event.idEvent}`,
              sport: 'football' as const,
              status: event.strStatus === 'Match Finished' ? 'finished' : 
                      event.strStatus?.includes('Progress') ? 'live' : 'scheduled',
              league: event.strLeague || 'Football',
              homeTeam: {
                name: event.strHomeTeam || 'Home',
                logo: event.strHomeTeamBadge,
                score: event.intHomeScore
              },
              awayTeam: {
                name: event.strAwayTeam || 'Away',
                logo: event.strAwayTeamBadge,
                score: event.intAwayScore
              },
              matchTime: event.strProgress || event.strStatus || 'Scheduled',
              venue: event.strVenue,
              startTime: event.dateEvent ? `${event.dateEvent}T${event.strTime || '00:00:00'}` : undefined,
              url: `https://www.thesportsdb.com/event/${event.idEvent}`,
              source: 'TheSportsDB',
              lastUpdated: new Date().toISOString()
            };
          }
        });
        
        allScores.push(...scores);
      } catch (sportError) {
        console.log(`⚠️ TheSportsDB ${sport} fetch failed:`, sportError);
      }
    }
    
    console.log(`✅ TheSportsDB SUCCESS: ${allScores.length} total events`);
    return allScores;
  } catch (error) {
    console.error('❌ TheSportsDB failed:', error);
    return [];
  }
}

// ============================================================================
// CRICKET SCORES APIs
// ============================================================================

/**
 * Try CricAPI (100/day - PRIMARY CRICKET)
 * Best for: International cricket matches
 */
async function tryCricAPIScores(): Promise<CricketScore[]> {
  try {
    if (!CRICAPI_KEY || CRICAPI_KEY === 'demo') {
      console.log('⚠️ CricAPI key not configured');
      return [];
    }
    
    console.log('🔄 Trying CricAPI (100/day - PRIMARY CRICKET)...');
    
    const response = await axios.get(
      `https://api.cricapi.com/v1/currentMatches?apikey=${CRICAPI_KEY}`,
      { timeout: 5000 }
    );
    
    const matches = response.data.data || [];
    const scores: CricketScore[] = matches.slice(0, 10).map((match: any) => ({
      id: `cricket-${match.id}`,
      sport: 'cricket' as const,
      status: match.matchStarted && !match.matchEnded ? 'live' : 
              match.matchEnded ? 'finished' : 'scheduled',
      league: match.matchType || 'Cricket',
      homeTeam: {
        name: match.teams?.[0] || 'Team 1',
        score: match.score?.[0]?.r && match.score?.[0]?.w ? 
               `${match.score[0].r}/${match.score[0].w} (${match.score[0].o || 0})` : 'Yet to bat',
        innings: match.score?.[0]?.inning
      },
      awayTeam: {
        name: match.teams?.[1] || 'Team 2',
        score: match.score?.[1]?.r && match.score?.[1]?.w ? 
               `${match.score[1].r}/${match.score[1].w} (${match.score[1].o || 0})` : 'Yet to bat',
        innings: match.score?.[1]?.inning
      },
      matchTime: match.status || 'Scheduled',
      venue: match.venue,
      startTime: match.dateTimeGMT,
      currentOver: match.score?.[0]?.o?.toString(),
      url: `https://cricapi.com/matches/${match.id}`,
      source: 'CricAPI',
      lastUpdated: new Date().toISOString()
    }));
    
    console.log(`✅ CricAPI SUCCESS: ${scores.length} matches`);
    return scores;
  } catch (error) {
    console.error('❌ CricAPI failed:', error);
    return [];
  }
}

/**
 * Try Cricbuzz via RapidAPI (500/month - BACKUP CRICKET)
 * Best for: Cricket backup
 */
async function tryCricbuzzScores(): Promise<CricketScore[]> {
  try {
    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'demo') {
      console.log('⚠️ RapidAPI key not configured');
      return [];
    }
    
    console.log('🔄 Trying Cricbuzz via RapidAPI (500/month - EMERGENCY)...');
    
    const response = await axios.get(
      'https://cricbuzz-cricket.p.rapidapi.com/matches/v1/recent',
      {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'cricbuzz-cricket.p.rapidapi.com'
        },
        timeout: 5000
      }
    );
    
    // Cricbuzz API has complex nested structure, simplified here
    const matches = response.data.typeMatches?.[0]?.seriesMatches || [];
    const scores: CricketScore[] = [];
    
    for (const series of matches.slice(0, 5)) {
      const match = series.seriesAdWrapper?.matches?.[0]?.matchInfo;
      if (match) {
        scores.push({
          id: `cricket-cb-${match.matchId}`,
          sport: 'cricket' as const,
          status: match.state === 'In Progress' ? 'live' : 
                  match.state === 'Complete' ? 'finished' : 'scheduled',
          league: match.seriesName || 'Cricket',
          homeTeam: {
            name: match.team1?.teamName || 'Team 1',
            score: 'Check Cricbuzz'
          },
          awayTeam: {
            name: match.team2?.teamName || 'Team 2',
            score: 'Check Cricbuzz'
          },
          matchTime: match.status || 'Scheduled',
          venue: match.venueInfo?.ground,
          startTime: new Date(match.startDate).toISOString(),
          url: `https://www.cricbuzz.com/`,
          source: 'Cricbuzz',
          lastUpdated: new Date().toISOString()
        });
      }
    }
    
    console.log(`✅ Cricbuzz SUCCESS: ${scores.length} matches`);
    return scores;
  } catch (error) {
    console.error('❌ Cricbuzz failed:', error);
    return [];
  }
}

// ============================================================================
// MAIN LIVE SCORES FETCHER
// ============================================================================

/**
 * Fetch live scores combining football and cricket
 * Returns up to 30 scores (20 football + 10 cricket)
 */
export async function fetchLiveScores(): Promise<LiveScore[]> {
  const cacheKey = 'live_scores';
  
  // Check cache first (60 second TTL)
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }
  
  console.log('🎯 Fetching live scores (Football + Cricket)...');
  
  const allScores: LiveScore[] = [];
  
  // ===== TRY THESPORTSDB FIRST (Multi-sport in one call) =====
  console.log('\n🎯 Trying TheSportsDB (Multi-sport)...');
  const sportsDBScores = await tryTheSportsDBScores();
  
  if (sportsDBScores.length > 0) {
    // TheSportsDB returned data, use it
    allScores.push(...sportsDBScores);
    console.log(`✅ TheSportsDB provided ${sportsDBScores.length} scores`);
  } else {
    // TheSportsDB failed, use individual APIs
    console.log('⚠️ TheSportsDB returned no data, falling back to individual APIs');
    
    // ===== FOOTBALL SCORES =====
    console.log('\n⚽ Fetching Football Scores...');
    
    // Try API-Football first (100/day)
    let footballScores = await tryAPIFootballScores();
    
    // If failed or empty, try Football-Data (10/min)
    if (footballScores.length === 0) {
      footballScores = await tryFootballDataScores();
    }
    
    // If still empty, try ESPN (unlimited)
    if (footballScores.length === 0) {
      footballScores = await tryESPNFootballScores();
    }
    
    allScores.push(...footballScores.slice(0, 20)); // Max 20 football matches
    
    // ===== CRICKET SCORES =====
    console.log('\n🏏 Fetching Cricket Scores...');
    
    // Try CricAPI first (100/day)
    let cricketScores = await tryCricAPIScores();
    
    // If failed or empty, try Cricbuzz (500/month)
    if (cricketScores.length === 0) {
      cricketScores = await tryCricbuzzScores();
    }
    
    allScores.push(...cricketScores.slice(0, 10)); // Max 10 cricket matches
  }
  
  // Cache the results for 60 seconds
  if (allScores.length > 0) {
    setCache(cacheKey, allScores);
  }
  
  const footballCount = allScores.filter(s => s.sport === 'football').length;
  const cricketCount = allScores.filter(s => s.sport === 'cricket').length;
  
  console.log(`\n✅ Total Live Scores: ${allScores.length} (${footballCount} football + ${cricketCount} cricket)`);
  
  return allScores;
}

/**
 * Get fallback dummy scores when all APIs fail
 */
export function getFallbackScores(): LiveScore[] {
  return [
    // Football
    {
      id: 'fallback-f1',
      sport: 'football',
      status: 'live',
      league: 'Premier League',
      homeTeam: { name: 'Manchester United', score: 2 },
      awayTeam: { name: 'Liverpool', score: 1 },
      matchTime: "65'",
      source: 'Fallback',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'fallback-f2',
      sport: 'football',
      status: 'live',
      league: 'La Liga',
      homeTeam: { name: 'Barcelona', score: 1 },
      awayTeam: { name: 'Real Madrid', score: 1 },
      matchTime: "42'",
      source: 'Fallback',
      lastUpdated: new Date().toISOString()
    },
    // Cricket
    {
      id: 'fallback-c1',
      sport: 'cricket',
      status: 'live',
      league: 'Test Match',
      homeTeam: { name: 'India', score: '325/5 (85.2)' },
      awayTeam: { name: 'England', score: '280 (78.5)' },
      matchTime: 'Day 2, Session 2',
      source: 'Fallback',
      lastUpdated: new Date().toISOString()
    } as CricketScore
  ];
}
