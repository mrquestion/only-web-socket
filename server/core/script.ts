const requestQueue: Function[] = [];

class WebSocketRequest extends HTMLElement {
  connectedCallback() {
    if (this.onload) {
      requestQueue.push(this.onload);
    }
  }
}

if (!customElements.get('web-socket-request')) {
  customElements.define('web-socket-request', WebSocketRequest);
}

window.addEventListener('load', (ev: Event): void => {
  const callback: FrameRequestCallback = (time: number): void => {
    requestAnimationFrame(callback);
    if (!window.onlyWebSocket) {
      return;
    }
    if (!(window.onlyWebSocket.client?.readyState === WebSocket.OPEN)) {
      return;
    }
    if (requestQueue.length === 0) {
      return;
    }
    const request: Function | undefined = requestQueue.shift();
    if (!request) {
      return;
    }
    request();
  };
  requestAnimationFrame(callback);
});

declare interface OnlyWebSocket {
  client?: WebSocket;
  connect: typeof connect;
  html: typeof html;
  style: typeof style;
  script: typeof script;
  img: typeof img;
}

declare interface Window {
  onlyWebSocket: OnlyWebSocket;
}

enum ResourceType {
  HTML = 'HTML',
  STYLE = 'STYLE',
  SCRIPT = 'SCRIPT',
  IMG = 'IMG',
}

const setHTML = (message: string): void => {
  document.write(message.slice(ResourceType.HTML.length + 1));
};
const addStyle = (message: string): void => {
  const style: HTMLStyleElement = document.createElement('style');
  style.textContent = message.slice(ResourceType.STYLE.length + 1);
  document.head.appendChild(style);
};
const addImg = (message: string): void => {
  const img: HTMLImageElement = document.createElement('img');
  img.setAttribute('src', `data:image/jpeg;base64,${message.slice(ResourceType.IMG.length + 1)}`);
  document.body.querySelector('main')?.appendChild(img);
};

const openEventListener = (ev: Event): void => {
  console.log('open', ev);
};
const messageEventListener = (ev: MessageEvent<string>): void => {
  console.log('message', ev);
  if (ev.data.startsWith(`${ResourceType.HTML};`)) {
    setHTML(ev.data);
  } else if (ev.data.startsWith(`${ResourceType.STYLE};`)) {
    addStyle(ev.data);
  } else if (ev.data.startsWith(`${ResourceType.IMG};`)) {
    addImg(ev.data);
  }
};
const closeEventListener = (ev: CloseEvent): void => {
  console.log('close', ev);
};
const errorEventListener = (ev: Event): void => {
  console.log('error', ev);
};

const connect = (): void => {
  const url = new URL(location.origin);
  url.protocol = 'ws';
  url.pathname = '/ws';
  const client = new WebSocket(url);
  client.addEventListener('open', openEventListener);
  client.addEventListener('message', messageEventListener);
  client.addEventListener('close', closeEventListener);
  client.addEventListener('error', errorEventListener);
  window.onlyWebSocket.client = client;
};

const getResource = (type: ResourceType, path: string) => {
  window.onlyWebSocket.client?.send(`${type};${path}`);
};

const html = (path: string): void => getResource(ResourceType.HTML, path);
const style = (path: string): void => getResource(ResourceType.STYLE, path);
const script = (path: string): void => getResource(ResourceType.SCRIPT, path);
const img = (path: string): void => getResource(ResourceType.IMG, path);

window.onlyWebSocket = {
  connect,
  html,
  style,
  script,
  img,
};
