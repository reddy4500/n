export const go = route => { if (location.hash !== '#/' + route) location.hash = '#/' + route; else window.dispatchEvent(new HashChangeEvent('hashchange')); };
export const currentRoute = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'home');
