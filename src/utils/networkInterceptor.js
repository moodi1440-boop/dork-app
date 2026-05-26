/**
 * Network Monitoring Interceptor
 * يعترض جميع طلبات API ويكشف عن الـ data leaks
 * 🔍 مراقبة حقيقية للبيانات المُرسلة والمُستقبلة
 */

export const networkMonitor = {
  requestLog: {},
  requestTimestamps: {},
  config: {
    warningThreshold: 50 * 1024, // 50 KB
    maxRequestsPerMinute: 5,
    enabled: true,
  },

  /**
   * تهيئة المراقب
   */
  init() {
    console.log(
      '%c🔍 NETWORK INTERCEPTOR INITIALIZED - Monitoring All API Calls',
      'color: #4ecdc4; font-weight: bold; font-size: 14px; background: #222; padding: 10px'
    );

    this.interceptFetch();
    this.interceptSupabase();
    this.startDashboard();
  },

  /**
   * اعتراض Fetch API Calls
   */
  interceptFetch() {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async (...args) => {
      const [resource, config] = args;
      const startTime = performance.now();
      const method = (config?.method || 'GET').toUpperCase();

      try {
        const response = await originalFetch.apply(window, args);
        const clonedResponse = response.clone();

        // قراءة response body
        let size = 0;
        let text = '';
        try {
          text = await clonedResponse.text();
          size = new Blob([text]).size;
        } catch (e) {
          size = 0;
        }

        const duration = performance.now() - startTime;
        const url = typeof resource === 'string' ? resource : resource.url;

        self.logRequest({
          type: 'FETCH',
          method,
          url,
          size,
          duration,
          timestamp: Date.now(),
          status: response.status,
        });

        return response;
      } catch (error) {
        console.error('❌ Fetch Error:', error);
        throw error;
      }
    };
  },

  /**
   * اعتراض Supabase Calls
   */
  interceptSupabase() {
    const self = this;
    if (!window.supabase) return;

    const originalFrom = window.supabase.from;

    window.supabase.from = function(table) {
      const queryBuilder = originalFrom.call(this, table);

      // اعتراض select
      const originalSelect = queryBuilder.select;
      queryBuilder.select = function(...args) {
        const result = originalSelect.apply(this, args);
        const originalData = result.data || [];

        const dataSize = JSON.stringify(originalData).length;
        self.logRequest({
          type: 'SUPABASE_SELECT',
          method: 'SELECT',
          url: `supabase://${table}`,
          size: dataSize,
          duration: 0,
          timestamp: Date.now(),
          status: 200,
          rowCount: Array.isArray(originalData) ? originalData.length : 1,
        });

        return result;
      };

      return queryBuilder;
    };
  },

  /**
   * تسجيل الطلب وتحليله
   */
  logRequest(request) {
    if (!this.config.enabled) return;

    const { url, type, method, size, duration, timestamp, status, rowCount } = request;
    const key = `${type}::${method}::${url}`;

    // تتبع timestamps الطلبات
    if (!this.requestTimestamps[key]) {
      this.requestTimestamps[key] = [];
    }

    this.requestTimestamps[key].push(timestamp);

    // تنظيف timestamps القديمة (أكثر من دقيقة)
    const oneMinuteAgo = timestamp - 60000;
    this.requestTimestamps[key] = this.requestTimestamps[key].filter(t => t > oneMinuteAgo);

    // تجميع الإحصائيات
    if (!this.requestLog[key]) {
      this.requestLog[key] = {
        count: 0,
        totalSize: 0,
        avgSize: 0,
        maxSize: 0,
        minSize: Infinity,
        lastCall: null,
        rowCount: 0,
      };
    }

    const stats = this.requestLog[key];
    stats.count++;
    stats.totalSize += size;
    stats.avgSize = Math.round(stats.totalSize / stats.count);
    stats.maxSize = Math.max(stats.maxSize, size);
    stats.minSize = Math.min(stats.minSize, size);
    stats.lastCall = new Date().toLocaleTimeString('ar-SA');
    if (rowCount) stats.rowCount = rowCount;

    // طباعة تفاصيل الطلب
    this.printRequest(request, stats);

    // فحص التحذيرات
    this.checkThresholds(request, stats);
  },

  /**
   * طباعة تفاصيل الطلب في Console
   */
  printRequest(request, stats) {
    const { type, url, method, size, duration, status, rowCount } = request;
    const sizeKB = (size / 1024).toFixed(2);
    const isWarning = size > this.config.warningThreshold;
    const color = isWarning ? '#ff6b6b' : '#51cf66';

    const icon = type === 'SUPABASE_SELECT' ? '📊' : '🌐';
    const statusIcon = status >= 400 ? '❌' : '✅';

    // السطر الأول
    console.log(
      `%c${icon} ${statusIcon} ${method.padEnd(6)} | ${sizeKB.padStart(8)} KB | ${Math.round(duration).toString().padStart(4)}ms`,
      `color: ${color}; font-weight: bold; font-size: 12px; font-family: monospace`
    );

    // السطر الثاني - الـ URL
    const urlDisplay = url.length > 60 ? url.substring(0, 57) + '...' : url;
    console.log(
      `%c   └─ ${urlDisplay}${rowCount ? ` (${rowCount} rows)` : ''}`,
      `color: ${color}; font-size: 11px; font-family: monospace`
    );
  },

  /**
   * فحص التحذيرات والتنبيهات
   */
  checkThresholds(request, stats) {
    const { url, type, method, size } = request;
    const key = `${type}::${method}::${url}`;
    const requestsInMinute = this.requestTimestamps[key].length;

    // ⚠️ تحذير: حجم أكبر من 50 KB
    if (size > this.config.warningThreshold) {
      console.warn(
        `%c⚠️  OVERSIZED PAYLOAD DETECTED`,
        'color: #ff6b6b; font-weight: bold; font-size: 13px; background: #1a1a1a; padding: 5px'
      );
      console.warn(
        `%c    ${type} → ${url.substring(0, 50)}\n    Size: ${(size / 1024).toFixed(2)} KB (Threshold: 50 KB)\n    Excess: ${((size - this.config.warningThreshold) / 1024).toFixed(2)} KB`,
        'color: #ff6b6b; font-size: 11px; font-family: monospace'
      );
    }

    // 🔁 تحذير: طلبات متكررة بسرعة
    if (requestsInMinute > this.config.maxRequestsPerMinute) {
      console.warn(
        `%c🔁 EXCESSIVE REQUESTS DETECTED`,
        'color: #ffd93d; font-weight: bold; font-size: 13px; background: #1a1a1a; padding: 5px'
      );
      console.warn(
        `%c    ${type} → ${method}\n    Requests/minute: ${requestsInMinute} (Max: ${this.config.maxRequestsPerMinute})\n    This might indicate polling or loops!`,
        'color: #ffd93d; font-size: 11px; font-family: monospace'
      );
    }
  },

  /**
   * عرض Dashboard في Console
   */
  startDashboard() {
    const self = this;

    setInterval(() => {
      if (!self.config.enabled || Object.keys(self.requestLog).length === 0) return;

      console.clear();
      console.log(
        '%c╔════════════════════════════════════════════════════════════╗\n║          📊 NETWORK MONITOR DASHBOARD 🔍                    ║\n╚════════════════════════════════════════════════════════════╝',
        'color: #4ecdc4; font-weight: bold; font-size: 12px; font-family: monospace'
      );

      const data = Object.entries(self.requestLog)
        .sort((a, b) => b[1].totalSize - a[1].totalSize)
        .slice(0, 20)
        .map(([key, stats]) => {
          const [type, method, url] = key.split('::');
          const requestsInMin = self.requestTimestamps[key]?.length || 0;
          const urlShort = url.length > 35 ? url.substring(0, 32) + '...' : url;

          return {
            'Type': type.substring(0, 10),
            'Method': method,
            'URL': urlShort,
            'Calls': stats.count,
            'Avg': `${(stats.avgSize / 1024).toFixed(1)}K`,
            'Max': `${(stats.maxSize / 1024).toFixed(1)}K`,
            'Req/Min': requestsInMin,
          };
        });

      console.table(data);

      // ملخص إجمالي
      const totalSize = Object.values(self.requestLog).reduce((sum, s) => sum + s.totalSize, 0);
      const totalRequests = Object.values(self.requestLog).reduce((sum, s) => sum + s.count, 0);

      console.log(
        `%c📈 Total: ${totalRequests} requests | ${(totalSize / 1024 / 1024).toFixed(2)} MB transferred | Last update: ${new Date().toLocaleTimeString('ar-SA')}`,
        'color: #4ecdc4; font-weight: bold; font-size: 12px; background: #1a1a1a; padding: 8px'
      );

      console.log(
        '%c💡 Commands: networkMonitor.toggle() | networkMonitor.reset() | networkMonitor.config',
        'color: #95e1d3; font-size: 11px; font-style: italic'
      );
    }, 30000); // تحديث كل 30 ثانية
  },

  /**
   * إعادة تعيين البيانات
   */
  reset() {
    this.requestLog = {};
    this.requestTimestamps = {};
    console.log(
      '%c🔄 Network Monitor Data Reset',
      'color: #51cf66; font-weight: bold; font-size: 12px'
    );
  },

  /**
   * تفعيل/إيقاف المراقب
   */
  toggle() {
    this.config.enabled = !this.config.enabled;
    console.log(
      `%c${this.config.enabled ? '✅ ENABLED' : '❌ DISABLED'} Network Monitor`,
      `color: ${this.config.enabled ? '#51cf66' : '#ff6b6b'}; font-weight: bold; font-size: 12px`
    );
  },

  /**
   * تصدير البيانات
   */
  exportData() {
    const data = {
      timestamp: new Date().toISOString(),
      requests: this.requestLog,
      totalSize: Object.values(this.requestLog).reduce((sum, s) => sum + s.totalSize, 0),
    };
    console.log('%cExported Data:', 'font-weight: bold');
    console.log(data);
    return data;
  },
};
