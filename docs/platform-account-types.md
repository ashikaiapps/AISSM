# Platform Account Types Guide

## Overview

SocialKeys.ai supports multiple account types per platform. This document explains what each platform supports, how authentication works, and what approvals are needed.

---

## LinkedIn

### Personal Profile
- **Author URN**: `urn:li:person:{sub}`
- **Scope**: `openid profile w_member_social`
- **Approval**: ✅ None — works immediately
- **What you can post**: Text updates, articles, images, videos
- **Setup**: Create app → enable "Share on LinkedIn" + "Sign In with LinkedIn using OpenID Connect"
- **Note**: Creating a LinkedIn developer app requires associating a LinkedIn Page — this is just a registration requirement and doesn't affect personal posting

### Company Page
- **Author URN**: `urn:li:organization:{orgId}`
- **Scope**: `r_organization_admin w_organization_social`
- **Approval**: ⏳ Marketing Developer Platform (apply in developer portal → Products)
- **What you can post**: Same as personal — posted as the Company Page
- **Requirements**: You must be a Page Admin on the Company Page
- **Discovery**: After OAuth, the app finds all Company Pages where you're an admin

### How It Works
After connecting LinkedIn, you'll see a selection screen with:
- ✅ **Your Name (Personal)** — always available
- ✅ **Company Name (Company Page)** — only if you have `w_organization_social` and are a Page Admin

---

## Facebook

### Facebook Page (Supported ✅)
- **Posts as**: The Page itself (e.g., "Acme Corp" not "John via Acme Corp")
- **Scope**: `pages_manage_posts pages_show_list pages_read_engagement`
- **Approval**: ⏳ Meta App Review (5-10 business days)
- **Token**: Each Page gets its own long-lived access token (~60 days)
- **Requirements**: You must be a Page Admin or Editor
- **Discovery**: After OAuth, the app lists all Pages you manage — select which to connect

### Personal Profile (NOT Supported ❌)
- Facebook **removed personal profile posting via API** in 2024
- The Graph API `/{user-id}/feed` endpoint no longer accepts POST requests
- There is no workaround — this is a permanent Meta policy change
- **Alternative**: Create a Facebook Page for your personal brand

---

## Instagram

### Business Account (Supported ✅)
- **How it posts**: Container-based 2-step publish (create container → publish)
- **Scope**: `instagram_basic instagram_content_publish`
- **Approval**: ⏳ Same Meta App Review as Facebook
- **Requirements**:
  1. Instagram account must be **Business** type (not Personal)
  2. Must be **linked to a Facebook Page**
- **Supports**: Single images, carousels (up to 10), Reels (video)
- **Limits**: 100 posts per 24-hour rolling window

### Creator Account (Supported ✅)
- Same as Business account — the API treats them identically
- Convert in: Instagram → Settings → Account → Switch to Professional Account → Creator

### Personal Account (NOT Supported ❌)
- Instagram's Content Publishing API only works with Professional (Business/Creator) accounts
- **To convert**: Instagram → Settings → Account → Switch to Professional Account
- It's free and takes 30 seconds

### How to Set Up
1. Convert your Instagram to Business/Creator account
2. Link it to a Facebook Page (Instagram → Settings → Linked Accounts)
3. Connect Facebook in SocialKeys → it discovers your Instagram accounts automatically

---

## YouTube

### YouTube Channel (Supported ✅)
- **How it posts**: Resumable video upload → adds #Shorts for Shorts
- **Scope**: `https://www.googleapis.com/auth/youtube.upload`
- **Approval**: ❌ None in test mode (up to 100 authorized users)
- **Content**: Video only — Shorts are vertical (9:16) videos ≤60 seconds
- **Quota**: 10,000 units/day (1 upload ≈ 1,600 units = ~6 uploads/day)
- **Production**: Requires Google API compliance review for >100 users

---

## TikTok

### TikTok Account (Supported ✅)
- **How it posts**: FILE_UPLOAD chunked video upload
- **Scope**: `video.publish user.info.basic`
- **Approval**: ⏳ TikTok audit (2-6 weeks for full publishing)
- **Unaudited**: Posts are `SELF_ONLY` (visible only to you, like drafts)
- **Content**: Video only
- **Note**: TikTok uses `client_key` (not `client_id`) in their API

---

## Threads (Planned)

### Threads Profile
- **How it posts**: Text + optional media via Threads Publishing API
- **Scope**: `threads_basic threads_content_publish`
- **Approval**: Same Meta App Review
- **Content**: Text posts, single images, videos, carousels, link posts
- **Setup**: Uses the same Meta developer app as Facebook/Instagram
- **Note**: Threads API launched June 2024 — available to all Meta developer apps

---

## Platform Rate Limits Summary

| Platform | Daily Limit | Notes |
|---|---|---|
| LinkedIn | 100 posts/member/day | Combined personal + API |
| Facebook | ~200 posts/page/day | Soft limit, may trigger spam review |
| Instagram | 100 posts/24h rolling | Hard limit across all posting methods |
| YouTube | ~6 Shorts/day | Based on 10K quota units |
| TikTok | 15 videos/day (unaudited) | Higher limits after audit |
| Threads | 250 posts/24h | Per Threads account |

For the goal of **50 posts/day**, you'll want multiple accounts across platforms and a scheduler to space posts optimally (every ~30 minutes per account).
