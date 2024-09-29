"use client";

import { useState } from "react";
import dotenv from "dotenv";

// imagine

dotenv.config();

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ username: username, password: password }),
      });

      if (response.status === 200) {
        let accountToken = await response.text();
        localStorage.setItem("token", JSON.parse(accountToken).token);
        window.location.href = "/";
      } else if (response.status === 401) {
        setError("Invalid username or password");
      } else if (response.status === 500) {
        setError("An error occurred while logging in");
      } else {
        setError("An error occurred while logging in");
      }
    } catch (error) {
      setError("An error occurred while logging in");
    }
  };

  return (
    <main>
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800">Login</h1>
          <form onSubmit={handleLogin} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Login
            </button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <a
              href="/register"
              className="text-sm text-indigo-600 hover:underline"
            >
              Does not have an account? Sign up
            </a>
          </form>
        </div>
      </div>
    </main>
  );
}
