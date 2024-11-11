"use client";

import { useEffect, useState } from "react";
import { Button, Navbar, NavbarBrand, NavbarContent } from "@nextui-org/react";
import { SunIcon, MoonIcon } from "lucide-react";
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

  const changeTransport = () => {
    if (socket.connected) {
      socket.disconnect();
      const newTransport = socket.io.engine.transport.name === "polling" ? "websocket" : "polling";
      socket.io.opts.transports = [newTransport];
      socket.connect();
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
    };

    const onDisconnect = () => {
      setConnected(false);
      setTransport("N/A");
    };

    const updateConnectedUsers = (users: number) => {
      setConnectedUsers(users);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
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
    <div className={`min-w-screen min-h-screen flex flex-col ${theme === "light" ? "bg-white light" : "bg-black dark"}`}>
      {/* Top Toolbar */}
      <Navbar className="flex">
        <NavbarBrand className="flex items-center space-x-5">
          <h1 className={`text-lg font-bold ${theme === 'light' ? 'text-black' : 'text-white'}`}>Limbo</h1>
          <p className="text-sm text-gray-500">
            {connected ? `Connected via ${transport} | SID: ${socket.io.engine.id}` : "Disconnected"}
          </p>
        </NavbarBrand>
        <NavbarContent className="flex space-x-2 ml-auto justify-end flex-row-reverse">
          <Button
            onClick={() => connected ? socket.disconnect() : socket.connect()}
            className={`${connected ? (theme === "light" ? "bg-red-400" : "bg-red-600") : (theme === "light" ? "bg-blue-400" : "bg-blue-600")}`}
          >
            {connected ? "Disconnect" : "Reconnect"}
          </Button>
          <Button onClick={toggleTheme}>
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </Button>
          {connected && (
            <Button onClick={changeTransport} className={`${theme === "light" ? "text-black" : "text-white"}`}>
              {transport === "polling" ? "WebSocket" : "Polling"}
            </Button>
          )}
        </NavbarContent>
      </Navbar>

      <div className="flex flex-grow">
        <div className="flex-grow h-max min-h-[79vh] min-w-screen border rounded-lg m-4 bg-transparent"></div>
        <div className="flex-grow h-max w-max min-h-[89vh] max-w-[30vh] border rounded-lg m-4 bg-transparent">
          <p>Connected users (${connectedUsers})</p>
        </div>
      </div>
    </div>
  );
}