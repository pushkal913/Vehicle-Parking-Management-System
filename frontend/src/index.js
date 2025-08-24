import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './AppComponent';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Development-time diagnostics to detect invalid default import of App
if (process.env.NODE_ENV === 'development') {
	try {
		// eslint-disable-next-line no-console
		console.debug('[index] App import diagnostics:', {
			type: typeof App,
			isFunction: typeof App === 'function',
			ownProps: App && typeof App === 'object' ? Object.getOwnPropertyNames(App) : null,
			hasDefault: App && typeof App === 'object' ? Object.prototype.hasOwnProperty.call(App, 'default') : false,
			defaultType: App && App.default ? typeof App.default : null,
		});
	} catch {}
}

const isRenderableComponent = (Comp) =>
	typeof Comp === 'function' || (Comp && typeof Comp === 'object' && (Comp.$$typeof || Comp.render));

const resolveComponent = (MaybeModule) => {
	if (isRenderableComponent(MaybeModule)) return MaybeModule;
	if (MaybeModule && typeof MaybeModule === 'object' && isRenderableComponent(MaybeModule.default)) {
    if (process.env.NODE_ENV === 'development') {
      try {
        // eslint-disable-next-line no-console
				console.warn('[index] Using App.default as component (module namespace import).');
      } catch {}
    }
		return MaybeModule.default;
  }
  return null;
};

const ResolvedApp = resolveComponent(App);

if (ResolvedApp) {
	root.render(<ResolvedApp />);
} else {
	// Render a minimal fallback with a clear error in dev, so the app doesn't hard-crash
	const Fallback = () => (
		<div style={{ padding: 16, fontFamily: 'sans-serif' }}>
			<h1 style={{ color: '#b91c1c' }}>App component failed to load</h1>
			<p>
				The default export from <code>src/App.js</code> is not a React component.
			</p>
			<pre style={{ background: '#fee2e2', padding: 12, borderRadius: 6 }}>
				{JSON.stringify({ type: typeof App, ownProps: App && Object.getOwnPropertyNames(App), defaultType: App && App.default && typeof App.default }, null, 2)}
			</pre>
			<p>Check for mixed default/named exports or a missing export default in App.js.</p>
		</div>
	);
	root.render(<Fallback />);
}
