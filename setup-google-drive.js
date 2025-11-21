const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function setupGoogleDrive() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log('❌ Error: credentials.json not found');
      console.log('\nSteps to set up Google Drive:');
      console.log('1. Go to: https://console.cloud.google.com/');
      console.log('2. Create a new project');
      console.log('3. Enable Google Drive API');
      console.log('4. Create OAuth 2.0 credentials (Desktop application)');
      console.log('5. Download credentials as JSON');
      console.log('6. Rename it to credentials.json and place in project root');
      console.log('7. Run: node setup-google-drive.js');
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });

    console.log('🔐 Google Drive OAuth Setup');
    console.log('=============================');
    console.log('Open this URL in your browser:');
    console.log(authUrl);
    console.log('\n');

    // Get authorization code
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Enter the authorization code: ', async (code) => {
      rl.close();

      try {
        const { tokens } = await oauth2Client.getToken(code);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log('✅ Token saved to token.json');
        console.log('✅ Google Drive setup complete!');
        console.log('\nYou can now use Google Drive storage in your app.');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error getting token:', error.message);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupGoogleDrive();
