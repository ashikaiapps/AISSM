import { registerInspirationAdapter } from './base.js';
import { redditAdapter } from './reddit.js';
import { hackernewsAdapter } from './hackernews.js';
import { rssAdapter } from './rss.js';
import { youtubeAdapter } from './youtube.js';
import { producthuntAdapter } from './producthunt.js';

registerInspirationAdapter(redditAdapter);
registerInspirationAdapter(hackernewsAdapter);
registerInspirationAdapter(rssAdapter);
registerInspirationAdapter(youtubeAdapter);
registerInspirationAdapter(producthuntAdapter);
