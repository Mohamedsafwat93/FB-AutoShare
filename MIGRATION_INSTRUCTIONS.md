# Google Drive File Migration Instructions

## Issue
The Replit environment is experiencing OpenSSL certificate validation issues when uploading files to Google Drive. This is a known compatibility issue between Node.js and the system's OpenSSL library.

## Solution: Run Migration Locally

To upload your 13 files to Google Drive, follow these steps on your local machine:

### Step 1: Copy the files and credentials to your local machine
```bash
# Copy temp-uploads folder with all 13 files
# Copy google_service.json file
```

### Step 2: Create migration script on your local machine
Create a file called `migrate.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const KEYFILEPATH = './google_service.json';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function uploadAllFiles() {
  try {
    console.log('🔐 Authenticating with Google Drive...');
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES
    });

    const drive = google.drive({ version: 'v3', auth });
    const tempDir = './temp-uploads';
    const files = fs.readdirSync(tempDir);

    console.log('📤 Uploading ' + files.length + ' files...\n');

    let uploaded = 0;
    for (const file of files) {
      try {
        const filePath = path.join(tempDir, file);
        const media = { body: fs.createReadStream(filePath) };
        const fileMetadata = { name: file };

        process.stdout.write('Uploading: ' + file + '... ');
        const res = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id'
        });

        fs.unlinkSync(filePath);
        console.log('✅ (ID: ' + res.data.id + ')');
        uploaded++;
      } catch (err) {
        console.log('❌ ' + err.message);
      }
    }

    console.log('\n✅ Migration Complete: ' + uploaded + '/' + files.length);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

uploadAllFiles();
```

### Step 3: Run the migration
```bash
# Install dependencies
npm install googleapis

# Run migration
node migrate.js
```

## Files Ready for Migration
- **Count**: 13 files
- **Location**: `/public/temp-uploads/`
- **Service Account**: `itsolutions-s1@sodium-pathway-478819-m5.iam.gserviceaccount.com`

## Alternative: Manual Upload
You can also manually upload files to Google Drive:
1. Log into Google Drive
2. Create a new folder
3. Share folder with service account email
4. Manually drag and drop the 13 files

## After Migration
Once files are uploaded to Google Drive, the web interface at `YOUR_URL/upload-test.html` will work perfectly for new uploads.

