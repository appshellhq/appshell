const urlCache = new Set<string>();

/** Propagates the shell's CSP nonce so browsers that don't trust strict-dynamic propagation still allow it. */
const cspNonce = (): string | undefined =>
  document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;

export default async (url: string) => {
  const element = document.createElement('script');
  const nonce = cspNonce();

  if (nonce) {
    element.nonce = nonce;
  }

  const cleanup = (): void => {
    if (document.head.contains(element)) {
      document.head.removeChild(element);
    }
  };

  return new Promise<boolean>((resolve, reject) => {
    if (urlCache.has(url)) {
      resolve(false);
    } else {
      urlCache.add(url);

      element.src = url;
      element.type = 'text/javascript';
      element.async = true;

      element.onload = () => {
        // eslint-disable-next-line no-console
        console.debug(`Remote entry fetched from '${url}'.`);

        resolve(true);
      };

      element.onerror = () => {
        const message = `Failed to fetch remote entry from '${url}'.`;
        // eslint-disable-next-line no-console
        console.error(message);
        urlCache.delete(url);
        reject(message);
      };

      document.head.appendChild(element);
    }
  }).finally(cleanup);
};
