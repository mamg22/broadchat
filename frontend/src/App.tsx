import { ChangeEvent, ReactNode, useState } from 'react'
import './App.css'

import Chat from './Chat.tsx'


function NamePicker({ onAccept }: { onAccept: Function }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<ReactNode | null>(null);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault()
    try {
      const params = new URLSearchParams([["username", name]])
      const response = await fetch("/api/check-name?" + params);

      if (!response.ok) {
        throw new Error(`Error fetching name availability: ${response.status}`);
      }

      const json = await response.json();

      if (json.available) {
        setError(null);
        onAccept(name)
      }
      else {
        setError(<div>Name not available</div>)
      }
    }
    catch (err: any) {
      console.error(err);
      setError(<div>{err.toString()}</div>);
    }
  }

  return (
    <form onSubmit={onSubmit} className="name-picker">
      <label>
        Username:
        <input type="text" autoComplete='username' onChange={onChange} />
      </label>
      <input type="submit" />
      {error}
    </form>
  )
}

function App() {
  const [userName, setUserName] = useState<string | null>(null);

  let mainComponent;
  if (userName !== null) {
    mainComponent = <Chat userName={userName} />;
  }
  else {
    mainComponent = <NamePicker onAccept={setUserName} />;
  }

  return (
    <>
      {mainComponent}
    </>
  )
}

export default App
