import { afterEach, afterAll, beforeAll, describe, it, expect } from "vitest";
import { io } from "socket.io-client";
import { RunningServer, unsafeRunServer } from "../utils/server";
import { Chat, ClientSocket, IoSocket, RoomId } from "@sounds-fishy/shared";
import { errAsync, ResultAsync } from "neverthrow";

let server: RunningServer;

beforeAll(() => {
  server = unsafeRunServer();
});

afterAll(() => {
  server.server.close();
});

afterEach(() => {
  server.io.disconnectSockets(true);
});

describe("Test IO connection ", () => {
  it("can connect to server", async () => {
    const socket = await newSocket();
    expect(socket.connected).toBe(true);
  });

  it("can host a room", async () => {
    const socket = await newSocket();
    const roomId = await hostRoom(socket);
    expect(roomId.isOk()).toBe(true);

    const [serverSocket] = await server.io.in(socket.id!).fetchSockets();
    expect(serverSocket.data.state).toEqual({
      status: "in-room",
      roomId: roomId._unsafeUnwrap(),
    });
  });

  it("cannot host multiple rooms", async () => {
    const socket = await newSocket();
    const firstRoom = await hostRoom(socket);
    const secondRoom = await hostRoom(socket);
    expect(firstRoom.isOk()).toBe(true);
    expect(secondRoom.isErr()).toBe(true);

    const [serverSocket] = await server.io.in(socket.id!).fetchSockets();
    expect(serverSocket.data.state.status).toBe("in-room");
  });

  it("can join a room", async () => {
    const socket = await newSocket();
    const roomId = (await hostRoom(socket))._unsafeUnwrap();
    const joiner = await newSocket();
    const joining = await joinRoom(joiner, roomId);
    expect(joining.isOk());

    const [serverSocket] = await server.io.in(joiner.id!).fetchSockets();
    expect(serverSocket.data.state).toEqual({
      status: "in-room",
      roomId,
    });
  });

  it("cannot join multiple rooms", async () => {
    const firstHost = await newSocket();
    const firstRoomId = (await hostRoom(firstHost))._unsafeUnwrap();

    const secondHost = await newSocket();
    const secondRoomId = (await hostRoom(secondHost))._unsafeUnwrap();

    const joiner = await newSocket();

    const joiningFirstRoom = await joinRoom(joiner, firstRoomId);
    const joiningSecondRoom = await joinRoom(joiner, secondRoomId);

    expect(joiningFirstRoom.isOk()).toBe(true);
    expect(joiningSecondRoom.isErr()).toBe(true);

    const [serverSocket] = await server.io.in(joiner.id!).fetchSockets();
    expect(serverSocket.data.state).toEqual({
      status: "in-room",
      roomId: firstRoomId,
    });
  });

  it("can host a new room after leaving the old one", async () => {
    const socket = await newSocket();

    const firstRoom = await hostRoom(socket);
    expect(firstRoom.isOk()).toBe(true);

    await leaveRoom(socket);

    const secondRoom = await hostRoom(socket);
    expect(secondRoom.isOk()).toBe(true);
    expect(secondRoom._unsafeUnwrap()).not.toBe(firstRoom._unsafeUnwrap());

    const [serverSocket] = await server.io.in(socket.id!).fetchSockets();
    expect(serverSocket.data.state).toEqual({
      status: "in-room",
      roomId: secondRoom._unsafeUnwrap(),
    });
  });

  it("can join a new room after leaving the old one", async () => {
    const host = await newSocket();
    const roomId = (await hostRoom(host))._unsafeUnwrap();

    const joiner = await newSocket();
    await joinRoom(joiner, roomId);

    await leaveRoom(joiner);

    const secondHost = await newSocket();
    const secondRoomId = (await hostRoom(secondHost))._unsafeUnwrap();

    const joining = await joinRoom(joiner, secondRoomId);
    expect(joining.isOk()).toBe(true);

    const [serverSocket] = await server.io.in(joiner.id!).fetchSockets();
    expect(serverSocket.data.state).toEqual({
      status: "in-room",
      roomId: secondRoomId,
    });
  });

  it("can chat", async () => {
    const p1 = await newSocket();
    const p2 = await newSocket();

    const _ = (await createRoom([p1, p2]))._unsafeUnwrap();

    const message = "Hello World!";

    p1.emit("room:chat", message);

    const chat = await new Promise<Chat>((resolve) =>
      p2.once("room:chat", resolve),
    );

    expect(chat.from).toBe(p1.id);
    expect(chat.message).toEqual(message);
  });
});

// host a room where the socket is a host
const hostRoom = (socket: ClientSocket): ResultAsync<RoomId, string> => {
  const promise = new Promise<RoomId>((resolve, reject) => {
    socket.once("room:hosted", resolve);
    socket.once("room:join_failed", reject);
  });
  socket.emit("room:host");
  return ResultAsync.fromPromise(promise, (e) => e as string);
};

// join a given room id where the socket is a joiner
const joinRoom = (
  socket: ClientSocket,
  roomId: RoomId,
): ResultAsync<void, string> => {
  const promise = new Promise<void>((resolve, reject) => {
    socket.once("room:joined", () => resolve());
    socket.once("room:join_failed", reject);
  });
  socket.emit("room:join", roomId);
  return ResultAsync.fromPromise(promise, (e) => e as string);
};

// leave the current room
const leaveRoom = (socket: ClientSocket): Promise<void> => {
  return new Promise((resolve) => {
    socket.emit("room:leave");
    setTimeout(resolve, 50);
  });
};

// create a socket.io connection to a localhost server (for testing purpose)
const newSocket = async (): Promise<ClientSocket> => {
  const socket = io(`http://localhost:${server.address.port}`);
  await new Promise<void>((resolve) => {
    socket.once("connect", () => resolve());
  });
  return socket;
};

// create a room where the first socket will be the host, and the rest are the members/joiners
const createRoom = (sockets: ClientSocket[]): ResultAsync<RoomId, string> => {
  if (sockets.length < 1) return errAsync("Failed to create an empty room.");
  const [host, ...joiners] = sockets;
  return hostRoom(host).andTee(async (roomId) => {
    await Promise.all(joiners.map((j) => joinRoom(j, roomId)));
  });
};
