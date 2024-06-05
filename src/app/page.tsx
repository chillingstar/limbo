"use client";

import { useEffect, useState } from "react";
import { socket } from "@/socket";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [, setTransport] = useState("N/A");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });

      socket.on("message", (receivedMessage) => {
        if (receivedMessage !== `You: ${message}`) {
          setMessages((prevMessages) => [
            ...prevMessages,
            `Anonymous: ${receivedMessage}`,
          ]);
        }
      });

      socket.on("announcement", (message) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          `<strong style="color: red">System</strong>: ${message}`,
        ]);
      });
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message");
      socket.off("announcement"); // Add this line
    };
  }, [message]);

  const handleMessageSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (message) {
      console.log(`Emitting message: ${message}`); // Add this line
      socket.emit("message", message);
      setMessages((prevMessages) => [...prevMessages, `You: ${message}`]);
      setMessage("");
    }
  };

  return (
    <main>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100vw",
          height: "35px",
          backgroundColor: isConnected ? "green" : "red",
          borderRadius: "5px",
        }}
      >
        <p style={{ color: "white" }}>
          {isConnected ? `Connected` : "Disconnected"}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          border: "1px solid white",
          width: "100vw",
          height: "calc(100vh - 80px)",
          borderRadius: "20px",
          margin: "auto",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          overflowY: "scroll",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            style={{ marginBottom: "10px" }}
            dangerouslySetInnerHTML={{ __html: message }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100vw",
          height: "45px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "5px",
        }}
      >
        <form
          style={{ display: "flex", width: "100%" }}
          onSubmit={handleMessageSubmit}
        >
          <input
            type="text"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: "calc(100% - 80px)",
              color: "black",
              height: "35px",
              borderRadius: "5px",
              border: "none",
              padding: "0 10px",
            }}
          />
          <button
            type="submit"
            style={{
              width: "80px",
              height: "35px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "blue",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
