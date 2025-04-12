# 🔄 Auto-Refresh for Web Resources

This lightweight JavaScript utility automatically monitors and refreshes static resources in your web page (like CSS, JS, images, iframes, etc.) **whenever they’re modified on the server** — without reloading the entire page.

> 🎯 Ideal for developers who want a smoother workflow without pressing F5 every time a file is changed.

---

## 🚀 Features

- ✅ Tracks and refreshes: `CSS`, `JS`, `images`, `iframes`, `videos`, and more
- ✅ Uses `Last-Modified` HTTP header for detecting changes
- ✅ Replaces only the updated resource — **not the whole page**
- ✅ Skips external resources (e.g., CDN or cross-origin URLs)
- ✅ Default check interval: **every 1 second**
- ✅ No dependencies

---

## 📦 Installation

1. **Download or copy** `auto-refresh.js` into your project.

2. **Include the script** in your HTML (at the top of <head> tag):

```html
<script src="/path/to/auto-refresh.js"></script>
