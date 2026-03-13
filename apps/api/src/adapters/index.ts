import { registerAdapter } from './base.js';
import { facebookAdapter } from './facebook.js';
import { instagramAdapter } from './instagram.js';
import { linkedinAdapter } from './linkedin.js';
import { tiktokAdapter } from './tiktok.js';
import { youtubeAdapter } from './youtube.js';

registerAdapter(facebookAdapter);
registerAdapter(instagramAdapter);
registerAdapter(linkedinAdapter);
registerAdapter(tiktokAdapter);
registerAdapter(youtubeAdapter);
