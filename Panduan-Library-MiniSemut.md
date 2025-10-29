# 📚 CARA MEMBUAT & MENGGUNAKAN LIBRARY MINISEMUT

## Custom Google Apps Script Library untuk Telegram Bot

---

## 📋 Daftar Isi

1. [Cara Membuat Library](#cara-membuat-library)
2. [Cara Deploy Library](#cara-deploy-library)
3. [Cara Menggunakan Library](#cara-menggunakan-library)
4. [Cara Mengembangkan Library](#cara-mengembangkan-library)
5. [Best Practices](#best-practices)

---

## 🔧 Cara Membuat Library

### Step 1: Buat Project Google Apps Script Baru

1. Buka https://script.google.com
2. Klik **"New Project"**
3. Rename project menjadi **"MiniSemut Library"**
4. Save project (Ctrl + S)

### Step 2: Setup File Structure

1. Buat file baru: **Code.gs**
2. Copy paste seluruh kode dari file `Code.gs` yang sudah saya buat
3. Buat file manifest: **appsscript.json**
   - Klik ⚙️ (Project Settings) di sidebar kiri
   - Centang **"Show appsscript.json manifest file in editor"**
   - Kembali ke editor, akan muncul file `appsscript.json`
   - Copy paste konfigurasi manifest yang sudah saya buat

### Step 3: Verify Code

1. Di editor, pilih function `MiniSemut.init` dari dropdown
2. Klik **Run** untuk test (akan error karena tidak ada token, tapi itu normal)
3. Check **Execution log** untuk memastikan tidak ada syntax error

---

## 🚀 Cara Deploy Library

### Step 1: Set Sharing Permission

1. Klik tombol **Share** di kanan atas
2. Di bagian "General access", pilih **"Anyone with the link"**
3. Set role: **Viewer**
4. Klik **Done**

**⚠️ PENTING:** Library harus accessible oleh siapa saja yang ingin menggunakannya!

### Step 2: Create Version (Deploy)

1. Klik **Deploy** > **Manage deployments**
2. Klik **Create deployment**
3. Pilih type: **Library**
4. Isi keterangan:
   ```
   Version: 1
   Description: MiniSemut v1.0.0 - Initial Release
   ```
5. Klik **Deploy**
6. **Copy Deployment ID** yang muncul (ini adalah Script ID library Anda)

### Step 3: Get Script ID

Jika lupa Script ID:
1. Klik ⚙️ (Project Settings)
2. Copy **Script ID** dari bagian "IDs"

**Contoh Script ID:**
```
1ABC123def456GHI789jklMNO012pqrSTU345vwxYZ678
```

---

## 📖 Cara Menggunakan Library

### Step 1: Add Library ke Project

1. Buka project Google Apps Script Anda (atau buat baru)
2. Di sidebar kiri, klik ikon **+ (Add a library)** di samping "Libraries"
3. Paste **Script ID** library MiniSemut
4. Klik **Look up**
5. Pilih **Version** (pilih yang terbaru)
6. Set **Identifier** menjadi: `MiniSemut`
7. Klik **Add**

### Step 2: Initialize Bot

```javascript
// Konfigurasi bot
const CONFIG = {
  adminbot: "123456789",        // ID Telegram admin
  groupAlert: "-100123456789",  // ID grup untuk alert
  usernamebot: "mybot",         // Username bot (tanpa @)
  tokenbot: "123456:ABC-DEF..." // Token dari BotFather
};

// Initialize bot menggunakan library MiniSemut
const bot = MiniSemut.init(CONFIG.tokenbot, {
  log_id: CONFIG.adminbot,
  username: CONFIG.usernamebot,
  prefix_command: './!$'  // Karakter prefix untuk command
});
```

### Step 3: Register Handlers

```javascript
// Handler untuk /start
bot.start(ctx => {
  ctx.replyWithHTML('<b>Hello!</b> Welcome to my bot.');
});

// Handler untuk /help
bot.cmd('help', ctx => {
  ctx.reply('This is help message.');
});

// Handler dengan regex pattern
bot.hears(/^[\/\.\!]check\s+(.+)/i, ctx => {
  const param = ctx.match[1];
  ctx.reply('You checked: ' + param);
});

// Handler untuk callback query (inline buttons)
bot.on(MiniSemut.enums.callback_query, ctx => {
  const data = ctx.callbackQuery.data;
  ctx.answerCbQuery();
  ctx.reply('You clicked: ' + data);
});

// Handler untuk text message
bot.on(MiniSemut.enums.text, ctx => {
  ctx.reply('You said: ' + ctx.message.text);
});
```

### Step 4: Setup Webhook

```javascript
/**
 * Main entry point - dipanggil otomatis oleh Telegram
 */
function doPost(e) {
  bot.doPost(e);
}

/**
 * Setup webhook - jalankan manual sekali setelah deploy
 */
function setWebhook() {
  const url = ScriptApp.getService().getUrl();
  bot.telegram.setWebhook(url);
  Logger.log('Webhook set to: ' + url);
}

/**
 * Check webhook status
 */
function getWebhookInfo() {
  const info = bot.telegram.getWebhookInfo();
  Logger.log(info);
  return info;
}
```

### Step 5: Deploy as Web App

1. Klik **Deploy** > **New deployment**
2. Pilih type: **Web app**
3. Isi description: "My Bot v1.0"
4. Execute as: **Me**
5. Who has access: **Anyone**
6. Klik **Deploy**
7. Copy **Web App URL**

### Step 6: Set Webhook

1. Di editor, jalankan function `setWebhook()`
2. Authorize jika diminta
3. Check log untuk konfirmasi

### Step 7: Test Bot

1. Buka bot di Telegram
2. Ketik `/start`
3. Test semua command dan fitur

---

## 🔄 Cara Mengembangkan Library

### Update Library (Add New Features)

#### 1. Edit Library Code

```javascript
// Tambahkan method baru di Code.gs
my.telegram.sendDocument = function(chatId, document, caption) {
  return apiRequest('sendDocument', {
    chat_id: chatId,
    document: document,
    caption: caption || undefined
  });
};
```

#### 2. Save & Test

1. Save changes (Ctrl + S)
2. Test function di library project
3. Verify tidak ada error

#### 3. Create New Version

1. Klik **Deploy** > **Manage deployments**
2. Klik **✏️ Edit** pada deployment yang ada
3. Klik **New version**
4. Isi description: "v1.1.0 - Added sendDocument method"
5. Klik **Deploy**

#### 4. Update Version di User Project

Ada 2 cara:

**Cara A: Manual Update (Recommended for Production)**
1. Buka project yang menggunakan library
2. Klik ikon **📚 Libraries** di sidebar
3. Klik library **MiniSemut**
4. Pilih **Version** baru dari dropdown
5. Klik **Save**

**Cara B: Development Mode (For Testing)**
1. Di library settings, pilih version: **Head (development mode)**
2. Semua perubahan library langsung terpakai
3. ⚠️ **JANGAN** gunakan untuk production!

---

## 🛠️ Cara Custom Library untuk Kebutuhan Spesifik

### Scenario 1: Add Custom Helper Function

**Edit di Code.gs:**

```javascript
my.helper.formatCurrency = function(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
};

my.helper.formatDate = function(date) {
  return date.toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
```

**Gunakan di project:**

```javascript
const formatted = MiniSemut.helper.formatCurrency(50000);
ctx.reply(formatted); // Output: Rp 50.000
```

### Scenario 2: Add New API Method

**Edit di Code.gs:**

```javascript
my.telegram.sendPoll = function(chatId, question, options) {
  return apiRequest('sendPoll', {
    chat_id: chatId,
    question: question,
    options: JSON.stringify(options)
  });
};
```

**Gunakan di project:**

```javascript
bot.cmd('poll', ctx => {
  MiniSemut.telegram.sendPoll(
    ctx.chat.id,
    'Pilih warna favorit:',
    ['Merah', 'Biru', 'Hijau']
  );
});
```

### Scenario 3: Add State Management

**Edit di Code.gs - tambahkan di bagian helper:**

```javascript
my.helper.state = {
  set: function(chatId, state, timeout) {
    const cache = CacheService.getScriptCache();
    cache.put('state_' + chatId, state, timeout || 1800);
  },
  
  get: function(chatId) {
    const cache = CacheService.getScriptCache();
    return cache.get('state_' + chatId);
  },
  
  remove: function(chatId) {
    const cache = CacheService.getScriptCache();
    cache.remove('state_' + chatId);
  }
};
```

**Gunakan di project:**

```javascript
bot.cmd('register', ctx => {
  MiniSemut.helper.state.set(ctx.chat.id, 'awaiting_name', 1800);
  ctx.reply('Silahkan kirim nama Anda:');
});

bot.on(MiniSemut.enums.text, ctx => {
  const state = MiniSemut.helper.state.get(ctx.chat.id);
  
  if (state === 'awaiting_name') {
    const name = ctx.message.text;
    ctx.reply('Halo, ' + name + '!');
    MiniSemut.helper.state.remove(ctx.chat.id);
  }
});
```

---

## ✅ Best Practices

### 1. Versioning

Gunakan semantic versioning: `MAJOR.MINOR.PATCH`

```
v1.0.0 - Initial release
v1.0.1 - Bug fix
v1.1.0 - New feature (backward compatible)
v2.0.0 - Breaking changes
```

### 2. Documentation

Tambahkan JSDoc untuk setiap public function:

```javascript
/**
 * Send message to Telegram
 * @param {string} chatId - Chat ID
 * @param {string} text - Message text
 * @param {object} extra - Extra options
 * @return {object} Response from Telegram API
 */
my.telegram.sendMessage = function(chatId, text, extra) {
  // implementation...
};
```

### 3. Error Handling

```javascript
my.telegram.sendMessage = function(chatId, text, extra) {
  try {
    return apiRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: (extra && extra.parse_mode) || undefined
    });
  } catch (error) {
    Logger.log('Error sending message: ' + error.message);
    throw error;
  }
};
```

### 4. Backward Compatibility

Saat update library, jangan:
- ❌ Hapus atau rename function yang sudah ada
- ❌ Ubah parameter function yang sudah ada
- ❌ Ubah return value function yang sudah ada

Boleh:
- ✅ Tambahkan function baru
- ✅ Tambahkan optional parameter
- ✅ Deprecate function (buat alias ke function baru)

### 5. Testing

Sebelum create version baru:

```javascript
// Test script di library project
function testLibrary() {
  // Test initialization
  const bot = MiniSemut.init('fake_token', {});
  Logger.log('✓ Init test passed');
  
  // Test helper
  const keyboard = MiniSemut.helper.keyboard.inline([
    [MiniSemut.helper.button.callback('Test', 'test')]
  ]);
  Logger.log('✓ Helper test passed');
  
  // Test enums
  Logger.log('Text enum: ' + MiniSemut.enums.text);
  Logger.log('✓ Enums test passed');
}
```

### 6. Security

**JANGAN simpan di library:**
- ❌ Bot token
- ❌ API keys
- ❌ Password
- ❌ User data

**DI project user (yang menggunakan library):**
- ✅ Simpan token di Script Properties
- ✅ Validasi input dari user
- ✅ Implement rate limiting

### 7. Performance

```javascript
// ❌ Bad: Multiple API calls dalam loop
for (var i = 0; i < users.length; i++) {
  bot.telegram.sendMessage(users[i], 'Hello');
}

// ✅ Good: Batch processing dengan delay
for (var i = 0; i < users.length; i++) {
  bot.telegram.sendMessage(users[i], 'Hello');
  if (i % 10 === 0) {
    Utilities.sleep(1000); // Delay setiap 10 messages
  }
}
```

---

## 🔍 Troubleshooting

### Problem: "Library not found"

**Solution:**
1. Check Script ID benar
2. Check sharing settings: "Anyone with the link can view"
3. Pastikan sudah create deployment

### Problem: "Function not found"

**Solution:**
1. Check version library (update ke versi terbaru)
2. Check typo nama function
3. Check identifier library (harus `MiniSemut`)

### Problem: Changes tidak terpakai

**Solution:**
1. Pastikan sudah create new version
2. Update version di project yang menggunakan library
3. Reload editor

### Problem: "Unauthorized"

**Solution:**
1. Check sharing permission library
2. Minta akses ke owner library
3. Verify Google account logged in

---

## 📊 Contoh Project Lengkap

```javascript
/**
 * INVENTORY BOT - Using MiniSemut Library
 */

// Configuration
const CONFIG = {
  adminbot: PropertiesService.getScriptProperties().getProperty('ADMIN_ID'),
  tokenbot: PropertiesService.getScriptProperties().getProperty('BOT_TOKEN'),
  usernamebot: 'inventory_bot'
};

// Initialize bot
const bot = MiniSemut.init(CONFIG.tokenbot, {
  log_id: CONFIG.adminbot,
  username: CONFIG.usernamebot,
  prefix_command: './!$'
});

const helper = MiniSemut.helper;
const enums = MiniSemut.enums;

// Handlers
bot.start(ctx => {
  const keyboard = helper.keyboard.inline([
    [helper.button.callback('📦 Check Stock', 'check')],
    [helper.button.callback('➕ Add Item', 'add')]
  ]);
  
  ctx.replyWithHTML(
    '<b>Welcome to Inventory Bot!</b>\n\n' +
    'Select an option:',
    keyboard
  );
});

bot.cmd('help', ctx => {
  ctx.reply(
    'Available commands:\n' +
    '/start - Main menu\n' +
    '/check [code] - Check stock\n' +
    '/help - This message'
  );
});

bot.hears(/^[\/\.\!]check\s+(.+)/i, ctx => {
  const itemCode = ctx.match[1].toUpperCase();
  // Check stock logic here...
  ctx.reply('Checking stock for: ' + itemCode);
});

bot.on(enums.callback_query, ctx => {
  const data = ctx.callbackQuery.data;
  ctx.answerCbQuery();
  
  if (data === 'check') {
    ctx.editMessageText('Please send item code:', { parse_mode: 'HTML' });
  }
});

// Webhook
function doPost(e) {
  bot.doPost(e);
}

function setWebhook() {
  const url = ScriptApp.getService().getUrl();
  bot.telegram.setWebhook(url);
  Logger.log('Webhook set!');
}
```

---

## 📚 Resources

- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Google Apps Script Docs:** https://developers.google.com/apps-script
- **Library Best Practices:** https://developers.google.com/apps-script/guides/libraries

---

**Selamat mengembangkan bot Telegram dengan MiniSemut! 🚀🐜**
