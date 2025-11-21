# OAuth2 Setup for Google Drive Migration

## Why OAuth2?
The Replit environment has OpenSSL limitations that prevent service account authentication. OAuth2 tokens can be generated locally on your computer and then used for uploads.

## Step 1: Get OAuth2 Token (Run Locally)

On your **local computer**, run:

```bash
npm install googleapis
node oauth-auth.js
```

This will:
1. Show you an authorization URL
2. Ask you to open it in your browser
3. Get authorization code from browser
4. Save `oauth-token.json`

## Step 2: Copy Token to Replit

Once you have `oauth-token.json` locally:
1. Copy the contents of `oauth-token.json`
2. Go to your Replit project Files
3. Create/paste into `oauth-token.json`
4. Commit the token (it's in .gitignore for safety)

## Step 3: Run Migration

Now on your **local computer**:

```bash
# Copy all 15 files from Replit's /public/temp-uploads/
node migrate-to-drive.js
```

The migration script will automatically detect `oauth-token.json` and use it instead of the service account.

## How It Works

The migration script checks in this order:
1. **OAuth2 token** (`oauth-token.json`) - if it exists, use this
2. **Service account** (`google_service.json`) - fallback option

## Troubleshooting

**"No files to upload"**: Make sure all 15 files are in the same folder as the script

**"Authentication failed"**: 
- Verify `oauth-token.json` is valid JSON
- Try refreshing the token by running `oauth-auth.js` again

**Files not appearing in Drive**:
- Check the folder permissions
- Verify the service account email is shared with the folder:
  `itsolutions-s1@sodium-pathway-478819-m5.iam.gserviceaccount.com`

## Security Note

⚠️ Never commit the actual OAuth token to GitHub. It's already in `.gitignore`.
The token in Replit is temporary and scoped to your Drive only.
