// app/replays/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'; // Import server client
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Youtube, CalendarDays, Clapperboard } from 'lucide-react'; // Import icons

// Define the Match type matching the 'matches' table structure
interface Match {
  id: number;
  match_date: string; // Changed from 'date'
  score_a: number;    // Changed from 'scoreA'
  score_b: number;    // Changed from 'scoreB'
  replay_url?: string | null; // Changed from 'replayUrl'
  user_id: string;
  created_at: string;
}

// Function to extract YouTube Video ID from various URL formats
// (Keep this function as it's needed to process the fetched URLs)
function getYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  let videoId: string | null = null;
  try {
    // Ensure URL has a protocol for parsing
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = 'https://' + url;
    }
    const urlObj = new URL(fullUrl);

    // Handle various YouTube URL formats
    if (urlObj.hostname.includes('youtube.com')) {
      if (urlObj.pathname === '/watch') { videoId = urlObj.searchParams.get('v'); }
      else if (urlObj.pathname.startsWith('/embed/')) { videoId = urlObj.pathname.substring('/embed/'.length); }
    } else if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.substring(1);
    }

    // Validate ID format (basic check for 11 standard characters)
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
    }
  } catch (error) {
    console.error("Error parsing YouTube URL:", url, error);
    return null;
  }
  console.warn("Could not parse YouTube Video ID from URL:", url);
  return null;
}


// The main page component is async for server-side data fetching
export default async function ReplayGalleryPage() {
  const cookieStore = cookies();
  const supabase = createClient();

  // Get user session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login'); // Redirect if not logged in
  }

  // Fetch matches for the logged-in user WHERE replay_url is not null and not empty
  const { data: matchesWithReplays, error } = await supabase
    .from('matches')
    .select('*') // Select all columns for now
    .eq('user_id', session.user.id) // Filter by user
    .not('replay_url', 'is', null) // Ensure replay_url is not NULL
    .neq('replay_url', '')          // Ensure replay_url is not an empty string
    .order('match_date', { ascending: false }); // Show newest first

  if (error) {
    console.error('Error fetching replays:', error);
    // Optionally render an error message
  }

  // Use the fetched data (or an empty array if error/no data)
  const validMatches = matchesWithReplays ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white flex items-center">
        <Clapperboard className="w-8 h-8 mr-3 text-red-600" />
        Replay Gallery
      </h1>

      {validMatches.length === 0 ? (
        // Message if no replays are found in the database
        <div className="text-center py-10 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <Youtube className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No match replays found in the database.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Add YouTube links when recording matches to see them here.</p>
        </div>
      ) : (
        // Grid layout for replay videos
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {validMatches.map((match) => {
            // Extract video ID using the helper function
            const videoId = getYouTubeVideoId(match.replay_url);

            // Skip rendering this card if video ID couldn't be extracted
            if (!videoId) {
              return null;
            }

            // Construct the standard YouTube embed URL
            const embedUrl = `https://www.youtube.com/embed/${videoId}`;

            return (
              // Video Card
              <div key={match.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Embedded Video Player using iframe */}
                <div className="aspect-video"> {/* Maintain 16:9 aspect ratio */}
                  <iframe
                    width="100%"
                    height="100%"
                    src={embedUrl}
                    title={`Match Replay - ${match.match_date}`} // Use match_date
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  ></iframe>
                </div>
                {/* Match Info Below Video */}
                <div className="p-4 flex-grow">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    <span>{match.match_date}</span> {/* Use match_date */}
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    Team A ({match.score_a}) vs Team B ({match.score_b}) {/* Use score_a, score_b */}
                  </p>
                  {/* Player names are not fetched here, so cannot be displayed yet */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
