# ClosetMatch Secure Setup Guide

## Security Features

✅ **Private Storage Bucket** — Images not publicly accessible  
✅ **Signed URLs** — URLs expire after 7 days  
✅ **User Isolation** — Users can only access their own files  
✅ **File Validation** — Size limits, type checking  
✅ **Auto-Refresh** — URLs automatically refreshed before expiry  

---

## Step 1: Supabase Storage Setup (PRIVATE Bucket)

### 1.1 Create Private Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Settings:
   - **Name:** `wardrobe-images`
   - **Public:** ❌ **UNCHECKED** (this makes it private)
   - **File size limit:** `5MB`
   - **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/heic`
4. Click **"Create bucket"**

### 1.2 Configure Row Level Security Policies

Go to **Storage** → **Policies** → Click on `wardrobe-images` bucket → **"New Policy"**

Create these 4 policies:

---

#### Policy 1: Users can upload to their own folder
```sql
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wardrobe-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**What this does:** Users can only upload files to a folder named with their user ID.

---

#### Policy 2: Users can view their own files
```sql
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wardrobe-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**What this does:** Users can only generate signed URLs for their own files.

---

#### Policy 3: Users can delete their own files
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wardrobe-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**What this does:** Users can only delete files in their own folder.

---

#### Policy 4: Users can update their own files
```sql
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wardrobe-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'wardrobe-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**What this does:** Users can only modify files in their own folder.

---

### 1.3 Verify Policies

After adding policies, your bucket should show:
- **RLS Enabled:** ✅
- **Policies:** 4 active

---

## Step 2: How Signed URLs Work

### The Flow

```
1. User uploads photo
   ↓
2. File stored at: wardrobe-images/{user-id}/1234567890-abc.jpg
   ↓
3. App generates signed URL (valid for 7 days)
   ↓
4. URL stored with item: { image: "https://...signed-url...", imagePath: "user-id/1234.jpg", imageExpiresAt: 1234567890 }
   ↓
5. When user opens app, URLs expiring within 24 hours are auto-refreshed
```

### Security Benefits

| Without Signed URLs | With Signed URLs |
|---------------------|------------------|
| Anyone with URL can view forever | URL expires after 7 days |
| URLs can be shared and abused | Old shared URLs stop working |
| No audit trail | Can track URL generation |

---

## Step 3: File Structure

```
src/
├── App.jsx                           # Main app
├── lib/
│   ├── supabase.js                  # Storage with signed URLs
│   └── emailProviders.js            # Email OAuth config
├── hooks/
│   └── useWardrobeWithUrlRefresh.js # Auto-refresh expired URLs
├── components/
│   ├── AddItemModal.jsx             # Stores path + expiry
│   ├── PhotoUploader.jsx            # Validates + uploads
│   ├── ClosetScanner.jsx            # AI detection
│   └── EmailImporter.jsx            # Email parsing
api/
├── chat.js                          # AI chat
├── detect-clothing.js               # AI image analysis
├── email-auth.js                    # OAuth callback
└── parse-emails.js                  # Email fetching
```

---

## Step 4: Environment Variables

Add to **Vercel** → **Settings** → **Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `ANTHROPIC_API_KEY` | ✅ | For AI features |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Gmail OAuth |
| `GOOGLE_CLIENT_ID` | Optional | Gmail OAuth (server) |
| `GOOGLE_CLIENT_SECRET` | Optional | Gmail OAuth (server) |
| `VITE_MICROSOFT_CLIENT_ID` | Optional | Outlook OAuth |
| `MICROSOFT_CLIENT_ID` | Optional | Outlook OAuth (server) |
| `MICROSOFT_CLIENT_SECRET` | Optional | Outlook OAuth (server) |

**Important:** Check all three environments (Production, Preview, Development) for each variable.

---

## Step 5: Testing Security

### Test 1: Upload without auth
```javascript
// Should FAIL
await supabase.storage.from('wardrobe-images').upload('test.jpg', file);
// Error: "new row violates row-level security policy"
```

### Test 2: Upload to another user's folder
```javascript
// Logged in as user-123, trying to upload to user-456's folder
await supabase.storage.from('wardrobe-images').upload('user-456/test.jpg', file);
// Error: "new row violates row-level security policy"
```

### Test 3: Access file directly without signed URL
```
https://xxx.supabase.co/storage/v1/object/public/wardrobe-images/user-123/photo.jpg
// Error: 404 or 403 (bucket is private)
```

### Test 4: Use expired signed URL
```
https://xxx.supabase.co/storage/v1/object/sign/wardrobe-images/...?token=expired
// Error: "Signature has expired"
```

---

## Step 6: Monitoring

### Check Storage Usage
Supabase Dashboard → Storage → Usage

### View Upload Logs
Supabase Dashboard → Logs → Select "storage"

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Upload fails | Policy missing or wrong | Check INSERT policy |
| Images don't load | URL expired | App auto-refreshes, force refresh |
| 403 on signed URL | Bucket is public | Make sure bucket is PRIVATE |

---

## Item Data Structure

Each wardrobe item with a photo stores:

```javascript
{
  id: 1234567890,
  name: "Blue Oxford Shirt",
  category: "tops",
  colors: ["blue"],
  style: "smart-casual",
  location: "Main Closet",
  
  // Photo data
  image: "https://xxx.supabase.co/storage/v1/object/sign/...", // Signed URL
  imagePath: "user-abc-123/1234567890-xyz.jpg",                // For refresh/delete
  imageExpiresAt: 1735689600000,                               // When URL expires
  isPhoto: true,
  
  wears: 5,
  createdAt: 1234567890
}
```

---

## URL Refresh Logic

The `useWardrobeWithUrlRefresh` hook handles:

1. **On app load:** Refresh URLs expiring within 24 hours
2. **Periodic check:** Every 6 hours while app is open
3. **On demand:** When accessing an item with expired URL

```javascript
// In App.jsx
import { useWardrobeWithUrlRefresh } from './hooks/useWardrobeWithUrlRefresh';

const [wardrobe, setWardrobe, isRefreshing] = useWardrobeWithUrlRefresh();
```

---

## Costs

| Resource | Free Tier | Paid |
|----------|-----------|------|
| Storage | 1 GB | $0.021/GB/month |
| Bandwidth | 2 GB | $0.09/GB |
| Signed URL generation | Unlimited | Unlimited |

**Estimated for 1,000 users (avg 50 photos each):**
- Storage: ~2.5 GB = ~$0.05/month
- Bandwidth: ~10 GB = ~$0.90/month

---

## Next Steps

1. ✅ Set up Supabase bucket with policies
2. ✅ Add environment variables to Vercel
3. ✅ Deploy and test upload/view/delete
4. 🔄 Set up email OAuth (optional)
5. 🔄 Add push notifications (future)
