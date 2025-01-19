from datetime import datetime
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect


class ClientRegistry:
    clients: dict[str, WebSocket]

    def __init__(self) -> None:
        self.clients = {}

    def register(self, name: str, socket: WebSocket) -> None:
        self.clients[name] = socket

    def unregister(self, name: str) -> None:
        del self.clients[name]

    async def broadcast(self, message: dict) -> None:
        for client in self.clients.values():
            await client.send_json(message)

    async def send_to(self, message: dict, recipient: str):
        client = self.clients[recipient]
        await client.send_json(message)


app = FastAPI()

clients = ClientRegistry()


@app.get("/api/check-name")
def check_name(username: str):
    return {"available": not not username and username not in clients.clients}


def process_message(message: dict, context: dict) -> dict:
    match message["type"]:
        case "send":
            return {
                "type": "message",
                "message_type": "message",
                "id": str(uuid.uuid4()),
                "time": str(datetime.now()),
                "user": context["user"],
                "usercolor": context["usercolor"],
                "message": message["message"],
            }
        case _:
            raise NotImplementedError()


USER_COLORS = "darkred purple green olive navy teal chocolate darkmagenta seagreen rebeccapurple".split()


@app.websocket("/api/chat-ws")
async def chat_websocket(websocket: WebSocket):
    try:
        await websocket.accept()
        identify = await websocket.receive_json()

        if identify["type"] == "identify":
            username = identify["username"]
            usercolor = USER_COLORS[hash(username) % len(USER_COLORS)]
            clients.register(username, websocket)
            await clients.broadcast(
                {
                    "type": "message",
                    "message_type": "room",
                    "id": str(uuid.uuid4()),
                    "user": username,
                    "action": "join",
                }
            )
        else:
            reason = "Required identification packet not provided"
            await websocket.close(4001, reason)
            return

    except WebSocketDisconnect:
        return

    context = {"user": username, "usercolor": usercolor}

    try:
        while True:
            msg = await websocket.receive_json()
            response = process_message(msg, context)

            await clients.broadcast(response)
    except WebSocketDisconnect:
        clients.unregister(username)
        await clients.broadcast(
            {
                "type": "message",
                "message_type": "room",
                "id": str(uuid.uuid4()),
                "user": username,
                "action": "leave",
            }
        )
