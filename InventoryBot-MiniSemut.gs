/**
 * ============================================================================
 * INVENTORY BOT - MENGGUNAKAN LIBRARY MINISEMUT
 * ============================================================================
 * 
 * Contoh implementasi lengkap inventory tracking bot
 * menggunakan library MiniSemut yang kita buat sendiri
 * 
 * Features:
 * - Real-time inventory tracking
 * - Stock alerts
 * - Search & filtering
 * - Backup units management
 * - State management untuk multi-step flow
 * 
 * ============================================================================
 */

// ============================================================================
// KONFIGURASI
// ============================================================================

const CONFIG = {
  // Bot Configuration
  adminbot: "YOUR_ADMIN_ID",
  groupAlert: "YOUR_GROUP_ID",
  usernamebot: "inventory_bot",
  tokenbot: "YOUR_BOT_TOKEN",
  
  // Spreadsheet Configuration
  inventorySpreadsheetId: "YOUR_SPREADSHEET_ID",
  
  // Stock Alert Thresholds
  stockAlert: {
    minimum: 5,
    critical: 2
  },
  
  // Cache Settings
  cacheTimeout: 1800 // 30 menit
};

// ============================================================================
// INISIALISASI BOT DENGAN LIBRARY MINISEMUT
// ============================================================================

const bot = MiniSemut.init(CONFIG.tokenbot, {
  log_id: CONFIG.adminbot,
  username: CONFIG.usernamebot,
  prefix_command: './!$'
});

const helper = MiniSemut.helper;
const enums = MiniSemut.enums;
const cache = CacheService.getScriptCache();

// ============================================================================
// DATABASE CLASS (Same as before)
// ============================================================================

class InventoryManager {
  
  constructor() {
    this.inventory = {
      ssid: CONFIG.inventorySpreadsheetId,
      ssurl: `https://docs.google.com/spreadsheets/d/${CONFIG.inventorySpreadsheetId}/edit`,
      sheets: {
        main: "inventory",
        backup: "backup_units",
        movement: "stock_movement",
        alerts: "stock_alerts"
      }
    };
  }
  
  get Spreadsheet() {
    try {
      return SpreadsheetApp.openByUrl(this.inventory.ssurl);
    } catch (e) {
      throw new Error(`Tidak dapat membuka spreadsheet: ${e.message}`);
    }
  }
  
  getSheet(sheetName) {
    const sheet = this.Spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' tidak ditemukan!`);
    }
    return sheet;
  }
  
  checkStock(itemCode) {
    const sheet = this.getSheet(this.inventory.sheets.main);
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) return null;
    
    const data = sheet.getRange(`A2:I${lastRow}`).getValues();
    const item = data.find(row => row[0].toString().toUpperCase() === itemCode.toUpperCase());
    
    if (!item) return null;
    
    return {
      itemCode: item[0],
      itemName: item[1],
      category: item[2],
      location: item[3],
      currentStock: item[4],
      minStock: item[5],
      backupAvailable: item[6],
      lastUpdate: item[7],
      status: item[8],
      stockLevel: this.getStockLevel(item[4], item[5])
    };
  }
  
  getStockLevel(currentStock, minStock) {
    if (currentStock <= CONFIG.stockAlert.critical) return 'CRITICAL';
    if (currentStock <= CONFIG.stockAlert.minimum || currentStock <= minStock) return 'LOW';
    return 'NORMAL';
  }
  
  updateStock(itemCode, newStock, movementType, notes) {
    const sheet = this.getSheet(this.inventory.sheets.main);
    const data = sheet.getRange(`A2:I${sheet.getLastRow()}`).getValues();
    
    const itemIndex = data.findIndex(row => 
      row[0].toString().toUpperCase() === itemCode.toUpperCase()
    );
    
    if (itemIndex === -1) {
      throw new Error(`Item ${itemCode} tidak ditemukan!`);
    }
    
    const oldStock = data[itemIndex][4];
    const row = itemIndex + 2;
    
    sheet.getRange(`E${row}`).setValue(newStock);
    sheet.getRange(`H${row}`).setValue(new Date());
    
    this.logStockMovement(itemCode, oldStock, newStock, movementType, notes);
    
    return {
      success: true,
      itemCode: itemCode,
      oldStock: oldStock,
      newStock: newStock,
      difference: newStock - oldStock
    };
  }
  
  logStockMovement(itemCode, oldStock, newStock, movementType, notes) {
    const sheet = this.getSheet(this.inventory.sheets.movement);
    sheet.appendRow([
      new Date(),
      itemCode,
      oldStock,
      newStock,
      newStock - oldStock,
      movementType,
      notes,
      Session.getActiveUser().getEmail() || 'Bot'
    ]);
  }
  
  searchItems(query) {
    const sheet = this.getSheet(this.inventory.sheets.main);
    const data = sheet.getRange(`A2:I${sheet.getLastRow()}`).getValues();
    
    const regex = new RegExp(query, 'i');
    
    return data.filter(row => 
      regex.test(row[0]) || regex.test(row[1]) || regex.test(row[2])
    ).map(row => ({
      itemCode: row[0],
      itemName: row[1],
      category: row[2],
      location: row[3],
      currentStock: row[4],
      minStock: row[5],
      stockLevel: this.getStockLevel(row[4], row[5])
    }));
  }
  
  getLowStockItems() {
    const sheet = this.getSheet(this.inventory.sheets.main);
    const data = sheet.getRange(`A2:I${sheet.getLastRow()}`).getValues();
    
    return data.filter(row => {
      const level = this.getStockLevel(row[4], row[5]);
      return level === 'LOW' || level === 'CRITICAL';
    }).map(row => ({
      itemCode: row[0],
      itemName: row[1],
      currentStock: row[4],
      minStock: row[5],
      stockLevel: this.getStockLevel(row[4], row[5])
    }));
  }
}

const InventoryDB = new InventoryManager();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatStockInfo(item) {
  const stockEmoji = {
    'NORMAL': '🟢',
    'LOW': '🟡',
    'CRITICAL': '🔴'
  };
  
  return `${stockEmoji[item.stockLevel]} <b>${item.itemName}</b> (${item.itemCode})\n` +
         `📦 Stock: ${item.currentStock} | Min: ${item.minStock}\n` +
         `📍 Lokasi: ${item.location}\n` +
         `🔄 Update: ${item.lastUpdate ? new Date(item.lastUpdate).toLocaleString('id-ID') : 'N/A'}`;
}

// ============================================================================
// BOT HANDLERS MENGGUNAKAN LIBRARY MINISEMUT
// ============================================================================

/**
 * Handler: /start - Menu utama
 */
bot.start(ctx => {
  const welcomeMsg = 
    `🤖 <b>Selamat Datang di Inventory Tracker Bot!</b>\n\n` +
    `Bot ini menggunakan library <b>MiniSemut</b> yang kita buat sendiri.\n\n` +
    `<b>Fitur:</b>\n` +
    `📦 Cek & update stock\n` +
    `🔍 Pencarian inventory\n` +
    `📊 Laporan inventory\n\n` +
    `Pilih menu di bawah:`;
  
  const keyboard = helper.keyboard.inline([
    [helper.button.callback('📦 Cek Stock', 'menu_check')],
    [helper.button.callback('➕ Update Stock', 'menu_update')],
    [helper.button.callback('🔍 Cari Item', 'menu_search')],
    [helper.button.callback('⚠️ Stock Rendah', 'menu_low')]
  ]);
  
  ctx.replyWithHTML(welcomeMsg, keyboard);
});

/**
 * Handler: /help
 */
bot.cmd('help', ctx => {
  const helpMsg = 
    `<b>📖 PANDUAN BOT</b>\n\n` +
    `/check [code] - Cek stock item\n` +
    `/search [keyword] - Cari item\n` +
    `/low - Lihat stock rendah\n` +
    `/help - Panduan ini\n\n` +
    `<i>Bot ini dibuat dengan library MiniSemut</i>`;
  
  ctx.replyWithHTML(helpMsg);
});

/**
 * Handler: /check [item_code]
 */
bot.hears(/^[\/\.\!]check\s+(.+)/i, ctx => {
  const itemCode = ctx.match[1].trim().toUpperCase();
  
  try {
    const item = InventoryDB.checkStock(itemCode);
    
    if (!item) {
      return ctx.replyWithHTML(`❌ Item <b>${itemCode}</b> tidak ditemukan!`);
    }
    
    const stockInfo = formatStockInfo(item);
    const keyboard = helper.keyboard.inline([
      [helper.button.callback('➕ Update', `update_${itemCode}`)]
    ]);
    
    ctx.replyWithHTML(stockInfo, keyboard);
    
  } catch (e) {
    ctx.replyWithHTML(`❌ Error: ${e.message}`);
  }
});

/**
 * Handler: /search [keyword]
 */
bot.hears(/^[\/\.\!]search\s+(.+)/i, ctx => {
  const keyword = ctx.match[1].trim();
  
  try {
    const results = InventoryDB.searchItems(keyword);
    
    if (!results.length) {
      return ctx.replyWithHTML(`🔍 Tidak ada item: "<b>${keyword}</b>"`);
    }
    
    let msg = `🔍 <b>HASIL: "${keyword}"</b>\n\n`;
    
    results.slice(0, 10).forEach((item, i) => {
      const emoji = item.stockLevel === 'NORMAL' ? '🟢' : 
                   item.stockLevel === 'LOW' ? '🟡' : '🔴';
      msg += `${i+1}. ${emoji} <b>${item.itemName}</b>\n`;
      msg += `   ${item.itemCode} | Stock: ${item.currentStock}\n\n`;
    });
    
    ctx.replyWithHTML(msg);
    
  } catch (e) {
    ctx.replyWithHTML(`❌ Error: ${e.message}`);
  }
});

/**
 * Handler: /low - Stock rendah
 */
bot.cmd('low', ctx => {
  try {
    const lowStockItems = InventoryDB.getLowStockItems();
    
    if (!lowStockItems.length) {
      return ctx.replyWithHTML('✅ Semua stock cukup!');
    }
    
    let msg = `⚠️ <b>STOCK RENDAH (${lowStockItems.length})</b>\n\n`;
    
    lowStockItems.forEach((item, i) => {
      const emoji = item.stockLevel === 'CRITICAL' ? '🔴' : '🟡';
      msg += `${i+1}. ${emoji} <b>${item.itemName}</b>\n`;
      msg += `   Stock: ${item.currentStock} | Min: ${item.minStock}\n\n`;
    });
    
    ctx.replyWithHTML(msg);
    
  } catch (e) {
    ctx.replyWithHTML(`❌ Error: ${e.message}`);
  }
});

/**
 * Handler: Callback Query
 */
bot.on(enums.callback_query, ctx => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat.id;
  
  // Menu: Check Stock
  if (data === 'menu_check') {
    cache.put(`state_${chatId}`, 'awaiting_check', CONFIG.cacheTimeout);
    ctx.editMessageText(
      '📦 <b>CEK STOCK</b>\n\nKirim ITEM CODE:',
      { parse_mode: 'HTML' }
    );
  }
  
  // Menu: Update Stock
  else if (data === 'menu_update') {
    cache.put(`state_${chatId}`, 'awaiting_update_code', CONFIG.cacheTimeout);
    ctx.editMessageText(
      '➕ <b>UPDATE STOCK</b>\n\nKirim ITEM CODE:',
      { parse_mode: 'HTML' }
    );
  }
  
  // Menu: Search
  else if (data === 'menu_search') {
    cache.put(`state_${chatId}`, 'awaiting_search', CONFIG.cacheTimeout);
    ctx.editMessageText(
      '🔍 <b>PENCARIAN</b>\n\nKirim keyword:',
      { parse_mode: 'HTML' }
    );
  }
  
  // Menu: Low Stock
  else if (data === 'menu_low') {
    try {
      const items = InventoryDB.getLowStockItems();
      
      if (!items.length) {
        ctx.editMessageText('✅ Semua stock cukup!', { parse_mode: 'HTML' });
      } else {
        let msg = `⚠️ <b>STOCK RENDAH</b>\n\n`;
        items.slice(0, 5).forEach(item => {
          const emoji = item.stockLevel === 'CRITICAL' ? '🔴' : '🟡';
          msg += `${emoji} ${item.itemName} (${item.currentStock})\n`;
        });
        ctx.editMessageText(msg, { parse_mode: 'HTML' });
      }
    } catch (e) {
      ctx.answerCbQuery('Error: ' + e.message);
    }
  }
  
  // Update button
  else if (data.startsWith('update_')) {
    const itemCode = data.replace('update_', '');
    cache.put(`state_${chatId}`, 'awaiting_new_stock', CONFIG.cacheTimeout);
    cache.put(`item_code_${chatId}`, itemCode, CONFIG.cacheTimeout);
    
    ctx.editMessageText(
      `➕ <b>UPDATE: ${itemCode}</b>\n\nKirim jumlah stock baru:`,
      { parse_mode: 'HTML' }
    );
  }
  
  ctx.answerCbQuery();
});

/**
 * Handler: Text Message (State-based)
 */
bot.on(enums.text, ctx => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();
  const state = cache.get(`state_${chatId}`);
  
  if (!state) return;
  
  // State: Awaiting item code untuk check
  if (state === 'awaiting_check') {
    const itemCode = text.toUpperCase();
    
    try {
      const item = InventoryDB.checkStock(itemCode);
      
      if (!item) {
        return ctx.replyWithHTML(`❌ Item <b>${itemCode}</b> tidak ditemukan!`);
      }
      
      ctx.replyWithHTML(formatStockInfo(item));
      cache.remove(`state_${chatId}`);
      
    } catch (e) {
      ctx.replyWithHTML(`❌ Error: ${e.message}`);
    }
  }
  
  // State: Awaiting item code untuk update
  else if (state === 'awaiting_update_code') {
    const itemCode = text.toUpperCase();
    
    try {
      const item = InventoryDB.checkStock(itemCode);
      
      if (!item) {
        return ctx.replyWithHTML(`❌ Item tidak ditemukan!`);
      }
      
      cache.put(`state_${chatId}`, 'awaiting_new_stock', CONFIG.cacheTimeout);
      cache.put(`item_code_${chatId}`, itemCode, CONFIG.cacheTimeout);
      
      ctx.replyWithHTML(
        `➕ <b>UPDATE: ${itemCode}</b>\n` +
        `Stock saat ini: <b>${item.currentStock}</b>\n\n` +
        `Kirim jumlah stock baru:`
      );
      
    } catch (e) {
      ctx.replyWithHTML(`❌ Error: ${e.message}`);
    }
  }
  
  // State: Awaiting new stock value
  else if (state === 'awaiting_new_stock') {
    const itemCode = cache.get(`item_code_${chatId}`);
    const newStock = parseInt(text);
    
    if (isNaN(newStock) || newStock < 0) {
      return ctx.replyWithHTML('❌ Harus angka positif!');
    }
    
    try {
      const result = InventoryDB.updateStock(
        itemCode, 
        newStock, 
        'MANUAL', 
        `Updated by ${ctx.from.first_name}`
      );
      
      ctx.replyWithHTML(
        `✅ <b>STOCK UPDATED!</b>\n\n` +
        `📦 Item: ${result.itemCode}\n` +
        `📊 ${result.oldStock} → ${result.newStock}\n` +
        `📈 Selisih: ${result.difference > 0 ? '+' : ''}${result.difference}`
      );
      
      cache.remove(`state_${chatId}`);
      cache.remove(`item_code_${chatId}`);
      
    } catch (e) {
      ctx.replyWithHTML(`❌ Error: ${e.message}`);
    }
  }
  
  // State: Awaiting search query
  else if (state === 'awaiting_search') {
    const keyword = text;
    
    try {
      const results = InventoryDB.searchItems(keyword);
      
      if (!results.length) {
        ctx.replyWithHTML(`🔍 Tidak ada hasil untuk: "<b>${keyword}</b>"`);
      } else {
        let msg = `🔍 <b>HASIL: "${keyword}"</b>\n\n`;
        results.slice(0, 10).forEach((item, i) => {
          msg += `${i+1}. ${item.itemName} (${item.itemCode})\n`;
        });
        ctx.replyWithHTML(msg);
      }
      
      cache.remove(`state_${chatId}`);
      
    } catch (e) {
      ctx.replyWithHTML(`❌ Error: ${e.message}`);
    }
  }
});

// ============================================================================
// WEBHOOK SETUP
// ============================================================================

/**
 * Main entry point untuk webhook
 */
function doPost(e) {
  try {
    bot.doPost(e);
  } catch (error) {
    Logger.log(`Error in doPost: ${error.message}`);
  }
}

/**
 * Setup webhook
 */
function setWebhook() {
  const url = ScriptApp.getService().getUrl();
  bot.telegram.setWebhook(url);
  Logger.log(`✓ Webhook set to: ${url}`);
}

/**
 * Get webhook info
 */
function getWebhookInfo() {
  const info = bot.telegram.getWebhookInfo();
  Logger.log(info);
  return info;
}
