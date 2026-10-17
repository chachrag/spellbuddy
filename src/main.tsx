import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out Firestore quota retry notices from triggering unhandled error boundaries
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args
    .map((a) => (typeof a === 'string' ? a : (a as Error)?.message || (a as { toString?: () => string })?.toString?.() || ''))
    .join(' ');
  if (
    msg.includes('Quota limit exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('Using maximum backoff delay') ||
    msg.includes('Free daily write units')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(<App />);
