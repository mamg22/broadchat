type ConnectionCallbacks = {
  "open": Function[],
  "close": Function[],
  "message": Function[],
  "error": Function[],
}


class ConnectionManager {
  socket: WebSocket | null;
  callbacks: ConnectionCallbacks;
  connectingEnabled: boolean;
  currentTimeout: number | null;

  constructor(enable_connecting: boolean = false) {
    this.socket = null;
    this.callbacks = {
      "open": [],
      "close": [],
      "message": [],
      "error": [],
    };
    this.connectingEnabled = enable_connecting;
    this.currentTimeout = null;

    if (this.connectingEnabled) {
      this.connect();
    }
  }

  start_connecting() {
    this.connectingEnabled = true;
    this.connect();
  }

  stop_connecting() {
    this.connectingEnabled = false;
    this.disconnect()
  }

  connect() {
    if (this.socket) {
      return;
    }

    if (this.currentTimeout !== null) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    const sock = new WebSocket(`ws://${location.host}/api/chat-ws`);
    this.socket = sock;

    sock.addEventListener("close", this.disconnect.bind(this));

    for (const event in this.callbacks) {
      sock.addEventListener(event, (...args: any[]) => {
        this.callbacks[event].forEach(function(func: Function) { func(...args) })
      });
    }
  }

  disconnect() {
    if (!this.socket) {
      return;
    }

    this.socket.close();
    this.socket = null;

    if (this.connectingEnabled) {
      const timeoutId = setTimeout(this.connect.bind(this), 3000);
      this.currentTimeout = timeoutId;
    }
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.socket !== null) {
      this.socket.send(data);
    }
    else {
      throw Error("Attempt to send data without connection");
    }
  }

  addEventListener(event: keyof ConnectionCallbacks, handler: Function) {
    this.callbacks[event].push(handler);
  }

  removeEventListener(event: keyof ConnectionCallbacks, handler: Function) {
    const pos = this.callbacks[event].indexOf(handler);
    this.callbacks[event].splice(pos, 1);
  }
}

export default ConnectionManager;
