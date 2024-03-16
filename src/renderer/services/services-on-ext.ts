import { v4 } from 'uuid';

export const ServicesOnExt: any = new Proxy(
  {},
  {
    get(_target, name) {
      return (...args: unknown[]) => {
        return new Promise((resolve, reject) => {
          const id = v4();
          requests[id] = { resolve, reject };
          const message = {
            type: 'FROM_CURLERROO_PAGE',
            method: name,
            args,
            id,
          };
          console.log('HVH', 'message', message);
          window.postMessage(message, '*');
        });
      };
    },
  },
);

type PromiseResolver<T> = {
  resolve: (value: T) => void;
  reject: (reason: T) => void;
};

const requests: {
  [key: string]: PromiseResolver<string>;
} = {};

export const extInstalled: boolean =
  localStorage.getItem('extInstalled') === String(true);

export const appReady = new Promise<void>((resolve, reject) => {
  let resolved = false;
  if (!extInstalled) {
    resolved = true;
    resolve();
  }

  setTimeout(() => {
    if (!resolved) {
      reject();
      localStorage.setItem('extInstalled', String(false));
      location.reload();
    }
  }, 3000);

  window.addEventListener('message', (event) => {
    if (event.data.type === 'FROM_CURLERROO_EXT') {
      if (event.data.id === 'init' && !extInstalled) {
        localStorage.setItem('extInstalled', String(true));
        return ServicesOnExt.get('inMemoryFileSystem')
          .then((data: any) => {
            if (!data) {
              return ServicesOnExt.set(
                'inMemoryFileSystem',
                localStorage.getItem('inMemoryFileSystem'),
              );
            }
            return Promise.resolve();
          })
          .then(() => {
            location.reload();
          });
      }

      if (event.data.id === 'init') {
        resolved = true;
        resolve();
      }

      const {
        id,
        data: { data, errorMessage },
      } = event.data;
      if (requests[id]) {
        if (errorMessage) {
          requests[id].reject(errorMessage);
        } else {
          requests[id].resolve(data);
        }
        delete requests[id];
      }
    }
  });
});
