/**
 * ============================================================================
 * MINISEMUT LIBRARY - Main Entry Point
 * ============================================================================
 * 
 * Google Apps Script Library untuk Telegram Bot
 * Version: 1.0.0
 * Author: Custom Development
 * 
 * Terinspirasi dari pola GAS-Lib-v3 dan best practices Google Apps Script
 * 
 * CARA MENGGUNAKAN LIBRARY:
 * 
 * 1. Add library dengan Script ID
 * 2. Initialize bot:
 *    const bot = MiniSemut.init(token, config);
 * 3. Register handlers:
 *    bot.start(ctx => { ... });
 *    bot.cmd('help', ctx => { ... });
 * 4. Setup webhook:
 *    function doPost(e) { bot.doPost(e); }
 * 
 * ============================================================================
 */

var MINISEMUT = (function() {
  
  var my = {};
  
  // =========================================================================
  // PRIVATE VARIABLES
  // =========================================================================
  
  var _token = null;
  var _config = {};
  var _handlers = {
    start: null,
    commands: {},
    hears: [],
    events: {}
  };
  var _baseUrl = 'https://api.telegram.org/bot';
  
  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  
  /**
   * Initialize MiniSemut bot
   * @param {string} token - Bot token from BotFather
   * @param {object} config - Configuration object
   * @return {object} Bot instance
   */
  my.init = function(token, config) {
    if (!token) {
      throw new Error('Bot token is required!');
    }
    
    _token = token;
    _config = config || {};
    
    // Default configuration
    _config.log_id = _config.log_id || null;
    _config.username = _config.username || '';
    _config.prefix_command = _config.prefix_command || '/';
    
    Logger.log('✓ MiniSemut initialized successfully');
    
    return {
      telegram: my.telegram,
      tg: my.telegram, // Alias
      start: registerStartHandler,
      cmd: registerCommandHandler,
      hears: registerHearsHandler,
      on: registerEventHandler,
      doPost: handleDoPost,
      getConfig: function() { return _config; }
    };
  };
  
  // =========================================================================
  // HANDLER REGISTRATION
  // =========================================================================
  
  /**
   * Register /start command handler
   */
  function registerStartHandler(handler) {
    _handlers.start = handler;
    Logger.log('✓ Start handler registered');
  }
  
  /**
   * Register command handler
   * @param {string} command - Command name (without /)
   * @param {function} handler - Handler function
   */
  function registerCommandHandler(command, handler) {
    _handlers.commands[command] = handler;
    Logger.log('✓ Command handler registered: /' + command);
  }
  
  /**
   * Register regex pattern handler
   * @param {RegExp} pattern - Regex pattern
   * @param {function} handler - Handler function
   */
  function registerHearsHandler(pattern, handler) {
    _handlers.hears.push({
      pattern: pattern,
      handler: handler
    });
    Logger.log('✓ Hears handler registered: ' + pattern);
  }
  
  /**
   * Register event handler
   * @param {string} eventType - Event type (from enums)
   * @param {function} handler - Handler function
   */
  function registerEventHandler(eventType, handler) {
    _handlers.events[eventType] = handler;
    Logger.log('✓ Event handler registered: ' + eventType);
  }
  
  // =========================================================================
  // WEBHOOK HANDLER
  // =========================================================================
  
  /**
   * Handle incoming webhook from Telegram
   * @param {object} e - POST event parameter
   */
  function handleDoPost(e) {
    try {
      if (!e || !e.postData) {
        Logger.log('✘ No POST data received');
        return ContentService.createTextOutput('No data');
      }
      
      var update = JSON.parse(e.postData.contents);
      Logger.log('✓ Update received: ' + JSON.stringify(update));
      
      routeUpdate(update);
      
      return ContentService.createTextOutput('ok');
      
    } catch (error) {
      Logger.log('✘ Error in doPost: ' + error.message);
      
      // Send error to admin if configured
      if (_config.log_id) {
        my.telegram.sendMessage(_config.log_id, 
          '🚨 Error in doPost:\n' + error.message + '\n\n' + error.stack
        );
      }
      
      return ContentService.createTextOutput('error');
    }
  }
  
  /**
   * Route update to appropriate handler
   * @param {object} update - Telegram update object
   */
  function routeUpdate(update) {
    var ctx = createContext(update);
    
    // Handle callback query
    if (update.callback_query) {
      if (_handlers.events['callback_query']) {
        _handlers.events['callback_query'](ctx);
      }
      return;
    }
    
    // Handle message
    if (update.message) {
      var text = update.message.text || '';
      
      // Check for /start command
      if (text === '/start' || text === '/start@' + _config.username) {
        if (_handlers.start) {
          _handlers.start(ctx);
          return;
        }
      }
      
      // Check for registered commands
      var prefixes = _config.prefix_command.split('');
      for (var i = 0; i < prefixes.length; i++) {
        if (text.startsWith(prefixes[i])) {
          var parts = text.substring(1).split(' ');
          var command = parts[0].split('@')[0]; // Remove @username if present
          
          if (_handlers.commands[command]) {
            _handlers.commands[command](ctx);
            return;
          }
        }
      }
      
      // Check for hears patterns
      for (var j = 0; j < _handlers.hears.length; j++) {
        var match = text.match(_handlers.hears[j].pattern);
        if (match) {
          ctx.match = match;
          _handlers.hears[j].handler(ctx);
          return;
        }
      }
      
      // Check for text event handler
      if (update.message.text && _handlers.events['text']) {
        _handlers.events['text'](ctx);
        return;
      }
      
      // Check for photo event handler
      if (update.message.photo && _handlers.events['photo']) {
        _handlers.events['photo'](ctx);
        return;
      }
    }
  }
  
  /**
   * Create context object for handlers
   * @param {object} update - Telegram update object
   * @return {object} Context object
   */
  function createContext(update) {
    var ctx = {
      update: update,
      message: update.message || update.callback_query.message,
      chat: (update.message || update.callback_query.message).chat,
      from: update.message ? update.message.from : update.callback_query.from,
      callbackQuery: update.callback_query || null,
      match: null
    };
    
    // Add reply methods
    ctx.reply = function(text, extra) {
      return my.telegram.sendMessage(ctx.chat.id, text, extra);
    };
    
    ctx.replyIt = function(text, extra) {
      extra = extra || {};
      extra.reply_to_message_id = ctx.message.message_id;
      return my.telegram.sendMessage(ctx.chat.id, text, extra);
    };
    
    ctx.replyWithHTML = function(text, keyboard) {
      return my.telegram.sendMessageHTML(ctx.chat.id, text, keyboard);
    };
    
    ctx.editMessageText = function(text, extra) {
      extra = extra || {};
      extra.chat_id = ctx.chat.id;
      extra.message_id = ctx.message.message_id;
      return my.telegram.editMessageText(text, extra);
    };
    
    ctx.answerCbQuery = function(text, showAlert) {
      if (!ctx.callbackQuery) return;
      return my.telegram.answerCallbackQuery(
        ctx.callbackQuery.id, 
        text || '', 
        showAlert || false
      );
    };
    
    return ctx;
  }
  
  // =========================================================================
  // TELEGRAM API WRAPPER
  // =========================================================================
  
  my.telegram = {
    
    /**
     * Send message
     */
    sendMessage: function(chatId, text, extra) {
      return apiRequest('sendMessage', {
        chat_id: chatId,
        text: text,
        parse_mode: (extra && extra.parse_mode) || undefined,
        reply_markup: (extra && extra.reply_markup) || undefined,
        reply_to_message_id: (extra && extra.reply_to_message_id) || undefined
      });
    },
    
    /**
     * Send message with HTML formatting
     */
    sendMessageHTML: function(chatId, text, keyboard) {
      return apiRequest('sendMessage', {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: keyboard || undefined
      });
    },
    
    /**
     * Edit message text
     */
    editMessageText: function(text, extra) {
      return apiRequest('editMessageText', {
        chat_id: extra.chat_id,
        message_id: extra.message_id,
        text: text,
        parse_mode: (extra && extra.parse_mode) || undefined,
        reply_markup: (extra && extra.reply_markup) || undefined
      });
    },
    
    /**
     * Delete message
     */
    deleteMessage: function(chatId, messageId) {
      return apiRequest('deleteMessage', {
        chat_id: chatId,
        message_id: messageId
      });
    },
    
    /**
     * Answer callback query
     */
    answerCallbackQuery: function(callbackQueryId, text, showAlert) {
      return apiRequest('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text: text || '',
        show_alert: showAlert || false
      });
    },
    
    /**
     * Send photo
     */
    sendPhoto: function(chatId, photo, caption) {
      return apiRequest('sendPhoto', {
        chat_id: chatId,
        photo: photo,
        caption: caption || undefined
      });
    },
    
    /**
     * Set webhook
     */
    setWebhook: function(url) {
      return apiRequest('setWebhook', {
        url: url
      });
    },
    
    /**
     * Get webhook info
     */
    getWebhookInfo: function() {
      return apiRequest('getWebhookInfo', {});
    },
    
    /**
     * Delete webhook
     */
    deleteWebhook: function() {
      return apiRequest('deleteWebhook', {});
    }
  };
  
  /**
   * Make API request to Telegram
   * @param {string} method - API method name
   * @param {object} data - Request data
   * @return {object} Response
   */
  function apiRequest(method, data) {
    try {
      var url = _baseUrl + _token + '/' + method;
      
      var options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(data),
        muteHttpExceptions: true
      };
      
      var response = UrlFetchApp.fetch(url, options);
      var result = JSON.parse(response.getContentText());
      
      if (!result.ok) {
        Logger.log('✘ API Error: ' + result.description);
        throw new Error(result.description);
      }
      
      return result.result;
      
    } catch (error) {
      Logger.log('✘ Request failed: ' + error.message);
      throw error;
    }
  }
  
  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================
  
  my.helper = {
    
    /**
     * Keyboard utilities
     */
    keyboard: {
      /**
       * Create inline keyboard
       * @param {array} buttons - 2D array of buttons
       * @return {object} Keyboard markup
       */
      inline: function(buttons) {
        return {
          inline_keyboard: buttons
        };
      }
    },
    
    /**
     * Button utilities
     */
    button: {
      /**
       * Create callback button
       * @param {string} text - Button text
       * @param {string} data - Callback data
       * @return {object} Button object
       */
      callback: function(text, data) {
        return {
          text: text,
          callback_data: data
        };
      },
      
      /**
       * Create URL button
       * @param {string} text - Button text
       * @param {string} url - URL to open
       * @return {object} Button object
       */
      url: function(text, url) {
        return {
          text: text,
          url: url
        };
      }
    }
  };
  
  // =========================================================================
  // ENUMS
  // =========================================================================
  
  my.enums = {
    // Event types
    text: 'text',
    photo: 'photo',
    video: 'video',
    document: 'document',
    audio: 'audio',
    voice: 'voice',
    callback_query: 'callback_query',
    
    // Parse modes
    HTML: 'HTML',
    Markdown: 'Markdown',
    MarkdownV2: 'MarkdownV2',
    
    // Chat types
    private: 'private',
    group: 'group',
    supergroup: 'supergroup',
    channel: 'channel'
  };
  
  // =========================================================================
  // RETURN PUBLIC API
  // =========================================================================
  
  return my;
  
})();

// Export for library usage
var MiniSemut = MINISEMUT;
