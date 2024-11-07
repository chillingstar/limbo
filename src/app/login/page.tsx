"use client";

import "dotenv/config";
import { Button, Card, CardBody, CardHeader, Input } from "@nextui-org/react";
import crypto from "crypto";
import { useState, useEffect } from "react";

export default function Login() {
    const [response, setResponse] = useState("");
    const [theme, setTheme] = useState("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "light";
        setTheme(savedTheme);
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const login = () => {
        const username: string = (document.getElementById("username") as HTMLInputElement).value;
        const password: string = (document.getElementById("password") as HTMLInputElement).value;
        const salt: string = crypto.randomBytes(64).toString("hex");

        const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

        fetch(`/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, hashedPassword }),
        }).then(async (res) => {
            if (res.status === 200) {
                setResponse("Login successful");
                window.location.href = "/";
            } else {
                const error = await res.json();
                switch (error.error) {
                    case "User not found":
                        setResponse("User not found");
                        break;
                    case "Invalid password":
                        setResponse("Invalid password");
                        break;
                    case "Invalid username format":
                        setResponse("Invalid username format");
                        break;
                    case "Invalid password format":
                        setResponse("Invalid password format");
                        break;
                    case "Internal server error":
                        setResponse("Internal server error");
                        break;
                    default:
                        setResponse("Unknown error");
                }
            }
        });
    };

    return (
        <div className={`min-w-screen min-h-screen flex flex-col ${theme === "light" ? "bg-white light" : "bg-black dark"}`}>
            <Card className="flex min-w-[40vh] m-auto">
                <CardHeader className="flex justify-center">
                    <h1 className="text-center font-bold">
                        {process.env.SERVER_NAME || "Limbo"} Login
                    </h1>
                </CardHeader>
                <CardBody className="space-y-5">
                    <Input placeholder="Username" id="username" />
                    <Input placeholder="Password" id="password" type="password" />
                    <Button onClick={login}>Login</Button>
                    {response && <p className="text-center">{response}</p>}
                </CardBody>
            </Card>
        </div>
    );
}
