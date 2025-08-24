import React from 'react';

export default function AppRoot() {
  const [ResolvedApp, setResolvedApp] = React.useState(null);
  const [errorInfo, setErrorInfo] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    const tryResolve = (mod) => {
        const isRenderable = (Comp) =>
          typeof Comp === 'function' || (Comp && typeof Comp === 'object' && (Comp.$$typeof || Comp.render));
        let comp = null;
        if (isRenderable(mod)) comp = mod;
        else if (mod && isRenderable(mod.default)) comp = mod.default;
        else if (mod && mod.default && isRenderable(mod.default.default)) comp = mod.default.default;
        else if (mod && mod.default && isRenderable(mod.default.App)) comp = mod.default.App;
        if (process.env.NODE_ENV === 'development') {
          try {
            // eslint-disable-next-line no-console
            console.debug('[AppRoot] dynamic import ./App diagnostics', {
              moduleType: typeof mod,
              hasDefault: !!(mod && Object.prototype.hasOwnProperty.call(mod, 'default')),
              defaultType: mod && typeof mod.default,
              ownProps: mod && Object.getOwnPropertyNames(mod),
              defaultOwnProps: mod && mod.default && Object.getOwnPropertyNames(mod.default),
            });
          } catch {}
        }
        return comp;
      };

  const load = async () => {
      const candidates = [
    './AppComponent',
    `./AppComponent.jsx?ts=${Date.now()}`,
    `./App.js?ts=${Date.now()}`,
    `./App.jsx?ts=${Date.now()}`,
      ];
      for (const path of candidates) {
        try {
          const mod = await import(/* webpackIgnore: true */ path).catch(async () => import(path));
          const comp = tryResolve(mod);
          if (mounted && comp) {
            setResolvedApp(() => comp);
            return;
          }
        } catch (e) {
          // continue to next candidate
        }
      }
      if (mounted) setErrorInfo({ message: 'Imported ./App but did not get a component', tried: candidates });
    };

    load();
    return () => { mounted = false; };
  }, []);

  if (ResolvedApp) {
    return <ResolvedApp />;
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>University Parking System</h1>
      <p>Bootstrap OK. Attempting to load full App…</p>
      {errorInfo && (
        <pre style={{ marginTop: 16, background: '#fee2e2', padding: 12, borderRadius: 6 }}>
          {JSON.stringify(errorInfo, null, 2)}
        </pre>
      )}
    </div>
  );
}
