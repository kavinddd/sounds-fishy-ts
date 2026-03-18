import { afterEach, afterAll, beforeAll, describe, it, expect } from "vitest";
import { io } from "socket.io-client";
import { RunningServer, unsafeRunServer } from "../utils/server";
import { ClientSocket, RoomId } from "@sounds-fishy/shared";
import { errAsync, ResultAsync } from "neverthrow";

// region: set up
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

// endregion

// region: test

describe("Test IO connection ", () => {
  it("can connect to server", async () => {
    const socket = await newSocket();
    expect(socket.connected).toBe(true);
  });

  it("can host a room", async () => {
    const socket = await newSocket();
    const roomId = await hostRoom(socket);
    expect(roomId.isOk()).toBe(true);
    expect(server.io.sockets.adapter.rooms.has(socket.id!)).toBe(true);
    expect(server.io.sockets.adapter.rooms.size === 2).toBe(true);
    expect(server.io.sockets.adapter.rooms.has(roomId._unsafeUnwrap())).toBe(
      true,
    );
  });

  it("cannot host multiple rooms", async () => {
    const socket = await newSocket();
    const firstRoom = await hostRoom(socket);
    const secondRoom = await hostRoom(socket);
    expect(firstRoom.isOk()).toBe(true);
    expect(secondRoom.isErr()).toBe(true);
  });

  it("can join a room", async () => {
    const socket = await newSocket();
    const roomId = (await hostRoom(socket))._unsafeUnwrap();
    const joiner = await newSocket();
    const joining = await joinRoom(joiner, roomId);
    expect(joining.isOk());
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
  });

  it("can chat", async () => {
    const p1 = await newSocket();
    const p2 = await newSocket();

    const message = "Hello World!";
    p1.emit("room:chat", message);

    await new Promise<void>(() => {
      p2.once("room:chat", (chat) => {
        const { message: received_message, from } = chat;
        expect(received_message).eq(message);
        expect(from).eq(p1.id);
      });
    });
  });
});

// endregion

// region: helpers

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

// endregion
