import { useEffect } from 'react';

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export default function MetaTags({ title, description, image, url }: MetaTagsProps) {
  useEffect(() => {
    if (title) document.title = title;
    const setMeta = (prop: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${prop}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, prop);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, true);
    }
    if (title) setMeta('og:title', title, true);
    if (image) setMeta('og:image', image, true);
    if (url) setMeta('og:url', url, true);
    setMeta('og:type', 'website', true);
  }, [title, description, image, url]);
  return null;
}
