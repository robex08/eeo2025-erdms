# 🎯 Scroll Restoration Fix - Root Cause Found & Fixed

## 📋 Problem Summary

Scroll restoration in Orders25List was not working - scroll position was correctly saved and restored, but immediately reset to 0. The logs showed:
```
✅ Scroll proveden: 2044
✅ Ověření: 0  ← Immediately reset!
```

## 🔍 Root Cause Analysis

The issue was **NOT** in Orders25List.js - all the scroll restoration logic was correct. The problem was in **Layout.js**:

### Layout.js Content Element Configuration

```javascript
// Line 517 in Layout.js - contentBase function
overflow-y: ${formView ? 'auto' : 'visible'};
```

### The Bug

The `<Content>` (which is `<main>`) element only had scrolling enabled when `formView=true`:

```javascript
// Line 1508 - BEFORE FIX
<Content $formView={location.pathname === '/orders-new' || location.pathname === '/order-form-25'} ...>
```

**Result:** For `/orders25-list`, the condition was `false`, so:
- `<main>` had `overflow-y: visible` 
- `<main>` was **NOT scrollable**
- Trying to set `main.scrollTop = 2044` had no effect
- Browser immediately reset it to 0 because the element wasn't a scroll container

## ✅ Solution

Added `/orders25-list` to the `formView` condition so the `<main>` element has `overflow-y: auto`:

```javascript
// Line 1508 - AFTER FIX
<Content $formView={location.pathname === '/orders-new' || location.pathname === '/order-form-25' || location.pathname === '/orders25-list'} ...>
```

**Result:** 
- `<main>` now has `overflow-y: auto` for Orders25List
- `<main>` is now a proper scroll container
- `main.scrollTop = 2044` works correctly
- Scroll position is preserved across F5 refreshes ✅

## 🧪 What Was Working (No Changes Needed)

All the scroll restoration logic in Orders25List.js was correct:

1. ✅ Scroll position saving to sessionStorage (user-isolated)
2. ✅ Scroll listener with stable dependencies
3. ✅ Refs pattern to prevent closure issues
4. ✅ Double requestAnimationFrame for DOM-ready timing
5. ✅ Scroll verification and auto-correction
6. ✅ Correct scroll container identification (`document.querySelector('main')`)

The only issue was that the scroll container didn't have scrolling enabled in Layout.js.

## 📝 Files Modified

### `/src/components/Layout.js`
- **Line 1508:** Added `/orders25-list` to `formView` condition

## 🎉 Impact

- Scroll position now correctly restored after F5 refresh
- Expanded orders restored at correct scroll position
- Splash screen shows during initialization
- All states isolated per logged-in user
- No more scroll position reset to 0

## 🔧 Technical Details

### Why overflow-y matters

When an element has `overflow-y: visible` (default), it's not a scroll container:
- Setting `scrollTop` has no effect
- Browser ignores scroll position assignments
- Element can't be scrolled programmatically

When an element has `overflow-y: auto`:
- Element becomes a scroll container
- `scrollTop` property works correctly  
- Scroll position can be saved and restored

### CSS Cascade

```css
/* When formView = false (BEFORE fix) */
overflow-y: visible;  /* ❌ Not scrollable */

/* When formView = true (AFTER fix) */
overflow-y: auto;     /* ✅ Scrollable */
```

## 🎯 Lessons Learned

1. **Always verify scroll container has overflow enabled** before implementing scroll restoration
2. **Layout configuration affects child component behavior** - check parent elements first
3. **Logs showed correct behavior** (scroll set to 2044) but immediate reset indicated container issue, not logic issue
4. **Don't assume window is scroll container** - modern layouts often use fixed containers with internal scrolling

## ✨ Status: FIXED ✅

The root cause has been identified and fixed. Scroll restoration now works perfectly!
