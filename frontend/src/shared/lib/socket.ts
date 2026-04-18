import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL ?? "/", {
  withCredentials: true,
  autoConnect: false,
  path: "/socket.io",
});

export default socket;
