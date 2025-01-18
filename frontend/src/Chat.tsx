import { ChangeEvent, FormEvent, MutableRefObject, useEffect, useRef, useState } from 'react'
import './Chat.css'

import ConnectionManager from './ConnectionManager';

type Message = {
  id: number,
  time: Date,
  user: string,
  usercolor: string,
  message: string,
}

function ChatLog({ messages }: { messages: Message[] }) {
  const messages_elts = messages.map(function(message) {
    return (
      <div className="chat-message" key={message.id}>
        <span className="chat-message-user">
          <span style={{ color: message.usercolor }}>{message.user}</span>: </span>
        <span className="chat-message-text">{message.message}</span>
      </div>
    )
  });

  const logRef: MutableRefObject<HTMLDivElement | null> = useRef(null);

  useEffect(function() {
    if (logRef.current) {
      const el = logRef.current;
      el.scroll({ top: el.scrollHeight, behavior: "smooth" })
    }
  }, [messages]);

  return (
    <div className="chat-log" ref={logRef}>
      {messages_elts}
    </div >
  )
}

function ChatInput({ onSubmit, disabled }: { onSubmit: Function, disabled: boolean }) {
  const [message, setMessage] = useState("");
  const inputRef = useRef<null | HTMLInputElement>(null);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let trimmed = message.trim();

    if (trimmed.length == 0) {
      return;
    }

    onSubmit(trimmed);
    setMessage("");
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setMessage(e.target.value);
  }

  useEffect(function() {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  return (
    <form onSubmit={submit} className="chat-input">
      <input type="text" value={disabled ? "" : message}
        placeholder={disabled ? "Connecting..." : "Say something..."}
        ref={inputRef}
        onChange={handleChange} className="chat-input-box" autoFocus={true} disabled={disabled} />
      <input type="submit" value="Send" disabled={disabled} />
    </form>
  )
}


function Chat({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  const connection = useRef<null | ConnectionManager>(null);
  if (connection.current === null) {
    connection.current = new ConnectionManager();
  }

  function handleSubmit(message: string) {
    const conn = connection.current;
    if (conn) {
      const data = {
        type: "send",
        message,
      };
      conn.send(JSON.stringify(data))
    }
  }

  useEffect(() => {
    if (connection.current === null) {
      return;
    }
    const conn = connection.current;

    function openHandler() {
      conn.send(JSON.stringify({ type: "identify", username: userName }));
      setConnected(true);
      console.log("chat connected");
    }
    function closeHandler() {
      setConnected(false);
      console.log("chat disconnected");
    }

    conn.addEventListener("open", openHandler);
    conn.addEventListener("close", closeHandler);

    conn.start_connecting();

    return () => {
      conn.removeEventListener("open", openHandler);
      conn.removeEventListener("close", closeHandler);
      conn.stop_connecting();
    }
  }, []);

  useEffect(() => {
    const conn = connection.current;
    if (!conn) {
      return
    }

    function messageHandler(event: MessageEvent) {
      let data = JSON.parse(event.data, function(key, value) {
        if (key == "time") {
          return new Date(Date.parse(value))
        }

        return value
      });

      if (data.type == "message") {
        setMessages([...messages, data]);
      }
    }

    conn.addEventListener("message", messageHandler);

    return () => {
      conn.removeEventListener("message", messageHandler);
    };
  }, [messages]);

  let connection_info;

  if (!connected) {
    connection_info = <div className="connecting-indicator">Connecting...</div>;
  }

  return (
    <>
      <div className="chat-main">
        {connection_info}
        <ChatLog messages={messages} />
        <ChatInput onSubmit={handleSubmit} disabled={!connected} />
      </div>
    </>
  )
}

export default Chat;
