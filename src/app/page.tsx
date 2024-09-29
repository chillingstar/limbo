"use client";

import { useEffect, useState } from "react";
import { socket } from "@/socket";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [, setTransport] = useState("N/A");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      window.location.href = "./login";
      return;
    }

    if (socket.connected) {
      onConnect();
    } else {
      onDisconnect();
    }

    function onDisconnect() {
      console.log("Disconnected from server");
      setIsConnected(false);
      setTransport("N/A");
    }

    function onConnect() {
      socket.emit("connectionPing", localStorage.getItem("token"));

      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });

      socket.on("message", (receivedMessage) => {
        let [username, ...messageParts] = receivedMessage.split(": ");
        let message = messageParts.join(": ");

        if (username !== "You") {
          setMessages((prevMessages) => [
            ...prevMessages,
            `${username}: ${message}`,
          ]);
        }
      });

      socket.on("announcement", (message) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          `<strong style="color: red">System</strong>: ${message}`,
        ]);
      });

      socket.on("adminMessage", (message) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          `<strong style="color: red">Admin</strong> ${message}`,
        ]);
      });

      socket.on("error", (data) => {
        data = JSON.parse(data);
        if (data.message) {
          alert(data.message);
        }

        if (data.logout) {
          localStorage.removeItem("token");
          window.location.href = "./login";
        }
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message");
      socket.off("adminMessage");
      socket.off("announcement");
      socket.off("error");
    };
  }, []);

  const handleMessageSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (message) {
      if (!localStorage.getItem("token")) {
        window.location.href = "./login";
        return;
      }

      socket.emit("message", {
        token: localStorage.getItem("token"),
        message: message,
      }, (response: { status: number; error?: string }) => {
        if (response.status === 200) {
          console.log(`Message sent: ${message}`);
          setMessage("");
        } else {
          alert(response.status + " | " + response.error);
          if (response.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "./login";
          }
        }
      });
    }
  };

  return (
    <main className="flex flex-col items-center justify-center">
      <div
        className={`flex flex-col items-center justify-center w-screen h-9 rounded ${
          isConnected ? "bg-green-500" : "bg-red-500"
        }`}
      >
        <p className="text-white">
          {isConnected ? `Connected` : "Disconnected"}
        </p>
      </div>
      <div
        className="flex flex-col justify-end w-screen h-screen border border-white rounded-2xl m-auto p-5 bg-white bg-opacity-10 overflow-y-scroll"
        style={{ height: "calc(100vh - 80px)" }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className="mb-2"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        ))}
      </div>
      <div className="flex flex-col items-center justify-center w-screen h-11 bg-white bg-opacity-10 rounded">
        <form className="flex w-full" onSubmit={handleMessageSubmit}>
          <input
            type="text"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-9 rounded-l text-black border-none px-2"
            style={{ width: "calc(100% - 80px)" }}
          />
          <button
            type="submit"
            className="w-20 h-9 rounded-r border-none bg-blue-500 text-white font-bold cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
