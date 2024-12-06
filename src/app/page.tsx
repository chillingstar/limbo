"use client";

import { useEffect, useState } from "react";
import { Button, Input, Card, Navbar, NavbarBrand, NavbarContent, Divider } from "@nextui-org/react";
import { SunIcon, MoonIcon }  from "lucide-react";
import io from "socket.io-client";

const socket = io();

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [theme, setTheme] = useState("light");

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const serverLogin = async () => {
    const userData = localStorage.getItem("user");

    if (userData) {
      const username = JSON.parse(userData).username;
      const authenticationToken = JSON.parse(userData).authToken;

      const response = await fetch("/api/authentication", {
        method: "POST",
        headers: {
          "Content-Type": "application"
        },
        body: JSON.stringify({
          username: username,
          authToken: authenticationToken
        })
      });

      if (response.ok) {
        return { code: 0 };
      } else {
        return { code: 1 };
      }
    }
  };

  const changeTransport = () => {
    if (socket.connected) {
      socket.disconnect();
      const newTransport =
        socket.io.engine.transport.name === "polling" ? "websocket" : "polling";
      socket.io.opts.transports = [newTransport];
      socket.connect();
    }
  };

  const sendMessage = async () => {
    if (connected) {
      const messageInput = document.getElementById("message") as HTMLInputElement | null;
      const messageValue = messageInput ? messageInput.value : "";

      if (messageValue) {
        if (messageValue.trim() == "") {
          return
        }

        socket.emit("message", messageValue.trim());
        if (messageInput) {
          messageInput.value = "";
        }
      }
    } else {
      const messageBox = document.getElementById("messageBox");
      if (messageBox) {
        const messageElement = document.createElement("p");
        messageElement.className = `mt-3 ml-3`;
        messageElement.innerHTML = `<strong style="color: red;">System (Client):</strong> You are not connected to the server, chatting functionalities are disabled.`;
        messageBox.appendChild(messageElement);
        messageBox.scrollTop = messageBox.scrollHeight;
      }
    }
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onConnect = async () => {
      // setConnected(true);
      // setTransport(socket.io.engine.transport.name);

      // socket.io.engine.on("upgrade", (transport) => {
      //   setTransport(transport.name);
      // });

      const loginStatus = await serverLogin();

      if (!loginStatus) {
        window.location.href = "/login";
        return;
      }

      switch (loginStatus.code) {
        case 0:
          setConnected(true);
          setTransport(socket.io.engine.transport.name);
          
          socket.io.engine.on("upgrade", (transport) => {
            setTransport(transport.name);
          });

          break;
        
        case 1:
          window.location.href = "/login";

          break;
      };

    };

    const onDisconnect = () => {
      setConnected(false);
      setTransport("N/A");
    };

    const onSystemMessage = async (message) => {
      const messageBox = document.getElementById("messageBox");
      if (messageBox) {
        const messageElement = document.createElement("p");
        messageElement.className = `mt-3 ml-3`;
        messageElement.innerHTML = `<strong style="color: red;">System:</strong> ${message.message}`;
        messageBox.appendChild(messageElement);
        messageBox.scrollTop = messageBox.scrollHeight;
      }
    };

    const onMessage = async (message) => {
      const messageBox = document.getElementById("messageBox");
      if (messageBox) {
        const messageElement = document.createElement("p");
        messageElement.className = `mt-3 ml-3`;
        messageElement.textContent = `${message.author}: ${message.message}`;
        messageBox.appendChild(messageElement);
        messageBox.scrollTop = messageBox.scrollHeight;
      }
    };

    const updateConnectedUsers = (users: number) => {
      setConnectedUsers(users);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message", onMessage);
    socket.on("system", onSystemMessage);
    socket.on("connectedUsers", updateConnectedUsers);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <div
      className={`min-w-screen min-h-screen flex flex-col ${
        theme === "light" ? "bg-white light" : "bg-black dark"
      }`}
    >
      {/* Top Toolbar */}
      <Navbar className="flex">
        <NavbarBrand className="flex items-center space-x-5">
          <h1
            className={`text-lg font-bold ${
              theme === "light" ? "text-black" : "text-white"
            }`}
          >
            Limbo
          </h1>
          <p className="text-sm text-gray-500">
            {connected
              ? `Connected via ${transport} | SID: ${socket.io.engine.id}`
              : "Disconnected"}
          </p>
        </NavbarBrand>
        <NavbarContent className="flex space-x-2 ml-auto justify-end flex-row-reverse">
          <Button
            onClick={() =>
              connected ? socket.disconnect() : socket.connect()
            }
            className={`${
              connected
                ? theme === "light"
                  ? "bg-red-400"
                  : "bg-red-600"
                : theme === "light"
                ? "bg-blue-400"
                : "bg-blue-600"
            }`}
          >
            {connected ? "Disconnect" : "Reconnect"}
          </Button>
          <Button onClick={toggleTheme}>
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </Button>
          {connected && (
            <Button
              onClick={changeTransport}
              className={`${theme === "light" ? "text-black" : "text-white"}`}
            >
              {transport === "polling" ? "WebSocket" : "Polling"}
            </Button>
          )}
        </NavbarContent>
      </Navbar>

      <div className="flex flex-grow space-x-0.5 space-y-1 p-1 mb-1">
        {/* Left Column (Main Box + Chat Box) */}
        <div className="flex flex-col flex-grow space-y-1">
          {/* Message Box */}
            <Card id="messageBox" className="flex-grow m-4 overflow-y-auto max-h-[88vh]"></Card>

          {/* Chat Box */}
            <div className="flex items-center mx-4 space-x-2">
            <Input
              id="message"
              placeholder="Message"
              className="flex-grow"
              onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
              }}
            />
            <Button onClick={sendMessage}>Send</Button>
            </div>
        </div>


        {/* connectedUser Box */}
        <Card className="flex flex-col flex-grow w-max min-h-[80vh] max-h-[80vh] max-w-[30vh] m-4 space-y-5">
            <div className="flex justify-center items-start flex-grow">
            <p className="text-center font-sans mt-1.5">
              Connected users: {connectedUsers}
            </p>
            <Divider orientation="vertical" />
            </div>
        </Card>
      </div>
    </div>
  );
}
