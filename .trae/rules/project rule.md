# قوانین پروژه (Project Rules)

## پخش صدا و افکت‌های صوتی
- هر افکت صوتی یا صدایی که در بخش‌های مختلف پروژه اضافه و پخش می‌شود، **باید حتماً** با میزان صدای تعیین شده توسط کاربر هماهنگ باشد.
- برای اعمال این قانون، باید از استور تنظیمات (`useSettingsStore`) استفاده کرده و مقدار صدای فایل صوتی (`volume`) را بر اساس `soundVolume` تنظیم کنید.

**الگوی پیاده‌سازی:**
```tsx
import { useSettingsStore } from '../stores/settingsStore';

// در داخل کامپوننت:
const { soundVolume } = useSettingsStore();

// هنگام پخش صدا:
const audio = new Audio(soundFile);
audio.volume = soundVolume / 100; // تبدیل درصد به عددی بین 0 تا 1
audio.play().catch(console.error);
```
