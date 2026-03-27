import {
  afterEach,
  afterAll,
  beforeAll,
  describe,
  it,
  expect,
  assert,
} from "vitest";
import { io } from "socket.io-client";
import { RunningServer, unsafeRunServer } from "../utils/server";
import {
  ackErr,
  Chat,
  ClientSocket,
  ClientState,
  HostError,
  JoinError,
  RoomId,
  SocketId,
  SocketState,
  StartError,
} from "@sounds-fishy/shared";
import { errAsync, okAsync, ResultAsync, safeTry } from "neverthrow";
import { rooms, sockets } from "../../src/store";

let server: RunningServer;

beforeAll(() => {
  server = unsafeRunServer();
});

afterAll(() => {
  server.server.close();
});

afterEach(() => {
  server.io.disconnectSockets(true);
  rooms.clear();
  sockets.clear();
});

describe("Test IO connection ", () => {
  it("can connect to server", async () => {
    const socket = await newSocket();
    expect(socket.connected).toBe(true);
  });

  it("can host a room", async () => {
    const socket = await newSocket();

    const stateSyncPromise = new Promise<ClientState>((resolve) =>
      socket.once("room:sync", resolve),
    );

    const roomId = await socket.emitWithAck("room:host");
    assert(roomId.success, "Acked failed.");

    const socketState = await sockets.get(socket.id! as SocketId);

    expect(socketState.isOk());
    expect(socketState._unsafeUnwrap()).toEqual({
      status: "in-room",
      roomId: roomId.data,
    });

    const stateSync = await stateSyncPromise;
    expect(stateSync.id).toBe(roomId.data);
    expect(stateSync.players).toContain(socket.id);
    expect(stateSync.hostId).toBe(socket.id);
    expect(stateSync.isPlaying).toBe(false);
  });

  it("cannot host multiple rooms", async () => {
    const socket = await newSocket();
    const firstRoom = await socket.emitWithAck("room:host");
    const secondRoom = await socket.emitWithAck("room:host");
    expect(firstRoom.success).toBe(true);
    expect(secondRoom).toMatchObject({
      success: false,
      code: "IN_ROOM",
    } satisfies HostError);

    const socketState = await sockets.get(socket.id! as SocketId);

    expect(socketState.isOk());
    expect(socketState._unsafeUnwrap().status).toEqual("in-room");
  });

  it("can join a room", async () => {
    const socket = await newSocket();
    const result = await socket.emitWithAck("room:host");
    assert(result.success, "Failed to host room.");
    const roomId = result.data;
    const joiner = await newSocket();

    const hostStateSyncPromise = new Promise<ClientState>((resolve) =>
      socket.once("room:sync", resolve),
    );
    const joinerStateSyncPromise = new Promise<ClientState>((resolve) =>
      joiner.once("room:sync", resolve),
    );

    const joining = await joiner.emitWithAck("room:join", result.data);
    expect(joining.success);

    const socketState = await sockets.get(socket.id! as SocketId);

    expect(socketState.isOk());
    expect(socketState._unsafeUnwrap()).toEqual({
      status: "in-room",
      roomId,
    });

    const hostStateSync = await hostStateSyncPromise;
    expect(hostStateSync.players).toContain(socket.id);
    expect(hostStateSync.players).toContain(joiner.id);

    const joinerStateSync = await joinerStateSyncPromise;
    expect(joinerStateSync.players).toContain(socket.id);
    expect(joinerStateSync.players).toContain(joiner.id);
  });

  it("cannot join multiple rooms", async () => {
    const firstHost = await newSocket();
    const firstRoomAck = await firstHost.emitWithAck("room:host");
    assert(firstRoomAck.success, "Failed to host first room.");
    const firstRoomId = firstRoomAck.data;

    const secondHost = await newSocket();
    const secondRoomAck = await secondHost.emitWithAck("room:host");
    assert(secondRoomAck.success, "Failed to host second room.");
    const secondRoomId = firstRoomAck.data;

    const joiner = await newSocket();

    const firstJoinAck = await joiner.emitWithAck("room:join", firstRoomId);
    const secondJoinAck = await joiner.emitWithAck("room:join", secondRoomId);

    expect(firstJoinAck.success).toBe(true);
    expect(secondJoinAck).toMatchObject({
      success: false,
      code: "IN_ROOM",
    } satisfies JoinError);

    assert(!secondJoinAck.success, "Joining second room should be failed.");
    expect(secondJoinAck.code).toBe("IN_ROOM");

    const socketState = await sockets.get(firstHost.id! as SocketId);

    expect(socketState.isOk());
    expect(socketState._unsafeUnwrap()).toEqual({
      status: "in-room",
      roomId: firstRoomId,
    });
  });

  it("can host a new room after leaving the old one", async () => {
    const socket = await newSocket();
    const firstRoomAck = await socket.emitWithAck("room:host");
    assert(firstRoomAck.success, "Failed to host first room.");

    await socket.emitWithAck("room:leave");

    const stateSyncPromise = new Promise<ClientState>((resolve) =>
      socket.once("room:sync", resolve),
    );

    const secondRoomAck = await socket.emitWithAck("room:host");
    assert(secondRoomAck.success, "Failed to host second room.");
    const secondRoomId = secondRoomAck.data;

    const socketState = await sockets.get(socket.id! as SocketId);

    expect(socketState.isOk());
    expect(socketState._unsafeUnwrap()).toEqual({
      status: "in-room",
      roomId: secondRoomId,
    } satisfies SocketState);

    const stateSync = await stateSyncPromise;
    expect(stateSync.id).toBe(secondRoomId);
    expect(stateSync.players).toContain(socket.id);
    expect(stateSync.isPlaying).toBe(false);
  });

  it("can join a new room after leaving the old one", async () => {
    const host = await newSocket();
    const firstRoomAck = await host.emitWithAck("room:host");
    assert(firstRoomAck.success, "Failed to host room.");
    const firstRoomId = firstRoomAck.data;

    const secondHost = await newSocket();
    const secondRoomAck = await secondHost.emitWithAck("room:host");
    assert(secondRoomAck.success, "Failed to host room.");
    const secondRoomId = secondRoomAck.data;

    const joiner = await newSocket();
    const joinFirstRoomAck = await joiner.emitWithAck("room:join", firstRoomId);
    expect(joinFirstRoomAck.success).toBe(true);
    const leaveRoomAck = await joiner.emitWithAck("room:leave");
    expect(leaveRoomAck.success).toBe(true);

    const stateSyncPromise = new Promise<ClientState>((resolve) =>
      joiner.once("room:sync", resolve),
    );

    const joinSecondRoomAck = await joiner.emitWithAck(
      "room:join",
      secondRoomId,
    );
    expect(joinSecondRoomAck.success).toBe(true);

    const socketState = (
      await sockets.get(joiner.id! as SocketId)
    )._unsafeUnwrap();
    expect(socketState).toEqual({
      status: "in-room",
      roomId: secondRoomId,
    });

    const stateSync = await stateSyncPromise;
    expect(stateSync.id).toBe(secondRoomId);
    expect(stateSync.players).toContain(secondHost.id);
    expect(stateSync.players).toContain(joiner.id);
  });

  it("can chat", async () => {
    const p1 = await newSocket();
    const p2 = await newSocket();

    const createRoomAck = await createRoom([p1, p2]);
    expect(createRoomAck.isOk()).toBe(true);

    const message = "Hello World!";

    const promise = new Promise<Chat>((resolve) =>
      p2.once("room:chat", resolve),
    );
    const ack = await p1.emitWithAck("room:chat", message);
    expect(ack.success).toBe(true);

    const chat = await promise;
    expect(chat.from).toBe(p1.id);
    expect(chat.message).toBe(message);
  });

  it("can start game", async () => {
    const p1 = await newSocket();
    const p2 = await newSocket();
    const p3 = await newSocket();
    const roomId = (await createRoom([p1, p2, p3]))._unsafeUnwrap();

    const startGameAck = await p1.emitWithAck("game:start");
    expect(startGameAck.success).toBe(true);

    const room = (await rooms.get(roomId))._unsafeUnwrap();
    assert(room.isPlaying, "Room is not playing");
    expect(room.game).toBeDefined();
    expect(room.game.questionHistory.size).toEqual(1);
  });

  it("cannot start game if player is less then minimum", async () => {
    const p1 = await newSocket();
    const _ = (await createRoom([p1]))._unsafeUnwrap();

    const startGameAck = await p1.emitWithAck("game:start");
    expect(startGameAck).toMatchObject({
      success: false,
      code: "NOT_ENOUGH",
    } satisfies StartError);
  });

  it("cannot start game by joiners", async () => {
    const host = await newSocket();
    const p2 = await newSocket();
    const p3 = await newSocket();
    const _ = (await createRoom([host, p2, p3]))._unsafeUnwrap();

    const startGameAckByP2 = await p2.emitWithAck("game:start");
    expect(startGameAckByP2).toMatchObject({
      success: false,
      code: "NOT_HOST",
    } satisfies StartError);

    const startGameAckByP3 = await p3.emitWithAck("game:start");
    expect(startGameAckByP3).toMatchObject({
      success: false,
      code: "NOT_HOST",
    } satisfies StartError);
  });
});

// create a socket.io connection to a localhost server (for testing purpose)
const newSocket = async (): Promise<ClientSocket> => {
  const socket = io(`http://localhost:${server.address.port}`);
  await new Promise<void>((resolve) => {
    socket.once("connect", () => resolve());
  });
  return socket;
};

// create a room where the first socket will be the host, and the rest are the members/joiners
const createRoom = (
  sockets: ClientSocket[],
): ResultAsync<RoomId, HostError | JoinError> => {
  const [host, ...joiners] = sockets;
  return safeTry(async function* () {
    const roomId = yield* ResultAsync.fromPromise(
      host.emitWithAck("room:host"),
      () => ackErr("UNEXPECTED"),
    ).andThen((ack) => (ack.success ? okAsync(ack.data) : errAsync(ack)));

    yield* ResultAsync.fromPromise(
      Promise.all(joiners.map((j) => j.emitWithAck("room:join", roomId))),
      () => ackErr("UNEXPECTED"),
    ).andThen((acks) => {
      const failedAck = acks.find((ack) => !ack.success);
      return failedAck ? errAsync(failedAck) : okAsync();
    });

    return okAsync(roomId);
  });
};
